<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$host = "192.168.1.34";
$port = "5432";
$user = "postgres";
$pass = "Admin123";

/*
  public.public_holidays schema:
    id           SERIAL PRIMARY KEY
    date_start   DATE
    date_end     DATE
    holiday_name VARCHAR
    duration     INTEGER
*/

try {
    $conn = new PDO("pgsql:host=$host;port=$port;dbname=aero_foods_finance", $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Return all holidays that overlap the requested month(s)/year
        $year  = isset($_GET['year'])  ? (int)$_GET['year']  : (int)date('Y');
        $month = isset($_GET['month']) ? $_GET['month']       : null;

        if ($month) {
            // Build first/last day of the requested month(s)
            $months = array_map('trim', explode(',', $month));
            sort($months);
            $firstMonth = (int)$months[0];
            $lastMonth  = (int)$months[count($months) - 1];
            $firstDay   = sprintf('%04d-%02d-01', $year, $firstMonth);
            $lastDay    = date('Y-m-t', strtotime($firstDay));  // last day of that month
            if ($lastMonth !== $firstMonth) {
                $lastDay = date('Y-m-t', strtotime(sprintf('%04d-%02d-01', $year, $lastMonth)));
            }

            $stmt = $conn->prepare(
                "SELECT id,
                        date_start::text AS date_start,
                        date_end::text   AS date_end,
                        holiday_name,
                        duration
                 FROM public.public_holidays
                 WHERE date_start <= :last_day
                   AND date_end   >= :first_day
                 ORDER BY date_start"
            );
            $stmt->execute([':first_day' => $firstDay, ':last_day' => $lastDay]);
        } else {
            $stmt = $conn->prepare(
                "SELECT id,
                        date_start::text AS date_start,
                        date_end::text   AS date_end,
                        holiday_name,
                        duration
                 FROM public.public_holidays
                 WHERE EXTRACT(YEAR FROM date_start) = :year
                    OR EXTRACT(YEAR FROM date_end)   = :year
                 ORDER BY date_start"
            );
            $stmt->execute([':year' => $year]);
        }
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body        = json_decode(file_get_contents('php://input'), true);
        $dateStart   = trim($body['date_start']   ?? '');
        $dateEnd     = trim($body['date_end']      ?? $dateStart);
        $holidayName = trim($body['holiday_name']  ?? '');

        if (!$dateStart || !$holidayName) {
            http_response_code(400);
            echo json_encode(['error' => 'date_start and holiday_name are required']);
            exit;
        }

        $parsedStart = date('Y-m-d', strtotime($dateStart));
        $parsedEnd   = date('Y-m-d', strtotime($dateEnd ?: $dateStart));

        if (!$parsedStart || $parsedStart === '1970-01-01') {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid date_start']);
            exit;
        }

        // Calculate duration in days (inclusive)
        $dur = (int)(( strtotime($parsedEnd) - strtotime($parsedStart) ) / 86400) + 1;

        // Upsert: if a holiday already overlaps date_start, update it; otherwise insert
        // Simple approach: delete any existing record that starts on the same date, then insert
        $delStmt = $conn->prepare(
            "DELETE FROM public.public_holidays WHERE date_start = :ds"
        );
        $delStmt->execute([':ds' => $parsedStart]);

        $insStmt = $conn->prepare(
            "INSERT INTO public.public_holidays (date_start, date_end, holiday_name, duration)
             VALUES (:ds, :de, :name, :dur)"
        );
        $insStmt->execute([
            ':ds'   => $parsedStart,
            ':de'   => $parsedEnd,
            ':name' => $holidayName,
            ':dur'  => $dur,
        ]);
        echo json_encode([
            'success'      => true,
            'date_start'   => $parsedStart,
            'date_end'     => $parsedEnd,
            'holiday_name' => $holidayName,
            'duration'     => $dur,
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $body      = json_decode(file_get_contents('php://input'), true);
        $dateStart = trim($body['date_start'] ?? '');

        if (!$dateStart) {
            http_response_code(400);
            echo json_encode(['error' => 'date_start is required']);
            exit;
        }

        $parsedStart = date('Y-m-d', strtotime($dateStart));
        $stmt = $conn->prepare(
            "DELETE FROM public.public_holidays
             WHERE date_start <= :ds AND date_end >= :ds"
        );
        $stmt->execute([':ds' => $parsedStart]);
        echo json_encode(['success' => true]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
