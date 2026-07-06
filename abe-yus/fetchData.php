<?php
header("Access-Control-Allow-Origin: *"); // Allow requests from any origin (for development)
header("Content-Type: application/json; charset=UTF-8");

// Database connection
$host = "192.168.1.34";
$db = "abe_yus_finance";
$user = "postgres";
$pass = "Admin123";

try {
    $conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $m = $_GET['month'];
	 $y = $_GET['year']; 
    
    // Fetch data from daily_sheet table
    $query = "SELECT * FROM public.daily_sheet 
              WHERE month = :month and year=:year
              ORDER BY id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':month', $m, PDO::PARAM_INT);
	 $stmt->bindParam(':year', $y, PDO::PARAM_INT);
    $stmt->execute();
    $dailySheetData = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Fetch data from bank_reconciliation_sheet table filtered by month
    $query2 = "SELECT visa, master, my_debit, month_date 
               FROM public.bank_reconciliation_sheet 
               WHERE EXTRACT(MONTH FROM month_date) = :month and EXTRACT(YEAR FROM month_date)=:year
               ORDER BY id";
    $stmt2 = $conn->prepare($query2);
    $stmt2->bindParam(':month', $m, PDO::PARAM_INT);
	$stmt2->bindParam(':year', $y, PDO::PARAM_INT);
    $stmt2->execute();
    $bankReconciliationData = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    
    // Create a lookup array indexed by month_date
    $bankDataByDate = [];
    foreach ($bankReconciliationData as $bankRecord) {
        $bankDataByDate[$bankRecord['month_date']] = $bankRecord;
    }
    
    // Merge both arrays based on matching month_date
    $data = [];
    foreach ($dailySheetData as $dailyRecord) {
        $mergedRecord = $dailyRecord;
        
        // Add bank reconciliation data if month_date matches
        if (isset($dailyRecord['month_date']) && isset($bankDataByDate[$dailyRecord['month_date']])) {
            $mergedRecord['visa'] = $bankDataByDate[$dailyRecord['month_date']]['visa'];
            $mergedRecord['master'] = $bankDataByDate[$dailyRecord['month_date']]['master'];
            $mergedRecord['my_debit'] = $bankDataByDate[$dailyRecord['month_date']]['my_debit'];
        }
        
        $data[] = $mergedRecord;
    }
    
    // Return JSON response
    echo json_encode($data);
    
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>