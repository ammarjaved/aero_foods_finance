<?php
// Database connection configuration for PostgreSQL
$host = "localhost";
$port = "5432";
$dbname = "aero_foods_finance";
$username = "postgres";
$password = "123";

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

// Process the form data
// $data = [];
// foreach ($_POST as $key => $value) {
//     $data[$key] = $value;
// }

$data = json_decode(file_get_contents('php://input'), true);


// Define upload directory
$upload_dir = 'images/';

// Create directory if it doesn't exist
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

$file_fields = ['image_start_time', 'image_end_time'];
foreach ($file_fields as $field) {
    // Check if a new file was uploaded
    if (isset($_FILES[$field]) && $_FILES[$field]['error'] === UPLOAD_ERR_OK) {
        $temp_name = $_FILES[$field]['tmp_name'];
        $original_name = $_FILES[$field]['name'];
        
        // Generate a unique filename to prevent overwriting
        $file_extension = pathinfo($original_name, PATHINFO_EXTENSION);
        $new_filename = uniqid() . '_' . date('Ymd') . '.' . $file_extension;
        $destination = $upload_dir . $new_filename;
        
        // Move the uploaded file to the destination
        if (move_uploaded_file($temp_name, $destination)) {
            // Store only the relative path in the database
            $data[$field] = $destination;
        } else {
            http_response_code(500);
            echo json_encode(['error' => "Failed to upload $field"]);
            exit;
        }
    } else if (!isset($data[$field])) {
        // If no new file was uploaded and no existing path was provided
        $data[$field] = null;
    }
    // If there's a path in the POST data, keep it (for existing images that weren't changed)
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

        if (!isset($_FILES['image_start_time']) && !isset($_FILES['image_end_time'])) {
            $query = "SELECT 'image_start_time', 'image_end_time' FROM daily_sheet WHERE id = ?";
            $stmt = $conn->prepare($query);
            $stmt->execute([$data['id']]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Keep existing image paths if no new uploads
            if (!isset($_FILES['image_start_time']) && !isset($data['image_start_time'])) {
                $data['image_start_time'] = $existing['image_start_time'];
            }
            if (!isset($_FILES['image_end_time']) && !isset($data['image_end_time'])) {
                $data['image_end_time'] = $existing['image_end_time'];
            }
        }
        
        
        $sql = "UPDATE log_sheet SET 
                name = :name,
                start_time = :start_time, 
                end_time = :end_time, 
                is_break = :is_break, 
                break_time = :break_time, 
                total_hr = :total_hr, 
                month_date=:month_date,
                day=:day,
                ot=:ot,
                meal=:meal,
                image_start_time = :image_start_time,
                image_end_time = :image_end_time,
                updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
                RETURNING id";
    } else {
        // INSERT operation
        $sql = "INSERT INTO log_sheet (
                month_date,
                day,
                created_at,
                updated_at
            ) VALUES (
                :month_date, 
                :day, 
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            ) RETURNING id";
    }
    
    $stmt = $conn->prepare($sql);
    
    // Bind parameters
    
    
   
    
    // For update operation, bind the ID
    if ($isUpdate) {

        $stmt->bindValue(':id', $data['id']);
        $stmt->bindValue(':name', $data['name']);
        $stmt->bindValue(':start_time', $data['start_time']);
        $stmt->bindValue(':end_time', $data['end_time']);
        $stmt->bindValue(':is_break', $data['is_break']);
        $stmt->bindValue(':break_time', $data['break_time'], PDO::PARAM_STR);
        $stmt->bindValue(':total_hr', $data['total_hr'], PDO::PARAM_STR);
        $stmt->bindValue(':month_date', $data['month_date']);
        $stmt->bindValue(':day', $data['day']);
        $stmt->bindValue(':ot', $data['ot']);
        $stmt->bindValue(':meal', $data['meal']);
    }else{
        $stmt->bindValue(':month_date', $data['month_date']);
        $stmt->bindValue(':day', $data['day']);
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
        'message' => $isUpdate ? 'Log entry updated successfully' : 'Log entry saved successfully', 
        'id' => $recordId
    ]);
    
} catch (PDOException $e) {
    http_response_code(500); // Server Error
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

// Close the connection
$conn = null;
?>