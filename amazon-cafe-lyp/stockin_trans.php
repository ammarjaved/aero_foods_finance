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
$db = "amazon_cafe_finance_lyp";
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
    if (!$data || !isset($data['globalInfo']) || !isset($data['items'])) {
        http_response_code(400);
        echo json_encode(['message' => 'Invalid input structure']);
        exit;
    }
    
    // Parse and format the date
    $dateParts = explode('-', $data['globalInfo']['date']); // ['21','07','2025']
    
    if (count($dateParts) !== 3) {
        http_response_code(400);
        echo json_encode(['message' => 'Invalid date format']);
        exit;
    }
 
    $day = (int)$dateParts[2];
    $month = (int)$dateParts[1];
    $year = (int)$dateParts[0];
    $formattedDate = "$year-$month-$day"; // e.g., 2025-07-21
    
    $pdo->beginTransaction();
    
    // Prepare SQL statement for stock_in_transaction
    $insertTransactionSQL = "
        INSERT INTO public.stock_in_transaction 
        (month_date, month, year, day, code, name, description, category, unit_price, packet, unit, transaction_in, order_number, created_at, updated_at, created_by, updated_by)
        VALUES
        (:month_date, :month, :year, :day, :code, :name, :description, :category, :unit_price, :packet, :unit, :transaction_in, :order_number, NOW(), NOW(), :created_by, :updated_by)
    ";
    $transactionStmt = $pdo->prepare($insertTransactionSQL);
    
    // Insert transaction records
    foreach ($data['items'] as $item) {
        // Bind parameters for transaction table
        $transactionStmt->bindParam(':month_date', $formattedDate);
        $transactionStmt->bindParam(':month', $month);
        $transactionStmt->bindParam(':year', $year);
        $transactionStmt->bindParam(':day', $day);
        $transactionStmt->bindParam(':code', $item['code']);
        $transactionStmt->bindParam(':name', $item['name']);
        $transactionStmt->bindParam(':description', $item['description']);
        $transactionStmt->bindParam(':category', $item['category']);
        $transactionStmt->bindParam(':unit_price', $item['unit_price']);
        $transactionStmt->bindParam(':packet', $item['packet']);
        $transactionStmt->bindParam(':unit', $item['unit']);
        $transactionStmt->bindParam(':transaction_in', $item['quantity']);
        $transactionStmt->bindParam(':order_number', $data['globalInfo']['orderNumber']);
        $transactionStmt->bindParam(':created_by', $item['user']);
        $transactionStmt->bindParam(':updated_by', $item['user']);
        $transactionStmt->execute();
    }
    
    // Now handle stock_in table operations
    // For each unique item code in the current transaction, calculate total and upsert
    $uniqueItems = [];
    foreach ($data['items'] as $item) {
        $itemCode = $item['code'];
        if (!isset($uniqueItems[$itemCode])) {
            $uniqueItems[$itemCode] = $item; // Store the first occurrence of each item
        }
    }
    
    // Prepare UPSERT statement for stock_in table using the existing constraint
    $upsertStockSQL = "
        INSERT INTO public.stock_in 
        (month_date, name, code, description, category, unit_price, packet, unit, total_box, created_at, updated_at, created_by, updated_by)
        VALUES 
        (:month_date, :name, :code, :description, :category, :unit_price, :packet, :unit, 
         (SELECT COALESCE(SUM(transaction_in), 0) FROM public.stock_in_transaction WHERE code = :code_for_sum AND month_date = :month_date_for_sum), 
         NOW(), NOW(), :created_by, :updated_by)
        ON CONFLICT (month_date, code) 
        DO UPDATE SET 
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            unit_price = EXCLUDED.unit_price,
            packet = EXCLUDED.packet,
            unit = EXCLUDED.unit,
            total_box = (SELECT COALESCE(SUM(transaction_in), 0) FROM public.stock_in_transaction WHERE code = EXCLUDED.code AND month_date = EXCLUDED.month_date),
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
    ";
    $stockStmt = $pdo->prepare($upsertStockSQL);
    
    // Execute upsert for each unique item code
    foreach ($uniqueItems as $itemCode => $item) {
        $stockStmt->bindParam(':month_date', $formattedDate);
        $stockStmt->bindParam(':month_date_for_sum', $formattedDate);
        $stockStmt->bindParam(':name', $item['name']);
        $stockStmt->bindParam(':code', $itemCode);
        $stockStmt->bindParam(':code_for_sum', $itemCode);
        $stockStmt->bindParam(':description', $item['description']);
        $stockStmt->bindParam(':category', $item['category']);
        $stockStmt->bindParam(':unit_price', $item['unit_price']);
        $stockStmt->bindParam(':packet', $item['packet']);
        $stockStmt->bindParam(':unit', $item['unit']);
        $stockStmt->bindParam(':created_by', $item['user']);
        $stockStmt->bindParam(':updated_by', $item['user']);
        $stockStmt->execute();
    }
    
    $pdo->commit();
    echo json_encode(['message' => 'Stock entries and stock_in table updated successfully.']);
    
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['message' => 'Database error: ' . $e->getMessage()]);
}