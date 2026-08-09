<?php
// Idempotent invoice-PDF stock-in import.
// Accepts parsed invoice lines + any brand-new materials, then:
//   1) inserts new materials into the current-month catalog snapshot,
//   2) appends invoice lines to stock_in_transaction (guarded on order_number+code),
//   3) upserts the per-day/per-code aggregate into stock_in.
// Safe to re-run: the same invoice (order_number) never duplicates ledger rows.
// If also_sogo is set, the same import is mirrored into mixue_sogo.

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = "192.168.1.34";
$port = "5432";
$user = "postgres";
$password = "Admin123";

/**
 * Propagate one material forward to every month from $fromMonthDate onward.
 *
 * `material` is a per-month catalog snapshot and fetch_materials.php reads one
 * month at a time, so a material is invisible in any month lacking a row for
 * it. Writing only the invoice month is what made imported materials (and
 * invoice price corrections) show up in that month alone.
 *
 * Forward only — earlier months keep the price they were costed at.
 *
 * Upper bound is the later of today's month and the newest month present in
 * `material`; nothing in this codebase rolls the catalog into a new month, so
 * without the CURRENT_DATE arm a mid-year invoice would never reach the sheet
 * the user is actually looking at.
 *
 * $material needs: code, name, description, category, unit_price, packet, unit.
 * Kept in sync with the identical helper in materials.php (this codebase
 * duplicates endpoints per brand rather than sharing includes).
 *
 * @return int month-rows written (updated + inserted)
 */
