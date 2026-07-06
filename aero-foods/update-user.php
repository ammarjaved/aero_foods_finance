<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
$host = '192.168.1.34';
$port = '5432';
//$dbname = 'aero_foods_finance';
$username = 'postgres';
$password = 'Admin123';



try {
    // Create PostgreSQL connection
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !is_array($input)) {
        throw new Exception('Invalid JSON input');
    }

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




    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get JSON input
   
    
    // Check if input is a single record or array of records
    // If it's an associative array (single record), wrap it in an array
    if (isset($input['username']) || isset($input['id'])) {
        $input = [$input];
    }
    
    $results = [];
    $pdo->beginTransaction();
    
    foreach ($input as $record) {
        // Validate required fields
        if (empty($record['username'])) {
            throw new Exception("Missing required field: username");
        }
        if (!isset($record['is_admin'])) {
            throw new Exception("Missing required field: is_admin");
        }
        // password is required only for new users
        $isUpdate = isset($record['id']) && !empty($record['id']);
        if (!$isUpdate && empty($record['password'])) {
            throw new Exception("Password is required for new users");
        }
        
        // $isUpdate already set above
        
        if ($isUpdate) {
            // UPDATE operation
            
            // Check if username already exists for a different user
            $checkSql = "SELECT id FROM users WHERE username = :username AND id != :id";
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->bindParam(':username', $record['username'], PDO::PARAM_STR);
            $checkStmt->bindParam(':id', $record['id'], PDO::PARAM_INT);
            $checkStmt->execute();
            
            if ($checkStmt->fetch()) {
                throw new Exception('User already exists with username: ' . $record['username']);
            }
            
            // Get the old username before updating
            $oldUsernameSql = "SELECT username FROM users WHERE id = :id";
            $oldUsernameStmt = $pdo->prepare($oldUsernameSql);
            $oldUsernameStmt->bindParam(':id', $record['id'], PDO::PARAM_INT);
            $oldUsernameStmt->execute();
            $oldUsername = $oldUsernameStmt->fetchColumn();
            
            if (!$oldUsername) {
                throw new Exception('No user found with ID: ' . $record['id']);
            }
            
            $hasNewPassword = !empty($record['password']);
            if ($hasNewPassword) {
                $sql = "UPDATE users SET
                            username   = :username,
                            is_admin   = :is_admin,
                            password   = :password,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = :id";
            } else {
                $sql = "UPDATE users SET
                            username   = :username,
                            is_admin   = :is_admin,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = :id";
            }

            $stmt = $pdo->prepare($sql);
            $stmt->bindParam(':id',       $record['id'],       PDO::PARAM_INT);
            $stmt->bindParam(':username', $record['username'],  PDO::PARAM_STR);
            $stmt->bindParam(':is_admin', $record['is_admin'],  PDO::PARAM_STR);
            if ($hasNewPassword) {
                $stmt->bindParam(':password', $record['password'], PDO::PARAM_STR);
            }

            $stmt->execute();
            
            if ($stmt->rowCount() > 0) {
                // Update employees: rename + update employment_type and basic_salary
                $empType    = isset($record['employment_type']) ? trim($record['employment_type']) : null;
                $basicSal   = isset($record['basic_salary'])    && $record['basic_salary'] !== '' ? floatval($record['basic_salary']) : null;

                $updateEmployeeSql = "UPDATE employees
                                      SET short_name       = :new_username,
                                          employment_type  = COALESCE(:emp_type, employment_type),
                                          basic_salary     = COALESCE(:basic_sal, basic_salary)
                                      WHERE LOWER(TRIM(short_name)) = LOWER(TRIM(:old_username))";
                $updateEmployeeStmt = $pdo->prepare($updateEmployeeSql);
                $updateEmployeeStmt->bindParam(':new_username', $record['username'], PDO::PARAM_STR);
                $updateEmployeeStmt->bindParam(':old_username', $oldUsername,        PDO::PARAM_STR);
                $updateEmployeeStmt->bindParam(':emp_type',     $empType,            PDO::PARAM_STR);
                $updateEmployeeStmt->bindParam(':basic_sal',    $basicSal,           PDO::PARAM_STR);
                $updateEmployeeStmt->execute();

                $results[] = [
                    'id' => $record['id'],
                    'action' => 'updated',
                    'status' => 'success',
                    'employee_rows_updated' => $updateEmployeeStmt->rowCount()
                ];
            } else {
                throw new Exception('No record found with ID: ' . $record['id']);
            }
            
        } else {
            // INSERT operation
            
            // Check if username already exists
            $checkSql = "SELECT id FROM users WHERE username = :username";
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->bindParam(':username', $record['username'], PDO::PARAM_STR);
            $checkStmt->execute();
            
            if ($checkStmt->fetch()) {
                throw new Exception('User already exists with username: ' . $record['username']);
            }
            
            $sql = "INSERT INTO users
                        (username, is_admin, password, created_at, updated_at)
                    VALUES 
                        (:username, :is_admin, :password, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id";
            
            $stmt = $pdo->prepare($sql);
            
            // Bind parameters
            $stmt->bindParam(':username', $record['username'], PDO::PARAM_STR);
            $stmt->bindParam(':is_admin', $record['is_admin'], PDO::PARAM_STR);
            $stmt->bindParam(':password', $record['password'], PDO::PARAM_STR);
            
            $stmt->execute();
            $newId = $stmt->fetchColumn();
            
            // Insert into employees table with short_name, employment_type, basic_salary
            $empType  = isset($record['employment_type']) ? trim($record['employment_type']) : 'hourly';
            $basicSal = isset($record['basic_salary']) && $record['basic_salary'] !== '' ? floatval($record['basic_salary']) : null;

            $insertEmployeeSql = "INSERT INTO employees (short_name, employment_type, basic_salary)
                                  VALUES (:username, :emp_type, :basic_sal)";
            $insertEmployeeStmt = $pdo->prepare($insertEmployeeSql);
            $insertEmployeeStmt->bindParam(':username',  $record['username'], PDO::PARAM_STR);
            $insertEmployeeStmt->bindParam(':emp_type',  $empType,            PDO::PARAM_STR);
            $insertEmployeeStmt->bindParam(':basic_sal', $basicSal,           PDO::PARAM_STR);
            $insertEmployeeStmt->execute();
            
            $results[] = [
                'id' => $newId,
                'action' => 'inserted',
                'status' => 'success',
                'employee_created' => true
            ];
        }
    }
    
    $pdo->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => count($results) . ' record(s) processed successfully',
        'results' => $results
    ]);
    
} catch (PDOException $e) {
    if (isset($pdo)) {
        $pdo->rollBack();
    }
    
    echo json_encode([
        'status' => 'error',
        'error' => 'Database error: ' . $e->getMessage()
    ]);
    
} catch (Exception $e) {
    if (isset($pdo)) {
        $pdo->rollBack();
    }
    
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
?>