<?php
header("Access-Control-Allow-Origin: *"); // Allow requests from any origin (for development)
header("Content-Type: application/json; charset=UTF-8");

// Database connection
$host = "192.168.1.34";
$db = $_GET['db'];
$user = "postgres";
$pass = "Admin123";

// Fetch data from permit_records table
$conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$m = $_GET['month'];
$y = $_GET['year'];

// Determine the number of days to use for averaging
// If it's the current month, use days up to today; otherwise use total days in month
$currentMonth = (int)date('n');
$currentYear = (int)date('Y');
$currentDay = (int)date('j');

$daysForAverage = "
    CASE 
        WHEN $m = $currentMonth AND $y = $currentYear THEN $currentDay
        ELSE EXTRACT(DAY FROM (DATE '$y-$m-01' + INTERVAL '1 MONTH - 1 DAY'))
    END
";

// Fetch data from permit_records table
$query = "select 
(select sum(total_sales) from daily_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as Total_Sales,
(select sum(actual_total) from bank_reconciliation_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as Total_recon,
(select sum(cash) from daily_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as total_cash_box_amount,
(select sum(cash_box_amount) from bank_reconciliation_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as cash_box_amount,
(select sum(shopee) from daily_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as total_shopee,
(select sum(shopee_1) from bank_reconciliation_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as recon_shopee,
(select sum(grab) from daily_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as total_grab,
(select sum(grab_1) from bank_reconciliation_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as recon_grab,
(select sum(panda) from daily_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as total_panda,
(select sum(panda_1) from bank_reconciliation_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as recon_panda,
(select sum(touch_n_go) from daily_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as total_tng,
(select sum(tng) from bank_reconciliation_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as recon_tng,
(select sum(duit_now) from daily_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as duit_now,
(select sum(visa_master) from daily_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as total_bank_card,
(select sum(dr_1) from bank_reconciliation_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as dr1,
(select sum(dr_2) from bank_reconciliation_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as dr2,
(select sum(cr) from bank_reconciliation_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as cr,
(select sum(visa) from bank_reconciliation_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as visa,
(select sum(master) from bank_reconciliation_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as master,
(select sum(my_debit) from bank_reconciliation_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as my_debit,
(select sum(total_terminal) from bank_reconciliation_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as total_terminal,
(select sum(comission) from bank_reconciliation_sheet where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as comission,
(SELECT CASE 
    WHEN SUM(total_sales) IS NULL OR ($daysForAverage) = 0 THEN 0 
    ELSE ROUND((SUM(total_sales) / ($daysForAverage))::numeric, 2) 
END FROM bank_reconciliation_sheet WHERE EXTRACT(MONTH FROM month_date) = $m AND EXTRACT(YEAR FROM month_date) = $y) as avg_month_sales,
(SELECT CASE 
    WHEN SUM(transaction_count) IS NULL OR ($daysForAverage) = 0 THEN 0 
    ELSE ROUND((SUM(transaction_count) / ($daysForAverage))::numeric, 2) 
END FROM daily_sheet WHERE EXTRACT(MONTH FROM month_date) = $m AND EXTRACT(YEAR FROM month_date) = $y) as avg_trans_count,
(SELECT CASE 
    WHEN SUM(total_sales) IS NULL OR SUM(transaction_count) IS NULL OR SUM(transaction_count) = 0 THEN 0 
    ELSE ROUND((SUM(total_sales) / SUM(transaction_count))::numeric, 2) 
END FROM daily_sheet WHERE EXTRACT(MONTH FROM month_date) = $m AND EXTRACT(YEAR FROM month_date) = $y) as avg_trans_val,
(SELECT CASE WHEN sum(discount) IS NULL OR sum(discount) = 'Infinity'::float OR sum(discount) = '-Infinity'::float THEN 0 ELSE ROUND(sum(discount)::numeric, 2) END FROM daily_sheet WHERE EXTRACT(MONTH FROM month_date) =$m AND EXTRACT(YEAR FROM month_date) = $y) as dis_hundred_per,
(SELECT CASE WHEN sum(labour_hours_used) IS NULL OR sum(labour_hours_used) = 'Infinity'::float OR sum(labour_hours_used) = '-Infinity'::float THEN 0 ELSE ROUND(sum(labour_hours_used)::numeric, 2) END FROM daily_sheet WHERE EXTRACT(MONTH FROM month_date) =$m AND EXTRACT(YEAR FROM month_date) = $y) as total_hours,
(SELECT CASE 
    WHEN SUM(labour_hours_used) IS NULL OR ($daysForAverage) = 0 THEN 0 
    ELSE ROUND((SUM(labour_hours_used) / ($daysForAverage))::numeric, 2) 
END FROM daily_sheet WHERE EXTRACT(MONTH FROM month_date) = $m AND EXTRACT(YEAR FROM month_date) = $y) as avg_labour_hrs,
(SELECT CASE WHEN avg(sales_per_labour_hours) IS NULL OR avg(sales_per_labour_hours) = 'Infinity'::float OR avg(sales_per_labour_hours) = '-Infinity'::float THEN 0 ELSE ROUND(avg(sales_per_labour_hours)::numeric, 2) END FROM daily_sheet WHERE EXTRACT(MONTH FROM month_date) =$m AND EXTRACT(YEAR FROM month_date) = $y) as avg_sales_labour_hrs,
($daysForAverage) as days_used_for_average,
(select sum(final_total) from daily_wastage where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as total_wastage,
(select sum(amount) from daily_expenditure where EXTRACT(MONTH FROM month_date)=$m and EXTRACT(YEAR FROM month_date)=$y) as total_expense
";

$stmt = $conn->prepare($query);
$stmt->execute();
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Fetch expense breakdown by type
$expenseQuery = "SELECT expense_type_name, SUM(amount) as total_amount 
                 FROM daily_expenditure 
                 WHERE EXTRACT(MONTH FROM month_date) = :m 
                 AND EXTRACT(YEAR FROM month_date) = :y 
                 GROUP BY expense_type_name";
$expenseStmt = $conn->prepare($expenseQuery);
$expenseStmt->execute(['m' => $m, 'y' => $y]);
$expenseByType = $expenseStmt->fetchAll(PDO::FETCH_ASSOC);

// Combine results
$result = [
    'summary' => $data[0],
    'expense_by_type' => $expenseByType
];

// Return JSON response
echo json_encode($result);
?>