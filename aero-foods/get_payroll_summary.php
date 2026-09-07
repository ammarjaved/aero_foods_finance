<?php
// get_payroll_summary.php - Fetch all active employees with their allowances and deductions

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Only GET method is allowed']);
    exit;
}

$host = '192.168.1.34';
$port = '5432';
$user = 'postgres';
$password = 'Admin123';

$dbMap = [
    'mixue'      => 'aero_foods_finance',
    'abe'        => 'abe_yus_finance',
    'amz'        => 'amazon_cafe_finance',
    'ojim'       => 'ojim_finance',
    'amz-lyp'    => 'amazon_cafe_finance_lyp',
    'mixue-sogo' => 'mixue_sogo',
];
$cafeKey = $_GET['db'] ?? 'mixue';
$dbname  = $dbMap[$cafeKey] ?? 'aero_foods_finance';

// Month filter (optional - used to filter one-off deductions by month)
$payMonth = isset($_GET['month']) ? $_GET['month'] : null;
$payYear  = isset($_GET['year']) ? $_GET['year'] : null;

try {
    $conn = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Fetch all active employees
    $empSql = "SELECT short_name, employment_type, basic_salary
               FROM employees
               WHERE is_active = 'yes'
               ORDER BY short_name";
    $empStmt = $conn->prepare($empSql);
    $empStmt->execute();
    $employees = $empStmt->fetchAll(PDO::FETCH_ASSOC);

    // Employment type + contract basic from the brand DB, then overridden by
    // the main DB (same source as salary_summary.php).
    $typeMap  = [];
    $basicMap = [];
    foreach ($employees as $e) {
        $k = strtolower(preg_replace('/\s+/', ' ', trim($e['short_name'])));
        $typeMap[$k]  = strtolower(trim($e['employment_type']));
        $basicMap[$k] = floatval($e['basic_salary']);
    }

    // Compute overtime + public-holiday premium + normal-hours pay from log_sheet.
    //   - Normal hours (NH) = first 8 hrs of a non-PH day (PH NH is kept separate)
    //   - OT = hours beyond 8, ignored when under 1 hour
    //   - monthly employees: Basic Salary = contract monthly salary
    //       hourly rate = RM8 flat for monthly and hourly staff
    //       PH pay = PH hours x (hourly rate x 2)
    //       extra days beyond 26: whole day at RM8/hr, no PH premium
    //   - hourly: NH at RM8/hr; PH = PH hours x RM16 (rate 8 x 2)
    $otMap = []; // normalized name => pay/hours/details
    if ($payMonth && $payYear) {
        try {

            // Public holidays + employment type/basic from the main DB
            // (same source as salary_summary.php)
            $publicHolidays = [];
            $otMonthStart = sprintf('%04d-%02d-01', $payYear, $payMonth);
            $otMonthEnd   = sprintf('%04d-%02d-%02d', $payYear, $payMonth,
                              date('t', mktime(0, 0, 0, $payMonth, 1, $payYear)));
            try {
                $mainConn = new PDO("pgsql:host=$host;port=$port;dbname=aero_foods_finance", $user, $password);
                $mainConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $phStmt = $mainConn->prepare(
                    "SELECT date_start::date::text AS date_start,
                            date_end::date::text   AS date_end,
                            holiday_name
                     FROM public.public_holidays
                     WHERE date_start <= :max_date
                       AND date_end   >= :min_date"
                );
                $phStmt->execute([':min_date' => $otMonthStart, ':max_date' => $otMonthEnd]);
                foreach ($phStmt->fetchAll(PDO::FETCH_ASSOC) as $ph) {
                    $cur = DateTime::createFromFormat('Y-m-d', substr($ph['date_start'], 0, 10));
                    $end = DateTime::createFromFormat('Y-m-d', substr($ph['date_end'], 0, 10));
                    if (!$cur || !$end) {
                        continue;
                    }
                    while ($cur <= $end) {
                        $publicHolidays[$cur->format('Y-m-d')] = $ph['holiday_name'];
                        $cur->modify('+1 day');
                    }
                }
                $mainEmpStmt = $mainConn->query(
                    "SELECT short_name, employment_type, basic_salary
                     FROM employees
                     WHERE is_active = 'yes'"
                );
                foreach ($mainEmpStmt->fetchAll(PDO::FETCH_ASSOC) as $e) {
                    $k = strtolower(preg_replace('/\s+/', ' ', trim($e['short_name'])));
                    $typeMap[$k]  = strtolower(trim($e['employment_type']));
                    if (isset($e['basic_salary']) && $e['basic_salary'] !== null && $e['basic_salary'] !== '') {
                        $val = floatval($e['basic_salary']);
                        if ($val > 0) {
                            $basicMap[$k] = $val;
                        }
                    }
                }
                $mainConn = null;
            } catch (Exception $e) {
                $publicHolidays = [];
            }

            $logSql = "SELECT name, (month_date::date)::text AS month_date, total_hr
                       FROM public.log_sheet
                       WHERE EXTRACT(MONTH FROM month_date) = :pay_month
                         AND EXTRACT(YEAR FROM month_date) = :pay_year
                       ORDER BY name, month_date";
            $logStmt = $conn->prepare($logSql);
            $logStmt->bindParam(':pay_month', $payMonth);
            $logStmt->bindParam(':pay_year', $payYear);
            $logStmt->execute();
            $logRows = $logStmt->fetchAll(PDO::FETCH_ASSOC);

            $grouped = [];
            foreach ($logRows as $r) {
                $k = strtolower(preg_replace('/\s+/', ' ', trim($r['name'])));
                $grouped[$k][] = $r;
            }

            foreach ($grouped as $k => $rows) {
                $empType   = isset($typeMap[$k]) ? $typeMap[$k] : 'hourly';
                // HQ staff: fixed monthly salary, timesheet is not used.
                if (strpos($empType, 'hq') === 0) {
                    continue;
                }
                $basic     = isset($basicMap[$k]) ? $basicMap[$k] : 0;
                $dayCount  = 0;
                $otPay     = 0;
                $otHours   = 0;
                $otDetails = [];
                $phPay     = 0;
                $phHours   = 0;
                $phDetails = [];
                $basePay   = 0; // non-PH NH pay (hourly: NH x RM8; monthly unused for basic)
                $normalHours = 0;
                $normalDetails = [];
                $workedHrs = 0;
                $workedDays = 0;
                foreach ($rows as $r) {
                    $hrs        = floatval($r['total_hr']);
                    $workedHrs += $hrs;
                    if ($hrs > 0) {
                        $workedDays++;
                    }
                    $date       = substr(trim($r['month_date']), 0, 10);
                    $isPH       = isset($publicHolidays[$date]);
                    $isExtraDay = false;
                    $dayPhPay   = 0;
                    $dayBasePay = 0;
                    $otHrs      = ($hrs > 8) ? ($hrs - 8) : 0;
                    if ($otHrs < 1) {
                        $otHrs = 0;
                    }
                    $regHrs     = min($hrs, 8);
                    $isMonthly  = (strpos($empType, 'month') === 0);
                    // Hourly rate is a flat RM8 for both monthly and hourly
                    // staff (used for OT and public holiday pay). PH rate is 2x.
                    $hourlyRate = 8;
                    $phRate     = $hourlyRate * 2;

                    if ($isMonthly) {
                        $dayCount++;
                        $dailyRate = $basic / 26;
                        if ($dayCount <= 26) {
                            if ($otHrs == 0) {
                                $dayNhPay = $dailyRate * ($regHrs / 8);
                            } else {
                                $dayNhPay = $dailyRate;
                            }
                            if ($isPH) {
                                $phHours   += $regHrs;
                                $dayPhPay   = $regHrs * $phRate;
                                $dayBasePay = 0;
                            } else {
                                $normalHours += $regHrs;
                                $dayBasePay   = $dayNhPay;
                            }
                            $dayOtHours = $otHrs;
                        } else {
                            $isExtraDay = true;
                            $dayOtHours = ($hrs < 1) ? 0 : $hrs;
                            $dayBasePay = 0;
                        }
                    } else {
                        $dayOtHours = $otHrs;
                        $dayNhPay   = $regHrs * $hourlyRate;
                        if ($isPH) {
                            $phHours   += $regHrs;
                            $dayPhPay   = $regHrs * $phRate;
                            $dayBasePay = 0;
                        } else {
                            $normalHours += $regHrs;
                            $dayBasePay   = $dayNhPay;
                        }
                    }

                    $basePay += $dayBasePay;
                    $dayOtPay = $dayOtHours * 8;
                    $otHours += $dayOtHours;
                    $otPay   += $dayOtPay;
                    $phPay   += $dayPhPay;

                    if (!$isPH && $dayBasePay > 0) {
                        $normalDetails[] = [
                            'date'              => $date,
                            'hours_worked'      => $hrs,
                            'normal_hours'      => round($regHrs, 2),
                            'normal_pay'        => round($dayBasePay, 2),
                            'is_public_holiday' => false,
                            'holiday_name'      => null,
                        ];
                    }
                    if ($dayOtPay > 0) {
                        $otDetails[] = [
                            'date'         => $date,
                            'hours_worked' => $hrs,
                            'ot_hours'     => round($dayOtHours, 2),
                            'ot_pay'       => round($dayOtPay, 2),
                            'is_extra_day' => $isExtraDay,
                        ];
                    }
                    if ($dayPhPay > 0) {
                        $phDetails[] = [
                            'date'         => $date,
                            'holiday_name' => $publicHolidays[$date],
                            'hours_worked' => $hrs,
                            'normal_hours' => round($regHrs, 2),
                            'hourly_rate'  => round($hourlyRate, 4),
                            'ph_rate'      => round($phRate, 4),
                            'premium'      => round($dayPhPay, 2),
                        ];
                    }
                }
                $otMap[$k] = [
                    'pay'           => $otPay,
                    'hours'         => $otHours,
                    'details'       => $otDetails,
                    'ph_pay'        => $phPay,
                    'ph_hours'      => $phHours,
                    'ph_details'    => $phDetails,
                    'base_pay'      => $basePay,
                    'normal_hours'  => $normalHours,
                    'normal_details'=> $normalDetails,
                    'worked_hours'  => $workedHrs,
                    'worked_days'   => $workedDays,
                ];
            }
        } catch (Exception $e) {
            // log_sheet unavailable in this DB - report zero overtime
            $otMap = [];
        }
    }

    // One-time deductions store pay_month as a 3-letter abbreviation (e.g. "JUN"),
    // matching the MONTHS list in the payroll form. $payMonth arrives here as a
    // number, so build every accepted representation (abbrev / plain / padded)
    // to match regardless of how the row was saved.
    $monthAbbrevs   = ['', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                           'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    $payMonthNum    = intval($payMonth);
    $payMonthAbbr   = ($payMonthNum >= 1 && $payMonthNum <= 12) ? $monthAbbrevs[$payMonthNum] : '';
    $payMonthPlain  = (string) $payMonthNum;
    $payMonthPadded = sprintf('%02d', $payMonthNum);

    $summary = [];

    foreach ($employees as $emp) {
        $empName = $emp['short_name'];

        // Fetch active allowances for this employee.
        // When a month/year is given, only include allowances whose effective
        // range overlaps with that calendar month:
        //   effective_from <= last day of pay month
        //   (effective_to IS NULL OR effective_to >= first day of pay month)
        if ($payMonth && $payYear) {
            $monthStart = sprintf('%04d-%02d-01', $payYear, $payMonth);
            $monthEnd   = sprintf('%04d-%02d-%02d', $payYear, $payMonth,
                            date('t', mktime(0, 0, 0, $payMonth, 1, $payYear)));

            $allowSql = "SELECT id, allowance_type, amount, is_recurring, effective_from, effective_to
                         FROM employee_allowances
                         WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(:employee_name))
                           AND (effective_from IS NULL OR effective_from <= :month_end)
                           AND (effective_to IS NULL OR effective_to >= :month_start)
                         ORDER BY allowance_type";
            $allowStmt = $conn->prepare($allowSql);
            $allowStmt->bindParam(':employee_name', $empName, PDO::PARAM_STR);
            $allowStmt->bindParam(':month_end',     $monthEnd,  PDO::PARAM_STR);
            $allowStmt->bindParam(':month_start',   $monthStart, PDO::PARAM_STR);
        } else {
            $allowSql = "SELECT id, allowance_type, amount, is_recurring, effective_from, effective_to
                         FROM employee_allowances
                         WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(:employee_name))
                           AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
                         ORDER BY allowance_type";
            $allowStmt = $conn->prepare($allowSql);
            $allowStmt->bindParam(':employee_name', $empName, PDO::PARAM_STR);
        }
        $allowStmt->execute();
        $allowances = $allowStmt->fetchAll(PDO::FETCH_ASSOC);

        $totalAllowances = 0;
        foreach ($allowances as $a) {
            $totalAllowances += floatval($a['amount']);
        }

        // Fetch applicable deductions for this employee
        // Recurring deductions always apply; one-offs apply only if pay_month/pay_year match
        if ($payMonth && $payYear) {
            $deductSql = "SELECT id, deduction_type, amount, is_recurring, is_auto_calculated,
                                 pay_month, pay_year, installment_no, total_installments
                          FROM employee_deductions
                          WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(:employee_name))
                            AND (
                                is_recurring = TRUE
                                OR (
                                    UPPER(TRIM(pay_month)) IN (:pay_month_abbr, :pay_month_plain, :pay_month_padded)
                                    AND TRIM(pay_year::text) = TRIM(:pay_year)
                                )
                            )
                          ORDER BY deduction_type";
            $deductStmt = $conn->prepare($deductSql);
            $deductStmt->bindParam(':employee_name',   $empName,        PDO::PARAM_STR);
            $deductStmt->bindParam(':pay_month_abbr',  $payMonthAbbr,   PDO::PARAM_STR);
            $deductStmt->bindParam(':pay_month_plain', $payMonthPlain,  PDO::PARAM_STR);
            $deductStmt->bindParam(':pay_month_padded',$payMonthPadded, PDO::PARAM_STR);
            $deductStmt->bindParam(':pay_year',        $payYear,        PDO::PARAM_STR);
        } else {
            $deductSql = "SELECT id, deduction_type, amount, is_recurring, is_auto_calculated,
                                 pay_month, pay_year, installment_no, total_installments
                          FROM employee_deductions
                          WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(:employee_name))
                            AND is_recurring = TRUE
                          ORDER BY deduction_type";
            $deductStmt = $conn->prepare($deductSql);
            $deductStmt->bindParam(':employee_name', $empName, PDO::PARAM_STR);
        }
        $deductStmt->execute();
        $deductions = $deductStmt->fetchAll(PDO::FETCH_ASSOC);

        $totalDeductions = 0;
        foreach ($deductions as $d) {
            $totalDeductions += floatval($d['amount']);
        }

        $empNorm = strtolower(preg_replace('/\s+/', ' ', trim($empName)));
        $ot      = isset($otMap[$empNorm])
                     ? $otMap[$empNorm]
                     : ['pay' => 0, 'hours' => 0, 'details' => [],
                        'ph_pay' => 0, 'ph_hours' => 0, 'ph_details' => [],
                        'base_pay' => 0,
                        'normal_hours' => 0, 'normal_details' => [],
                        'worked_hours' => 0, 'worked_days' => 0];

        $empTypeOut = isset($typeMap[$empNorm]) && $typeMap[$empNorm] !== ''
            ? $typeMap[$empNorm]
            : $emp['employment_type'];
        $contractBasic = isset($basicMap[$empNorm]) && $basicMap[$empNorm] > 0
            ? round($basicMap[$empNorm], 2)
            : round(floatval($emp['basic_salary']), 2);
        // HQ staff: full contract salary, no timesheet (treated as monthly).
        $isHqEmp      = (strpos(strtolower(trim($empTypeOut)), 'hq') === 0);
        $isMonthlyEmp = $isHqEmp || (strpos(strtolower(trim($empTypeOut)), 'month') === 0);
        // Monthly: contract monthly salary in Basic. Hourly: non-PH NH x RM8.
        $basicOut = $isMonthlyEmp ? $contractBasic : round($ot['base_pay'], 2);
        // Flat RM8/hr for both monthly and hourly staff (OT and PH pay).
        $hourlyRateOut = 8;

        $summary[] = [
            'employee_name'    => $empName,
            'employment_type'  => $empTypeOut,
            'is_hq'            => $isHqEmp,
            'contract_basic'   => $contractBasic,
            'basic_salary'     => $basicOut,
            'hourly_rate'      => $hourlyRateOut,
            'normal_hours'     => round($ot['normal_hours'], 2),
            'normal_details'   => $ot['normal_details'],
            'worked_hours'     => round($ot['worked_hours'], 2),
            'worked_days'      => $ot['worked_days'],
            'overtime_hours'   => round($ot['hours'], 2),
            'overtime_pay'     => round($ot['pay'], 2),
            'overtime_details' => $ot['details'],
            'ph_hours'         => round($ot['ph_hours'], 2),
            'ph_premium'       => round($ot['ph_pay'], 2),
            'ph_details'       => $ot['ph_details'],
            'allowances'       => $allowances,
            'total_allowances' => round($totalAllowances, 2),
            'deductions'       => $deductions,
            'total_deductions' => round($totalDeductions, 2),
        ];
    }

    echo json_encode([
        'status'  => 'success',
        'message' => count($summary) . ' employee(s) found',
        'results' => $summary
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}

$conn = null;
?>
