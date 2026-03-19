<?php
// generate_schedule_image.php - FINAL FIXED VERSION (NO EXTRA SPACE ON RIGHT)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

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

if (!$data || !is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON format']);
    exit;
}

// Process data
$dates = [];
$employees = [];
$schedule = [];
$daily_totals = [];

foreach ($data as $record) {
    $date = $record['month_date'];
    $emp = ucfirst(strtolower($record['employee_name']));
    $start = $record['proposed_start_time'];
    $end = $record['proposed_end_time'];
    $hours = (float)$record['total_hours'];
    $break = (float)$record['break_hour'];
    $off = (bool)$record['off_day'];
    
    if (!in_array($date, $dates)) {
        $dates[] = $date;
    }
    if (!in_array($emp, $employees)) {
        $employees[] = $emp;
    }

    $schedule[$emp][$date] = [
        'start' => $start,
        'end' => $end,
        'hours' => $hours,
        'break' => $break,
        'off' => $off || $hours == 0
    ];

    if (!isset($daily_totals[$date])) {
        $daily_totals[$date] = 0;
    }
    if (!$off && $hours > 0) {
        $daily_totals[$date] += $hours;
    }
}

// Sort dates and employees
sort($dates);
sort($employees);

if (empty($dates)) {
    http_response_code(400);
    echo json_encode(['error' => 'No data provided']);
    exit;
}

$min_date = min($dates);
$max_date = max($dates);
$range_start = date('j F Y', strtotime($min_date));
$range_end = date('j F Y', strtotime($max_date));

$header_title = "EMPLOYEE WORK SCHEDULE";
$header_range = "$range_start - $range_end";

// Colors (RGB)
$colors = [
    'white'     => [255, 255, 255],
    'black'     => [0,   0,   0],
    'gray'      => [169, 169, 169],
    'header_bg' => [0,   0,   0],
    'purple'    => [216, 191, 216],
    'green'     => [144, 238, 144],
    'orange'    => [255, 165,   0],
    'blue'      => [135, 206, 235]
];

function getCellColor($end) {
    $end_dt = new DateTime($end);
    $end_h = $end_dt->format('H');
    if ($end_h == '18') return 'purple';
    if ($end_h == '19') return 'green';
    if ($end_h == '23') return 'orange';
    if ($end_h == '01') return 'blue';
    return 'white';
}

function formatTime($time) {
    $dt = new DateTime($time);
    return $dt->format('ga');
}

// Dimensions
$cell_width = 140;
$cell_height = 70;
$header_height = 60;
$emp_col_width = 160;
$num_days = count($dates);
$num_emps = count($employees);

// Removed extra margins on right
$margin_left_right = 20;
$width = $emp_col_width + $num_days * $cell_width + $margin_left_right * 2;
$height = 140 + $header_height + $num_emps * $cell_height + 40;

$im = imagecreatetruecolor($width, $height);
$white = imagecolorallocate($im, ...$colors['white']);
$black = imagecolorallocate($im, ...$colors['black']);
$gray = imagecolorallocate($im, ...$colors['gray']);
$header_bg = imagecolorallocate($im, ...$colors['header_bg']);
$purple = imagecolorallocate($im, ...$colors['purple']);
$green = imagecolorallocate($im, ...$colors['green']);
$orange = imagecolorallocate($im, ...$colors['orange']);
$blue = imagecolorallocate($im, ...$colors['blue']);

imagefill($im, 0, 0, $white);

// Fonts
$font_bold = 'C:/Windows/Fonts/arialbd.ttf';
$font_regular = 'C:/Windows/Fonts/arial.ttf';

if (!file_exists($font_bold) || !file_exists($font_regular)) {
    http_response_code(500);
    echo json_encode(['error' => 'Font files not found on server']);
    exit;
}

// Title
imagettftext($im, 22, 0, 20, 60, $black, $font_bold, $header_title);
imagettftext($im, 16, 0, 20, 100, $black, $font_regular, $header_range);

// Table start position
$table_y = 140;
$table_left = $margin_left_right;
$table_right = $width - $margin_left_right;

