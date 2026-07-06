<?php
// Enable CORS for React Native
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
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

// Database configurations
$db1 = 'aero_foods_finance';
$db2 = 'abe_yus_finance';
$db3 = 'amazon_cafe_finance';
$db4 = 'ojim_finance';
$db5 = 'amazon_cafe_finance_lyp';
$db6 = 'mixue_sogo';

if($_GET['db']=='mixue'){
    $databases=$db1;
}else if($_GET['db']=='abe'){
    $databases=$db2;
}else if($_GET['db']=='amz'){
    $databases=$db3;
}else if($_GET['db']=='ojim'){
    $databases=$db4;
}else if($_GET['db']=='amz-lyp'){
    $databases=$db5;
}



try {
    // Get query parameters
   
    $allResults = [];
    $totalRecords = 0;
    
    // Loop through each database
        try {
            // Connect to each database
            $dsn = "pgsql:host=$host;port=$port;dbname=$databases ";
            $pdo = new PDO($dsn, $user, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Loop through each table in the database
                // Base SQL query - adjust column names based on table structure
                $sql = "SELECT u.id, u.username, u.password, u.is_admin,
                               u.created_at, u.updated_at,
                               e.employment_type, e.basic_salary
                        FROM users u
                        LEFT JOIN employees e ON LOWER(TRIM(e.short_name)) = LOWER(TRIM(u.username))";
                
                $conditions = [];
                $params = [];
                
                // Build conditions based on provided filters
               
                
                // Add ORDER BY for consistent results
                $sql .= " ORDER BY u.id";
                
                // Prepare and execute query
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                
                // Fetch results
                $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Add results to the combined array
                $allResults = array_merge($allResults, $results);
                $totalRecords += count($results);
                
               
            
            
        } catch (PDOException $e) {
            // Log database-specific errors but continue with other databases
            error_log("Error connecting to $dbname: " . $e->getMessage());
            
            // Add error info to results
            $allResults[] = [
                'error' => true,
                'database' => $dbname,
                'message' => 'Database connection failed: ' . $e->getMessage(),
                'error_code' => $e->getCode()
            ];
        }
    
    
    // Sort all results by date (most recent first)
    usort($allResults, function($a, $b) {
        // Handle error entries
        if (isset($a['error']) || isset($b['error'])) {
            return 0;
        }
        
        // Primary sort by month_date (descending)
        $dateCompare = strcmp($b['month_date'] ?? '', $a['month_date'] ?? '');
        if ($dateCompare !== 0) {
            return $dateCompare;
        }
        
        // Secondary sort by id (descending)
        return ($b['id'] ?? 0) - ($a['id'] ?? 0);
    });
    
    // Return combined response
    echo json_encode([
        'status' => 'success',
        'results' => $allResults
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'General error: ' . $e->getMessage(),
        'error_code' => $e->getCode() ?? 0
    ]);
}
?>