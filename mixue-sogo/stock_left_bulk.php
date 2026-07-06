<?php
// Enable CORS for React Native
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
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
$dbname = "mixue_sogo";
$user = "postgres";
$password = "Admin123";

try {
    // Connect to PostgreSQL
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    // Decode input JSON
    $json = file_get_contents('php://input');
    $input = json_decode($json, true);

    if (!isset($input['data'], $input['form'], $input['materials']) || !is_array($input['form'])) {
        throw new Exception("Invalid input: expecting { data, form, materials } structure.");
    }

    $data = $input['data'];
    $form = $input['form'];
    $materials = $input['materials'];

    $month_date = $data['month_date'];
    $month = (int)$data['month'];
    $year = (int)$data['year'];
    $day = (int)$data['day'];

    // SQL for UPSERT
    $sql = <<<SQL
INSERT INTO public.stock_left (
    month_date, month, year, day,
    code, name, description, category,
    unit_price, packet, unit,
    total_box, loose_packets, remaining,
    created_at, updated_at
)
VALUES (
    :month_date, :month, :year, :day,
    :code, :name, :description, :category,
    :unit_price, :packet, :unit,
    :total_box, :loose_packets, :remaining,
    NOW(), NOW()
)
ON CONFLICT (month_date, code) DO UPDATE SET
    loose_packets = EXCLUDED.loose_packets,
    total_box     = EXCLUDED.total_box,
    remaining     = EXCLUDED.remaining,
    name          = EXCLUDED.name,
    description   = EXCLUDED.description,
    category      = EXCLUDED.category,
    unit_price    = EXCLUDED.unit_price,
    packet        = EXCLUDED.packet,
    unit          = EXCLUDED.unit,
    updated_at    = NOW()
SQL;

    $stmt = $pdo->prepare($sql);
    $pdo->beginTransaction();

    $results = [];

    foreach ($form as $item) {
        $key = $item['key'];

        // Find matching material by name
        $material = array_filter($materials, fn($mat) => $mat['name'] === $key);
        $material = reset($material); // get first match or false

        if (!$material) {
            $results[] = ['code' => null, 'name' => $key, 'action' => 'skipped', 'reason' => 'material not found'];
            continue;
        }

        $remaining = number_format(
            (float)$item['value'] + ((float)$item['loose'] / (float)$material['packet']),
            2,
            '.',
            ''
        );

        // Populate fields from material
        $params = [
            ':month_date'    => $month_date,
            ':month'         => $month,
            ':year'          => $year,
            ':day'           => $day,
            ':code'          => $material['code'],
            ':name'          => $material['name'],
            ':description'   => $material['description'] ?? '',
            ':category'      => $material['category'] ?? '',
            ':unit_price'    => (float)($material['unit_price'] ?? 0),
            ':packet'        => (float)($material['packet'] ?? 0),
            ':unit'          => $material['unit'] ?? '',
            ':total_box'     => (float)$item['value'],
            ':loose_packets' => (float)$item['loose'],
            ':remaining'     => $remaining
        ];

        $stmt->execute($params);
        $results[] = [
            'code' => $material['code'],
            'name' => $material['name'],
            'action' => $stmt->rowCount() > 0 ? 'upserted' : 'no_change'
        ];
    }

    $pdo->commit();
    echo json_encode([
        'status'  => 'success',
        'message' => count($results) . ' records processed',
        'results' => $results
    ], JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Database error: ' . $e->getMessage(),
        'error_code' => $e->getCode()
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => $e->getMessage()
    ]);
}
?>