// Draw black header background
imagefilledrectangle($im, $table_left, $table_y, $table_right, $table_y + $header_height, $header_bg);

// Header lines
imageline($im, $table_left, $table_y, $table_right, $table_y, $black);
imageline($im, $table_left, $table_y + $header_height, $table_right, $table_y + $header_height, $black);

// EMPLOYEE header
$emp_header = 'EMPLOYEE';
$bbox = imagettfbbox(14, 0, $font_bold, $emp_header);
$text_width = $bbox[2] - $bbox[0];
$text_x = $table_left + ($emp_col_width - $text_width) / 2;
$text_y = $table_y + $header_height / 2 + 8;
imagettftext($im, 14, 0, $text_x, $text_y, $white, $font_bold, $emp_header);

// Date headers
$x = $table_left + $emp_col_width;
foreach ($dates as $date) {
    $day_name = strtoupper(date('D', strtotime($date)));
    $day_date = date('d/m/y', strtotime($date));
    $day_text = "$day_name $day_date";

    $bbox = imagettfbbox(13, 0, $font_bold, $day_text);
    $text_width = $bbox[2] - $bbox[0];
    $text_x = $x + ($cell_width - $text_width) / 2;
    $text_y = $table_y + $header_height / 2 + 8;
    imagettftext($im, 13, 0, $text_x, $text_y, $white, $font_bold, $day_text);

    $x += $cell_width;
}

// Vertical lines
$x = $table_left;
imageline($im, $x, $table_y, $x, $table_y + $header_height + $num_emps * $cell_height, $black);
$x += $emp_col_width;
imageline($im, $x, $table_y, $x, $table_y + $header_height + $num_emps * $cell_height, $black);
for ($i = 0; $i < $num_days; $i++) {
    $x += $cell_width;
    imageline($im, $x, $table_y, $x, $table_y + $header_height + $num_emps * $cell_height, $black);
}
// Rightmost line
imageline($im, $table_right, $table_y, $table_right, $table_y + $header_height + $num_emps * $cell_height, $black);

// Employee rows
$y = $table_y + $header_height;
foreach ($employees as $idx => $emp) {
    imageline($im, $table_left, $y, $table_right, $y, $black);

    // Employee name
    $emp_text = ($idx + 1) . ' ' . $emp;
    $bbox = imagettfbbox(12, 0, $font_regular, $emp_text);
    $text_width = $bbox[2] - $bbox[0];
    $text_x = $table_left + ($emp_col_width - $text_width) / 2;
    $text_y = $y + ($cell_height / 2) + 8;
    imagettftext($im, 12, 0, $text_x, $text_y, $black, $font_regular, $emp_text);

    // Shift cells
    $x = $table_left + $emp_col_width;
    foreach ($dates as $date) {
        $shift = $schedule[$emp][$date] ?? ['off' => true, 'hours' => 0];
        if ($shift['off']) {
            imagefilledrectangle($im, $x + 1, $y + 1, $x + $cell_width - 2, $y + $cell_height - 2, $gray);
        } else {
            $color_key = getCellColor($shift['end']);
            $cell_color = ${$color_key};
            imagefilledrectangle($im, $x + 1, $y + 1, $x + $cell_width - 2, $y + $cell_height - 2, $cell_color);

            $start_f = formatTime($shift['start']);
            $end_f = formatTime($shift['end']);
            $hours = $shift['hours'];
            $break = $shift['break'];
            $text = "$start_f - $end_f ($hours) \nBreak Hr - ($break)";

            $bbox = imagettfbbox(10, 0, $font_regular, $text);
            $text_width = $bbox[2] - $bbox[0];
            $text_x = $x + ($cell_width - $text_width) / 2;
            $text_y = $y + ($cell_height / 2) + 8;
            imagettftext($im, 10, 0, $text_x, $text_y, $black, $font_regular, $text);
        }
        $x += $cell_width;
    }

    $y += $cell_height;
}

// Bottom line
imageline($im, $table_left, $y, $table_right, $y, $black);

// Output image
header('Content-Type: image/png');
header('Content-Disposition: attachment; filename="employee_schedule.png"');
imagepng($im);
imagedestroy($im);
?>