<?php
// Upsert a single item's minimum stock level. Input is in PACKETS; box value is
// derived as packets / packets-per-box. Also syncs packet to the material table.
// POST JSON: { code, name?, min_stock_packets }

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = "192.168.1.34";
$db = "aero_foods_finance";
$user = "postgres";
$pass = "Admin123";

try {
    $pdo = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $data = json_decode(file_get_contents('php://input'), true);
    $code = trim($data['code'] ?? '');
    if ($code === '' || !isset($data['min_stock_packets'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'code and min_stock_packets are required']);
        exit;
    }
    $minPackets = (float)$data['min_stock_packets'];

    // Resolve packets-per-box: prefer the latest material row, else the existing min_stock row.
    $pkStmt = $pdo->prepare(
        "SELECT packet FROM material WHERE code = :c ORDER BY month_date DESC, id DESC LIMIT 1"
    );
    $pkStmt->execute([':c' => $code]);
    $packet = $pkStmt->fetchColumn();
    if ($packet === false || (float)$packet == 0) {
        $exStmt = $pdo->prepare("SELECT packet FROM min_stock WHERE code = :c");
        $exStmt->execute([':c' => $code]);
        $packet = $exStmt->fetchColumn();
    }
    $packet = (float)$packet;

    $name = trim($data['name'] ?? '');
    if ($name === '') {
        $nmStmt = $pdo->prepare(
            "SELECT name FROM material WHERE code = :c ORDER BY month_date DESC, id DESC LIMIT 1"
        );
        $nmStmt->execute([':c' => $code]);
        $name = (string)($nmStmt->fetchColumn() ?: '');
    }

    // Resolve unit from the latest material row (the min_stock CSV has no unit).
    $unStmt = $pdo->prepare(
        "SELECT unit FROM material WHERE code = :c AND unit <> '' ORDER BY month_date DESC, id DESC LIMIT 1"
    );
    $unStmt->execute([':c' => $code]);
    $unit = (string)($unStmt->fetchColumn() ?: '');

    $minBox = $packet > 0 ? $minPackets / $packet : 0;

    // Upsert min_stock.
    $up = $pdo->prepare("
        INSERT INTO min_stock (code, name, packet, min_stock_box, min_stock_packets, unit)
        VALUES (:code, :name, :packet, :min_box, :min_pkt, :unit)
        ON CONFLICT (code) DO UPDATE SET
            name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE min_stock.name END,
            packet = EXCLUDED.packet,
            min_stock_box = EXCLUDED.min_stock_box,
            min_stock_packets = EXCLUDED.min_stock_packets,
            unit = CASE WHEN EXCLUDED.unit <> '' THEN EXCLUDED.unit ELSE min_stock.unit END,
            updated_at = now()
    ");
    $up->execute([
        ':code' => $code,
        ':name' => $name,
        ':packet' => $packet,
        ':min_box' => $minBox,
        ':min_pkt' => $minPackets,
        ':unit' => $unit,
    ]);

    // Also sync packet value to the latest material row(s) for this code.
    $matStmt = $pdo->prepare("
        UPDATE material SET packet = :packet, updated_at = now()
        WHERE code = :code AND packet <> :packet2
    ");
    $matStmt->execute([
        ':packet' => $packet,
        ':code' => $code,
        ':packet2' => $packet,
    ]);
    $materialsSynced = $matStmt->rowCount();

    echo json_encode([
        'status' => 'success',
        'message' => 'Minimum stock updated',
        'code' => $code,
        'packet' => $packet,
        'min_stock_box' => $minBox,
        'min_stock_packets' => $minPackets,
        'materials_synced' => $materialsSynced,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
