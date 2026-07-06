<?php
/**
 * Daily Sheet and Bank Reconciliation Update Script
 * Updates calculated columns based on the formulas provided
 */

// Suppress PHP error output so warnings/notices never corrupt the JSON response
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);

// Enable CORS for React frontend
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

class DailySheetCalculator {
    private $pdo;
    
    public function __construct($host, $port, $dbname, $user, $password) {
        try {
            $this->pdo = new PDO(
                "pgsql:host=$host;port=$port;dbname=$dbname",
                $user,
                $password,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
        } catch (PDOException $e) {
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }
    
    /**
     * Update Daily Sheet calculated columns
     */
    public function updateDailySheet($id, $updated_by = 'system') {
        try {
            $stmt = $this->pdo->prepare("
                SELECT * FROM daily_sheet WHERE id = :id
            ");
            $stmt->execute(['id' => $id]);
            $record = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$record) {
                throw new Exception("Record not found with ID: $id");
            }
            
            // Calculate Daily Sheet Items
            $sales_walk_in = floatval($record['cash']) + floatval($record['touch_n_go']) +
                           floatval($record['duit_now']) + floatval($record['voucher']) +
                           floatval($record['visa_master']);

            $sales_delivery = floatval($record['shopee']) + floatval($record['grab']) + floatval($record['panda']);

            $total_sales = $sales_delivery + $sales_walk_in;

            $variance = floatval($record['cash_box_amount']) - floatval($record['cash']);
            
            // Calculate labour_hours_used from log_sheet
            $logStmt = $this->pdo->prepare("
                SELECT COALESCE(SUM(total_hr), 0) as total_hr 
                FROM log_sheet
                WHERE EXTRACT(MONTH FROM start_time) = :month
                AND EXTRACT(YEAR FROM start_time) = :year 
                AND start_time::date = :date
            ");
            $logStmt->execute([
                'month' => $record['month'],
                'year' => $record['year'],
                'date' => $record['month_date']
            ]);
            $logResult = $logStmt->fetch(PDO::FETCH_ASSOC);
            $labour_hours_used = floatval($logResult['total_hr'] ?? 0);
            
            // Ensure labour_hours_used is a valid number
            if (!is_numeric($labour_hours_used) || $labour_hours_used < 0) {
                $labour_hours_used = 0;
            }
            
            $sales_per_labour_hours = $labour_hours_used > 0 
                ? round($total_sales / $labour_hours_used, 2)
                : 0;
            
            // Calculate month_date_sales (cumulative from day 1 to current date)
            $currentDate = date('Y-m-d');
            $recordDate = $record['month_date'];
            $currentMonth = (int)date('m');
            $currentYear = (int)date('Y');
            
            // Check if this is the current month
            $isCurrentMonth = ($record['month'] == $currentMonth && $record['year'] == $currentYear);
            
            if ($isCurrentMonth) {
                // For current month, only calculate up to today (or last day with sales)
                // First check if today has sales data
                $todayStmt = $this->pdo->prepare("
                    SELECT COALESCE(total_sales, 0) as today_sales
                    FROM daily_sheet 
                    WHERE month_date = :current_date
                    AND EXTRACT(MONTH FROM month_date) = :month
                    AND EXTRACT(YEAR FROM month_date) = :year
                    LIMIT 1
                ");
                $todayStmt->execute([
                    'current_date' => $currentDate,
                    'month' => $currentMonth,
                    'year' => $currentYear
                ]);
                $todayResult = $todayStmt->fetch(PDO::FETCH_ASSOC);
                $todaySales = floatval($todayResult['today_sales'] ?? 0);
                
                if ($todaySales > 0) {
                    // If today has sales, include up to today
                    $cutoffDate = $currentDate;
                } else {
                    // If today has no sales, only up to yesterday
                    $cutoffDate = date('Y-m-d', strtotime($currentDate . ' -1 day'));
                }
                
                // Only calculate for records up to cutoff date
                if ($recordDate <= $cutoffDate) {
                    $stmt = $this->pdo->prepare("
                        SELECT COALESCE(SUM(total_sales), 0) as month_total
                        FROM daily_sheet 
                        WHERE month_date <= :record_date 
                        AND month_date <= :cutoff_date
                        AND EXTRACT(MONTH FROM month_date) = :month
                        AND EXTRACT(YEAR FROM month_date) = :year
                    ");
                    $stmt->execute([
                        'record_date' => $recordDate,
                        'cutoff_date' => $cutoffDate,
                        'month' => $record['month'],
                        'year' => $record['year']
                    ]);
                } else {
                    // For future dates in current month, set to 0
                    $month_date_sales = 0;
                    goto skip_calculation;
                }
            } else {
                // For past months, calculate all days up to and including current record
                $stmt = $this->pdo->prepare("
                    SELECT COALESCE(SUM(total_sales), 0) as month_total
                    FROM daily_sheet 
                    WHERE month_date <= :month_date 
                    AND EXTRACT(MONTH FROM month_date) = :month
                    AND EXTRACT(YEAR FROM month_date) = :year
                ");
                $stmt->execute([
                    'month_date' => $recordDate,
                    'month' => $record['month'],
                    'year' => $record['year']
                ]);
            }
            
            $monthResult = $stmt->fetch(PDO::FETCH_ASSOC);
            $month_date_sales = floatval($monthResult['month_total'] ?? 0);
            
            skip_calculation:
            
            // Update the record
            $updateStmt = $this->pdo->prepare("
                UPDATE daily_sheet 
                SET 
                    sales_walk_in = :sales_walk_in,
                    sales_delivery = :sales_delivery,
                    total_sales = :total_sales,
                    variance = :variance,
                    labour_hours_used = :labour_hours_used,
                    sales_per_labour_hours = :sales_per_labour_hours,
                    month_date_sales = :month_date_sales,
                    updated_at = NOW(),
                    updated_by = :updated_by
                WHERE id = :id
            ");
            
            $updateStmt->execute([
                'sales_walk_in' => $sales_walk_in,
                'sales_delivery' => $sales_delivery,
                'total_sales' => $total_sales,
                'variance' => $variance,
                'labour_hours_used' => $labour_hours_used,
                'sales_per_labour_hours' => $sales_per_labour_hours,
                'month_date_sales' => $month_date_sales,
                'updated_by' => $updated_by,
                'id' => $id
            ]);
            
            return true;
            
        } catch (Exception $e) {
            error_log("Error updating daily sheet: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Update Bank Reconciliation Sheet calculated columns
     */
    public function updateBankReconciliation($id, $updated_by = 'system') {
        try {
            $stmt = $this->pdo->prepare("
                SELECT * FROM bank_reconciliation_sheet WHERE id = :id
            ");
            $stmt->execute(['id' => $id]);
            $record = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$record) {
                throw new Exception("Record not found with ID: $id");
            }
            
            // Calculate Bank Reconciliation Items
            $total_terminal = floatval($record['visa']) + floatval($record['master']) + floatval($record['my_debit']);
            $commission = (floatval($record['dr_1']) + floatval($record['dr_2']) + floatval($record['cr'])) -
                         (floatval($record['visa']) + floatval($record['master']) + floatval($record['my_debit']));
            $variance_1 = floatval($record['tng']) - floatval($record['duit_now']);
            $total_bank_card = floatval($record['dr_1']) + floatval($record['dr_2']) + floatval($record['cr']);
            $variance_2 = (floatval($record['dr_1']) + floatval($record['dr_2']) + floatval($record['cr'])) -
                         (floatval($record['visa_master']) + floatval($record['touch_n_go']));
            $total_delivery = floatval($record['shopee_1']) + floatval($record['grab_1']) + floatval($record['panda_1']);
            $variance_3 = (floatval($record['shopee_1']) + floatval($record['grab_1']) + floatval($record['panda_1'])) -
                         floatval($record['sales_delivery']);
            $actual_total = floatval($record['cash_box_amount']) + floatval($record['tng']) +
                          floatval($record['dr_1']) + floatval($record['dr_2']) + floatval($record['cr']) +
                          floatval($record['shopee_1']) + floatval($record['grab_1']) + floatval($record['panda_1']);
            $total_variance = $actual_total - floatval($record['total_sales']);
            
            // Update the record
            $updateStmt = $this->pdo->prepare("
                UPDATE bank_reconciliation_sheet 
                SET 
                    total_terminal = :total_terminal,
                    comission = :commission,
                    variance_1 = :variance_1,
                    total_bank_card = :total_bank_card,
                    variance_2 = :variance_2,
                    total_delivery = :total_delivery,
                    variance_3 = :variance_3,
                    actual_total = :actual_total,
                    total_variance = :total_variance,
                    updated_at = NOW(),
                    updated_by = :updated_by
                WHERE id = :id
            ");
            
            $updateStmt->execute([
                'total_terminal' => $total_terminal,
                'commission' => $commission,
                'variance_1' => $variance_1,
                'total_bank_card' => $total_bank_card,
                'variance_2' => $variance_2,
                'total_delivery' => $total_delivery,
                'variance_3' => $variance_3,
                'actual_total' => $actual_total,
                'total_variance' => $total_variance,
                'updated_by' => $updated_by,
                'id' => $id
            ]);
            
            return true;
            
        } catch (Exception $e) {
            error_log("Error updating bank reconciliation: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Update all daily sheets for a specific month and year
     */
    public function updateDailySheetsForMonth($year, $month, $updated_by = 'system') {
        try {
            $stmt = $this->pdo->prepare("
                SELECT id FROM daily_sheet 
                WHERE year = :year AND month = :month 
                ORDER BY month_date
            ");
            $stmt->execute(['year' => $year, 'month' => $month]);
            $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            if (empty($ids)) {
                return ['success' => false, 'message' => 'No daily sheet records found for this month', 'count' => 0, 'total' => 0];
            }
            
            $success_count = 0;
            foreach ($ids as $id) {
                if ($this->updateDailySheet($id, $updated_by)) {
                    $success_count++;
                }
            }
            
            return [
                'success' => true,
                'message' => "Updated $success_count daily sheet records",
                'count' => $success_count,
                'total' => count($ids)
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
                'count' => 0,
                'total' => 0
            ];
        }
    }
    
    /**
     * Update all daily sheets for an entire year
     */
    public function updateDailySheetsForYear($year, $updated_by = 'system') {
        try {
            $stmt = $this->pdo->prepare("
                SELECT id FROM daily_sheet 
                WHERE year = :year 
                ORDER BY month_date
            ");
            $stmt->execute(['year' => $year]);
            $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            if (empty($ids)) {
                return ['success' => false, 'message' => 'No daily sheet records found for this year', 'count' => 0, 'total' => 0];
            }
            
            $success_count = 0;
            foreach ($ids as $id) {
                if ($this->updateDailySheet($id, $updated_by)) {
                    $success_count++;
                }
            }
            
            return [
                'success' => true,
                'message' => "Updated $success_count daily sheet records for the entire year",
                'count' => $success_count,
                'total' => count($ids)
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
                'count' => 0,
                'total' => 0
            ];
        }
    }
    
    /**
     * Update all bank reconciliation sheets for a specific month and year
     */
    public function updateBankReconciliationsForMonth($year, $month, $updated_by = 'system') {
        try {
            $stmt = $this->pdo->prepare("
                SELECT id FROM bank_reconciliation_sheet 
                WHERE EXTRACT(YEAR FROM month_date) = :year 
                AND EXTRACT(MONTH FROM month_date) = :month 
                ORDER BY month_date
            ");
            $stmt->execute(['year' => $year, 'month' => $month]);
            $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            if (empty($ids)) {
                return ['success' => false, 'message' => 'No bank reconciliation records found for this month', 'count' => 0, 'total' => 0];
            }
            
            $success_count = 0;
            foreach ($ids as $id) {
                if ($this->updateBankReconciliation($id, $updated_by)) {
                    $success_count++;
                }
            }
            
            return [
                'success' => true,
                'message' => "Updated $success_count bank reconciliation records",
                'count' => $success_count,
                'total' => count($ids)
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
                'count' => 0,
                'total' => 0
            ];
        }
    }
    
    /**
     * Update all bank reconciliation sheets for an entire year
     */
    public function updateBankReconciliationsForYear($year, $updated_by = 'system') {
        try {
            $stmt = $this->pdo->prepare("
                SELECT id FROM bank_reconciliation_sheet 
                WHERE EXTRACT(YEAR FROM month_date) = :year 
                ORDER BY month_date
            ");
            $stmt->execute(['year' => $year]);
            $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            if (empty($ids)) {
                return ['success' => false, 'message' => 'No bank reconciliation records found for this year', 'count' => 0, 'total' => 0];
            }
            
            $success_count = 0;
            foreach ($ids as $id) {
                if ($this->updateBankReconciliation($id, $updated_by)) {
                    $success_count++;
                }
            }
            
            return [
                'success' => true,
                'message' => "Updated $success_count bank reconciliation records for the entire year",
                'count' => $success_count,
                'total' => count($ids)
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
                'count' => 0,
                'total' => 0
            ];
        }
    }
}

// ============================================================================
// API ENDPOINT
// ============================================================================

// Database configuration
$host = "192.168.1.34";
$port = "5432";
$user = "postgres";
$password = "Admin123";

// Allowed databases
$allowed_dbs = [
    'mixue_sogo',
    'aero_foods_finance',
    'amazon_cafe_finance',
	 'amazon_cafe_finance_lyp',
    'abe_yus_finance',
    'ojim_finance'
];

try {
    // Validate GET parameters
    if (!isset($_GET['year']) || !isset($_GET['db'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Missing required parameters: year and db',
            'usage' => [
                'For specific month' => 'reconsole.php?year=2024&month=1&db=mixue_sogo&user=admin',
                'For entire year' => 'reconsole.php?year=2024&db=mixue_sogo&user=admin'
            ]
        ]);
        exit;
    }
    
    $year = (int)$_GET['year'];
    $month = isset($_GET['month']) ? (int)$_GET['month'] : null;
    $dbname = $_GET['db'];
    $updated_by = $_GET['user'] ?? 'system';
    
    // Validate database name
    if (!in_array($dbname, $allowed_dbs)) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid database name',
            'allowed_databases' => $allowed_dbs
        ]);
        exit;
    }
    
    // Validate year
    if ($year < 2000 || $year > 2100) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid year. Must be between 2000 and 2100'
        ]);
        exit;
    }
    
    // Validate month if provided
    if ($month !== null && ($month < 1 || $month > 12)) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid month. Must be between 1 and 12'
        ]);
        exit;
    }
    
    // Create calculator instance
    $calculator = new DailySheetCalculator($host, $port, $dbname, $user, $password);
    
    // Update based on whether month is specified
    if ($month !== null) {
        // Update specific month
        $dailyResult = $calculator->updateDailySheetsForMonth($year, $month, $updated_by);
        $bankResult = $calculator->updateBankReconciliationsForMonth($year, $month, $updated_by);
        
        $response = [
            'success' => $dailyResult['success'] || $bankResult['success'],
            'database' => $dbname,
            'year' => $year,
            'month' => $month,
            'updated_by' => $updated_by,
            'daily_sheet' => $dailyResult,
            'bank_reconciliation' => $bankResult,
            'message' => 'Monthly update completed'
        ];
    } else {
        // Update entire year
        $dailyResult = $calculator->updateDailySheetsForYear($year, $updated_by);
        $bankResult = $calculator->updateBankReconciliationsForYear($year, $updated_by);
        
        $response = [
            'success' => $dailyResult['success'] || $bankResult['success'],
            'database' => $dbname,
            'year' => $year,
            'month' => null,
            'updated_by' => $updated_by,
            'daily_sheet' => $dailyResult,
            'bank_reconciliation' => $bankResult,
            'message' => 'Yearly update completed'
        ];
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>