<?php
// VG item master CRUD (Abe Yus cafe).
//
//   GET                             -> all items, by code
//   POST   (JSON, operation=insert) -> create
//   POST   (JSON, operation=update) -> update by id
//   PUT    (JSON)                   -> update by id
//   DELETE ?id=N                    -> delete
//
// item_code / item_name / unit_price / pcs / supply live here rather than on
// every sales line; vg_sales.php joins to this table for pcs and supply and
// derives pcs_sold = qty_sold * pcs.
//
// Table: see sql/vg_item_abe_yus.sql.

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, PUT, GET, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = "192.168.1.34";
$port = "5432";
$dbname = "abe_yus_finance";
$username = "postgres";
$password = "Admin123";

try {
    $conn = new PDO("pgsql:host=$host;port=$port;dbname=$dbname;user=$username;password=$password");
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

/** Body may arrive as JSON or as a form post; accept either. */
function requestBody() {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    if (is_array($json)) { return $json; }
    return $_POST;
}

function textOrNull($v) {
    if ($v === null) { return null; }
    $v = trim((string)$v);
    return $v === '' ? null : $v;
}

function numOrNull($v) {
    if ($v === null || $v === '') { return null; }
    if (is_numeric($v)) { return (float)$v; }
    $clean = str_replace([',', ' ', 'RM'], '', (string)$v);
    return is_numeric($clean) ? (float)$clean : null;
}

$method = $_SERVER['REQUEST_METHOD'];
$body = requestBody();

switch ($method) {
    case 'GET':
        handleList($conn);
        break;
    case 'POST':
        (($body['operation'] ?? 'insert') === 'update')
            ? handleUpdate($conn, $body)
            : handleInsert($conn, $body);
        break;
    case 'PUT':
        handleUpdate($conn, $body);
        break;
    case 'DELETE':
        handleDelete($conn, $_GET['id'] ?? null);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}

function handleList($conn) {
    try {
        $stmt = $conn->query("SELECT id, item_code, item_name, unit_price, pcs, supply,
                                     created_at, updated_at, created_by, updated_by
                              FROM vg_item
                              ORDER BY item_code");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function handleInsert($conn, $data) {
    $itemCode = textOrNull($data['item_code'] ?? '');
    if ($itemCode === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Item Code is required']);
        return;
    }

    try {
        $stmt = $conn->prepare(
            "INSERT INTO vg_item (item_code, item_name, unit_price, pcs, supply,
                                  created_at, updated_at, created_by, updated_by)
             VALUES (:item_code, :item_name, :unit_price, :pcs, :supply,
                     NOW(), NOW(), :created_by, :updated_by)
             RETURNING id"
        );
        $stmt->execute([
            ':item_code'  => $itemCode,
            ':item_name'  => textOrNull($data['item_name'] ?? null),
            ':unit_price' => numOrNull($data['unit_price'] ?? null),
            ':pcs'        => numOrNull($data['pcs'] ?? null),
            ':supply'     => textOrNull($data['supply'] ?? null),
            ':created_by' => textOrNull($data['user'] ?? null),
            ':updated_by' => textOrNull($data['user'] ?? null),
        ]);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Item created',
            'id' => $stmt->fetch(PDO::FETCH_ASSOC)['id'],
        ]);
    } catch (PDOException $e) {
        // 23505 = unique_violation on item_code — a far more useful message
        // than the raw constraint text.
        if ($e->getCode() === '23505') {
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => "Item code $itemCode already exists"]);
            return;
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function handleUpdate($conn, $data) {
    $id = $data['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'id is required for update']);
        return;
    }
    $itemCode = textOrNull($data['item_code'] ?? '');
    if ($itemCode === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Item Code is required']);
        return;
    }

    try {
        $stmt = $conn->prepare(
            "UPDATE vg_item SET
                item_code  = :item_code,
                item_name  = :item_name,
                unit_price = :unit_price,
                pcs        = :pcs,
                supply     = :supply,
                updated_at = NOW(),
                updated_by = :updated_by
             WHERE id = :id"
        );
        $stmt->execute([
            ':item_code'  => $itemCode,
            ':item_name'  => textOrNull($data['item_name'] ?? null),
            ':unit_price' => numOrNull($data['unit_price'] ?? null),
            ':pcs'        => numOrNull($data['pcs'] ?? null),
            ':supply'     => textOrNull($data['supply'] ?? null),
            ':updated_by' => textOrNull($data['user'] ?? null),
            ':id'         => (int)$id,
        ]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Item not found']);
            return;
        }
        echo json_encode(['success' => true, 'message' => 'Item updated']);
    } catch (PDOException $e) {
        if ($e->getCode() === '23505') {
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => "Item code $itemCode already exists"]);
            return;
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function handleDelete($conn, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'id is required']);
        return;
    }
    try {
        // Sales lines reference items by code, not by FK, so deleting an item
        // never removes sales history — those rows simply show blank pcs /
        // supply until the code exists again.
        $stmt = $conn->prepare("DELETE FROM vg_item WHERE id = :id");
        $stmt->execute([':id' => (int)$id]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Item not found']);
            return;
        }
        echo json_encode(['success' => true, 'message' => 'Item deleted']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

$conn = null;
?>
