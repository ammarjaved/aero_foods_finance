<?php
// Database connection configuration for PostgreSQL
$host = "192.168.1.34";
$port = "5432";
$dbname = "ojim_finance";
$username = "postgres";
$password = "Admin123";

// Set headers to allow cross-origin requests (CORS)
header("Access-Control-Allow-Origin: *"); // Replace * with your actual frontend domain in production
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Just exit with 200 OK status
    exit(0);
}

// Check if the request is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Only POST method is allowed']);
    exit;
}

// Define upload directory
$upload_dir = 'images/';

// Create directory if it doesn't exist
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

// Process the form data
$data = [];
foreach ($_POST as $key => $value) {
    $data[$key] = $value;
}

// Connect to PostgreSQL database
try {
    $conn_string = "pgsql:host=$host;port=$port;dbname=$dbname;user=$username;password=$password";
    $conn = new PDO($conn_string);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500); // Server Error
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Determine if this is an insert or update operation
$isUpdate = isset($data['id']) && !empty($data['id']);

try {
    if ($isUpdate) {
        
        // UPDATE operation
        $sql = "UPDATE bank_reconciliation_sheet SET
            visa = :visa,
            master = :master,
            my_debit = :my_debit,
            total_terminal = :total_terminal,
            comission = :comission,
            tng = :tng,
            variance_1 = :variance_1,
            dr_1 = :dr_1,
            dr_2 = :dr_2,
            cr = :cr,
            total_bank_card = :total_bank_card,
            variance_2 = :variance_2,
            shopee_1 = :shopee_1,
            grab_1 = :grab_1,
            panda_1 = :panda_1,
            total_delivery = :total_delivery,
            variance_3 = :variance_3,
            actual_total = :actual_total,
            total_variance = :total_variance
        WHERE id = :id
        RETURNING id";
    }
    
$stmt = $conn->prepare($sql);

$stmt->bindValue(':visa', $data['visa']);
$stmt->bindValue(':master', $data['master']);
$stmt->bindValue(':my_debit', $data['my_debit']);
$stmt->bindValue(':total_terminal', $data['total_terminal']);
$stmt->bindValue(':comission', $data['comission']);
$stmt->bindValue(':tng', $data['tng']);
$stmt->bindValue(':variance_1', $data['variance_1']);
$stmt->bindValue(':dr_1', $data['dr_1']);
$stmt->bindValue(':dr_2', $data['dr_2']);
$stmt->bindValue(':cr', $data['cr']);
$stmt->bindValue(':total_bank_card', $data['total_bank_card']);
$stmt->bindValue(':variance_2', $data['variance_2']);
$stmt->bindValue(':shopee_1', $data['shopee_1']);
$stmt->bindValue(':grab_1', $data['grab_1']);
$stmt->bindValue(':panda_1', $data['panda_1']);
$stmt->bindValue(':total_delivery', $data['total_delivery']);
$stmt->bindValue(':variance_3', $data['variance_3']);
$stmt->bindValue(':actual_total', $data['actual_total']);
$stmt->bindValue(':total_variance', $data['total_variance']);

    // For update operation, bind the ID
    if ($isUpdate) {
        $stmt->bindValue(':id', $data['id']);
    }
    
    // Execute the query
    $stmt->execute();
    
    // Get the ID of the inserted/updated record
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $recordId = $result['id'];
    
    // Send success response
    http_response_code(200); // OK
    echo json_encode([
        'success' => true, 
        'message' => $isUpdate ? 'Daily sales data updated successfully' : 'Daily sales data saved successfully', 
        'id' => $recordId
    ]);
    
} catch (PDOException $e) {
    http_response_code(500); // Server Error
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

// Close the connection
$conn = null;
?>