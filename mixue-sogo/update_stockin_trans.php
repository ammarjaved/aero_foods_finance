<?php
// Enable CORS
header("Access-Control-Allow-Origin: *"); // Use specific origin in production
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Respond to preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database connection
$host = "192.168.1.34";
$db = "mixue_sogo";
$user = "postgres";
$pass = "Admin123";

try {
    // Connect to PostgreSQL
    $pdo = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Read JSON input
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    // Validate input
    if (!$data || !isset($data['name']) || !isset($data['stock_in']) || !isset($data['month_date'])) {
        http_response_code(400);
        echo json_encode(['message' => 'Invalid input structure. Required: name, stock_in, month_date']);
        exit;
    }
    
    $itemName = $data['name'];
    $totalBox = $data['stock_in']; // stock_in represents total_box
    $monthDate = $data['month_date']; // Already in YYYY-MM-DD format
    
    // Extract date parts for transaction table
    $dateParts = explode('-', $monthDate);
    if (count($dateParts) !== 3) {
        http_response_code(400);
        echo json_encode(['message' => 'Invalid date format. Expected: YYYY-MM-DD']);
        exit;
    }
    
    $year = (int)$dateParts[0];
    $month = (int)$dateParts[1];
    $day = (int)$dateParts[2];
    
    $pdo->beginTransaction();
    
    // Step 1: Update total_box in stock_in table (only update existing rows)
    $updateStockSQL = "
        UPDATE public.stock_in 
        SET total_box = :total_box,
            updated_at = NOW()
        WHERE month_date = :month_date AND name = :name
    ";
    $updateStockStmt = $pdo->prepare($updateStockSQL);
    $updateStockStmt->bindParam(':month_date', $monthDate);
    $updateStockStmt->bindParam(':name', $itemName);
    $updateStockStmt->bindParam(':total_box', $totalBox);
    $updateStockStmt->execute();
    
    // Check if the update affected any rows
    $updatedRows = $updateStockStmt->rowCount();
    if ($updatedRows === 0) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['message' => 'No matching record found in stock_in table for the given name and date']);
        exit;
    }
    
    // Step 2: Delete existing rows in stock_in_transaction for the same month_date and name
    $deleteTransactionSQL = "
        DELETE FROM public.stock_in_transaction 
        WHERE month_date = :month_date AND name = :name
    ";
    $deleteTransactionStmt = $pdo->prepare($deleteTransactionSQL);
    $deleteTransactionStmt->bindParam(':month_date', $monthDate);
    $deleteTransactionStmt->bindParam(':name', $itemName);
    $deleteTransactionStmt->execute();
    
    // Step 3: Insert new row from the updated stock_in record into stock_in_transaction
    $insertTransactionFromStockSQL = "
        INSERT INTO public.stock_in_transaction 
        (month_date, month, year, day, code, name, description, category, unit_price, packet, unit, transaction_in, created_at, updated_at, created_by, updated_by)
        SELECT 
            s.month_date, 
            :month, 
            :year, 
            :day, 
            s.code, 
            s.name, 
            s.description, 
            s.category, 
            s.unit_price, 
            s.packet, 
            s.unit, 
            s.total_box, 
            NOW(), 
            NOW(), 
            s.created_by, 
            s.updated_by
        FROM public.stock_in s
        WHERE s.month_date = :month_date AND s.name = :name
    ";
    $insertTransactionFromStockStmt = $pdo->prepare($insertTransactionFromStockSQL);
    $insertTransactionFromStockStmt->bindParam(':month_date', $monthDate);
    $insertTransactionFromStockStmt->bindParam(':month', $month);
    $insertTransactionFromStockStmt->bindParam(':year', $year);
    $insertTransactionFromStockStmt->bindParam(':day', $day);
    $insertTransactionFromStockStmt->bindParam(':name', $itemName);
    $insertTransactionFromStockStmt->execute();
    
    $pdo->commit();
    echo json_encode([
        'success' => 'Stock updated successfully',
        'updated_item' => $itemName,
        'new_total_box' => $totalBox,
        'date' => $monthDate
    ]);
    
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['message' => 'Database error: ' . $e->getMessage()]);
}