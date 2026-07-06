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
        $sql = "select d.*,b.*,c.audit_status_name,a.audit_points as marks_obtain,audit_image_1,audit_image_2,audit_image_3,audit_date,a.audit_code,a.auditor_name from audit a,audit_items b, audit_status c ,audit_type d
where a.audit_items_id=b.audit_items_id and a.audit_status_id=c.audit_status_id and a.audit_type_id=d.audit_type_id
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
        'database' => 'mixue_sogo',
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