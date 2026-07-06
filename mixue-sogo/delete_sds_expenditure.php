<?php
// Enable CORS for React Native
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration mapping
$db_configs = [
    'mixue_sogo' => [
        'host' => '192.168.1.34',
        'port' => '5432',
        'dbname' => 'mixue_sogo',
        'user' => 'postgres',
        'password' => 'Admin123'
    ],
    'aero_foods_finance' => [
        'host' => '192.168.1.34',
        'port' => '5432',
        'dbname' => 'aero_foods_finance',
        'user' => 'postgres',
        'password' => 'Admin123'
    ],
    'amazon_cafe_finance' => [
        'host' => '192.168.1.34',
        'port' => '5432',
        'dbname' => 'amazon_cafe_finance',
        'user' => 'postgres',
        'password' => 'Admin123'
    ],
    'amazon_cafe_finance_lyp' => [
        'host' => '192.168.1.34',
        'port' => '5432',
        'dbname' => 'amazon_cafe_finance_lyp',
        'user' => 'postgres',
        'password' => 'Admin123'
    ],
    'abe_yus_finance' => [
        'host' => '192.168.1.34',
        'port' => '5432',
        'dbname' => 'abe_yus_finance',
        'user' => 'postgres',
        'password' => 'Admin123'
    ],
    'ojim_cafe_finance' => [
        'host' => '192.168.1.34',
        'port' => '5432',
        'dbname' => 'ojim_finance',
        'user' => 'postgres',
        'password' => 'Admin123'
    ]
];

// Default configuration
$default_db = 'mixue_sogo';
$default_table = 'sds_expenditure';

try {
    // Get JSON input
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!$data || !isset($data['id'])) {
        throw new Exception("Invalid JSON input or missing id parameter");
    }

    // Get database and table from request, use defaults if not provided
    $source_database = isset($data['source_database']) && !empty($data['source_database']) 
        ? $data['source_database'] 
        : $default_db;
    
    $source_table = isset($data['source_table']) && !empty($data['source_table']) 
        ? $data['source_table'] 
        : $default_table;

    // Validate database configuration exists
    if (!isset($db_configs[$source_database])) {
        throw new Exception("Invalid source database: $source_database");
    }

    // Validate table name to prevent SQL injection
    $allowed_tables = ['sds_expenditure', 'daily_expenditure'];
    if (!in_array($source_table, $allowed_tables)) {
        throw new Exception("Invalid table name: $source_table");
    }

    // Get database configuration
    $config = $db_configs[$source_database];
//  print_r($config);
    // Connect to PostgreSQL
    $dsn = "pgsql:host={$config['host']};port={$config['port']};dbname={$config['dbname']}";
    $pdo = new PDO($dsn, $config['user'], $config['password']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Prepare SQL statement for deletion
    // Using parameterized query for id, but table name must be validated (done above)
  
    $sql = "DELETE FROM public.$source_table WHERE id = :id";
    $stmt = $pdo->prepare($sql);

    // Begin transaction
    $pdo->beginTransaction();

    // Execute deletion
    $stmt->execute([':id' => (int)$data['id']]);
    $affected_rows = $stmt->rowCount();

    // Commit transaction
    $pdo->commit();

    // Return response
    echo json_encode([
        'status' => 'success',
        'message' => $affected_rows > 0 
            ? "Record deleted successfully from $source_database.$source_table" 
            : "No record found with id {$data['id']} in $source_database.$source_table",
        'id' => (int)$data['id'],
        'database' => $source_database,
        'table' => $source_table,
        'affected_rows' => $affected_rows
    ]);

} catch (PDOException $e) {
    // Rollback on error
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage(),
        'error_code' => $e->getCode()
    ]);
} catch (Exception $e) {
    // Rollback on error
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>