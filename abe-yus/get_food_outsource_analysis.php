<?php
// Enable CORS for React Native
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
$host = "192.168.1.34";
$port = "5432";
$dbname = "abe_yus_finance";
$user = "postgres";
$password = "Admin123";

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Build base query - aggregate wastage and sale quantities per material
    $sql = "SELECT
                d.material_id,
                d.material_name,
                m.price,
                m.tax,
                m.selling_price,
                m.vendor_name,
                m.unit,
                (m.price + (m.tax / 100)) AS price_with_tax,
                COALESCE(SUM(CASE WHEN LOWER(d.outsource_type) = 'wastage' THEN d.quantity ELSE 0 END), 0) AS wastage_quantity,
                COALESCE(SUM(CASE WHEN LOWER(d.outsource_type) = 'sale' THEN d.quantity ELSE 0 END), 0) AS sale_quantity
            FROM public.daily_food_outsource d
            LEFT JOIN public.food_outsource_materials m ON d.material_id = m.id
            WHERE 1=1";
    $params = [];

    // Filter by material_id
    if (isset($_GET['material_id']) && $_GET['material_id'] !== '') {
        $sql .= " AND d.material_id = :material_id";
        $params[':material_id'] = (int)$_GET['material_id'];
    }

    // Filter by material_name
    if (isset($_GET['material_name']) && $_GET['material_name'] !== '') {
        $sql .= " AND LOWER(d.material_name) LIKE LOWER(:material_name)";
        $params[':material_name'] = '%' . trim($_GET['material_name']) . '%';
    }

    // Filter by exact date
    if (isset($_GET['month_date']) && $_GET['month_date'] !== '') {
        $sql .= " AND d.month_date = :month_date";
        $params[':month_date'] = $_GET['month_date'];
    }

    // Filter by date range
    if (isset($_GET['date_from']) && $_GET['date_from'] !== '') {
        $sql .= " AND d.month_date >= :date_from";
        $params[':date_from'] = $_GET['date_from'];
    }
    if (isset($_GET['date_to']) && $_GET['date_to'] !== '') {
        $sql .= " AND d.month_date <= :date_to";
        $params[':date_to'] = $_GET['date_to'];
    }

    // Filter by vendor_name
    if (isset($_GET['vendor_name']) && $_GET['vendor_name'] !== '') {
        $sql .= " AND LOWER(m.vendor_name) LIKE LOWER(:vendor_name)";
        $params[':vendor_name'] = '%' . trim($_GET['vendor_name']) . '%';
    }

    $sql .= " GROUP BY d.material_id, d.material_name, m.price, m.tax, m.selling_price, m.vendor_name, m.unit
              ORDER BY d.material_name ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $analysis = [];
    $grand_total_wastage = 0;
    $grand_total_sales = 0;
    $grand_net = 0;

    foreach ($rows as $row) {
        $price_with_tax = (float)$row['price_with_tax'];
        $selling_price = (float)$row['selling_price'];
        $wastage_qty = (float)$row['wastage_quantity'];
        $sale_qty = (float)$row['sale_quantity'];

        // total wastage = price_with_tax * wastage quantity (this is a loss)
        $total_wastage = $price_with_tax * $wastage_qty;

        // total sales = selling_price * sale quantity (this is revenue)
        $total_sales_revenue = $selling_price * $sale_qty;

        // cost of sold items = price_with_tax * sale quantity
        $cost_of_sales = $price_with_tax * $sale_qty;

        // profit from sales = total_sales_revenue - cost_of_sales
        $profit_from_sales = $total_sales_revenue - $cost_of_sales;

        // net profit/loss = profit from sales - total wastage cost
        $net_profit_loss = $profit_from_sales - $total_wastage;

        $grand_total_wastage += $total_wastage;
        $grand_total_sales += $total_sales_revenue;
        $grand_net += $net_profit_loss;

        $analysis[] = [
            'material_id' => (int)$row['material_id'],
            'material_name' => $row['material_name'],
            'vendor_name' => $row['vendor_name'],
            'unit' => $row['unit'],
            'price' => (float)$row['price'],
            'tax' => (float)$row['tax'],
            'price_with_tax' => round($price_with_tax, 2),
            'selling_price' => $selling_price,
            'wastage_quantity' => $wastage_qty,
            'sale_quantity' => $sale_qty,
            'total_wastage_cost' => round($total_wastage, 2),
            'total_sales_revenue' => round($total_sales_revenue, 2),
            'cost_of_sales' => round($cost_of_sales, 2),
            'profit_from_sales' => round($profit_from_sales, 2),
            'net_profit_loss' => round($net_profit_loss, 2),
            'status' => $net_profit_loss >= 0 ? 'profit' : 'loss'
        ];
    }

    echo json_encode([
        'status' => 'success',
        'message' => count($analysis) . ' materials analyzed',
        'summary' => [
            'grand_total_wastage_cost' => round($grand_total_wastage, 2),
            'grand_total_sales_revenue' => round($grand_total_sales, 2),
            'grand_net_profit_loss' => round($grand_net, 2),
            'overall_status' => $grand_net >= 0 ? 'profit' : 'loss'
        ],
        'results' => $analysis
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage(),
        'error_code' => $e->getCode()
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>