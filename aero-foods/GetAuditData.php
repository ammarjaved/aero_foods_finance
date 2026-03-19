<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
class AuditQueryHandler {
    private $connection;
    
    public function __construct($host, $port, $database, $username, $password) {
        $this->connect($host, $port, $database, $username, $password);
    }
    
    /**
     * Connect to PostgreSQL database
     */
    private function connect($host, $port, $database, $username, $password) {
        try {
            $dsn = "pgsql:host=$host;port=$port;dbname=$database";
            $this->connection = new PDO($dsn, $username, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_OBJ
            ]);
        } catch (PDOException $e) {
           throw new Exceptio("Connection failed: " . $e->getMessage());        }
    }
    
    /**
     * Execute the audit query and return array of objects
     */
    public function getAuditData() {
        $sql = "
            SELECT 
                a.audit_type_id as id_type,
                audit_type_code as type,
                audit_type_name as name,
                audit_type_evaluation as evalulation, 
                audit_items_id as id,
                audit_item as item, 
                audit_item_marks as point
            FROM audit_type a 
            INNER JOIN audit_items b ON a.audit_type_id = b.audit_type_id
        ";
        
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute();
            $results = $stmt->fetchAll();
            
            return $results;
        } catch (PDOException $e) {
            throw new Exception("Query execution failed: " . $e->getMessage());
        }
    }
    
    /**
     * Close database connection
     */
    public function close() {
        $this->connection = null;
    }
}

try {
    // Database configuration - Update these values with your actual database credentials
    $config = [
        'host' => '192.168.1.34',
        'port' => '5432',
        'database' => 'aero_foods_finance',
        'username' => 'postgres',
        'password' => 'Admin123'
    ];
    
    // Create instance and execute query
    $auditQuery = new AuditQueryHandler(
        $config['host'], 
        $config['port'], 
        $config['database'], 
        $config['username'], 
        $config['password']
    );
    
    // Get audit data
    $auditData = $auditQuery->getAuditData();
    
    // Display results
   
    
      echo json_encode($auditData);
        
        // Uncomment below to see all records
        // print_r($auditData);
    
    
    // If you need JSON output instead
    // echo json_encode($auditData, JSON_PRETTY_PRINT);
    
    // Close connection
    $auditQuery->close();
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}


?>