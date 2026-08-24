<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$host = "192.168.1.34";
$user = "postgres";
$pass = "Admin123";

$month = intval($_GET['month'] ?? date('n'));
$year  = intval($_GET['year']  ?? date('Y'));
$db    = $_GET['db'] ?? 'aero_foods_finance';

$allowed = ['aero_foods_finance', 'mixue_sogo', 'amazon_cafe_finance', 'amazon_cafe_finance_lyp', 'abe_yus_finance', 'ojim_finance'];
if (!in_array($db, $allowed)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid db parameter"]);
    exit;
}

try {
    $conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 1. Current Stock Value - only the cafes running the stock module keep
    //    physical counts in stock_left, so only they can be valued.
    $stockValue = 0;
    if (in_array($db, ['aero_foods_finance', 'mixue_sogo'])) {
        $stmt = $conn->query("
            WITH latest_stock AS (
                SELECT DISTINCT ON (name)
                    name, total_box, loose_packets, packet, unit_price
                FROM stock_left
                ORDER BY name, month_date DESC
            )
            SELECT COALESCE(SUM(
                CASE
                    WHEN packet > 0
                    THEN ((total_box * packet + loose_packets)::numeric / packet) * unit_price
                    ELSE total_box * unit_price
                END
            ), 0) AS current_stock_value
            FROM latest_stock
        ");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $stockValue = floatval($row['current_stock_value']);
    }

    // 2. Current Month Stock Purchased
    // Aero Foods and Mixue Sogo run the stock_in module, so their purchases are
    // taken from goods actually received that month (boxes x unit price).
    // Every other cafe records purchases as a 'Stock' expense, and so does a
    // stock_in cafe in a month with no goods received, hence the fallback below.
    $stockInDbs = ['aero_foods_finance', 'mixue_sogo'];

    $purchasedValue = 0;
    $purchasedSource = 'daily_expenditure';

    if (in_array($db, $stockInDbs)) {
        $stmt = $conn->prepare("
            SELECT COALESCE(SUM(total_box * unit_price), 0) AS total_purchased
            FROM stock_in
            WHERE EXTRACT(MONTH FROM month_date) = :month
              AND EXTRACT(YEAR  FROM month_date) = :year
        ");
        $stmt->execute([':month' => $month, ':year' => $year]);
        $purchasedValue = floatval($stmt->fetchColumn());
        $purchasedSource = 'stock_in';
    }

    if ($purchasedValue <= 0) {
        $stmt = $conn->prepare("
            SELECT COALESCE(SUM(amount), 0) AS total_purchased
            FROM daily_expenditure
            WHERE expense_type_name = 'Stock'
              AND EXTRACT(MONTH FROM month_date) = :month
              AND EXTRACT(YEAR  FROM month_date) = :year
        ");
        $stmt->execute([':month' => $month, ':year' => $year]);
        $purchasedValue = floatval($stmt->fetchColumn());
        $purchasedSource = 'daily_expenditure';
    }

    // 3. Current Month Sales — sum of total_sales from daily_sheet
    $stmt = $conn->prepare("
        SELECT COALESCE(SUM(total_sales), 0) AS total_sales
        FROM daily_sheet
        WHERE EXTRACT(MONTH FROM month_date) = :month
          AND EXTRACT(YEAR  FROM month_date) = :year
    ");
    $stmt->execute([':month' => $month, ':year' => $year]);
    $sales = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        "current_stock_value"           => round($stockValue, 2),
        "current_month_stock_purchased" => round($purchasedValue, 2),
        "stock_purchased_source"        => $purchasedSource,
        "current_month_sales"           => round(floatval($sales['total_sales']), 2),
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
