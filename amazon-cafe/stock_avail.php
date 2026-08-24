<?php
header("Access-Control-Allow-Origin: *"); // Allow requests from any origin (for development)
header("Content-Type: application/json; charset=UTF-8");

// Database connection
$host = "192.168.1.34";
$db = "amazon_cafe_finance";
$user = "postgres";
$pass = "Admin123";

$conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// ---------------------------------------------------------------------------
// Date filter.
//   start = first day of the purchase period (blank = no lower bound)
//   end   = last day of the period, and the date the stock position is read at
// Stock in is summed between start and end, so a start/end of 1-31 Aug answers
// "how much did I purchase in August". The remaining figures always use the
// latest count on or before "end", because that is a position, not a flow.
// ---------------------------------------------------------------------------
function readDateParam($value, $fallback) {
    $value = trim((string)$value);
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m)
        && checkdate((int)$m[2], (int)$m[3], (int)$m[1])) {
        return $value;
    }
    return $fallback;
}

// No start given means "everything ever received", as before.
$startDate = readDateParam($_GET['start'] ?? '', '1900-01-01');
$endDate   = readDateParam($_GET['end']   ?? '', date('Y-m-d'));

// Guard against a reversed range.
if ($startDate > $endDate) {
    $startDate = '1900-01-01';
}

$query = "-- Simplified inventory query with proper syntax
WITH stock_summary AS (
    SELECT
        name,
        code,
        SUM(total_box) AS total_boxes_in,
        MAX(packet) AS packet_size,
        MAX(category) AS category,
        MAX(description) AS description,
        MAX(unit_price) AS unit_price,
        MAX(unit) AS unit
    FROM stock_in
    WHERE month_date >= CAST(:start_in AS date)  -- purchases from the start of the period
      AND month_date <= CAST(:end_in AS date)    -- to the end of the period
    GROUP BY name, code  -- Include both name and code in GROUP BY
),
latest_stock_left AS (
    SELECT DISTINCT ON(name) *  -- Use name instead of code
    FROM stock_left
    WHERE month_date <= CAST(:end_left AS date)  -- latest count on or before the end date
    ORDER BY name, month_date DESC
),
current_materials AS (
    SELECT DISTINCT ON(name)  -- Use name instead of code
        name,
        code,
        category
    FROM material
    WHERE month_date <= CAST(:end_mat AS date)  -- latest item master entry on or before the end date
    ORDER BY name, month_date DESC
)
SELECT
    COALESCE(m.category, l.category, i.category) AS category,
    COALESCE(l.code, i.code, m.code) AS code,
    COALESCE(l.name, i.name, m.name) AS name,
    COALESCE(l.description, i.description) AS description,
    COALESCE(l.unit_price, i.unit_price) AS unit_price,
    COALESCE(l.packet, i.packet_size) AS packet,
    COALESCE(l.unit, i.unit) AS unit,
    COALESCE(i.total_boxes_in, 0) AS total_boxes,

    -- Calculate total packets
    (COALESCE(i.total_boxes_in, 0) * COALESCE(i.packet_size, 0)) AS total_packets,

    -- Calculate remaining inventory (if no stock_left data, assume 100% remaining)
    CASE
        WHEN l.name IS NULL THEN (COALESCE(i.total_boxes_in, 0) * COALESCE(i.packet_size, 0))
        ELSE ((COALESCE(l.total_box, 0) * COALESCE(i.packet_size, 1)) + COALESCE(l.loose_packets, 0))
    END AS remaining_packets,

    -- Calculate remaining boxes (if no stock_left data, use original total_boxes)
    CASE
        WHEN l.name IS NULL THEN COALESCE(i.total_boxes_in, 0)
        ELSE FLOOR(
            ((COALESCE(l.total_box, 0) * COALESCE(i.packet_size, 1)) + COALESCE(l.loose_packets, 0))::numeric
            / COALESCE(l.packet, i.packet_size, 1)
        )
    END AS remaining_boxes,

    -- Calculate remaining loose packets (if no stock_left data, assume 0 loose)
    CASE
        WHEN l.name IS NULL THEN 0
        ELSE (
            ((COALESCE(l.total_box, 0) * COALESCE(i.packet_size, 1)) + COALESCE(l.loose_packets, 0)) -
            (FLOOR(
                ((COALESCE(l.total_box, 0) * COALESCE(i.packet_size, 1)) + COALESCE(l.loose_packets, 0))::numeric
                / COALESCE(l.packet, i.packet_size, 1)
            ) * COALESCE(l.packet, i.packet_size, 1))
        )
    END AS remaining_loose_packets,

    -- Calculate remaining percentage (if no stock_left data, assume 100%)
    CASE
        WHEN (COALESCE(i.total_boxes_in, 0) * COALESCE(i.packet_size, 0)) = 0 THEN 0
        WHEN l.name IS NULL THEN 100.00
        ELSE ROUND(
            (((COALESCE(l.total_box, 0) * COALESCE(i.packet_size, 1)) + COALESCE(l.loose_packets, 0))::numeric * 100) /
            (COALESCE(i.total_boxes_in, 0) * COALESCE(i.packet_size, 0))::numeric,
            2
        )
    END AS remaining_percentage
FROM stock_summary i
FULL OUTER JOIN latest_stock_left l ON i.name = l.name  -- Join on name
FULL OUTER JOIN current_materials m ON COALESCE(i.name, l.name) = m.name  -- Join on name
WHERE COALESCE(m.category, l.category, i.category) IS DISTINCT FROM 'Discontinue'  -- hide discontinued items
ORDER BY remaining_percentage ASC;";

$stmt = $conn->prepare($query);
$stmt->execute([
    ':start_in' => $startDate,
    ':end_in'   => $endDate,
    ':end_left' => $endDate,
    ':end_mat'  => $endDate,
]);
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Return JSON response
echo json_encode($data);
?>