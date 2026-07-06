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
        $sql = "UPDATE daily_wastage SET 
        jasmine_tea_wastage = :jasmine_tea_wastage,
    jasmine_tea_cost = :jasmine_tea_cost,
    black_tea_wastage = :black_tea_wastage,
    black_tea_cost = :black_tea_cost,
    milk_tea_wastage = :milk_tea_wastage,
    milk_tea_cost = :milk_tea_cost,
    coffee_wastage = :coffee_wastage,
    coffee_cost = :coffee_cost,
    ctc_wastage = :ctc_wastage,
    ctc_cost = :ctc_cost,
    yellow_peach_jelly_wastage = :yellow_peach_jelly_wastage,
    yellow_peach_jelly_cost = :yellow_peach_jelly_cost,
    brown_sugar_jelly_wastage = :brown_sugar_jelly_wastage,
    brown_sugar_jelly_cost = :brown_sugar_jelly_cost,
    peal_wastage = :peal_wastage,
    peal_cost = :peal_cost,
    ice_cream_wastage = :ice_cream_wastage,
    ice_cream_cost = :ice_cream_cost,
    melon_ice_cream_wastage = :melon_ice_cream_wastage,
    melon_ice_cream_cost = :melon_ice_cream_cost,
    oreo_wastage = :oreo_wastage,
    oreo_cost = :oreo_cost,
    yellow_peach_jam_wastage = :yellow_peach_jam_wastage,
    yellow_peach_jam_cost = :yellow_peach_jam_cost,
    pink_peach_jam_wastage = :pink_peach_jam_wastage,
    pink_peach_jam_cost = :pink_peach_jam_cost,
    kiwi_jam_wastage = :kiwi_jam_wastage,
    kiwi_jam_cost = :kiwi_jam_cost,
    strawberry_jam_wastage = :strawberry_jam_wastage,
    strawberry_jam_cost = :strawberry_jam_cost,
    mango_jam_wastage = :mango_jam_wastage,
    mango_jam_cost = :mango_jam_cost,
    passion_fruit_jam_wastage = :passion_fruit_jam_wastage,
    passion_fruit_jam_cost = :passion_fruit_jam_cost,
    nata_de_coco_wastage = :nata_de_coco_wastage,
    nata_de_coco_cost = :nata_de_coco_cost,
    lemon_wastage = :lemon_wastage,
    lemon_cost = :lemon_cost,
    total_before_discount = :total_before_discount,
    final_total = :final_total,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            RETURNING id";
    }
    
$stmt = $conn->prepare($sql);

// Jasmine Tea
$stmt->bindValue(':jasmine_tea_wastage', $data['jasmine_tea_wastage']);
$stmt->bindValue(':jasmine_tea_cost', $data['jasmine_tea_cost']);

// Black Tea
$stmt->bindValue(':black_tea_wastage', $data['black_tea_wastage']);
$stmt->bindValue(':black_tea_cost', $data['black_tea_cost']);

// Milk Tea
$stmt->bindValue(':milk_tea_wastage', $data['milk_tea_wastage']);
$stmt->bindValue(':milk_tea_cost', $data['milk_tea_cost']);

// Coffee
$stmt->bindValue(':coffee_wastage', $data['coffee_wastage']);
$stmt->bindValue(':coffee_cost', $data['coffee_cost']);

// CTC
$stmt->bindValue(':ctc_wastage', $data['ctc_wastage']);
$stmt->bindValue(':ctc_cost', $data['ctc_cost']);

// Yellow Peach Jelly
$stmt->bindValue(':yellow_peach_jelly_wastage', $data['yellow_peach_jelly_wastage']);
$stmt->bindValue(':yellow_peach_jelly_cost', $data['yellow_peach_jelly_cost']);

// Brown Sugar Jelly
$stmt->bindValue(':brown_sugar_jelly_wastage', $data['brown_sugar_jelly_wastage']);
$stmt->bindValue(':brown_sugar_jelly_cost', $data['brown_sugar_jelly_cost']);

// Peal
$stmt->bindValue(':peal_wastage', $data['peal_wastage']);
$stmt->bindValue(':peal_cost', $data['peal_cost']);

// Ice Cream
$stmt->bindValue(':ice_cream_wastage', $data['ice_cream_wastage']);
$stmt->bindValue(':ice_cream_cost', $data['ice_cream_cost']);

// Melon Ice Cream
$stmt->bindValue(':melon_ice_cream_wastage', $data['melon_ice_cream_wastage']);
$stmt->bindValue(':melon_ice_cream_cost', $data['melon_ice_cream_cost']);

// Oreo
$stmt->bindValue(':oreo_wastage', $data['oreo_wastage']);
$stmt->bindValue(':oreo_cost', $data['oreo_cost']);

// Yellow Peach Jam
$stmt->bindValue(':yellow_peach_jam_wastage', $data['yellow_peach_jam_wastage']);
$stmt->bindValue(':yellow_peach_jam_cost', $data['yellow_peach_jam_cost']);

// Pink Peach Jam
$stmt->bindValue(':pink_peach_jam_wastage', $data['pink_peach_jam_wastage']);
$stmt->bindValue(':pink_peach_jam_cost', $data['pink_peach_jam_cost']);

// Kiwi Jam
$stmt->bindValue(':kiwi_jam_wastage', $data['kiwi_jam_wastage']);
$stmt->bindValue(':kiwi_jam_cost', $data['kiwi_jam_cost']);

// Strawberry Jam
$stmt->bindValue(':strawberry_jam_wastage', $data['strawberry_jam_wastage']);
$stmt->bindValue(':strawberry_jam_cost', $data['strawberry_jam_cost']);

// Mango Jam
$stmt->bindValue(':mango_jam_wastage', $data['mango_jam_wastage']);
$stmt->bindValue(':mango_jam_cost', $data['mango_jam_cost']);

// Passion Fruit Jam
$stmt->bindValue(':passion_fruit_jam_wastage', $data['passion_fruit_jam_wastage']);
$stmt->bindValue(':passion_fruit_jam_cost', $data['passion_fruit_jam_cost']);

// Nata De Coco
$stmt->bindValue(':nata_de_coco_wastage', $data['nata_de_coco_wastage']);
$stmt->bindValue(':nata_de_coco_cost', $data['nata_de_coco_cost']);

// Lemon
$stmt->bindValue(':lemon_wastage', $data['lemon_wastage']);
$stmt->bindValue(':lemon_cost', $data['lemon_cost']);

// Total Values
$stmt->bindValue(':total_before_discount', $data['total_before_discount']);
$stmt->bindValue(':final_total', $data['final_total']);
    
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