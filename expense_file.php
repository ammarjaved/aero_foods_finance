<?php
/*
 * expense_file.php
 *
 * Actions:
 *   POST action=upload         — parse & save rows to tbl_expense_file
 *   GET  from_date, to_date    — fetch rows with optional date filter
 *   POST action=update_company — update company/vendor/expense_type + save to daily_expenditure
 *   POST action=delete_rows    — delete rows by ids array
 *   POST action=bulk_update    — update company/vendor/expense_type for multiple rows at once
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// ─── DB connection ─────────────────────────────────────────────────────────
$host     = "192.168.1.34";
$port     = "5432";
$dbname   = "aero_foods_finance";
$username = "postgres";
$password = "Admin123";

try {
    $conn = new PDO(
        "pgsql:host=$host;port=$port;dbname=$dbname",
        $username,
        $password
    );
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB connection failed: ' . $e->getMessage()]);
    exit;
}

// Ensure vendor and expense_type_name columns exist
try {
    $conn->exec("ALTER TABLE tbl_expense_file ADD COLUMN IF NOT EXISTS vendor VARCHAR(100)");
    $conn->exec("ALTER TABLE tbl_expense_file ADD COLUMN IF NOT EXISTS expense_type_name VARCHAR(50) DEFAULT 'Others'");
} catch (PDOException $e) {
    // Ignore if unsupported or already exists
}

// ─── Company → database mapping ────────────────────────────────────────────
function getCompanyDb(string $company): string {
    $map = [
        'aero_foods_finance'       => 'aero_foods_finance',
        'amazon_cafe_finance'      => 'amazon_cafe_finance',
        'amazon_cafe_finance_lyp'  => 'amazon_cafe_finance_lyp',
        'abe_yus_finance'          => 'abe_yus_finance',
        'ojim_finance'             => 'ojim_finance',
        'sds_hq'                   => 'aero_foods_finance',
    ];
    return $map[$company] ?? 'aero_foods_finance';
}

function getCompanyLabel(string $company): string {
    $map = [
        'aero_foods_finance'       => 'Mixue',
        'amazon_cafe_finance'      => 'Amazon',
        'amazon_cafe_finance_lyp'  => 'Amazon LYP',
        'abe_yus_finance'          => 'Abe Yus',
        'ojim_finance'             => 'Ojim',
        'sds_hq'                   => 'SDS HQ',
    ];
    return $map[$company] ?? $company;
}

// ─── Route by method ───────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if (($_GET['action'] ?? '') === 'files') {
        handleFileList($conn);
    } else {
        handleFetch($conn);
    }
} elseif ($method === 'POST') {
    $body   = file_get_contents('php://input');
    $data   = json_decode($body, true);
    $action = $data['action'] ?? '';

    if ($action === 'upload') {
        handleUpload($conn, $data);
    } elseif ($action === 'update_company') {
        handleUpdateCompany($conn, $data);
    } elseif ($action === 'delete_rows') {
        handleDeleteRows($conn, $data);
    } elseif ($action === 'bulk_update') {
        handleBulkUpdate($conn, $data);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Unknown action']);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

// ─── HANDLER: file list ────────────────────────────────────────────────────
function handleFileList(PDO $conn): void {
    $stmt = $conn->query(
        "SELECT file_name, COUNT(*) AS row_count
         FROM tbl_expense_file
         GROUP BY file_name
         ORDER BY MAX(id) DESC"
    );
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['status' => 'success', 'files' => $files]);
}

// ─── HANDLER: fetch rows ───────────────────────────────────────────────────
function handleFetch(PDO $conn): void {
    $from     = $_GET['from_date']  ?? null;
    $to       = $_GET['to_date']    ?? null;
    $fileName = $_GET['file_name']  ?? null;

    $sql    = "SELECT * FROM tbl_expense_file WHERE 1=1";
    $params = [];

    if ($from) {
        $sql      .= " AND transaction_date >= :from_date";
        $params[':from_date'] = $from;
    }
    if ($to) {
        $sql      .= " AND transaction_date <= :to_date";
        $params[':to_date'] = $to;
    }
    if ($fileName) {
        $sql      .= " AND file_name = :file_name";
        $params[':file_name'] = $fileName;
    }

    $sql .= " ORDER BY transaction_date DESC, id DESC";

    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['status' => 'success', 'data' => $rows]);
}

// ─── HANDLER: upload rows ──────────────────────────────────────────────────
function handleUpload(PDO $conn, array $data): void {
    $rows     = $data['rows']      ?? [];
    $fileName = $data['file_name'] ?? 'unknown';

    if (empty($rows)) {
        echo json_encode(['status' => 'error', 'message' => 'No rows provided']);
        return;
    }

    $sql = "INSERT INTO tbl_expense_file
                (transaction_date, description, debit, credit, balance, file_name)
            VALUES
                (:transaction_date, :description, :debit, :credit, :balance, :file_name)";
    $stmt    = $conn->prepare($sql);
    $saved   = 0;
    $skipped = 0;

    $conn->beginTransaction();
    try {
        foreach ($rows as $row) {
            $txDate = $row['transaction_date'] ?? null;
            if (empty($txDate)) {
                $skipped++;
                continue;
            }
            $stmt->execute([
                ':transaction_date' => $txDate,
                ':description'      => $row['description'] ?? '',
                ':debit'            => $row['debit']  !== '' && $row['debit']  !== null ? $row['debit']  : null,
                ':credit'           => $row['credit'] !== '' && $row['credit'] !== null ? $row['credit'] : null,
                ':balance'          => $row['balance'] !== '' && $row['balance'] !== null ? $row['balance'] : null,
                ':file_name'        => $fileName,
            ]);
            $saved++;
        }
        $conn->commit();
        echo json_encode([
            'status'  => 'success',
            'message' => "$saved rows saved, $skipped skipped",
            'saved'   => $saved,
            'skipped' => $skipped,
        ]);
    } catch (PDOException $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

// ─── HANDLER: delete rows ──────────────────────────────────────────────────
function handleDeleteRows(PDO $conn, array $data): void {
    $ids = array_map('intval', $data['ids'] ?? []);
    if (empty($ids)) {
        echo json_encode(['status' => 'error', 'message' => 'No ids provided']);
        return;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $conn->prepare("DELETE FROM tbl_expense_file WHERE id IN ($placeholders)");
    $stmt->execute($ids);
    $deleted = $stmt->rowCount();

    echo json_encode(['status' => 'success', 'message' => "$deleted rows deleted"]);
}

// ─── CORE: update a single expense row ────────────────────────────────────
function doUpdateRow(PDO $conn, int $id, string $company, string $vendor, string $expType, string $username): array {
    // Fetch the row
    $fetchStmt = $conn->prepare("SELECT * FROM tbl_expense_file WHERE id = :id");
    $fetchStmt->execute([':id' => $id]);
    $row = $fetchStmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        return ['ok' => false, 'msg' => "Row $id not found"];
    }

    // Update tbl_expense_file
    $conn->prepare(
        "UPDATE tbl_expense_file SET company = :company, vendor = :vendor, expense_type_name = :etype WHERE id = :id"
    )->execute([':company' => $company, ':vendor' => $vendor, ':etype' => $expType, ':id' => $id]);

    $debit = $row['debit'];
    if ($debit === null || $debit == 0) {
        return ['ok' => true, 'msg' => 'Updated (no debit to record)'];
    }

    $targetDb     = getCompanyDb($company);
    $companyLabel = getCompanyLabel($company);
    $txDate       = $row['transaction_date'];
    $desc         = $row['description'];
    $dayOfWeek    = date('w', strtotime($txDate));
    $tag          = '[ef:' . $id . ']';

    $isSdsHq = ($expType === 'SDS HQ');

    try {
        // Clean up old records from all company DBs (daily_expenditure)
        $allDbs = ['aero_foods_finance','amazon_cafe_finance','amazon_cafe_finance_lyp','abe_yus_finance','ojim_finance'];
        foreach ($allDbs as $db) {
            try {
                $chkConn = new PDO("pgsql:host=192.168.1.34;port=5432;dbname=$db", "postgres", "Admin123");
                $chkConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $chkConn->prepare("DELETE FROM daily_expenditure WHERE remarks LIKE :tag")
                        ->execute([':tag' => '%' . $tag . '%']);
            } catch (PDOException $e) {
                // DB may not exist — skip
            }
        }

        // Also clean up sds_expenditure in aero_foods_finance
        try {
            $aeroConn = new PDO("pgsql:host=192.168.1.34;port=5432;dbname=aero_foods_finance", "postgres", "Admin123");
            $aeroConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $aeroConn->prepare("DELETE FROM sds_expenditure WHERE remarks LIKE :tag")
                     ->execute([':tag' => '%' . $tag . '%']);
        } catch (PDOException $e) {
            // skip
        }

        if ($isSdsHq) {
            // SDS HQ always saves to sds_expenditure in aero_foods_finance, not company-specific
            $insertConn = new PDO("pgsql:host=192.168.1.34;port=5432;dbname=aero_foods_finance", "postgres", "Admin123");
            $insertConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $insertConn->prepare(
                "INSERT INTO sds_expenditure
                     (month_date, day, expense_type_name, vendor, amount, remarks, company, created_by, updated_by)
                 VALUES
                     (:month_date, :day, :expense_type_name, :vendor, :amount, :remarks, :company, :created_by, :updated_by)"
            )->execute([
                ':month_date'        => $txDate,
                ':day'               => (int)$dayOfWeek,
                ':expense_type_name' => $expType,
                ':vendor'            => $vendor !== '' ? mb_substr($vendor, 0, 100) : mb_substr($desc, 0, 100),
                ':amount'            => $debit,
                ':remarks'           => $tag . ' Bank import: ' . mb_substr($desc, 0, 180),
                ':company'           => $companyLabel,
                ':created_by'        => $username,
                ':updated_by'        => $username,
            ]);
            return ['ok' => true, 'msg' => 'Saved to aero_foods_finance.sds_expenditure'];
        } else {
            $targetConn = new PDO(
                "pgsql:host=192.168.1.34;port=5432;dbname=$targetDb",
                "postgres",
                "Admin123"
            );
            $targetConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $targetConn->prepare(
                "INSERT INTO daily_expenditure
                     (month_date, day, expense_type_name, vendor, amount, remarks, company, created_by, updated_by)
                 VALUES
                     (:month_date, :day, :expense_type_name, :vendor, :amount, :remarks, :company, :created_by, :updated_by)"
            )->execute([
                ':month_date'        => $txDate,
                ':day'               => (int)$dayOfWeek,
                ':expense_type_name' => $expType,
                ':vendor'            => $vendor !== '' ? mb_substr($vendor, 0, 100) : mb_substr($desc, 0, 100),
                ':amount'            => $debit,
                ':remarks'           => $tag . ' Bank import: ' . mb_substr($desc, 0, 180),
                ':company'           => $companyLabel,
                ':created_by'        => $username,
                ':updated_by'        => $username,
            ]);
            return ['ok' => true, 'msg' => "Saved to $targetDb"];
        }
    } catch (PDOException $e) {
        return ['ok' => false, 'msg' => "id $id expense insert failed: " . $e->getMessage()];
    }
}

// ─── HANDLER: update company (single row) ─────────────────────────────────
function handleUpdateCompany(PDO $conn, array $data): void {
    $id      = (int)($data['id']              ?? 0);
    $company = $data['company']               ?? '';
    $vendor  = $data['vendor']                ?? '';
    $expType = $data['expense_type_name']     ?? 'Others';
    $username = $data['username']             ?? 'system';

    if (!$id || (!$company && $expType !== 'SDS HQ')) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'id and company are required']);
        return;
    }

    $result = doUpdateRow($conn, $id, $company, $vendor, $expType, $username);

    if ($result['ok']) {
        echo json_encode(['status' => 'success', 'message' => $result['msg']]);
    } else {
        echo json_encode(['status' => 'partial', 'message' => $result['msg']]);
    }
}

// ─── HANDLER: bulk update (multiple rows) ─────────────────────────────────
function handleBulkUpdate(PDO $conn, array $data): void {
    $ids      = array_map('intval', $data['ids']             ?? []);
    $company  = $data['company']                             ?? '';
    $vendor   = $data['vendor']                              ?? '';
    $expType  = $data['expense_type_name']                   ?? 'Others';
    $username = $data['username']                            ?? 'system';

    if (empty($ids) || (!$company && $expType !== 'SDS HQ')) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'ids and company are required']);
        return;
    }

    $ok = 0; $fail = 0; $errMsgs = [];

    foreach ($ids as $id) {
        $result = doUpdateRow($conn, $id, $company, $vendor, $expType, $username);
        if ($result['ok']) {
            $ok++;
        } else {
            $fail++;
            $errMsgs[] = $result['msg'];
        }
    }

    $status = ($fail === 0) ? 'success' : ($ok > 0 ? 'partial' : 'error');
    $msg = "$ok updated" . ($fail > 0 ? ", $fail failed" : "");
    if (!empty($errMsgs)) $msg .= ': ' . implode('; ', $errMsgs);

    echo json_encode(['status' => $status, 'message' => $msg]);
}
