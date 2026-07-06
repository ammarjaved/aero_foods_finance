<?php
// Database connection configuration for PostgreSQL
$host = "192.168.1.34";
$port = "5432";
$dbname = "amazon_cafe_finance";
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
                nasi_wastage = :nasi_wastage,
                nasi_cost = :nasi_cost,
                nasi_lamak_wastage = :nasi_lamak_wastage,
                nasi_lamak_cost = :nasi_lamak_cost,
                boil_egg_wastage = :boil_egg_wastage,
                boil_egg_cost = :boil_egg_cost,
                cpc_wastage = :cpc_wastage,
                cpc_cost = :cpc_cost,
                cpt_wastage = :cpt_wastage,
                cpt_cost = :cpt_cost,
                spring_roll_wastage = :spring_roll_wastage,
                spring_roll_cost = :spring_roll_cost,
                toast_bread_wastage = :toast_bread_wastage,
                toast_bread_cost = :toast_bread_cost,
                leamon_wastage = :leamon_wastage,
                leamon_cost = :leamon_cost,
                chicken_wastage = :chicken_wastage,
                chicken_cost = :chicken_cost,
				timun_wastage = :timun_wastage,
                timun_cost = :timun_cost,
				black_tea_wastage = :black_tea_wastage,
                black_tea_cost = :black_tea_cost,
				coffee_wastage = :coffee_wastage,
                coffee_cost = :coffee_cost,
				tea_wastage = :tea_wastage,
                tea_cost = :tea_cost,
                total_before_discount = :total_before_discount,
                discount = :discount,
                final_total = :final_total,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            RETURNING id";
    }
    
    $stmt = $conn->prepare($sql);

    // Bind all new food item values
    // Nasi
    $stmt->bindValue(':nasi_wastage', $data['nasi_wastage']);
    $stmt->bindValue(':nasi_cost', $data['nasi_cost']);
    
    // Nasi Lamak
    $stmt->bindValue(':nasi_lamak_wastage', $data['nasi_lamak_wastage']);
    $stmt->bindValue(':nasi_lamak_cost', $data['nasi_lamak_cost']);
    
    // Soft Boil Egg
    $stmt->bindValue(':boil_egg_wastage', $data['boil_egg_wastage']);
    $stmt->bindValue(':boil_egg_cost', $data['boil_egg_cost']);
    
    // Curry Puff Chicken
    $stmt->bindValue(':cpc_wastage', $data['cpc_wastage']);
    $stmt->bindValue(':cpc_cost', $data['cpc_cost']);
    
    // Curry Puff Tomyam
    $stmt->bindValue(':cpt_wastage', $data['cpt_wastage']);
    $stmt->bindValue(':cpt_cost', $data['cpt_cost']);
    
    // Spring Roll
    $stmt->bindValue(':spring_roll_wastage', $data['spring_roll_wastage']);
    $stmt->bindValue(':spring_roll_cost', $data['spring_roll_cost']);
    
    // Toast Bread
    $stmt->bindValue(':toast_bread_wastage', $data['toast_bread_wastage']);
    $stmt->bindValue(':toast_bread_cost', $data['toast_bread_cost']);
    
    // Lemon (note spelling: leamon)
    $stmt->bindValue(':leamon_wastage', $data['leamon_wastage']);
    $stmt->bindValue(':leamon_cost', $data['leamon_cost']);
    
    // Chicken
    $stmt->bindValue(':chicken_wastage', $data['chicken_wastage']);
    $stmt->bindValue(':chicken_cost', $data['chicken_cost']);
	
	// Timun
    $stmt->bindValue(':timun_wastage', $data['timun_wastage']);
    $stmt->bindValue(':timun_cost', $data['timun_cost']);
	
	// Black Tea
    $stmt->bindValue(':black_tea_wastage', $data['black_tea_wastage']);
    $stmt->bindValue(':black_tea_cost', $data['black_tea_cost']);
	
	// Coffee
    $stmt->bindValue(':coffee_wastage', $data['coffee_wastage']);
    $stmt->bindValue(':coffee_cost', $data['coffee_cost']);
	
	// Tea
    $stmt->bindValue(':tea_wastage', $data['tea_wastage']);
    $stmt->bindValue(':tea_cost', $data['tea_cost']);

    // Total Values
    $stmt->bindValue(':total_before_discount', $data['total_before_discount']);
    $stmt->bindValue(':discount', $data['discount']);
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