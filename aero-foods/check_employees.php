<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$host     = "192.168.1.34";
$port     = "5432";
$user     = "postgres";
$password = "Admin123";

$dbMap = [
    'mixue'   => 'aero_foods_finance',
    'abe'     => 'abe_yus_finance',
    'amz'     => 'amazon_cafe_finance',
    'ojim'    => 'ojim_finance',
    'amz-lyp' => 'amazon_cafe_finance_lyp',
];

$cafeKey = $_GET['db'] ?? 'mixue';
$cafeDb  = $dbMap[$cafeKey] ?? 'aero_foods_finance';

$out = ['db' => $cafeDb];

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$cafeDb", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Columns of employees table
    $colStmt = $pdo->query(
        "SELECT column_name, data_type
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'employees'
         ORDER BY ordinal_position"
    );
    $out['columns'] = $colStmt->fetchAll(PDO::FETCH_ASSOC);

    // Sample rows
    $rowStmt = $pdo->query("SELECT * FROM employees LIMIT 5");
    $out['sample_rows'] = $rowStmt->fetchAll(PDO::FETCH_ASSOC);

} catch (Exception $e) {
    $out['error'] = $e->getMessage();
}

echo json_encode($out, JSON_PRETTY_PRINT);
?>
