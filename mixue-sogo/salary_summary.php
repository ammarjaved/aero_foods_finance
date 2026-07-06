<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$host = "192.168.1.34";
$port = "5432";
$user = "postgres";
$pass = "Admin123";

$db   = isset($_GET['db'])   ? $_GET['db']            : 'mixue_sogo';
$m    = isset($_GET['month']) ? $_GET['month']          : date('n');
$year = isset($_GET['year']) ? intval($_GET['year'])    : date('Y');

try {
    // Connect to brand DB (log_sheet lives here)
    $brandConn = new PDO("pgsql:host=$host;port=$port;dbname=$db", $user, $pass);
    $brandConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Connect to main DB (employees + public_holidays live here)
    $mainConn = new PDO("pgsql:host=$host;port=$port;dbname=mixue_sogo", $user, $pass);
    $mainConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Fetch log_sheet entries for requested months and year
    $logQuery = "SELECT name, month_date, total_hr
                 FROM public.log_sheet
                 WHERE EXTRACT(MONTH FROM month_date) IN ($m)
                   AND EXTRACT(YEAR FROM month_date) = $year
                 ORDER BY month_date";
    $logStmt = $brandConn->prepare($logQuery);
    $logStmt->execute();
    $logData = $logStmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($logData)) {
        echo json_encode([]);
        exit;
    }

    // Fetch employees (select all columns — avoids hard-coding column names)
    $empQuery = "SELECT * FROM public.employees WHERE is_active = 'yes'";
    $empStmt  = $mainConn->prepare($empQuery);
    $empStmt->execute();
    $employees = $empStmt->fetchAll(PDO::FETCH_ASSOC);

    // Build lookup: lowercase name -> employee record (trim all whitespace)
    $empMap = [];
    foreach ($employees as $emp) {
        $key = strtolower(preg_replace('/\s+/', ' ', trim($emp['short_name'])));
        $empMap[$key] = $emp;
    }

    // Helper: extract basic salary from a row using common possible column names
    function getBasicSalary($row) {
        $candidates = ['basic_salary', 'salary', 'monthly_salary', 'base_salary', 'basic'];
        foreach ($candidates as $col) {
            if (array_key_exists($col, $row) && $row[$col] !== null && $row[$col] !== '') {
                $val = floatval($row[$col]);
                if ($val > 0) return $val;
            }
        }
        return 0;
    }

    // Fetch public holidays from public.public_holidays (date_start / date_end range)
    // A log date is a PH if it falls within any [date_start, date_end] range.
    $publicHolidays = [];  // 'YYYY-MM-DD' => holiday_name
    $phError        = null;

    // Get the min/max dates in the log so we can narrow the query efficiently
    $logDates  = array_unique(array_map(function($r) {
        return date('Y-m-d', strtotime($r['month_date']));
    }, $logData));
    sort($logDates);
    $minDate = $logDates[0];
    $maxDate = $logDates[count($logDates) - 1];

    try {
        $phStmt = $mainConn->prepare(
            "SELECT date_start::text AS date_start,
                    date_end::text   AS date_end,
                    holiday_name
             FROM public.public_holidays
             WHERE date_start <= :max_date
               AND date_end   >= :min_date"
        );
        $phStmt->execute([':min_date' => $minDate, ':max_date' => $maxDate]);

        foreach ($phStmt->fetchAll(PDO::FETCH_ASSOC) as $ph) {
            // Expand every day in the [date_start, date_end] range
            $cur = strtotime(substr($ph['date_start'], 0, 10));
            $end = strtotime(substr($ph['date_end'],   0, 10));
            while ($cur <= $end) {
                $publicHolidays[date('Y-m-d', $cur)] = $ph['holiday_name'];
                $cur = strtotime('+1 day', $cur);
            }
        }
    } catch (Exception $e) {
        $phError = $e->getMessage();
        $publicHolidays = [];
    }

    // Group log entries by employee name
    $empLogs = [];
    foreach ($logData as $row) {
        $empLogs[$row['name']][] = $row;
    }

    $result = [];

    foreach ($empLogs as $empName => $logs) {
        $empKey  = strtolower(preg_replace('/\s+/', ' ', trim($empName)));
        $emp     = isset($empMap[$empKey]) ? $empMap[$empKey] : null;
        $empType = $emp ? strtolower(trim($emp['employment_type'])) : 'hourly';
        $basic   = $emp ? getBasicSalary($emp) : 0;

        // Sort logs by date ascending
        usort($logs, function ($a, $b) {
            return strcmp($a['month_date'], $b['month_date']);
        });

        $dayCount = 0;

        foreach ($logs as $log) {
            $hrs     = floatval($log['total_hr']);
            $dateRaw = $log['month_date'];
            $date    = date('Y-m-d', strtotime($dateRaw));
            $isPH      = isset($publicHolidays[$date]);
            $phName    = $isPH ? $publicHolidays[$date] : null;

            $salary = 0;

            if ($empType === 'monthly') {
                $dailyRate = $basic / 26;   // OT rate is always RM8 flat (not dailyRate/8)
                $dayCount++;

                if ($dayCount <= 26) {
                    // ---------- standard monthly day ----------
                    if ($isPH) {
                        // Public holiday: double basic, OT at RM8 flat
                        if ($hrs <= 8) {
                            $salary = $dailyRate * ($hrs / 8) * 2;
                        } else {
                            $salary = ($dailyRate * 2) + (($hrs - 8) * 8);
                        }
                    } else {
                        if ($hrs <= 8) {
                            $salary = $dailyRate * ($hrs / 8);
                        } else {
                            $salary = $dailyRate + (($hrs - 8) * 8);
                        }
                    }
                } else {
                    // ---------- extra day beyond 26 ----------
                    $salary = $hrs * 8;
                }

            } else {
                // ---------- hourly employee ----------
                if ($isPH) {
                    // Public holiday: first 8 hrs × RM16, remaining × RM8
                    if ($hrs <= 8) {
                        $salary = $hrs * 16;
                    } else {
                        $salary = (8 * 16) + (($hrs - 8) * 8);
                    }
                } else {
                    $salary = $hrs * 8;
                }
            }

            $isExtraDay   = ($empType === 'monthly' && $dayCount > 26);
            $dailyRateOut = ($empType === 'monthly') ? round($basic / 26, 4) : null;

            $result[] = [
                'name'             => $empName,
                'month_date'       => $date,
                'salary'           => round($salary, 2),
                'hours'            => $hrs,
                'is_public_holiday'=> $isPH,
                'holiday_name'     => $phName,
                'employment_type'  => $empType,
                'basic_salary'     => $basic,
                'daily_rate'       => $dailyRateOut,
                'day_number'       => $dayCount,
                'is_extra_day'     => $isExtraDay,
            ];
        }
    }

    // Attach debug info as a special sentinel row so frontend can show it
    if ($phError) {
        array_unshift($result, ['__ph_error' => $phError]);
    }

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
