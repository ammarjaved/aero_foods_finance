<?php
// VG Melawati sales-order upload endpoint (Abe Yus cafe).
//
//   GET                      -> list uploaded files (newest first)
//   GET  ?file_id=N          -> all rows of one uploaded file
//   POST (JSON body)         -> store a parsed "Master VG" sheet
//   DELETE ?file_id=N        -> drop an upload and its rows
//
// The workbook is parsed in the browser (src/com_abe/vg-sales/VgSalesComponent.js
// via the xlsx package) and posted here as JSON, so no file ever lands on disk.
// Re-uploading the same file name REPLACES that file's rows rather than
// doubling them — same re-run-safe rule as the invoice import.
//
// pcs and supply are NOT stored per sales line: they belong to the item, so
// they are read from vg_item (maintained on the VG Items screen) and pcs_sold
// is derived as qty_sold * vg_item.pcs when rows are fetched. An upload seeds
// vg_item for any code it has never seen, using the sheet's own values.
//
// Tables: see sql/vg_sales_abe_yus.sql and sql/vg_item_abe_yus.sql.

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS");
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

/** Empty string / null -> SQL NULL, otherwise the trimmed text. */
function textOrNull($v) {
    if ($v === null) { return null; }
    $v = trim((string)$v);
    return $v === '' ? null : $v;
}

/** Blank cells become NULL so they don't sum as zero-priced rows. */
function numOrNull($v) {
    if ($v === null || $v === '') { return null; }
    if (is_numeric($v)) { return (float)$v; }
    $clean = str_replace([',', ' ', 'RM'], '', (string)$v);
    return is_numeric($clean) ? (float)$clean : null;
}

/** Accepts YYYY-MM-DD (what the browser sends); anything unparseable -> NULL. */
function dateOrNull($v) {
    $v = textOrNull($v);
    if ($v === null) { return null; }
    $ts = strtotime($v);
    return $ts === false ? null : date('Y-m-d', $ts);
}

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        isset($_GET['file_id']) ? handleRows($conn, $_GET['file_id']) : handleFileList($conn);
        break;
    case 'POST':
        handleUpload($conn);
        break;
    case 'DELETE':
        handleDelete($conn, $_GET['file_id'] ?? null);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}

