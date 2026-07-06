<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$host = "192.168.1.34";
$port = "5432";
$user = "postgres";
$pass = "Admin123";

$out = [];

try {
    $conn = new PDO("pgsql:host=$host;port=$port;dbname=mixue_sogo", $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $out['connected'] = true;

    // List all tables that have "holiday" in the name (any schema)
    $stmt = $conn->query(
        "SELECT table_schema, table_name
         FROM information_schema.tables
         WHERE table_name ILIKE '%holiday%'
         ORDER BY table_schema, table_name"
    );
    $out['holiday_tables'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // For each found table, show columns and row count
    foreach ($out['holiday_tables'] as $tbl) {
        $schema = $tbl['table_schema'];
        $name   = $tbl['table_name'];
        $key    = "$schema.$name";

        // columns
        $colStmt = $conn->query(
            "SELECT column_name, data_type
             FROM information_schema.columns
             WHERE table_schema = '$schema' AND table_name = '$name'
             ORDER BY ordinal_position"
        );
        $out['columns'][$key] = $colStmt->fetchAll(PDO::FETCH_ASSOC);

        // row count
        $cntStmt = $conn->query("SELECT COUNT(*) AS cnt FROM \"$schema\".\"$name\"");
        $out['row_count'][$key] = $cntStmt->fetch(PDO::FETCH_ASSOC)['cnt'];

        // sample rows
        $rowStmt = $conn->query("SELECT * FROM \"$schema\".\"$name\" ORDER BY 1 LIMIT 10");
        $out['sample_rows'][$key] = $rowStmt->fetchAll(PDO::FETCH_ASSOC);
    }

} catch (Exception $e) {
    $out['error'] = $e->getMessage();
}

echo json_encode($out, JSON_PRETTY_PRINT);
?>
