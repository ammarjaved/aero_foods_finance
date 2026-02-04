<?php
/**
 * Daily Sheet and Bank Reconciliation Update Script
 * Updates calculated columns based on the formulas provided
 */

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
            $sales_walk_in = $record['cash'] + $record['touch_n_go'] + 
                           $record['duit_now'] + $record['voucher'] + 
                           $record['visa_master'];
            
            $sales_delivery = $record['shopee'] + $record['grab'] + $record['panda'];
            
            $total_sales = $sales_delivery + $sales_walk_in;
            
            $variance = $record['cash_box_amount'] - $record['cash'];
            
            $sales_per_labour_hours = $record['labour_hours_used'] > 0 
                ? $total_sales / $record['labour_hours_used'] 
                : 0;
            
            // Calculate month_date_sales
            $stmt = $this->pdo->prepare("
                SELECT COALESCE(SUM(total_sales), 0) as month_total
                FROM daily_sheet 
                WHERE month_date <= :month_date 
                AND id != :id
                AND EXTRACT(MONTH FROM month_date) = :month
                AND EXTRACT(YEAR FROM month_date) = :year
            ");
            $stmt->execute([
                'month_date' => $record['month_date'],
                'id' => $id,
                'month' => $record['month'],
                'year' => $record['year']
            ]);
            $month_total = $stmt->fetch(PDO::FETCH_ASSOC)['month_total'];
            $month_date_sales = $month_total + $total_sales;
            
            // Update the record
            $updateStmt = $this->pdo->prepare("
                UPDATE daily_sheet 
                SET 
                    sales_walk_in = :sales_walk_in,
                    sales_delivery = :sales_delivery,
                    total_sales = :total_sales,
                    variance = :variance,
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
            $total_terminal = $record['visa'] + $record['master'] + $record['my_debit'];
            $commission = ($record['dr_1'] + $record['dr_2'] + $record['cr']) - 
                         ($record['visa'] + $record['master'] + $record['my_debit']);
            $variance_1 = $record['tng'] - ($record['touch_n_go'] + $record['duit_now']);
            $total_bank_card = $record['dr_1'] + $record['dr_2'] + $record['cr'];
            $variance_2 = ($record['dr_1'] + $record['dr_2'] + $record['cr']) - 
                         $record['visa_master'];
            $total_delivery = $record['shopee_1'] + $record['grab_1'] + $record['panda_1'];
            $variance_3 = ($record['shopee_1'] + $record['grab_1'] + $record['panda_1']) - 
                         $record['sales_delivery'];
            $actual_total = $record['cash_box_amount'] + $record['tng'] + 
                          $record['dr_1'] + $record['dr_2'] + $record['cr'] + 
                          $record['shopee_1'] + $record['grab_1'] + $record['panda_1'];
            $total_variance = $actual_total - $record['total_sales'];
            
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
                return ['success' => false, 'message' => 'No daily sheet records found for this month', 'count' => 0];
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
                'count' => 0
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
                return ['success' => false, 'message' => 'No bank reconciliation records found for this month', 'count' => 0];
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
                'count' => 0
            ];
        }
    }
}

// ============================================================================
// API ENDPOINT
// ============================================================================

// Database configuration
$host = "localhost";
$port = "5432";
$user = "postgres";
$password = "123";

// Allowed databases
$allowed_dbs = [
    'aero_foods_finance',
    'amazon_cafe_finance',
    'abe_yus_finance',
    'ojim_finance'
];

try {
    // Validate GET parameters
    if (!isset($_GET['year']) || !isset($_GET['month']) || !isset($_GET['db'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Missing required parameters: year, month, and db',
            'usage' => 'update_sheet.php?year=2024&month=1&db=aero_foods_finance&user=admin'
        ]);
        exit;
    }
    
    $year = (int)$_GET['year'];
    $month = (int)$_GET['month'];
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
    
    // Validate year and month
    if ($year < 2000 || $year > 2100) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid year. Must be between 2000 and 2100'
        ]);
        exit;
    }
    
    if ($month < 1 || $month > 12) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid month. Must be between 1 and 12'
        ]);
        exit;
    }
    
    // Create calculator instance
    $calculator = new DailySheetCalculator($host, $port, $dbname, $user, $password);
    
    // Update both tables
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
        'message' => 'Update completed'
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>