<?php
// Enable CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Max-Age: 3600");
    exit(0);
}

// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

$host = "localhost";
$db = "aero_foods_finance";
$user = "postgres";
$password = "123";

$dsn = "pgsql:host=$host;dbname=$db";

try {
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(["error" => "Connection failed: " . $e->getMessage()]));
}

// get_targets.php - Fetch targets data
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Get month and year from request parameters
        $month = isset($_GET['month']) ? intval($_GET['month']) : date('n'); // Current month if not specified
        $year = isset($_GET['year']) ? intval($_GET['year']) : date('Y'); // Current year if not specified
        
        // Query to fetch targets data
        $stmt = $pdo->prepare("SELECT * FROM targets WHERE month = ? AND year = ?");
        $stmt->execute([$month, $year]);
        $targets = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Query to fetch actual sales data (assuming you have a sales table)
        $salesStmt = $pdo->prepare("SELECT SUM(total_sales) as mtd FROM daily_sheet WHERE month = ? AND year = ?");
        $salesStmt->execute([$month, $year]);
        $salesData = $salesStmt->fetch(PDO::FETCH_ASSOC);


        $salesStmt1 = $pdo->prepare("SELECT SUM(total_hr) as total_hr 
        FROM log_sheet 
        WHERE EXTRACT(MONTH FROM start_time) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM start_time) = EXTRACT(YEAR FROM CURRENT_DATE);");
        $salesStmt1->execute();
        $lh = $salesStmt1->fetch(PDO::FETCH_ASSOC);
        
        // $mtdSales = $salesData['mtd_sales'] ?? 0;
        // $salesPercentage = $targets && $targets['sales_target'] > 0 ? 
        //     round(($mtdSales / $targets['sales_target']) * 100) : 0;
        
        // Combine targets with actual sales data
        $response = $targets ? [
            'month' => $month,
            'year' => $year,
            'sales_target' => $targets['sales_target'],
            'growth_target' => $targets['growth_target'],
            'labor_target' => $targets['labor_target'],
            'cogs_target' => $targets['cogs_target'],
            'atv_target' => $targets['atv_target'],
            'mtd' => $salesData['mtd'],
            'tlh' => $lh['total_hr']
        ] : null;
        
        echo json_encode(['data' => $response]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

// add_targets.php - Add or update targets
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Get JSON data from request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON data']);
            exit;
        }
        
        // Check if target record already exists for this month/year
        $checkStmt = $pdo->prepare("SELECT id FROM targets WHERE month = ? AND year = ?");
        $checkStmt->execute([$data['month'], $data['year']]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            // Update existing record
            $stmt = $pdo->prepare("
                UPDATE targets 
                SET sales_target = ?, growth_target = ?, labor_target = ?, 
                    cogs_target = ?, atv_target = ?,mtd=?, updated_at = NOW(), 
                    updated_by = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $data['sales_target'],
                $data['growth_target'],
                $data['labor_target'],
                $data['cogs_target'],
                $data['atv_target'],
                // $data['mtd'],
                $data['user'] ?? 'system',
                $existing['id']
            ]);
            
            echo json_encode(['success' => true, 'message' => 'Targets updated successfully']);
        } else {
            // Insert new record
            $stmt = $pdo->prepare("
                INSERT INTO targets 
                (month, year, sales_target, growth_target, labor_target, 
                cogs_target, atv_target,mtd, created_by, updated_by)
                VALUES (?, ?, ?, ?, ?, ?,?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['month'],
                $data['year'],
                $data['sales_target'],
                $data['growth_target'],
                $data['labor_target'],
                $data['cogs_target'],
                $data['atv_target'],
                // $data['mtd'],
                $data['user'] ?? 'system',
                $data['user'] ?? 'system'
            ]);
            
            echo json_encode(['success' => true, 'message' => 'Targets added successfully']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}
?>