<?php
// Database connection configuration for PostgreSQL
$host = "192.168.1.34";
$port = "5432";
$dbname = "aero_foods_finance";
$username = "postgres";
$password = "Admin123";

// Set headers to allow cross-origin requests (CORS)
header("Access-Control-Allow-Origin: *"); // Replace * with your actual frontend domain in production
header("Access-Control-Allow-Methods: POST, PUT, GET, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
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

// Handle different HTTP methods
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetRequest($conn);
        break;
    case 'POST':
        // Check if this is an update or insert based on operation parameter
        $operation = $_POST['operation'] ?? 'insert';
        if ($operation === 'update') {
            handlePutRequest($conn);
        } else {
            handlePostRequest($conn);
        }
        break;
    case 'PUT':
        handlePutRequest($conn);
        break;
    case 'DELETE':
        handleDeleteRequest($conn);
        break;
    default:
        http_response_code(405); // Method Not Allowed
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

// Function to handle GET requests (retrieve materials)
function handleGetRequest($conn) {
    try {
        $sql = "SELECT * FROM material ORDER BY created_at DESC";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        
        $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => $materials
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

// Function to handle POST requests (create new material)
function handlePostRequest($conn) {
    // Process the form data
    $data = [];
    foreach ($_POST as $key => $value) {
        $data[$key] = $value;
    }
    
    // Validate required fields
    $requiredFields = ['code', 'name', 'description', 'unit_price', 'packet', 'unit'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "Missing required field: $field"]);
            return;
        }
    }
    
    try {
        // INSERT operation
        $sql = "INSERT INTO material (
            month_date, 
            day, 
            month, 
            year, 
            code, 
            name, 
            description, 
            category, 
            unit_price, 
            packet, 
            unit, 
            created_at, 
            updated_at, 
            created_by, 
            updated_by
        ) VALUES (
            :month_date, 
            :day, 
            :month, 
            :year, 
            :code, 
            :name, 
            :description, 
            :category, 
            :unit_price, 
            :packet, 
            :unit, 
            NOW(), 
            NOW(), 
            :created_by, 
            :updated_by
        ) RETURNING id";
        
        $stmt = $conn->prepare($sql);
        
        // Bind parameters
        $stmt->bindValue(':month_date', $data['month_date'] ?? date('Y-m-d'));
        $stmt->bindValue(':day', $data['day'] ?? date('d'));
        $stmt->bindValue(':month', $data['month'] ?? date('n'));
        $stmt->bindValue(':year', $data['year'] ?? date('Y'));
        $stmt->bindValue(':code', $data['code']);
        $stmt->bindValue(':name', $data['name']);
        $stmt->bindValue(':description', $data['description']);
        $stmt->bindValue(':category', $data['category'] ?? 'Equipment');
        $stmt->bindValue(':unit_price', $data['unit_price']);
        $stmt->bindValue(':packet', $data['packet']);
        $stmt->bindValue(':unit', $data['unit']);
        $stmt->bindValue(':created_by', $data['created_by'] ?? '');
        $stmt->bindValue(':updated_by', $data['updated_by'] ?? '');
        
        // Execute the query
        $stmt->execute();
        
        // Get the ID of the inserted record
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $recordId = $result['id'];
        
        // Send success response
        http_response_code(201); // Created
        echo json_encode([
            'success' => true,
            'message' => 'Material created successfully',
            'id' => $recordId
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

// Function to handle PUT requests (update existing material)
function handlePutRequest($conn) {
    $data = [];
    foreach ($_POST as $key => $value) {
        $data[$key] = $value;
    }
    
    // Check if ID is provided
    if (!isset($data['id']) || empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'ID is required for update operation']);
        return;
    }
    
    try {
        // UPDATE operation
        $sql = "UPDATE material SET
            month_date = :month_date,
            day = :day,
            month = :month,
            year = :year,
            code = :code,
            name = :name,
            description = :description,
            category = :category,
            unit_price = :unit_price,
            packet = :packet,
            unit = :unit,
            updated_at = NOW(),
            updated_by = :updated_by
        WHERE id = :id
        RETURNING id";
        
        $stmt = $conn->prepare($sql);
       
        // Bind parameters
        $stmt->bindValue(':id', $data['id']);
        $stmt->bindValue(':month_date', $data['month_date'] ?? date('Y-m-d'));
        $stmt->bindValue(':day', $data['day'] ?? date('d'));
        $stmt->bindValue(':month', $data['month'] ?? date('n'));
        $stmt->bindValue(':year', $data['year'] ?? date('Y'));
        $stmt->bindValue(':code', $data['code']);
        $stmt->bindValue(':name', $data['name']);
        $stmt->bindValue(':description', $data['description']);
        $stmt->bindValue(':category', $data['category'] ?? 'Equipment');
        $stmt->bindValue(':unit_price', $data['unit_price']);
        $stmt->bindValue(':packet', $data['packet']);
        $stmt->bindValue(':unit', $data['unit']);
        $stmt->bindValue(':updated_by', $data['updated_by'] ?? '');
        
        // Execute the query
        $stmt->execute();
        
        // Check if any rows were affected
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Material not found']);
            return;
        }
        
        // Get the ID of the updated record
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $recordId = $result['id'];
        
        // Send success response
        http_response_code(200); // OK
        echo json_encode([
            'success' => true,
            'message' => 'Material updated successfully',
            'id' => $recordId
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

// Function to handle DELETE requests (delete material)
function handleDeleteRequest($conn) {
    // Get the ID from URL parameters
    $id = $_GET['id'] ?? null;
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID is required for delete operation']);
        return;
    }
    
    try {
        $sql = "DELETE FROM material WHERE id = :id";
        $stmt = $conn->prepare($sql);
        $stmt->bindValue(':id', $id);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Material not found']);
            return;
        }
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Material deleted successfully'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

// Close the connection
$conn = null;
?>