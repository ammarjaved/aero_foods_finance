<?php
header("Access-Control-Allow-Origin: *"); // Allow requests from any origin (for development)
header("Content-Type: application/json; charset=UTF-8");

// Database connection
$host = "192.168.1.34";
$db = "aero_foods_finance";
$user = "postgres";
$pass = "Admin123";

$conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Fetch data from permit_records table
$conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
// Fetch data from permit_records table
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
    GROUP BY name, code  -- Include both name and code in GROUP BY
),
latest_stock_left AS (
    SELECT DISTINCT ON(name) *  -- Use name instead of code
    FROM stock_left 
    ORDER BY name, month_date DESC
),
current_materials AS (
    SELECT DISTINCT ON(name)  -- Use name instead of code
        name,
        code, 
        category
    FROM material 
    WHERE EXTRACT(YEAR FROM month_date) = EXTRACT(YEAR FROM CURRENT_DATE) 
      AND EXTRACT(MONTH FROM month_date) = EXTRACT(MONTH FROM CURRENT_DATE)
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
ORDER BY remaining_percentage ASC;";

$stmt = $conn->prepare($query);
$stmt->execute();
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Return JSON response
echo json_encode($data);
?>