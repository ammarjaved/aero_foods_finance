<?php
// Database connection configuration for PostgreSQL
$host = "192.168.1.34";
$port = "5432";
$dbname = "amazon_cafe_finance_lyp";
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
    echo json_encode(array('error' => 'Only POST method is allowed'));
    exit;
}

// Define upload directory
$upload_dir = 'images/';

// Create directory if it doesn't exist
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

// Process the form data
$data = array();
foreach ($_POST as $key => $value) {
    $data[$key] = $value;
}

// Process file uploads
$file_fields = array('image_pos', 'image_recipt');
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
            echo json_encode(array('error' => "Failed to upload $field"));
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
    echo json_encode(array('error' => 'Database connection failed: ' . $e->getMessage()));
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
            $stmt->execute(array($data['id']));
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
                discount = :discount,
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
                discount,
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
                :actual_bank_amount,
                :cash_box_amount,
                :variance,
                :bank_in_date,
                :recipt_ref_no,
                :remarks,
                :image_recipt,
                :discount,
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
    $stmt->bindValue(':discount', $data['discount']);
   
    if (isset($data['bank_in_date']) && strtolower($data['bank_in_date']) === 'null') {
        // If value is string 'null', bind as NULL
        $stmt->bindValue(':bank_in_date', null, PDO::PARAM_NULL);
    } else if (empty($data['bank_in_date'])) {
        // If value is empty or not set, also bind as NULL
        $stmt->bindValue(':bank_in_date', null, PDO::PARAM_NULL);
    } else {
        // Value exists and is not 'null', bind normally
        $stmt->bindValue(':bank_in_date', $data['bank_in_date']);
    }
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
    
    // Now update the bank_reconciliation_sheet table
    $bankReconciliationResult = updateBankReconciliation($conn, $data);
    
    // Send success response
    http_response_code(200); // OK
    echo json_encode(array(
        'success' => true, 
        'message' => $isUpdate ? 'Daily sales data updated successfully' : 'Daily sales data saved successfully', 
        'id' => $recordId,
        'bank_reconciliation' => $bankReconciliationResult
    ));
    
} catch (PDOException $e) {
    http_response_code(500); // Server Error
    echo json_encode(array('error' => 'Database error: ' . $e->getMessage()));
}

// Close the connection
$conn = null;

/**
 * Update bank_reconciliation_sheet table with terminal data and commission
 */
function updateBankReconciliation($conn, $data) {
    try {
        // Only proceed if the required fields are present
        if (!isset($data['visa']) || !isset($data['master']) || !isset($data['my_debit'])) {
            return array('status' => 'skipped', 'reason' => 'Required fields not present', 'data' => array_keys($data));
        }
        
        // Check if month_date exists
        if (!isset($data['month_date']) || empty($data['month_date'])) {
            return array('status' => 'skipped', 'reason' => 'month_date not present');
        }
        
        // Calculate total_terminal
        $visa = floatval($data['visa']);
        $master = floatval($data['master']);
        $my_debit = floatval($data['my_debit']);
        $total_terminal = $visa + $master + $my_debit;
        
        // First, check if a record exists for this month_date
        $checkSql = "SELECT id, dr_1, dr_2, cr FROM bank_reconciliation_sheet WHERE month_date = :month_date";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindValue(':month_date', $data['month_date']);
        $checkStmt->execute();
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            // Record exists, UPDATE it
            // Calculate commission: (dr_1 + dr_2 + cr) - total_terminal
            $dr_1 = isset($existing['dr_1']) ? floatval($existing['dr_1']) : 0;
            $dr_2 = isset($existing['dr_2']) ? floatval($existing['dr_2']) : 0;
            $cr = isset($existing['cr']) ? floatval($existing['cr']) : 0;
            $comission = ($dr_1 + $dr_2 + $cr) - $total_terminal;
            
            $updateSql = "UPDATE bank_reconciliation_sheet SET 
                         visa = :visa,
                         master = :master,
                         my_debit = :my_debit,
                         total_terminal = :total_terminal,
                         comission = :comission,
                         updated_at = CURRENT_TIMESTAMP
                         WHERE month_date = :month_date";
            
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->bindValue(':visa', $visa);
            $updateStmt->bindValue(':master', $master);
            $updateStmt->bindValue(':my_debit', $my_debit);
            $updateStmt->bindValue(':total_terminal', $total_terminal);
            $updateStmt->bindValue(':comission', $comission, PDO::PARAM_STR);

            $updateStmt->bindValue(':month_date', $data['month_date']);
            $updateStmt->execute();
            
            return array(
                'status' => 'updated',
                'month_date' => $data['month_date'],
                'visa' => $visa,
                'master' => $master,
                'my_debit' => $my_debit,
                'total_terminal' => $total_terminal,
                'comission' => $comission,
                'rows_affected' => $updateStmt->rowCount()
            );
        } else {
            // Record doesn't exist, INSERT it
            // Commission will be negative of total_terminal since dr_1, dr_2, cr are NULL/0
            $comission = 0 - $total_terminal;
            
            $insertSql = "INSERT INTO bank_reconciliation_sheet 
                         (month_date, visa, master, my_debit, total_terminal, commission, created_at, updated_at)
                         VALUES 
                         (:month_date, :visa, :master, :my_debit, :total_terminal, :comission, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
            
            $insertStmt = $conn->prepare($insertSql);
            $insertStmt->bindValue(':month_date', $data['month_date']);
            $insertStmt->bindValue(':visa', $visa);
            $insertStmt->bindValue(':master', $master);
            $insertStmt->bindValue(':my_debit', $my_debit);
            $insertStmt->bindValue(':total_terminal', $total_terminal);
            $insertStmt->bindValue(':commission', $commission);
            $insertStmt->execute();
            
            return array(
                'status' => 'inserted',
                'month_date' => $data['month_date'],
                'visa' => $visa,
                'master' => $master,
                'my_debit' => $my_debit,
                'total_terminal' => $total_terminal,
                'comission' => $comission,
                'rows_affected' => $insertStmt->rowCount()
            );
        }
        
    } catch (PDOException $e) {
        // Return the error instead of just logging it
        return array(
            'status' => 'error',
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        );
    }
}
?>