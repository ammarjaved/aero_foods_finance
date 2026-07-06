<?php
// Enable CORS for React Native
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
$host = "192.168.1.34";
$port = "5432";
$user = "postgres";
$password = "Admin123";

// Company to database/table mapping
function getDatabaseAndTable($company) {
    $company = strtolower(trim($company));
    
    switch ($company) {
        case 'sds hq':
        case 'sds':
        case 'allmas mixue':
        case 'mixue':
            return [
                'database' => 'mixue_sogo',
                'table' => $company === 'sds hq' || $company === 'sds' ? 'sds_expenditure' : 'daily_expenditure'
            ];
        case 'amazon':
            return [
                'database' => 'amazon_cafe_finance',
                'table' => 'daily_expenditure'
            ];
		  case 'amazon_lyp':
            return [
                'database' => 'amazon_cafe_finance_lyp',
                'table' => 'daily_expenditure'
            ];	
        case 'abe yus':
        case 'abe':
            return [
                'database' => 'abe_yus_finance',
                'table' => 'daily_expenditure'
            ];
        case 'ojim':
            return [
                'database' => 'ojim_finance',
                'table' => 'daily_expenditure'
            ];
        default:
            // Default to mixue_sogo for unknown companies
            return [
                'database' => 'mixue_sogo',
                'table' => 'daily_expenditure'
            ];
    }
}

// Function to get upload directory based on company
function getUploadDirectory($company) {
    $company = strtolower(trim($company));
    
    // Log for debugging
    error_log("Getting upload directory for company: '$company'");
    
    switch ($company) {
        case 'amazon':
            $dirName = 'amazon-cafe';
            break;
		 case 'amazon_lyp':
            $dirName = 'amazon-cafe-lyp';
            break;	
        case 'abe yus':
        case 'abe':
            $dirName = 'abe-yus';
            break;
        case 'ojim':
            $dirName = 'ojim-cafe';
            break;
        case 'mixue':
        case 'sds hq':
        case 'sds':
        case 'allmas mixue':
            $dirName = 'aero-foods';
            break;
        default:
            $dirName = 'aero-foods';
            error_log("Company '$company' not matched, using default: aero-foods");
            break;
    }
    
    // Get the htdocs root directory (go up until we find htdocs)
    // This works regardless of which company folder the script is in
    $currentDir = __DIR__;
    
    // Find htdocs directory by going up the directory tree
    while (basename($currentDir) !== 'htdocs' && $currentDir !== dirname($currentDir)) {
        $currentDir = dirname($currentDir);
    }
    
    // If we found htdocs, use it; otherwise fall back to going up one level from script
    if (basename($currentDir) === 'htdocs') {
        $htdocsPath = $currentDir;
    } else {
        // Fallback: assume script is one level below htdocs
        $htdocsPath = dirname(__DIR__);
    }
    
    $uploadPath = $htdocsPath . '/' . $dirName . '/images/expenditure';
    
    error_log("Selected directory: $dirName");
    error_log("htdocs path: $htdocsPath");
    error_log("Upload directory resolved to: $uploadPath");
    
    return $uploadPath;
}

// Function to save base64 image to file
function saveBase64Image($base64String, $company) {
    error_log("saveBase64Image called with company: '$company'");
    
    $uploadDir = getUploadDirectory($company);
    error_log("Upload directory resolved to: $uploadDir");
    
    // Create upload directory if it doesn't exist
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
        error_log("Created directory: $uploadDir");
    }

    // Check if it's a valid base64 image
    if (preg_match('/^data:image\/(\w+);base64,/', $base64String, $type)) {
        // Extract the base64 encoded text
        $base64String = substr($base64String, strpos($base64String, ',') + 1);
        $type = strtolower($type[1]); // jpg, png, gif

        // Decode base64
        $imageData = base64_decode($base64String);

        if ($imageData === false) {
            throw new Exception('Failed to decode base64 image');
        }

        // Generate unique filename
        $filename = uniqid('exp_', true) . '.' . $type;
        $filepath = $uploadDir . '/' . $filename;

        // Save file
        if (file_put_contents($filepath, $imageData)) {
            // Return relative path for database storage
            // Just return the filename since the full path is already in $uploadDir
            $dbPath = 'images/expenditure/' . $filename;
            error_log("Image saved successfully. DB path: $dbPath");
            return $dbPath;
        } else {
            throw new Exception('Failed to save image file');
        }
    }

    // If not base64, return as is (might be existing file path)
    error_log("Not base64 data, returning as-is: $base64String");
    return $base64String;
}

