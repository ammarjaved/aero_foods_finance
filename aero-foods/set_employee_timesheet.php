<?php
// set_employee_timesheet.php - UPDATED WITH off_day AND break_hour SUPPORT
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST method is allowed']);
    exit;
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data || !isset($data['username']) || !isset($data['records'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request format']);
    exit;
}

$username_request = $data['username'];
$records = $data['records'];

$host = "192.168.1.34";
$port = "5432";
$dbname = "aero_foods_finance";
$user = "postgres";
$password = "Admin123";

try {
    $conn = new PDO("pgsql:host=$host;port=$port;dbname=$dbname;user=$user;password=$password");
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->beginTransaction();

    $results = [];

    foreach ($records as $record) {
        $isUpdate = !empty($record['id']) && is_numeric($record['id']) && $record['id'] > 0;

        $updateFields = [];
        $insertColumns = [];
        $insertValues = [];
        $params = [];

        // Required fields
        if (empty($record['month_date']) || empty($record['employee_name'])) {
            throw new Exception("month_date and employee_name are required");
        }

        // Get break_hour (default 0 if not provided)
        $breakHour = (float)($record['break_hour'] ?? 0.0);

        // Calculate total_hours if start/end times are provided
        $totalHours = $record['total_hours'] ?? null;
        $startTime = $record['proposed_start_time'] ?? null;
        $endTime = $record['proposed_end_time'] ?? null;

        if ($startTime && $endTime) {
            try {
                $dtStart = new DateTime($startTime);
                $dtEnd = new DateTime($endTime);
                $diff = $dtEnd->diff($dtStart);
                $totalHours = $diff->h + ($diff->days * 24) + ($diff->i / 60.0);
                if ($dtEnd < $dtStart) {
                    $totalHours = 0;
                } else {
                    $totalHours -= $breakHour; // Subtract break_hour
                    if ($totalHours < 0) {
                        $totalHours = 0;
                    }
                }
            } catch (Exception $e) {
                $totalHours = $record['total_hours'] ?? 0;
            }
        } else {
            $totalHours = $record['total_hours'] ?? 0;
        }

        // Core fields (always set)
        $coreFields = [
            'month_date' => $record['month_date'],
            'employee_name' => $record['employee_name'],
            'proposed_start_time' => $startTime,
            'proposed_end_time' => $endTime,
            'total_hours' => (float)$totalHours
        ];

        foreach ($coreFields as $field => $value) {
            if ($isUpdate) {
                $updateFields[] = "$field = :$field";
            } else {
                $insertColumns[] = $field;
                $insertValues[] = ":$field";
            }
            $params[":$field"] = $value === '' ? null : $value;
        }

        // NEW: break_hour handling (optional)
        if (array_key_exists('break_hour', $record)) {
            if ($isUpdate) {
                $updateFields[] = "break_hour = :break_hour";
            } else {
                $insertColumns[] = "break_hour";
                $insertValues[] = ":break_hour";
            }
            $params[':break_hour'] = $breakHour;
        }

        // off_day handling (optional, backward compatible)
        if (array_key_exists('off_day', $record)) {
            // Accept: true, false, "true", "false", "t", "f", 1, 0
            $offDayRaw = $record['off_day'];
            $offDayBool = filter_var($offDayRaw, FILTER_VALIDATE_BOOLEAN);
            if ($isUpdate) {
                $updateFields[] = "off_day = :off_day";
            } else {
                $insertColumns[] = "off_day";
                $insertValues[] = ":off_day";
            }
            $params[':off_day'] = $offDayBool;
        } else {
            // If not sent, do nothing → keeps default FALSE in DB for new records
            // For updates, off_day remains unchanged
        }

        // created_by / updated_by
        if ($isUpdate) {
            $updateFields[] = "updated_by = :updated_by";
            $updateFields[] = "updated_at = CURRENT_TIMESTAMP";
        } else {
            $insertColumns[] = "created_by";
            $insertValues[] = ":created_by";
            $insertColumns[] = "updated_by";
            $insertValues[] = ":updated_by";
            $params[':created_by'] = $username_request;
        }
        $params[':updated_by'] = $username_request;

        // Build and execute query
        if ($isUpdate) {
            $sql = "UPDATE public.employee_timesheet SET " . implode(', ', $updateFields) . " WHERE id = :id RETURNING *";
            $params[':id'] = $record['id'];
        } else {
            $sql = "INSERT INTO public.employee_timesheet (" . implode(', ', $insertColumns) . ")
                    VALUES (" . implode(', ', $insertValues) . ") RETURNING *";
        }

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $results[] = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Employee timesheet data processed successfully',
        'results' => $results
    ]);

} catch (Exception $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}

$conn = null;
?>