function propagateMaterialForward($pdo, array $material, $fromMonthDate, $importUser) {
    $code        = $material['code'];
    $name        = $material['name'] ?? '';
    $description = $material['description'] ?? '';
    $category    = $material['category'] ?? '';
    $unitPrice   = (float)($material['unit_price'] ?? 0);
    $packet      = (float)($material['packet'] ?? 0);
    $unit        = $material['unit'] ?? '';
    // `day` is not a calendar day — live values run 0..7 and are near-constant
    // within a month (it tags the batch a row was created in). Carry the
    // material's own value rather than inventing one; new invoice materials
    // fall back to 1, matching the existing import insert above.
    $day         = (int)($material['day'] ?? 1);

    // NOTE: every placeholder is used EXACTLY ONCE per statement, and each
    // execute() array matches its statement exactly. PDO_PGSQL rewrites named
    // parameters to positional ones and rejects a repeated name or a stray key
    // (the :price / :price2 pair below is the same workaround).

    $updateStmt = $pdo->prepare("UPDATE material SET
            name        = :name,
            description = :description,
            category    = :category,
            unit_price  = :unit_price,
            packet      = :packet,
            unit        = :unit,
            updated_at  = NOW(),
            updated_by  = :updated_by
        WHERE code = :code
          AND date_trunc('month', month_date) >= date_trunc('month', CAST(:from_month AS date))");
    $updateStmt->execute([
        ':name'        => $name,
        ':description' => $description,
        ':category'    => $category,
        ':unit_price'  => $unitPrice,
        ':packet'      => $packet,
        ':unit'        => $unit,
        ':updated_by'  => $importUser,
        ':code'        => $code,
        ':from_month'  => $fromMonthDate,
    ]);
    $written = $updateStmt->rowCount();

    $insertStmt = $pdo->prepare("INSERT INTO material (
            month_date, day, month, year,
            code, name, description, category,
            unit_price, packet, unit, sort_key,
            created_at, updated_at, created_by, updated_by
        )
        SELECT
            m.month_date, :day,
            EXTRACT(MONTH FROM m.month_date),
            EXTRACT(YEAR  FROM m.month_date),
            :code_ins, :name, :description, :category,
            :unit_price, :packet, :unit,
            (SELECT s.sort_key FROM material s
              WHERE s.code = :code_sk ORDER BY s.month_date DESC LIMIT 1),
            NOW(), NOW(), :created_by, :updated_by
        FROM (
            SELECT generate_series(
                date_trunc('month', CAST(:from_month_a AS date)),
                GREATEST(
                    date_trunc('month', CURRENT_DATE),
                    COALESCE(
                        (SELECT date_trunc('month', MAX(month_date)) FROM material),
                        date_trunc('month', CAST(:from_month_b AS date))
                    )
                ),
                interval '1 month'
            )::date AS month_date
        ) m
        WHERE NOT EXISTS (
            SELECT 1 FROM material x
            WHERE x.code = :code_chk
              AND date_trunc('month', x.month_date) = m.month_date
        )");
    $insertStmt->execute([
        ':code_ins'     => $code,
        ':day'          => $day,
        ':name'         => $name,
        ':description'  => $description,
        ':category'     => $category,
        ':unit_price'   => $unitPrice,
        ':packet'       => $packet,
        ':unit'         => $unit,
        ':created_by'   => $importUser,
        ':updated_by'   => $importUser,
        ':from_month_a' => $fromMonthDate,
        ':from_month_b' => $fromMonthDate,
        ':code_chk'     => $code,
        ':code_sk'      => $code,
    ]);

    return $written + $insertStmt->rowCount();
}

/**
 * Run the full import pipeline against a given PDO connection.
 * Returns [inserted, skipped, materials_added, prices_updated].
 */
function runImport($pdo, $data, $orderNumber, $monthDate, $snapshotDate, $year, $month, $day, $importUser) {
    $newMaterials = $data['newMaterials'] ?? [];

    // 1) Insert brand-new materials — check ONLY by code to avoid duplicates.
    $checkMaterialStmt = $pdo->prepare("SELECT 1 FROM material WHERE code = :code LIMIT 1");
    $materialSql = "INSERT INTO material
        (month_date, month, year, day, code, name, description, category, unit_price, packet, unit, created_by, updated_by)
        VALUES (:month_date, :month, :year, :day, :code, :name, :description, :category, :unit_price, :packet, :unit, :created_by, :updated_by)
        ON CONFLICT DO NOTHING";
    $materialStmt = $pdo->prepare($materialSql);
    $materialsAdded = 0;
    foreach ($newMaterials as $m) {
        $checkMaterialStmt->execute([':code' => $m['code']]);
        if ($checkMaterialStmt->fetch()) { continue; }
        $materialStmt->execute([
            ':month_date'  => $snapshotDate,
            ':month'       => $month,
            ':year'        => $year,
            ':day'         => 1,
            ':code'        => $m['code'],
            ':name'        => $m['name'],
            ':description' => $m['description'] ?? '',
            ':category'    => $m['category'] ?? '',
            ':unit_price'  => (float)($m['unit_price'] ?? 0),
            ':packet'      => (float)($m['packet'] ?? 0),
            ':unit'        => $m['unit'] ?? '',
            ':created_by'  => $importUser,
            ':updated_by'  => $importUser,
        ]);
        $materialsAdded += $materialStmt->rowCount();

        // Carry the new material into every month from the invoice month on,
        // not just the invoice month's snapshot.
        propagateMaterialForward($pdo, $m, $snapshotDate, $importUser);
    }

    // 1b) Invoice price is final: apply it to the invoice month AND every later
    //     month, and create any later month-rows that don't exist yet. Scoping
    //     this to `month_date = :snapshot_date` is what confined a price
    //     correction to the single month the invoice landed in.
    $sourceRowStmt = $pdo->prepare("
        SELECT code, name, description, category, unit_price, packet, unit, day
        FROM material
        WHERE code = :code
          AND date_trunc('month', month_date) <= date_trunc('month', CAST(:snapshot_date AS date))
        ORDER BY month_date DESC
        LIMIT 1
    ");
    $pricesUpdated = 0;
    foreach ($data['items'] as $item) {
        $code = $item['code'] ?? '';
        if ($code === '') { continue; }

        // Take the material's own attributes from its latest snapshot at or
        // before the invoice month, then let the invoice price override.
        $sourceRowStmt->execute([':code' => $code, ':snapshot_date' => $snapshotDate]);
        $source = $sourceRowStmt->fetch(PDO::FETCH_ASSOC);
        if (!$source) { continue; } // unknown code and not in newMaterials — skip

        $source['unit_price'] = (float)($item['unit_price'] ?? 0);
        $pricesUpdated += propagateMaterialForward($pdo, $source, $snapshotDate, $importUser);
    }

    // 2) Append invoice lines to the ledger, skipping any (order_number, code) already present.
    $checkStmt = $pdo->prepare(
        "SELECT 1 FROM stock_in_transaction WHERE order_number = :o AND code = :c LIMIT 1"
    );
    $txStmt = $pdo->prepare(
        "INSERT INTO stock_in_transaction
            (month_date, month, year, day, code, name, description, category,
             unit_price, packet, unit, transaction_in, order_number, created_at, updated_at, created_by, updated_by)
         VALUES
            (:month_date, :month, :year, :day, :code, :name, :description, :category,
             :unit_price, :packet, :unit, :transaction_in, :order_number, NOW(), NOW(), :created_by, :updated_by)"
    );

    $inserted = 0;
    $skipped = 0;
    $touchedCodes = [];
    foreach ($data['items'] as $item) {
        $code = $item['code'] ?? '';
        if ($code === '') { continue; }
        $touchedCodes[$code] = $item;

        $checkStmt->execute([':o' => $orderNumber, ':c' => $code]);
        if ($checkStmt->fetch()) {
            $skipped++;
            continue;
        }

        $txStmt->execute([
            ':month_date'     => $monthDate,
            ':month'          => $month,
            ':year'           => $year,
            ':day'            => $day,
            ':code'           => $code,
            ':name'           => $item['name'] ?? '',
            ':description'    => $item['description'] ?? '',
            ':category'       => $item['category'] ?? '',
            ':unit_price'     => (float)($item['unit_price'] ?? 0),
            ':packet'         => (float)($item['packet'] ?? 0),
            ':unit'           => $item['unit'] ?? '',
            ':transaction_in' => (float)($item['quantity'] ?? 0),
            ':order_number'   => $orderNumber,
            ':created_by'     => $importUser,
            ':updated_by'     => $importUser,
        ]);
        $inserted++;
    }

    // 3) Upsert the per-day/per-code aggregate (total_box = SUM of ledger for that code+date).
    $upsertSql = "INSERT INTO stock_in
        (month_date, month, year, day, code, name, description, category, unit_price, packet, unit, total_box, order_number, created_at, updated_at, created_by, updated_by)
        VALUES
        (:month_date, :month, :year, :day, :code, :name, :description, :category, :unit_price, :packet, :unit,
         (SELECT COALESCE(SUM(transaction_in), 0) FROM stock_in_transaction WHERE code = :code_sum AND month_date = :md_sum),
         :order_number, NOW(), NOW(), :created_by, :updated_by)
        ON CONFLICT (month_date, code) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            unit_price = EXCLUDED.unit_price,
            packet = EXCLUDED.packet,
            unit = EXCLUDED.unit,
            total_box = (SELECT COALESCE(SUM(transaction_in), 0) FROM stock_in_transaction WHERE code = EXCLUDED.code AND month_date = EXCLUDED.month_date),
            order_number = EXCLUDED.order_number,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by";
    $upsertStmt = $pdo->prepare($upsertSql);
    foreach ($touchedCodes as $code => $item) {
        $upsertStmt->execute([
            ':month_date'   => $monthDate,
            ':month'        => $month,
            ':year'         => $year,
            ':day'          => $day,
            ':code'         => $code,
            ':name'         => $item['name'] ?? '',
            ':description'  => $item['description'] ?? '',
            ':category'     => $item['category'] ?? '',
            ':unit_price'   => (float)($item['unit_price'] ?? 0),
            ':packet'       => (float)($item['packet'] ?? 0),
            ':unit'         => $item['unit'] ?? '',
            ':code_sum'     => $code,
            ':md_sum'       => $monthDate,
            ':order_number' => $orderNumber,
            ':created_by'   => $importUser,
            ':updated_by'   => $importUser,
        ]);
    }

    return [$inserted, $skipped, $materialsAdded, $pricesUpdated];
}

try {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!$data || !isset($data['globalInfo']) || !isset($data['items'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid input structure']);
        exit;
    }

    $orderNumber = trim($data['globalInfo']['orderNumber'] ?? '');
    $dateStr = trim($data['globalInfo']['date'] ?? '');
    if ($orderNumber === '') {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Order number (invoice no) is required']);
        exit;
    }

    $dateParts = explode('-', $dateStr);
    if (count($dateParts) !== 3) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid date format, expected YYYY-MM-DD']);
        exit;
    }
    $year = (int)$dateParts[0];
    $month = (int)$dateParts[1];
    $day = (int)$dateParts[2];
    $monthDate = sprintf('%04d-%02d-%02d', $year, $month, $day);
    $snapshotDate = sprintf('%04d-%02d-01', $year, $month);
    $importUser = $data['user'] ?? 'pdf_import';

    // --- Main DB ---
    $dbname = "aero_foods_finance";
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->beginTransaction();
    [$inserted, $skipped, $materialsAdded, $pricesUpdated] = runImport($pdo, $data, $orderNumber, $monthDate, $snapshotDate, $year, $month, $day, $importUser);
    $pdo->commit();

    // --- Cross-DB sync to mixue_sogo if requested ---
    $sogoResult = null;
    if (!empty($data['also_sogo'])) {
        $sogoPdo = new PDO("pgsql:host=$host;port=$port;dbname=mixue_sogo", $user, $password);
        $sogoPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $sogoPdo->beginTransaction();
        [$sogoInserted, $sogoSkipped, $sogoMatAdded, $sogoPriceUpdated] = runImport($sogoPdo, $data, $orderNumber, $monthDate, $snapshotDate, $year, $month, $day, $importUser);
        $sogoPdo->commit();
        $sogoResult = [
            'inserted' => $sogoInserted,
            'skipped_duplicates' => $sogoSkipped,
            'materials_added' => $sogoMatAdded,
            'prices_updated' => $sogoPriceUpdated,
        ];
    }

    $response = [
        'status' => 'success',
        'message' => $inserted > 0
            ? "Imported $inserted line(s) for invoice $orderNumber."
            : "Invoice $orderNumber already imported — nothing new added.",
        'order_number' => $orderNumber,
        'inserted' => $inserted,
        'skipped_duplicates' => $skipped,
        'materials_added' => $materialsAdded,
        'prices_updated' => $pricesUpdated,
    ];
    if ($sogoResult !== null) {
        $response['sogo_sync'] = $sogoResult;
    }
    echo json_encode($response);

} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) { $pdo->rollBack(); }
    if (isset($sogoPdo) && $sogoPdo->inTransaction()) { $sogoPdo->rollBack(); }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) { $pdo->rollBack(); }
    if (isset($sogoPdo) && $sogoPdo->inTransaction()) { $sogoPdo->rollBack(); }
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