try {
    // Get JSON input
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!$data || !is_array($data)) {
        throw new Exception("Invalid JSON input or data is not an array");
    }

    // Group data by database and table
    $groupedData = [];
    foreach ($data as $item) {
        // Validate required fields
        if (!isset($item['month_date']) || !isset($item['day']) || !isset($item['amount'])) {
            throw new Exception("Missing required fields (month_date, day, or amount) in item");
        }
        
        if (!isset($item['company']) || empty($item['company'])) {
            throw new Exception("Company field is required to determine target database");
        }

        $dbInfo = getDatabaseAndTable($item['company']);
        $key = $dbInfo['database'] . '.' . $dbInfo['table'];
        
        if (!isset($groupedData[$key])) {
            $groupedData[$key] = [
                'database' => $dbInfo['database'],
                'table' => $dbInfo['table'],
                'items' => []
            ];
        }
        
        $groupedData[$key]['items'][] = $item;
    }

    $allResults = [];
    $totalProcessed = 0;

    // Process each database/table group
    foreach ($groupedData as $group) {
        $dbname = $group['database'];
        $tableName = $group['table'];
        $items = $group['items'];

        try {
            // Connect to the specific database
            $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
            $pdo = new PDO($dsn, $user, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            // Prepare SQL statements
            $insert_sql = "INSERT INTO public.$tableName (
                month_date, day, company, vendor, amount, expense_type_name, remarks, expense_recipt, is_approved, created_by, updated_by
            ) VALUES (
                :month_date, :day, :company, :vendor, :amount, :expense_type_name, :remarks, :expense_recipt, :is_approved, :created_by, :updated_by
            ) RETURNING id";

            $update_sql = "UPDATE public.$tableName SET
                month_date = :month_date,
                day = :day,
                company = :company,
                vendor = :vendor,
                amount = :amount,
                expense_type_name = :expense_type_name,
                remarks = :remarks,
                expense_recipt = :expense_recipt,
                is_approved = :is_approved,
                updated_by = :updated_by,
                updated_at = NOW()
            WHERE id = :id";

            // Begin transaction for this database
            $pdo->beginTransaction();

            // Prepare statements
            $insert_stmt = $pdo->prepare($insert_sql);
            $update_stmt = $pdo->prepare($update_sql);

            // Process each item for this database/table
            foreach ($items as $item) {
                // Handle expense_recipt upload
                $receiptPath = null;
                if (isset($item['expense_recipt']) && !empty($item['expense_recipt'])) {
                    // Check if it's a file path (already exists) or new base64 data
                    if (strpos($item['expense_recipt'], 'images/expenditure/') === 0) {
                        // It's already a saved file path, keep it as is
                        $receiptPath = $item['expense_recipt'];
                    } else {
                        // It's new base64 data, save it
                        try {
                            $receiptPath = saveBase64Image($item['expense_recipt'], $item['company']);
                        } catch (Exception $e) {
                            error_log("Image upload error: " . $e->getMessage());
                            // Continue without image if upload fails
                            $receiptPath = null;
                        }
                    }
                }

                // Determine is_approved based on expense_type_name
                $expenseType = strtolower(trim($item['expense_type_name'] ?? ''));
                $isApproved = ($expenseType === 'claim') ? false : true;

                if (isset($item['id']) && !empty($item['id'])) {
                    // Update existing record
                    $params = [
                        ':id' => (int)$item['id'],
                        ':month_date' => $item['month_date'],
                        ':day' => (float)$item['day'],
                        ':company' => $item['company'] ?? '',
                        ':vendor' => $item['vendor'] ?? '',
                        ':amount' => (float)$item['amount'],
                        ':expense_type_name' => $item['expense_type_name'] ?? '',
                        ':remarks' => $item['remarks'] ?? '',
                        ':expense_recipt' => $receiptPath,
                        ':is_approved' => $isApproved ? 't' : 'f',
                        ':updated_by' => $item['updated_by'] ?? ''
                    ];
                    $update_stmt->execute($params);
                    $affected_rows = $update_stmt->rowCount();
                    $allResults[] = [
                        'id' => $params[':id'],
                        'action' => $affected_rows > 0 ? 'updated' : 'no_change',
                        'month_date' => $item['month_date'],
                        'company' => $item['company'],
                        'expense_recipt' => $receiptPath,
                        'is_approved' => $isApproved ? 't' : 'f',
                        'database' => $dbname,
                        'table' => $tableName
                    ];
                } else {
                    // Insert new record
                    $params = [
                        ':month_date' => $item['month_date'],
                        ':day' => (float)$item['day'],
                        ':company' => $item['company'] ?? '',
                        ':vendor' => $item['vendor'] ?? '',
                        ':amount' => (float)$item['amount'],
                        ':expense_type_name' => $item['expense_type_name'] ?? '',
                        ':remarks' => $item['remarks'] ?? '',
                        ':expense_recipt' => $receiptPath,
                        ':is_approved' => $isApproved ? 't' : 'f',
                        ':created_by' => $item['created_by'] ?? '',
                        ':updated_by' => $item['updated_by'] ?? ''
                    ];
                    $insert_stmt->execute($params);
                    $id = $insert_stmt->fetchColumn();
                    $allResults[] = [
                        'id' => $id,
                        'action' => 'inserted',
                        'month_date' => $item['month_date'],
                        'company' => $item['company'],
                        'expense_recipt' => $receiptPath,
                        'is_approved' => $isApproved,
                        'database' => $dbname,
                        'table' => $tableName
                    ];
                }
                $totalProcessed++;
            }

            // Commit transaction for this database
            $pdo->commit();

        } catch (PDOException $e) {
            // Rollback on error for this specific database
            if (isset($pdo) && $pdo->inTransaction()) {
                $pdo->rollBack();
            }

            // Add error to results but continue with other databases
            $allResults[] = [
                'error' => true,
                'database' => $dbname,
                'table' => $tableName,
                'message' => 'Database error: ' . $e->getMessage(),
                'error_code' => $e->getCode(),
                'items_count' => count($items)
            ];
            
            error_log("Database error for $dbname.$tableName: " . $e->getMessage());
        }
    }

    // Return combined results
    echo json_encode([
        'status' => 'success',
        'message' => $totalProcessed . ' records successfully added',
        'summary' => [
            'total_processed' => $totalProcessed,
            'databases_used' => array_unique(array_column($allResults, 'database')),
            'groups_processed' => count($groupedData)
        ],
        'results' => $allResults
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>