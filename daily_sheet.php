<?php
// Database connection configuration for PostgreSQL
$host = "192.168.1.34";
$port = "5432";
$dbname = "aero_foods_finance";
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

// Process file uploads
$file_fields = ['image_pos', 'image_recipt'];
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
        // For update, first get existing image paths to avoid deleting them if no new image is uploaded
        if (!isset($_FILES['image_pos']) && !isset($_FILES['image_recipt'])) {
            $query = "SELECT image_pos, image_recipt FROM daily_sheet WHERE id = ?";
            $stmt = $conn->prepare($query);
            $stmt->execute([$data['id']]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Keep existing image paths if no new uploads
            if (!isset($_FILES['image_pos']) && !isset($data['image_pos'])) {
                $data['image_pos'] = $existing['image_pos'];
            }
            if (!isset($_FILES['image_recipt']) && !isset($data['image_recipt'])) {
                $data['image_recipt'] = $existing['image_recipt'];
            }
        }
        
        // UPDATE operation
        $sql = "UPDATE daily_sheet SET 
                month_date = :month_date,
                month = :month, 
                year = :year, 
                day = :day, 
                cash = :cash, 
                touch_n_go = :touch_n_go, 
                duit_now = :duit_now, 
                voucher = :voucher, 
                visa_master = :visa_master,
                sales_walk_in = :sales_walk_in, 
                shopee = :shopee, 
                grab = :grab, 
                panda = :panda,
                sales_delivery = :sales_delivery, 
                total_sales = :total_sales, 
                month_date_sales = :month_date_sales, 
                transaction_count = :transaction_count, 
                avg_transaction_value = :avg_transaction_value,
                labour_hours_used = :labour_hours_used, 
                sales_per_labour_hours = :sales_per_labour_hours, 
                image_pos = :image_pos, 
                prev_day_balance = :prev_day_balance,
                next_day_balance = :next_day_balance,
                actual_bank_amount = :actual_bank_amount,
                cash_box_amount = :cash_box_amount,
                variance = :variance,
                bank_in_date = :bank_in_date,
                recipt_ref_no = :recipt_ref_no,
                remarks = :remarks,
                image_recipt = :image_recipt,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            RETURNING id";
    } else {
        // INSERT operation
        $sql = "INSERT INTO daily_sheet (
                month_date, 
                month, 
                year, 
                day, 
                cash, 
                touch_n_go, 
                duit_now, 
                voucher, 
                visa_master,
                sales_walk_in, 
                shopee, 
                grab, 
                panda,
                sales_delivery, 
                total_sales, 
                month_date_sales, 
                transaction_count, 
                avg_transaction_value,
                labour_hours_used, 
                sales_per_labour_hours, 
                image_pos, 
                prev_day_balance,
                next_day_balance,
                actual_bank_amount,
                cash_box_amount,
                variance,
                bank_in_date,
                recipt_ref_no,
                remarks,
                image_recipt,
                created_at,
                updated_at
            ) VALUES (
                :month_date, 
                :month, 
                :year, 
                :day, 
                :cash, 
                :touch_n_go, 
                :duit_now, 
                :voucher, 
                :visa_master,
                :sales_walk_in, 
                :shopee, 
                :grab, 
                :panda,
                :sales_delivery, 
                :total_sales, 
                :month_date_sales, 
                :transaction_count, 
                :avg_transaction_value,
                :labour_hours_used, 
                :sales_per_labour_hours, 
                :image_pos, 
                :prev_day_balance,
                :next_day_balance,
                :cash_in_hand,
                :actual_bank_amount,
                :cash_box_amount,
                :variance,
                :bank_in_date,
                :recipt_ref_no,
                :remarks,
                :image_recipt,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            ) RETURNING id";
    }
    
    $stmt = $conn->prepare($sql);
    
    // Bind parameters
    $stmt->bindValue(':month_date', $data['month_date']);
    $stmt->bindValue(':month', $data['month']);
    $stmt->bindValue(':year', $data['year']);
    $stmt->bindValue(':day', $data['day']);
    $stmt->bindValue(':cash', $data['cash']);
    $stmt->bindValue(':touch_n_go', $data['touch_n_go']);
    $stmt->bindValue(':duit_now', $data['duit_now']);
    $stmt->bindValue(':voucher', $data['voucher']);
    $stmt->bindValue(':visa_master', $data['visa_master']);
    $stmt->bindValue(':sales_walk_in', $data['sales_walk_in']);
    $stmt->bindValue(':shopee', $data['shopee']);
    $stmt->bindValue(':grab', $data['grab']);
    $stmt->bindValue(':panda', $data['panda']);
    $stmt->bindValue(':sales_delivery', $data['sales_delivery']);
    $stmt->bindValue(':total_sales', $data['total_sales']);
    $stmt->bindValue(':month_date_sales', $data['month_date_sales']);
    $stmt->bindValue(':transaction_count', $data['transaction_count']);
    $stmt->bindValue(':avg_transaction_value', $data['avg_transaction_value']);
    $stmt->bindValue(':labour_hours_used', $data['labour_hours_used']);
    $stmt->bindValue(':sales_per_labour_hours', $data['sales_per_labour_hours']);
    $stmt->bindValue(':image_pos', $data['image_pos']);
    $stmt->bindValue(':prev_day_balance', $data['prev_day_balance']);
    $stmt->bindValue(':next_day_balance', $data['next_day_balance']);
    $stmt->bindValue(':actual_bank_amount', $data['actual_bank_amount']);
    $stmt->bindValue(':cash_box_amount', $data['cash_box_amount']);
    $stmt->bindValue(':variance', $data['variance']);
    $stmt->bindValue(':bank_in_date', $data['bank_in_date']);
    $stmt->bindValue(':recipt_ref_no', $data['recipt_ref_no']);
    $stmt->bindValue(':remarks', $data['remarks']);
    $stmt->bindValue(':image_recipt', $data['image_recipt']);
    
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