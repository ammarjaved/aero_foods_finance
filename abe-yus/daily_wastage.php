<?php
// Database connection configuration for PostgreSQL
$host = "192.168.1.34";
$port = "5432";
$dbname = "abe_yus_finance";
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
        // UPDATE operation for new structure
        $sql = "UPDATE daily_wastage SET 
                fccpp_wastage = :fccpp_wastage,
                fccpp_cost = :fccpp_cost,
                fsr_cav_wastage = :fsr_cav_wastage,
                fsr_cav_cost = :fsr_cav_cost,
                ftypp_wastage = :ftypp_wastage,
                ftypp_cost = :ftypp_cost,
                total_before_discount = :total_before_discount,
                discount = :discount,
                final_total = :final_total,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            RETURNING id";
    }
    
    $stmt = $conn->prepare($sql);

    // Frozen Chicken Curry Potato Puff
    $stmt->bindValue(':fccpp_wastage', $data['fccpp_wastage']);
    $stmt->bindValue(':fccpp_cost', $data['fccpp_cost']);

    // Frozen Spring Roll
    $stmt->bindValue(':fsr_cav_wastage', $data['fsr_cav_wastage']);
    $stmt->bindValue(':fsr_cav_cost', $data['fsr_cav_cost']);

    // Frozen Tom Yum Potato Puff
    $stmt->bindValue(':ftypp_wastage', $data['ftypp_wastage']);
    $stmt->bindValue(':ftypp_cost', $data['ftypp_cost']);

    // Total Values
    $stmt->bindValue(':total_before_discount', $data['total_before_discount']);
    $stmt->bindValue(':discount', $data['discount']);  // Added discount binding
    $stmt->bindValue(':final_total', $data['final_total']);
    
    // For update operation, bind the ID
    if ($isUpdate) {
        $stmt->bindValue(':id', $data['id']);
    }
    
    // Execute the query
    $stmt->execute();
    
    // Get the ID of the updated record
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $recordId = $result['id'];
    
    // Send success response
    http_response_code(200); // OK
    echo json_encode([
        'success' => true, 
        'message' => 'Daily wastage data updated successfully', 
        'id' => $recordId
    ]);
    
} catch (PDOException $e) {
    http_response_code(500); // Server Error
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

// Close the connection
$conn = null;
?>