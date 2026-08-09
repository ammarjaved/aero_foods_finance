<?php
// Reorder report: current-month material + latest stock_left + min_stock.
// need_reorder = current packets <= min_stock packets.

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$host = "192.168.1.34";
$db = "aero_foods_finance";
$user = "postgres";
$pass = "Admin123";

$curMonth = (int)date('n');
$curYear  = (int)date('Y');

try {
    $pdo = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = "
        WITH latest_stock AS (
            SELECT DISTINCT ON (code) code, total_box, loose_packets, packet, month_date
            FROM stock_left
            ORDER BY code, month_date DESC, id DESC
        )
        SELECT
            c.code,
            c.name,
            c.category,
            c.unit,
            c.packet,
            COALESCE(m.min_stock_box, 0) AS min_stock_box,
            COALESCE(m.min_stock_packets, 0) AS min_stock_packets,
            COALESCE(s.total_box * c.packet + s.loose_packets, 0) AS current_packets,
            s.month_date AS last_count_date,
            (COALESCE(s.total_box * c.packet + s.loose_packets, 0) <= COALESCE(m.min_stock_packets, 0)) AS need_reorder
        FROM material c
        LEFT JOIN latest_stock s ON s.code = c.code
        LEFT JOIN min_stock m ON m.code = c.code
        WHERE EXTRACT(MONTH FROM c.month_date) = :cur_month
          AND EXTRACT(YEAR  FROM c.month_date) = :cur_year
          AND c.id IN (
              SELECT MAX(id) FROM material
              WHERE EXTRACT(MONTH FROM month_date) = :cur_month2
                AND EXTRACT(YEAR  FROM month_date) = :cur_year2
              GROUP BY code
          )
          AND LOWER(TRIM(c.category)) IN ('food', 'packaging')
        ORDER BY need_reorder DESC, c.name
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':cur_month'  => $curMonth,
        ':cur_year'   => $curYear,
        ':cur_month2' => $curMonth,
        ':cur_year2'  => $curYear,
    ]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($data as &$row) {
        $row['packet'] = (float)$row['packet'];
        $row['min_stock_box'] = (float)$row['min_stock_box'];
        $row['min_stock_packets'] = (float)$row['min_stock_packets'];
        $row['current_packets'] = (float)$row['current_packets'];
        $row['need_reorder'] = ($row['need_reorder'] === true || $row['need_reorder'] === 't');
    }
    unset($row);

    echo json_encode($data);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
