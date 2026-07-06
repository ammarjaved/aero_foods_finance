<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
$host = "192.168.1.34";
$dbname = "mixue_sogo";
$user = "postgres";
$password = "Admin123";

try {
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Base query
    $sql = "SELECT * FROM public.daily_expenditure";
    
    $where = [];
    $params = [];
    
    // Year filter - Fixed version
    if (isset($_GET['year']) && is_numeric($_GET['year']) && $_GET['year'] >= 1900 && $_GET['year'] <= 2100) {
        // Use CAST to ensure proper comparison
        $where[] = "CAST(EXTRACT(YEAR FROM month_date) AS INTEGER) = :year";
        $params[':year'] = (int)$_GET['year'];
    }
    
    // Month filter
    if (isset($_GET['month']) && is_numeric($_GET['month']) && $_GET['month'] >= 1 && $_GET['month'] <= 12) {
        $where[] = "CAST(EXTRACT(MONTH FROM month_date) AS INTEGER) = :month";
        $params[':month'] = (int)$_GET['month'];
    }
    
    // Expense type filter
    if (isset($_GET['expense_type_name']) && trim($_GET['expense_type_name']) !== '') {
        $where[] = "expense_type_name ILIKE :expense_type_name";
        $params[':expense_type_name'] = '%' . trim($_GET['expense_type_name']) . '%';
    }
    
    // Is approved filter
    if (isset($_GET['is_approved'])) {
        $approved = strtolower(trim($_GET['is_approved']));
        if ($approved === 'true' || $approved === '1') {
            $where[] = "is_approved = TRUE";
        } elseif ($approved === 'false' || $approved === '0') {
            $where[] = "is_approved = FALSE";
        }
    }
    
    if (!empty($where)) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }
    
    $sql .= " ORDER BY id";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Return JSON response
    echo json_encode($data);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Database error",
        "message" => $e->getMessage()
    ]);
}
?>