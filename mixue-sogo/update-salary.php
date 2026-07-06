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
$dbname = 'mixue_sogo';
$username = 'postgres';
$password = 'Admin123';



try {
    // Create PostgreSQL connection
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !is_array($input)) {
        throw new Exception('Invalid JSON input');
    }
    
    $results = [];
    $pdo->beginTransaction();
    
    foreach ($input as $record) {
        // Validate required fields (only amount fields and user tracking)
        $requiredFields = ['mixue', 'abeyus', 'dac','ojim', 'sds_hq'];
        
        // Check if this is an update (has ID) or insert (no ID)
        $isUpdate = isset($record['id']) && !empty($record['id']);
        
        if ($isUpdate) {
            // UPDATE operation
            $sql = "UPDATE salary SET 
                        mixue = :mixue,
                        abeyus = :abeyus,
                        dac = :dac,
						dac_lyp = :dac_lyp,
                        ojim=:ojim,
                        sds_hq = :sds_hq,
                        updated_by = :updated_by,
                        created_by = CURRENT_TIMESTAMP
                    WHERE id = :id";
            
            $stmt = $pdo->prepare($sql);
            
            // Bind parameters
            $stmt->bindParam(':id', $record['id'], PDO::PARAM_INT);
            $stmt->bindParam(':mixue', $record['mixue'], PDO::PARAM_STR);
            $stmt->bindParam(':abeyus', $record['abeyus'], PDO::PARAM_STR);
            $stmt->bindParam(':dac', $record['dac'], PDO::PARAM_STR);
			 $stmt->bindParam(':dac_lyp', $record['dac_lyp'], PDO::PARAM_STR);
            $stmt->bindParam(':ojim', $record['ojim'], PDO::PARAM_STR);
            $stmt->bindParam(':sds_hq', $record['sds_hq'], PDO::PARAM_STR);
            $stmt->bindParam(':updated_by', $record['updated_by'], PDO::PARAM_STR);
            
            $stmt->execute();
            
            if ($stmt->rowCount() > 0) {
                $results[] = [
                    'id' => $record['id'],
                    'action' => 'updated',
                    'status' => 'success'
                ];
            } else {
                throw new Exception('No record found with ID: ' . $record['id']);
            }
            
        } else {
            // INSERT operation
            // Note: For insert, you would need month and year, but since your form doesn't send them,
            // you might need to get them from somewhere else or modify this logic
            
            $sql = "INSERT INTO salary
                        (month, year, mixue, \"abe-yus\",dac,dac_lyp,ojim, sds_hq, created_by, updated_by, created_at, updated_at)
                    VALUES 
                        (:month, :year, :mixue, :abe_yus, :dac,:dac_lyp,:ojim ,:sds_hq, :created_by, :updated_by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id";
            
            $stmt = $pdo->prepare($sql);
            
            // For new records, you'll need to provide month and year somehow
            // This is a limitation since your form doesn't send them
            $month = isset($record['month']) ? $record['month'] : null;
            $year = isset($record['year']) ? $record['year'] : null;
            
            if (!$month || !$year) {
                throw new Exception('Month and Year are required for new records');
            }
            
            // Bind parameters
            $stmt->bindParam(':month', $month, PDO::PARAM_STR);
            $stmt->bindParam(':year', $year, PDO::PARAM_STR);
            $stmt->bindParam(':mixue', $record['mixue'], PDO::PARAM_STR);
            $stmt->bindParam(':abeyus', $record['abeyus'], PDO::PARAM_STR);
            $stmt->bindParam(':dac', $record['dac'], PDO::PARAM_STR);
			 $stmt->bindParam(':dac_lyp', $record['dac_lyp'], PDO::PARAM_STR);
            $stmt->bindParam(':ojim', $record['ojim'], PDO::PARAM_STR);

            $stmt->bindParam(':sds_hq', $record['sds_hq'], PDO::PARAM_STR);
            $stmt->bindParam(':created_by', $record['created_by'], PDO::PARAM_STR);
            $stmt->bindParam(':updated_by', $record['updated_by'], PDO::PARAM_STR);
            
            $stmt->execute();
            $newId = $stmt->fetchColumn();
            
            $results[] = [
                'id' => $newId,
                'action' => 'inserted',
                'status' => 'success'
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