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
$databases = [
    'aero_foods_finance' => [
        'tables' => ['sds_expenditure', 'daily_expenditure']
    ],
    'abe_yus_finance' => [
        'tables' => ['daily_expenditure']
    ],
    'amazon_cafe_finance' => [
        'tables' => ['daily_expenditure']
    ],
    'ojim_finance' => [
        'tables' => ['daily_expenditure']
    ],
    'amazon_cafe_finance_lyp' => [
        'tables' => ['daily_expenditure']
    ],
];

try {
    // Get query parameters
    $company = isset($_GET['company']) ? trim($_GET['company']) : null;
    $start_date = isset($_GET['start_date']) ? trim($_GET['start_date']) : null;
    $end_date = isset($_GET['end_date']) ? trim($_GET['end_date']) : null;
    
    $allResults = [];
    $totalRecords = 0;
    
    // Loop through each database
    foreach ($databases as $dbname => $config) {
        try {
            // Connect to each database
            $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
            $pdo = new PDO($dsn, $user, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Loop through each table in the database
            foreach ($config['tables'] as $tableName) {
                // Base SQL query - adjust column names based on table structure
                $sql = "SELECT *,
                               '$dbname' as source_database, '$tableName' as source_table
                        FROM public.$tableName";
                
                $conditions = [];
                $params = [];
                
                // Build conditions based on provided filters
                if ($company) {
                    $conditions[] = "company = :company";
                    $params[':company'] = $company;
                }
                
                if ($start_date) {
                    $conditions[] = "month_date >= :start_date";
                    $params[':start_date'] = $start_date;
                }
                
                if ($end_date) {
                    $conditions[] = "month_date <= :end_date";
                    $params[':end_date'] = $end_date;
                }
                
                // Add WHERE clause if filters are present
                if (!empty($conditions)) {
                    $sql .= " WHERE " . implode(" AND ", $conditions);
                }
                
                // Add ORDER BY for consistent results
                $sql .= " ORDER BY month_date DESC, id DESC";
                
                // Prepare and execute query
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                
                // Fetch results
                $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Add results to the combined array
                $allResults = array_merge($allResults, $results);
                $totalRecords += count($results);
                
                // Optional: Add a summary for each table
                error_log("Fetched " . count($results) . " records from $dbname.$tableName");
            }
            
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
        'message' => $totalRecords . ' total records retrieved from all databases',
        'summary' => [
            'total_records' => $totalRecords,
            'databases_queried' => array_keys($databases),
            'filters_applied' => [
                'company' => $company,
                'start_date' => $start_date,
                'end_date' => $end_date
            ]
        ],
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