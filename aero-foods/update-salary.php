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
$dbname = 'aero_foods_finance';
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

    // Amount columns are double precision: an empty string from the form is not
    // a valid number, so send NULL instead of ''.
    $amount = function ($record, $key) {
        if (!isset($record[$key])) {
            return null;
        }
        $value = $record[$key];
        return ($value === '' || $value === null) ? null : $value;
    };

    foreach ($input as $record) {
        // Validate required fields (only amount fields and user tracking)
        $requiredFields = ['mixue', 'abeyus', 'dac','ojim', 'sds_hq'];
        
        // Check if this is an update (has ID) or insert (no ID)
        $isUpdate = isset($record['id']) && !empty($record['id']);
        
        if ($isUpdate) {
            // UPDATE operation
            $sql = "UPDATE salary SET
                        mixue      = :mixue,
                        abeyus     = :abeyus,
                        dac        = :dac,
                        dac_lyp    = :dac_lyp,
                        ojim       = :ojim,
                        mixue_sogo = :mixue_sogo,
                        sds_hq     = :sds_hq,
                        updated_by = :updated_by
                    WHERE id = :id";

            $stmt = $pdo->prepare($sql);

            // Bind parameters. bindValue (not bindParam) because these come from
            // a closure return, and NULLs must bind as NULL rather than ''.
            $stmt->bindValue(':id', $record['id'], PDO::PARAM_INT);
            $stmt->bindValue(':mixue',      $amount($record, 'mixue'));
            $stmt->bindValue(':abeyus',     $amount($record, 'abeyus'));
            $stmt->bindValue(':dac',        $amount($record, 'dac'));
            $stmt->bindValue(':dac_lyp',    $amount($record, 'dac_lyp'));
            $stmt->bindValue(':ojim',       $amount($record, 'ojim'));
            $stmt->bindValue(':mixue_sogo', $amount($record, 'mixue_sogo'));
            $stmt->bindValue(':sds_hq',     $amount($record, 'sds_hq'));
            $stmt->bindValue(':updated_by', $record['updated_by'], PDO::PARAM_STR);

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
            
            // Column list matches the salary table exactly: the amount column is
            // abeyus (not "abe-yus"), and there are no created_at / updated_at
            // columns. Getting either wrong made every new-record save fail.
            $sql = "INSERT INTO salary
                        (month, year, mixue, abeyus, dac, dac_lyp, ojim, mixue_sogo, sds_hq, created_by, updated_by)
                    VALUES
                        (:month, :year, :mixue, :abeyus, :dac, :dac_lyp, :ojim, :mixue_sogo, :sds_hq, :created_by, :updated_by)
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
            $stmt->bindValue(':month', $month, PDO::PARAM_STR);
            $stmt->bindValue(':year', $year, PDO::PARAM_STR);
            $stmt->bindValue(':mixue',      $amount($record, 'mixue'));
            $stmt->bindValue(':abeyus',     $amount($record, 'abeyus'));
            $stmt->bindValue(':dac',        $amount($record, 'dac'));
            $stmt->bindValue(':dac_lyp',    $amount($record, 'dac_lyp'));
            $stmt->bindValue(':ojim',       $amount($record, 'ojim'));
            $stmt->bindValue(':mixue_sogo', $amount($record, 'mixue_sogo'));
            $stmt->bindValue(':sds_hq',     $amount($record, 'sds_hq'));
            $stmt->bindValue(':created_by', $record['created_by'], PDO::PARAM_STR);
            $stmt->bindValue(':updated_by', $record['updated_by'], PDO::PARAM_STR);

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