// Dropdown source: every upload, newest first.
function handleFileList($conn) {
    try {
        $stmt = $conn->query("SELECT id, file_name, sheet_name, row_count,
                                     period_start, period_end, uploaded_at, uploaded_by
                              FROM vg_sales_file
                              ORDER BY uploaded_at DESC, id DESC");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

// Table source: one file's rows, in sheet order.
function handleRows($conn, $fileId) {
    try {
        $fileStmt = $conn->prepare("SELECT id, file_name, sheet_name, row_count,
                                           period_start, period_end, uploaded_at, uploaded_by
                                    FROM vg_sales_file WHERE id = :id");
        $fileStmt->execute([':id' => (int)$fileId]);
        $file = $fileStmt->fetch(PDO::FETCH_ASSOC);
        if (!$file) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Upload not found']);
            return;
        }

        // pcs / supply come from the item master, and pcs_sold is derived from
        // them. LEFT JOIN so a line whose code is not in vg_item still shows —
        // it just has blank pcs / supply / pcs_sold rather than disappearing.
        $stmt = $conn->prepare("SELECT o.id, o.row_no, o.sales_date, o.store_code, o.store_name,
                                       o.partner_code, o.partner_name, o.item_family_code,
                                       o.division_code, o.item_code, o.item_name, o.unit_price,
                                       o.qty_sold, o.gross_value, o.disc_value, o.net_value,
                                       i.pcs                    AS pcs,
                                       i.supply                 AS supply,
                                       (o.qty_sold * i.pcs)     AS pcs_sold
                                FROM vg_sales_order o
                                LEFT JOIN vg_item i ON i.item_code = o.item_code
                                WHERE o.file_id = :id
                                ORDER BY o.row_no, o.id");
        $stmt->execute([':id' => (int)$fileId]);

        echo json_encode([
            'success' => true,
            'file' => $file,
            'data' => $stmt->fetchAll(PDO::FETCH_ASSOC),
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function handleUpload($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    $fileName = textOrNull($data['fileName'] ?? '');
    $rows     = $data['rows'] ?? null;

    if ($fileName === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'fileName is required']);
        return;
    }
    if (!is_array($rows) || count($rows) === 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No rows found in the sheet']);
        return;
    }

    $sheetName  = textOrNull($data['sheetName'] ?? '') ?? 'Master VG';
    $uploadedBy = textOrNull($data['user'] ?? '');

    try {
        $conn->beginTransaction();

        // Same file name uploaded again -> reuse the row and wipe its children,
        // so the sheet is replaced rather than appended to.
        $fileStmt = $conn->prepare(
            "INSERT INTO vg_sales_file (file_name, sheet_name, uploaded_at, uploaded_by)
             VALUES (:file_name, :sheet_name, NOW(), :uploaded_by)
             ON CONFLICT (file_name) DO UPDATE SET
                 sheet_name  = EXCLUDED.sheet_name,
                 uploaded_at = NOW(),
                 uploaded_by = EXCLUDED.uploaded_by
             RETURNING id"
        );
        $fileStmt->execute([
            ':file_name'   => $fileName,
            ':sheet_name'  => $sheetName,
            ':uploaded_by' => $uploadedBy,
        ]);
        $fileId = (int)$fileStmt->fetch(PDO::FETCH_ASSOC)['id'];

        $delStmt = $conn->prepare("DELETE FROM vg_sales_order WHERE file_id = :file_id");
        $delStmt->execute([':file_id' => $fileId]);
        $replaced = $delStmt->rowCount();

        $insStmt = $conn->prepare(
            "INSERT INTO vg_sales_order (
                file_id, row_no, sales_date, store_code, store_name,
                partner_code, partner_name, item_family_code, division_code,
                item_code, item_name, unit_price, qty_sold, gross_value,
                disc_value, net_value
             ) VALUES (
                :file_id, :row_no, :sales_date, :store_code, :store_name,
                :partner_code, :partner_name, :item_family_code, :division_code,
                :item_code, :item_name, :unit_price, :qty_sold, :gross_value,
                :disc_value, :net_value
             )"
        );

        // Codes the master has never seen are seeded from the sheet's own
        // pcs / supply so an upload is never blocked by a missing item. Codes
        // that already exist are left exactly as they are — the VG Items
        // screen stays the source of truth once a row is there.
        $itemStmt = $conn->prepare(
            "INSERT INTO vg_item (item_code, item_name, unit_price, pcs, supply,
                                  created_at, updated_at, created_by, updated_by)
             VALUES (:item_code, :item_name, :unit_price, :pcs, :supply,
                     NOW(), NOW(), :created_by, :updated_by)
             ON CONFLICT (item_code) DO NOTHING"
        );
        $itemsAdded = 0;
        $seenCodes = [];

        $inserted = 0;
        $rowNo = 0;
        foreach ($rows as $r) {
            $rowNo++;

            $itemCode = textOrNull($r['itemCode'] ?? null);
            if ($itemCode !== null && !isset($seenCodes[$itemCode])) {
                $seenCodes[$itemCode] = true;
                $itemStmt->execute([
                    ':item_code'  => $itemCode,
                    ':item_name'  => textOrNull($r['itemName'] ?? null),
                    ':unit_price' => numOrNull($r['unitPrice'] ?? null),
                    ':pcs'        => numOrNull($r['pcs'] ?? null),
                    ':supply'     => textOrNull($r['supply'] ?? null),
                    ':created_by' => $uploadedBy,
                    ':updated_by' => $uploadedBy,
                ]);
                $itemsAdded += $itemStmt->rowCount();
            }

            $insStmt->execute([
                ':file_id'          => $fileId,
                ':row_no'           => (int)($r['rowNo'] ?? $rowNo),
                ':sales_date'       => dateOrNull($r['salesDate'] ?? null),
                ':store_code'       => textOrNull($r['storeCode'] ?? null),
                ':store_name'       => textOrNull($r['storeName'] ?? null),
                ':partner_code'     => textOrNull($r['partnerCode'] ?? null),
                ':partner_name'     => textOrNull($r['partnerName'] ?? null),
                ':item_family_code' => textOrNull($r['itemFamilyCode'] ?? null),
                ':division_code'    => textOrNull($r['divisionCode'] ?? null),
                ':item_code'        => $itemCode,
                ':item_name'        => textOrNull($r['itemName'] ?? null),
                ':unit_price'       => numOrNull($r['unitPrice'] ?? null),
                ':qty_sold'         => numOrNull($r['qtySold'] ?? null),
                ':gross_value'      => numOrNull($r['grossValue'] ?? null),
                ':disc_value'       => numOrNull($r['discValue'] ?? null),
                ':net_value'        => numOrNull($r['netValue'] ?? null),
            ]);
            $inserted++;
        }

        // Summary columns are derived from what actually landed, not from what
        // the browser claimed, so they stay true even if rows were skipped.
        $sumStmt = $conn->prepare(
            "UPDATE vg_sales_file SET
                row_count    = (SELECT COUNT(*)         FROM vg_sales_order WHERE file_id = :f1),
                period_start = (SELECT MIN(sales_date)  FROM vg_sales_order WHERE file_id = :f2),
                period_end   = (SELECT MAX(sales_date)  FROM vg_sales_order WHERE file_id = :f3)
             WHERE id = :f4"
        );
        $sumStmt->execute([':f1' => $fileId, ':f2' => $fileId, ':f3' => $fileId, ':f4' => $fileId]);

        $conn->commit();

        $message = $replaced > 0
            ? "Replaced $replaced existing row(s) with $inserted row(s) from $fileName."
            : "Uploaded $inserted row(s) from $fileName.";
        if ($itemsAdded > 0) {
            $message .= " Added $itemsAdded new item(s) to the item master.";
        }

        http_response_code(201);
        echo json_encode([
            'success'     => true,
            'message'     => $message,
            'file_id'     => $fileId,
            'inserted'    => $inserted,
            'replaced'    => $replaced,
            'items_added' => $itemsAdded,
        ]);
    } catch (PDOException $e) {
        if ($conn->inTransaction()) { $conn->rollBack(); }
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function handleDelete($conn, $fileId) {
    if (!$fileId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'file_id is required']);
        return;
    }
    try {
        // vg_sales_order rows go with it (ON DELETE CASCADE).
        $stmt = $conn->prepare("DELETE FROM vg_sales_file WHERE id = :id");
        $stmt->execute([':id' => (int)$fileId]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Upload not found']);
            return;
        }
        echo json_encode(['success' => true, 'message' => 'Upload deleted']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

$conn = null;
?>
