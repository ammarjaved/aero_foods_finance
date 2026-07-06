<?php
// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 86400"); // 24 hours
    http_response_code(200);
    exit();
}
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use DELETE or POST method.']);
    exit;
}

// Database connection - PostgreSQL
$host = '192.168.1.34';
//$dbname = 'aero_foods_finance';
$username = 'postgres';
$password = 'Admin123';
$port = '5432';




try {

    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    $db1 = 'aero_foods_finance';
    $db2 = 'abe_yus_finance';
    $db3 = 'amazon_cafe_finance';
    $db4 = 'ojim_finance';
	$db5 = 'amazon_cafe_finance_lyp';
    $db6 = 'mixue_sogo';

    if($input['db']=='mixue'){
        $dbname=$db1;
    }else if($input['db']=='abe'){
        $dbname=$db2;
    }else if($input['db']=='amz'){
        $dbname=$db3;
    }else if($input['db']=='ojim'){
        $dbname=$db4;
    }else if($input['db']=='amz-lyp'){
        $dbname=$db5;
    }else if($input['db']=='mixue-sogo'){
        $dbname=$db6;
    }

    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Get JSON input


if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid JSON input',
        'raw' => $rawInput
    ]);
    exit;
}

// Extract user ID
$userId = $input['id'] ?? null;

if (empty($userId)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'id is required',
        'example' => ['id' => '123']
    ]);
    exit;
}

try {
    $pdo->beginTransaction();
    
    // First, get the username from users table
    $getUserStmt = $pdo->prepare("SELECT username FROM users WHERE id = :id");
    $getUserStmt->bindParam(':id', $userId, PDO::PARAM_INT);
    $getUserStmt->execute();
    $user = $getUserStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode([
            'error' => 'User not found',
            'id' => $userId
        ]);
        exit;
    }
    
    $username = $user['username'];
    
    // Delete from employees table where short_name matches username
    $deleteEmployeeStmt = $pdo->prepare("DELETE FROM employees WHERE short_name = :username");
    $deleteEmployeeStmt->bindParam(':username', $username, PDO::PARAM_STR);
    $deleteEmployeeStmt->execute();
    $deletedEmployeeRows = $deleteEmployeeStmt->rowCount();
    
    // Delete from users table
    $deleteUserStmt = $pdo->prepare("DELETE FROM users WHERE id = :id");
    $deleteUserStmt->bindParam(':id', $userId, PDO::PARAM_INT);
    $deleteUserStmt->execute();
    $deletedUserRows = $deleteUserStmt->rowCount();
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Records deleted successfully',
        'username' => $username,
        'deleted_users' => $deletedUserRows,
        'deleted_employees' => $deletedEmployeeRows
    ]);
    
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to delete records',
        'message' => $e->getMessage()
    ]);
}
?>