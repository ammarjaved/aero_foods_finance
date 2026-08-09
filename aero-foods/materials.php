<?php
// Database connection configuration for PostgreSQL
$host = "192.168.1.34";
$port = "5432";
$dbname = "aero_foods_finance";
$username = "postgres";
$password = "Admin123";

// Set headers to allow cross-origin requests (CORS)
header("Access-Control-Allow-Origin: *"); // Replace * with your actual frontend domain in production
header("Access-Control-Allow-Methods: POST, PUT, GET, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Connect to PostgreSQL database
try {
    $conn_string = "pgsql:host=$host;port=$port;dbname=$dbname;user=$username;password=$password";
    $conn = new PDO($conn_string);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500); // Server Error
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Handle different HTTP methods
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetRequest($conn);
        break;
    case 'POST':
        // Check if this is an update or insert based on operation parameter
        $operation = $_POST['operation'] ?? 'insert';
        if ($operation === 'update') {
            handlePutRequest($conn);
        } else {
            handlePostRequest($conn);
        }
        break;
    case 'PUT':
        handlePutRequest($conn);
        break;
    case 'DELETE':
        handleDeleteRequest($conn);
        break;
    default:
        http_response_code(405); // Method Not Allowed
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

/**
 * Propagate one material forward to every month from $fromMonthDate onward.
 *
 * The `material` table is a per-month catalog snapshot (one row per code per
 * month) and `fetch_materials.php` reads a single month at a time, so a
 * material is invisible in any month that has no row for it. Writing only the
 * edited month is what made new/edited materials appear in that month alone.
 *
 * Forward only — months BEFORE $fromMonthDate are never touched, so historical
 * sheets keep the prices they were costed at.
 *
 * Upper bound is the later of (a) today's month and (b) the newest month
 * present in `material`. (a) closes the gap up to the current sheet — nothing
 * else in this codebase rolls the catalog into a new month. (b) covers months
 * already created ahead of today.
 *
 * Existing forward rows are OVERWRITTEN, including unit_price: the newest
 * invoice/edit is treated as the current truth from its month onward.
 *
 * Months are compared with date_trunc because the two writers disagree on the
 * day component — the invoice import stores the 1st (snapshotDate) while this
 * endpoint stores whatever day the user picked.
 *
 * @return int number of month-rows written (updated + inserted)
 */
function propagateMaterialForward($conn, $material, $fromMonthDate, $updatedBy) {
    $code        = $material['code'];
    $name        = $material['name'] ?? '';
    $description = $material['description'] ?? '';
    $category    = $material['category'] ?? 'Equipment';
    $unitPrice   = (float)($material['unit_price'] ?? 0);
    $packet      = (float)($material['packet'] ?? 0);
    $unit        = $material['unit'] ?? '';
    // `day` is not a calendar day — live values run 0..7 and are near-constant
    // within a month (it tags the batch a row was created in). Carry the
    // material's own value rather than inventing one.
    $day         = (int)($material['day'] ?? 1);

    // NOTE: every placeholder below is used EXACTLY ONCE per statement, and each
    // execute() array matches its statement's placeholders exactly. PDO_PGSQL
    // rewrites named parameters to positional ones and rejects both a repeated
    // name and a stray extra key. (The `:price` / `:price2` pair in
    // stock_in_pdf_import.php is the same workaround.)

    // 1) Overwrite every EXISTING row for this code from the given month on.
    $updateStmt = $conn->prepare("UPDATE material SET
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
        ':updated_by'  => $updatedBy,
        ':code'        => $code,
        ':from_month'  => $fromMonthDate,
    ]);
    $written = $updateStmt->rowCount();

    // 2) Create rows for the months in the window that have none yet.
    $insertStmt = $conn->prepare("INSERT INTO material (
            month_date, day, month, year,
            code, name, description, category,
            unit_price, packet, unit, sort_key,
            created_at, updated_at, created_by, updated_by
        )
        SELECT
            m.month_date,
            :day,
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
        ':created_by'   => $updatedBy,
        ':updated_by'   => $updatedBy,
        ':from_month_a' => $fromMonthDate,
        ':from_month_b' => $fromMonthDate,
        ':code_chk'     => $code,
        ':code_sk'      => $code,
    ]);

    return $written + $insertStmt->rowCount();
}

