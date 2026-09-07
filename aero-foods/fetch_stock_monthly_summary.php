<?php
// fetch_stock_monthly_summary.php
// Per-item purchase totals for one month: code, name, total quantity
// purchased and total amount paid, from the stock_in_transaction ledger.
//   GET ?month=7&year=2026   (both default to the current month/year)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$host = "192.168.1.34";
$db   = "aero_foods_finance";
$user = "postgres";
$pass = "Admin123";

$m = isset($_GET['month']) && $_GET['month'] !== "" ? (int) $_GET['month'] : (int) date('n');
$y = isset($_GET['year'])  && $_GET['year']  !== "" ? (int) $_GET['year']  : (int) date('Y');

try {
    $conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Filter on month_date (the sheet date of the stock-in), not created_at.
    $query = "SELECT
        code,
        MAX(name)                          AS name,
        MAX(unit)                          AS unit,
        MAX(category)                      AS category,
        SUM(transaction_in)                AS total_quantity,
        SUM(unit_price * transaction_in)   AS total_amount,
        COUNT(*)                           AS transactions
    FROM public.stock_in_transaction
    WHERE EXTRACT(MONTH FROM month_date) = :month
      AND EXTRACT(YEAR FROM month_date)  = :year
    GROUP BY code
    ORDER BY MAX(name), code";

    $stmt = $conn->prepare($query);
    $stmt->execute([':month' => $m, ':year' => $y]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'status'  => 'success',
        'month'   => $m,
        'year'    => $y,
        'results' => $rows,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'error' => $e->getMessage()]);
}
?>
