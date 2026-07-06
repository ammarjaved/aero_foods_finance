<?php
// Database connection configuration for PostgreSQL
$host = "192.168.1.34";
$port = "5432";
$dbname = "mixue_sogo";
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

$data = $_POST;

// Define base upload directory
$base_dir = 'images/';
if (!file_exists($base_dir)) {
    mkdir($base_dir, 0777, true);
}

// Define upload directory
$upload_dir = 'images/gallery_images/';
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

$file_fields = ['image_url'];
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
        if (!isset($_FILES['image_url'])) {
            $query = "SELECT image_url FROM gallery_images WHERE id = ?";
            $stmt = $conn->prepare($query);
            $stmt->execute([$data['id']]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Keep existing image paths if no new uploads
            if (!isset($_FILES['image_url']) && !isset($data['image_url'])) {
                $data['image_url'] = $existing['image_url'];
            }
        }
		
        $sql = "UPDATE gallery_images SET  month_date = :month_date, type = :type, title = :title, image_url = :image_url, updated_at = CURRENT_TIMESTAMP WHERE id = :id RETURNING id";
    } else {
        // INSERT operation
        $sql = "INSERT INTO gallery_images (
                month_date,
                type,
                title,
				image_url,
				created_at,
				updated_at
            ) VALUES (
                :month_date,
                :type,
				:title,
				:image_url,
				CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            ) RETURNING id";
    }

    $stmt = $conn->prepare($sql);
    
    $stmt->bindValue(':month_date', $data['month_date']);
    $stmt->bindValue(':type', $data['type']);
    $stmt->bindValue(':title', $data['title']);
    $stmt->bindValue(':image_url', $data['image_url']);
    
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
        'message' => $isUpdate ? 'Log entry updated successfully' : 'Log entry saved successfully', 
        'id' => $recordId
    ]);
    
} catch (PDOException $e) {
    http_response_code(500); // Server Error
    //echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
	 if ($e->getCode() === '23505' && strpos($e->getMessage(), 'unique_log') !== false) {
        http_response_code(400); // Bad Request
        echo json_encode(['error' => 'Name already exists for the selected date.']);
    } else {
        http_response_code(500); // Server Error
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

// Close the connection
$conn = null;
?>