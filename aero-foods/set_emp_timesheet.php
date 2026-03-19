<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST allowed']);
    exit;
}

/**
 * READ RAW INPUT ONCE
 */
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data || !isset($data['username'], $data['records'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid payload']);
    exit;
}

$username = $data['username'];
$records  = $data['records'];

/**
 * 🔥 FORCE-NORMALIZE INPUT (CRITICAL FIX)
 * Converts "", "false", null, missing → FALSE
 * Converts "true", 1 → TRUE
 */
foreach ($records as &$record) {
    if (!isset($record['off_day']) || $record['off_day'] === '' || $record['off_day'] === 'false' || $record['off_day'] === null) {
        $record['off_day'] = false;
    } elseif ($record['off_day'] === true || $record['off_day'] === 1 || $record['off_day'] === '1' || $record['off_day'] === 'true') {
        $record['off_day'] = true;
    } else {
        $record['off_day'] = false;
    }
}
unset($record);

try {
    $pdo = new PDO(
        "pgsql:host=192.168.1.34;port=5432;dbname=aero_foods_finance",
        "postgres",
        "Admin123",
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $pdo->beginTransaction();
    $results = [];

    foreach ($records as $r) {

        if (empty($r['month_date']) || empty($r['employee_name'])) {
            throw new Exception("month_date and employee_name required");
        }

        $isUpdate = !empty($r['id']);

        /**
         * HOURS CALCULATION
         */
        $start = $r['proposed_start_time'] ?? null;
        $end   = $r['proposed_end_time'] ?? null;
        $hours = 0;


		if ($start && $end) {
			try {
				$s = new DateTime($start);
				$e = new DateTime($end);
				if ($e > $s) {
					$d = $e->diff($s);
					$hours = ($d->days * 24) + $d->h + ($d->i / 60);
					
					// Subtract break hours
					$breakHours = isset($r['break_hour']) ? floatval($r['break_hour']) : 0;
					$hours = max(0, $hours - $breakHours);
				}
			} catch (Exception $e) {
				$hours = 0;
			}
		}

        if ($isUpdate) {
            $sql = "
                UPDATE public.employee_timesheet
                SET
                    month_date = :month_date,
                    employee_name = :employee_name,
                    proposed_start_time = :start_time,
                    proposed_end_time = :end_time,
                    total_hours = :total_hours,
                    off_day = :off_day,
                    break_hour=:break_hour,
                    updated_by = :updated_by,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
                RETURNING *
            ";
        } else {
            $sql = "
                INSERT INTO public.employee_timesheet
                (
                    month_date,
                    employee_name,
                    proposed_start_time,
                    proposed_end_time,
                    total_hours,
                    off_day,
                    break_hour,
                    created_by,
                    updated_by
                )
                VALUES
                (
                    :month_date,
                    :employee_name,
                    :start_time,
                    :end_time,
                    :total_hours,
                    :off_day,
                    :break_hour,
                    :created_by,
                    :updated_by
                )
                RETURNING *
            ";
        }

        $stmt = $pdo->prepare($sql);

        /**
         * SAFE BINDING
         */
        $stmt->bindValue(':month_date', $r['month_date']);
        $stmt->bindValue(':employee_name', $r['employee_name']);
        $stmt->bindValue(':start_time', $start, $start ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':end_time', $end, $end ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':total_hours', $hours);

        // 🔥 BOOLEAN BIND (NO EMPTY STRING POSSIBLE)
        $stmt->bindValue(':off_day', $r['off_day'], PDO::PARAM_BOOL);
        $stmt->bindValue(':break_hour', $r['break_hour']);
        if ($isUpdate) {
            $stmt->bindValue(':id', (int)$r['id'], PDO::PARAM_INT);
            $stmt->bindValue(':updated_by', $username);
        } else {
            $stmt->bindValue(':created_by', $username);
            $stmt->bindValue(':updated_by', $username);
        }

        $stmt->execute();
        $results[] = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'results' => $results
    ]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