// Function to handle GET requests (retrieve materials)
function handleGetRequest($conn) {
    try {
        $sql = "SELECT * FROM material ORDER BY created_at DESC";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        
        $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => $materials
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

// Function to handle POST requests (create new material)
function handlePostRequest($conn) {
    // Process the form data
    $data = [];
    foreach ($_POST as $key => $value) {
        $data[$key] = $value;
    }
    
    // Validate required fields
    $requiredFields = ['code', 'name', 'description', 'unit_price', 'packet', 'unit'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "Missing required field: $field"]);
            return;
        }
    }

    // A material always belongs to the 1st of its month: adding one on 8 Aug
    // still records it against 1 Aug. The invoice import already writes the 1st
    // (see stock_in_pdf_import.php), so both writers agree on the day component.
    $monthTs = !empty($data['month_date']) ? strtotime($data['month_date']) : false;
    if ($monthTs === false) {
        $monthTs = time();
    }
    $data['month_date'] = date('Y-m-01', $monthTs);
    $data['day']        = 1;
    $data['month']      = (int) date('n', $monthTs);
    $data['year']       = (int) date('Y', $monthTs);
    
    try {
        $conn->beginTransaction();
        // INSERT operation
        $sql = "INSERT INTO material (
            month_date, 
            day, 
            month, 
            year, 
            code, 
            name, 
            description, 
            category, 
            unit_price, 
            packet, 
            unit, 
            created_at, 
            updated_at, 
            created_by, 
            updated_by
        ) VALUES (
            :month_date, 
            :day, 
            :month, 
            :year, 
            :code, 
            :name, 
            :description, 
            :category, 
            :unit_price, 
            :packet, 
            :unit, 
            NOW(), 
            NOW(), 
            :created_by, 
            :updated_by
        ) RETURNING id";
        
        $stmt = $conn->prepare($sql);
        
        // Bind parameters
        $stmt->bindValue(':month_date', $data['month_date'] ?? date('Y-m-d'));
        $stmt->bindValue(':day', $data['day'] ?? date('d'));
        $stmt->bindValue(':month', $data['month'] ?? date('n'));
        $stmt->bindValue(':year', $data['year'] ?? date('Y'));
        $stmt->bindValue(':code', $data['code']);
        $stmt->bindValue(':name', $data['name']);
        $stmt->bindValue(':description', $data['description']);
        $stmt->bindValue(':category', $data['category'] ?? 'Equipment');
        $stmt->bindValue(':unit_price', $data['unit_price']);
        $stmt->bindValue(':packet', $data['packet']);
        $stmt->bindValue(':unit', $data['unit']);
        $stmt->bindValue(':created_by', $data['created_by'] ?? '');
        $stmt->bindValue(':updated_by', $data['updated_by'] ?? '');
        
        // Execute the query
        $stmt->execute();
        
        // Get the ID of the inserted record
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $recordId = $result['id'];

        // Carry the new material into every later month, not just this one.
        $monthsWritten = propagateMaterialForward(
            $conn,
            $data,
            $data['month_date'] ?? date('Y-m-d'),
            $data['created_by'] ?? ''
        );

        $conn->commit();

        // Send success response
        http_response_code(201); // Created
        echo json_encode([
            'success' => true,
            'message' => 'Material created successfully',
            'id' => $recordId,
            'months_written' => $monthsWritten
        ]);

    } catch (PDOException $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

// Function to handle PUT requests (update existing material)
function handlePutRequest($conn) {
    $data = [];
    foreach ($_POST as $key => $value) {
        $data[$key] = $value;
    }
    
    // Check if ID is provided
    if (!isset($data['id']) || empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'ID is required for update operation']);
        return;
    }
    
    try {
        $conn->beginTransaction();
        // UPDATE operation
        $sql = "UPDATE material SET
            month_date = :month_date,
            day = :day,
            month = :month,
            year = :year,
            code = :code,
            name = :name,
            description = :description,
            category = :category,
            unit_price = :unit_price,
            packet = :packet,
            unit = :unit,
            updated_at = NOW(),
            updated_by = :updated_by
        WHERE id = :id
        RETURNING id";
        
        $stmt = $conn->prepare($sql);
       
        // Bind parameters
        $stmt->bindValue(':id', $data['id']);
        $stmt->bindValue(':month_date', $data['month_date'] ?? date('Y-m-d'));
        $stmt->bindValue(':day', $data['day'] ?? date('d'));
        $stmt->bindValue(':month', $data['month'] ?? date('n'));
        $stmt->bindValue(':year', $data['year'] ?? date('Y'));
        $stmt->bindValue(':code', $data['code']);
        $stmt->bindValue(':name', $data['name']);
        $stmt->bindValue(':description', $data['description']);
        $stmt->bindValue(':category', $data['category'] ?? 'Equipment');
        $stmt->bindValue(':unit_price', $data['unit_price']);
        $stmt->bindValue(':packet', $data['packet']);
        $stmt->bindValue(':unit', $data['unit']);
        $stmt->bindValue(':updated_by', $data['updated_by'] ?? '');
        
        // Execute the query
        $stmt->execute();
        
        // Check if any rows were affected
        if ($stmt->rowCount() === 0) {
            $conn->rollBack();
            http_response_code(404);
            echo json_encode(['error' => 'Material not found']);
            return;
        }

        // Get the ID of the updated record
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $recordId = $result['id'];

        // Apply the same edit to this month and every later one.
        $monthsWritten = propagateMaterialForward(
            $conn,
            $data,
            $data['month_date'] ?? date('Y-m-d'),
            $data['updated_by'] ?? ''
        );

        $conn->commit();

        // Send success response
        http_response_code(200); // OK
        echo json_encode([
            'success' => true,
            'message' => 'Material updated successfully',
            'id' => $recordId,
            'months_written' => $monthsWritten
        ]);

    } catch (PDOException $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

// Function to handle DELETE requests (delete material)
function handleDeleteRequest($conn) {
    // Get the ID from URL parameters
    $id = $_GET['id'] ?? null;
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID is required for delete operation']);
        return;
    }
    
    try {
        $sql = "DELETE FROM material WHERE id = :id";
        $stmt = $conn->prepare($sql);
        $stmt->bindValue(':id', $id);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Material not found']);
            return;
        }
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Material deleted successfully'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

// Close the connection
$conn = null;
?>