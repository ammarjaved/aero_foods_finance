<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = "192.168.1.34";
$port = "5432";
$dbname = "aero_foods_finance";
$username = "postgres";
$password = "Admin123";

function getConnection() {
    global $host, $port, $dbname, $username, $password;
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    return $pdo;
}

function jsonInput() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return $_POST;
    }
    return $data;
}

function toBool($v) {
    if ($v === true || $v === 1 || $v === '1' || $v === 'true' || $v === 't' || $v === 'yes') {
        return true;
    }
    return false;
}

function normalizeRow($row) {
    $row['is_done'] = toBool(isset($row['is_done']) ? $row['is_done'] : false);
    if (isset($row['weekday']) && $row['weekday'] !== null && $row['weekday'] !== '') {
        $row['weekday'] = intval($row['weekday']);
    }
    return $row;
}

function validDate($value) {
    if (!$value) {
        return false;
    }
    $dt = DateTime::createFromFormat('Y-m-d', $value);
    return $dt && $dt->format('Y-m-d') === $value;
}

function mondayOf($dateStr) {
    $dt = DateTime::createFromFormat('Y-m-d', $dateStr);
    if (!$dt) {
        $dt = new DateTime();
    }
    $n = intval($dt->format('N'));
    if ($n !== 1) {
        $dt->modify('-' . ($n - 1) . ' days');
    }
    return $dt->format('Y-m-d');
}

function monthStart($dateStr) {
    $dt = DateTime::createFromFormat('Y-m-d', $dateStr);
    if (!$dt) {
        $dt = new DateTime();
    }
    return $dt->format('Y-m-01');
}

function resolveType($input) {
    $type = '';
    if (isset($_GET['type'])) {
        $type = $_GET['type'];
    } elseif (is_array($input) && isset($input['type'])) {
        $type = $input['type'];
    }
    $type = strtolower(trim($type));
    if ($type === 'daily' || $type === 'weekly' || $type === 'monthly' || $type === 'todo') {
        return $type;
    }
    throw new Exception("type is required (daily, weekly, monthly or todo)");
}

function bindParams($stmt, $params) {
    foreach ($params as $key => $value) {
        if ($value === null) {
            $stmt->bindValue($key, null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue($key, $value);
        }
    }
}

function fetchDaily($pdo, $date) {
    $stmt = $pdo->prepare("SELECT * FROM task_daily WHERE task_date = :d ORDER BY sort_order ASC, id ASC");
    $stmt->bindValue(':d', $date);
    $stmt->execute();
    $out = array();
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $out[] = normalizeRow($row);
    }
    return $out;
}

function saveDaily($pdo, $record) {
    if (empty($record['task_date']) || !validDate($record['task_date'])) {
        throw new Exception("task_date is required (YYYY-MM-DD)");
    }
    if (empty($record['section'])) {
        throw new Exception("section is required");
    }
    if (empty($record['title']) || trim($record['title']) === '') {
        throw new Exception("title is required");
    }
    $allowed = array('daily_management', 'daily_everyday', 'weekly_planner');
    if (!in_array($record['section'], $allowed, true)) {
        throw new Exception("invalid section");
    }
    $isDone = toBool(isset($record['is_done']) ? $record['is_done'] : false);
    $doneBy = isset($record['done_by']) ? $record['done_by'] : null;
    $weekday = (isset($record['weekday']) && $record['weekday'] !== '' && $record['weekday'] !== null)
        ? intval($record['weekday']) : null;
    $sortOrder = isset($record['sort_order']) ? intval($record['sort_order']) : 0;
    if ($sortOrder === 0) {
        $maxStmt = $pdo->prepare("SELECT COALESCE(MAX(sort_order), 0) AS mx FROM task_daily WHERE task_date = :d AND section = :s");
        $maxStmt->bindValue(':d', $record['task_date']);
        $maxStmt->bindValue(':s', $record['section']);
        $maxStmt->execute();
        $maxRow = $maxStmt->fetch(PDO::FETCH_ASSOC);
        $sortOrder = intval($maxRow['mx']) + 10;
    }
    $sql = "INSERT INTO task_daily
            (task_date, section, category, planner_group, weekday, title, is_done, done_at, done_by, remarks, sort_order, updated_at)
            VALUES
            (:task_date, :section, :category, :planner_group, :weekday, :title, CAST(:is_done AS boolean), :done_at, :done_by, :remarks, :sort_order, NOW())
            RETURNING *";
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':task_date', $record['task_date']);
    $stmt->bindValue(':section', $record['section']);
    $stmt->bindValue(':category', isset($record['category']) && $record['category'] !== '' ? $record['category'] : null);
    $stmt->bindValue(':planner_group', isset($record['planner_group']) && $record['planner_group'] !== '' ? $record['planner_group'] : null);
    $stmt->bindValue(':weekday', $weekday, $weekday === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $stmt->bindValue(':title', trim($record['title']));
    $stmt->bindValue(':is_done', $isDone ? 'true' : 'false');
    $stmt->bindValue(':done_at', $isDone ? date('Y-m-d H:i:s') : null);
    $stmt->bindValue(':done_by', $isDone ? $doneBy : null);
    $stmt->bindValue(':remarks', isset($record['remarks']) ? $record['remarks'] : null);
    $stmt->bindValue(':sort_order', $sortOrder, PDO::PARAM_INT);
    $stmt->execute();
    return normalizeRow($stmt->fetch(PDO::FETCH_ASSOC));
}

function updateDaily($pdo, $record) {
    if (empty($record['id'])) {
        throw new Exception("id is required for update");
    }
    $fields = array();
    $params = array(':id' => intval($record['id']));
    if (isset($record['title'])) {
        $fields[] = "title = :title";
        $params[':title'] = trim($record['title']);
    }
    if (isset($record['section'])) {
        $allowed = array('daily_management', 'daily_everyday', 'weekly_planner');
        if (!in_array($record['section'], $allowed, true)) {
            throw new Exception("invalid section");
        }
        $fields[] = "section = :section";
        $params[':section'] = $record['section'];
    }
    if (array_key_exists('category', $record)) {
        $fields[] = "category = :category";
        $params[':category'] = $record['category'] !== '' ? $record['category'] : null;
    }
    if (array_key_exists('planner_group', $record)) {
        $fields[] = "planner_group = :planner_group";
        $params[':planner_group'] = $record['planner_group'] !== '' ? $record['planner_group'] : null;
    }
    if (array_key_exists('weekday', $record)) {
        $fields[] = "weekday = :weekday";
        $params[':weekday'] = ($record['weekday'] === '' || $record['weekday'] === null) ? null : intval($record['weekday']);
    }
    if (array_key_exists('remarks', $record)) {
        $fields[] = "remarks = :remarks";
        $params[':remarks'] = $record['remarks'];
    }
    if (isset($record['sort_order'])) {
        $fields[] = "sort_order = :sort_order";
        $params[':sort_order'] = intval($record['sort_order']);
    }
    if (isset($record['is_done'])) {
        $isDone = toBool($record['is_done']);
        $fields[] = "is_done = CAST(:is_done AS boolean)";
        $params[':is_done'] = $isDone ? 'true' : 'false';
        $fields[] = "done_at = :done_at";
        $fields[] = "done_by = :done_by";
        $params[':done_at'] = $isDone ? date('Y-m-d H:i:s') : null;
        $params[':done_by'] = $isDone && isset($record['done_by']) ? $record['done_by'] : null;
    }
    if (isset($record['task_date'])) {
        if (!validDate($record['task_date'])) {
            throw new Exception("invalid task_date");
        }
        $fields[] = "task_date = :task_date";
        $params[':task_date'] = $record['task_date'];
    }
    if (count($fields) === 0) {
        throw new Exception("no fields to update");
    }
    $fields[] = "updated_at = NOW()";
    $stmt = $pdo->prepare("UPDATE task_daily SET " . implode(', ', $fields) . " WHERE id = :id RETURNING *");
    bindParams($stmt, $params);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        throw new Exception("task not found");
    }
    return normalizeRow($row);
}

function fetchWeekly($pdo, $weekStart) {
    $stmt = $pdo->prepare("SELECT * FROM task_weekly WHERE week_start = :d ORDER BY sort_order ASC, id ASC");
    $stmt->bindValue(':d', $weekStart);
    $stmt->execute();
    $out = array();
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $out[] = normalizeRow($row);
    }
    return $out;
}

function saveWeekly($pdo, $record) {
    $weekStart = isset($record['week_start']) ? $record['week_start'] : (isset($record['date']) ? $record['date'] : '');
    if (!validDate($weekStart)) {
        throw new Exception("week_start is required (YYYY-MM-DD)");
    }
    $weekStart = mondayOf($weekStart);
    if (empty($record['category'])) {
        throw new Exception("category is required");
    }
    if (empty($record['title']) || trim($record['title']) === '') {
        throw new Exception("title is required");
    }
    $isDone = toBool(isset($record['is_done']) ? $record['is_done'] : false);
    $doneBy = isset($record['done_by']) ? $record['done_by'] : null;
    $sortOrder = isset($record['sort_order']) ? intval($record['sort_order']) : 0;
    if ($sortOrder === 0) {
        $maxStmt = $pdo->prepare("SELECT COALESCE(MAX(sort_order), 0) AS mx FROM task_weekly WHERE week_start = :d AND category = :c");
        $maxStmt->bindValue(':d', $weekStart);
        $maxStmt->bindValue(':c', $record['category']);
        $maxStmt->execute();
        $maxRow = $maxStmt->fetch(PDO::FETCH_ASSOC);
        $sortOrder = intval($maxRow['mx']) + 10;
    }
    $sql = "INSERT INTO task_weekly
            (week_start, category, title, is_done, done_at, done_by, remarks, sort_order, updated_at)
            VALUES
            (:week_start, :category, :title, CAST(:is_done AS boolean), :done_at, :done_by, :remarks, :sort_order, NOW())
            RETURNING *";
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':week_start', $weekStart);
    $stmt->bindValue(':category', $record['category']);
    $stmt->bindValue(':title', trim($record['title']));
    $stmt->bindValue(':is_done', $isDone ? 'true' : 'false');
    $stmt->bindValue(':done_at', $isDone ? date('Y-m-d H:i:s') : null);
    $stmt->bindValue(':done_by', $isDone ? $doneBy : null);
    $stmt->bindValue(':remarks', isset($record['remarks']) ? $record['remarks'] : null);
    $stmt->bindValue(':sort_order', $sortOrder, PDO::PARAM_INT);
    $stmt->execute();
    return normalizeRow($stmt->fetch(PDO::FETCH_ASSOC));
}

function updateWeekly($pdo, $record) {
    if (empty($record['id'])) {
        throw new Exception("id is required for update");
    }
    $fields = array();
    $params = array(':id' => intval($record['id']));
    if (isset($record['title'])) {
        $fields[] = "title = :title";
        $params[':title'] = trim($record['title']);
    }
    if (isset($record['category'])) {
        $fields[] = "category = :category";
        $params[':category'] = $record['category'];
    }
    if (array_key_exists('remarks', $record)) {
        $fields[] = "remarks = :remarks";
        $params[':remarks'] = $record['remarks'];
    }
    if (isset($record['sort_order'])) {
        $fields[] = "sort_order = :sort_order";
        $params[':sort_order'] = intval($record['sort_order']);
    }
    if (isset($record['is_done'])) {
        $isDone = toBool($record['is_done']);
        $fields[] = "is_done = CAST(:is_done AS boolean)";
        $params[':is_done'] = $isDone ? 'true' : 'false';
        $fields[] = "done_at = :done_at";
        $fields[] = "done_by = :done_by";
        $params[':done_at'] = $isDone ? date('Y-m-d H:i:s') : null;
        $params[':done_by'] = $isDone && isset($record['done_by']) ? $record['done_by'] : null;
    }
    if (isset($record['week_start']) || isset($record['date'])) {
        $weekStart = isset($record['week_start']) ? $record['week_start'] : $record['date'];
        if (!validDate($weekStart)) {
            throw new Exception("invalid week_start");
        }
        $fields[] = "week_start = :week_start";
        $params[':week_start'] = mondayOf($weekStart);
    }
    if (count($fields) === 0) {
        throw new Exception("no fields to update");
    }
    $fields[] = "updated_at = NOW()";
    $stmt = $pdo->prepare("UPDATE task_weekly SET " . implode(', ', $fields) . " WHERE id = :id RETURNING *");
    bindParams($stmt, $params);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        throw new Exception("task not found");
    }
    return normalizeRow($row);
}

function fetchMonthly($pdo, $monthStartVal) {
    $stmt = $pdo->prepare("SELECT * FROM task_monthly WHERE month_start = :d ORDER BY sort_order ASC, id ASC");
    $stmt->bindValue(':d', $monthStartVal);
    $stmt->execute();
    $out = array();
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $out[] = normalizeRow($row);
    }
    return $out;
}

function saveMonthly($pdo, $record) {
    $monthStartVal = isset($record['month_start']) ? $record['month_start'] : (isset($record['date']) ? $record['date'] : '');
    if (!validDate($monthStartVal)) {
        throw new Exception("month_start is required (YYYY-MM-DD)");
    }
    $monthStartVal = monthStart($monthStartVal);
    if (empty($record['section'])) {
        throw new Exception("section is required");
    }
    if (empty($record['title']) || trim($record['title']) === '') {
        throw new Exception("title is required");
    }
    $allowed = array('monthly_management', 'monthly_checklist', 'outstanding_project');
    if (!in_array($record['section'], $allowed, true)) {
        throw new Exception("invalid section");
    }
    $isDone = toBool(isset($record['is_done']) ? $record['is_done'] : false);
    $doneBy = isset($record['done_by']) ? $record['done_by'] : null;
    $sortOrder = isset($record['sort_order']) ? intval($record['sort_order']) : 0;
    if ($sortOrder === 0) {
        $maxStmt = $pdo->prepare("SELECT COALESCE(MAX(sort_order), 0) AS mx FROM task_monthly WHERE month_start = :d AND section = :s");
        $maxStmt->bindValue(':d', $monthStartVal);
        $maxStmt->bindValue(':s', $record['section']);
        $maxStmt->execute();
        $maxRow = $maxStmt->fetch(PDO::FETCH_ASSOC);
        $sortOrder = intval($maxRow['mx']) + 10;
    }
    $sql = "INSERT INTO task_monthly
            (month_start, section, category, title, is_done, done_at, done_by, remarks, sort_order, updated_at)
            VALUES
            (:month_start, :section, :category, :title, CAST(:is_done AS boolean), :done_at, :done_by, :remarks, :sort_order, NOW())
            RETURNING *";
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':month_start', $monthStartVal);
    $stmt->bindValue(':section', $record['section']);
    $stmt->bindValue(':category', isset($record['category']) && $record['category'] !== '' ? $record['category'] : null);
    $stmt->bindValue(':title', trim($record['title']));
    $stmt->bindValue(':is_done', $isDone ? 'true' : 'false');
    $stmt->bindValue(':done_at', $isDone ? date('Y-m-d H:i:s') : null);
    $stmt->bindValue(':done_by', $isDone ? $doneBy : null);
    $stmt->bindValue(':remarks', isset($record['remarks']) ? $record['remarks'] : null);
    $stmt->bindValue(':sort_order', $sortOrder, PDO::PARAM_INT);
    $stmt->execute();
    return normalizeRow($stmt->fetch(PDO::FETCH_ASSOC));
}

function updateMonthly($pdo, $record) {
    if (empty($record['id'])) {
        throw new Exception("id is required for update");
    }
    $fields = array();
    $params = array(':id' => intval($record['id']));
    if (isset($record['title'])) {
        $fields[] = "title = :title";
        $params[':title'] = trim($record['title']);
    }
    if (isset($record['section'])) {
        $allowed = array('monthly_management', 'monthly_checklist', 'outstanding_project');
        if (!in_array($record['section'], $allowed, true)) {
            throw new Exception("invalid section");
        }
        $fields[] = "section = :section";
        $params[':section'] = $record['section'];
    }
    if (array_key_exists('category', $record)) {
        $fields[] = "category = :category";
        $params[':category'] = $record['category'] !== '' ? $record['category'] : null;
    }
    if (array_key_exists('remarks', $record)) {
        $fields[] = "remarks = :remarks";
        $params[':remarks'] = $record['remarks'];
    }
    if (isset($record['sort_order'])) {
        $fields[] = "sort_order = :sort_order";
        $params[':sort_order'] = intval($record['sort_order']);
    }
    if (isset($record['is_done'])) {
        $isDone = toBool($record['is_done']);
        $fields[] = "is_done = CAST(:is_done AS boolean)";
        $params[':is_done'] = $isDone ? 'true' : 'false';
        $fields[] = "done_at = :done_at";
        $fields[] = "done_by = :done_by";
        $params[':done_at'] = $isDone ? date('Y-m-d H:i:s') : null;
        $params[':done_by'] = $isDone && isset($record['done_by']) ? $record['done_by'] : null;
    }
    if (isset($record['month_start']) || isset($record['date'])) {
        $monthStartVal = isset($record['month_start']) ? $record['month_start'] : $record['date'];
        if (!validDate($monthStartVal)) {
            throw new Exception("invalid month_start");
        }
        $fields[] = "month_start = :month_start";
        $params[':month_start'] = monthStart($monthStartVal);
    }
    if (count($fields) === 0) {
        throw new Exception("no fields to update");
    }
    $fields[] = "updated_at = NOW()";
    $stmt = $pdo->prepare("UPDATE task_monthly SET " . implode(', ', $fields) . " WHERE id = :id RETURNING *");
    bindParams($stmt, $params);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        throw new Exception("task not found");
    }
    return normalizeRow($row);
}

function fetchTodo($pdo) {
    $stmt = $pdo->prepare("SELECT * FROM task_todo ORDER BY task_type ASC, category ASC, sort_order ASC, id ASC");
    $stmt->execute();
    $out = array();
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $out[] = normalizeRow($row);
    }
    return $out;
}

function fetchTodoForDaily($pdo, $date) {
    $sql = "SELECT id, 'daily_management' AS section, category, title, is_done, done_at, done_by, remarks, sort_order, 'todo' AS source
            FROM task_todo
            WHERE task_type = 'daily' AND date_from <= :d AND date_to >= :d
            ORDER BY sort_order ASC, id ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':d', $date);
    $stmt->execute();
    $out = array();
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $out[] = normalizeRow($row);
    }
    return $out;
}

function fetchTodoForWeekly($pdo, $weekStart) {
    $weekEnd = date('Y-m-d', strtotime($weekStart . ' +6 days'));
    $sql = "SELECT id, :sel_week AS week_start, category, title, is_done, done_at, done_by, remarks, sort_order, 'todo' AS source
            FROM task_todo
            WHERE task_type = 'weekly' AND date_from <= :week_end AND date_to >= :week_start
            ORDER BY sort_order ASC, id ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':sel_week', $weekStart);
    $stmt->bindValue(':week_start', $weekStart);
    $stmt->bindValue(':week_end', $weekEnd);
    $stmt->execute();
    $out = array();
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $out[] = normalizeRow($row);
    }
    return $out;
}

function fetchTodoForMonthly($pdo, $monthStartVal) {
    $monthEnd = date('Y-m-t', strtotime($monthStartVal));
    $sql = "SELECT id, :sel_month AS month_start, 'monthly_management' AS section, category, title, is_done, done_at, done_by, remarks, sort_order, 'todo' AS source
            FROM task_todo
            WHERE task_type = 'monthly' AND date_from <= :month_end AND date_to >= :month_start
            ORDER BY sort_order ASC, id ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':sel_month', $monthStartVal);
    $stmt->bindValue(':month_start', $monthStartVal);
    $stmt->bindValue(':month_end', $monthEnd);
    $stmt->execute();
    $out = array();
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $out[] = normalizeRow($row);
    }
    return $out;
}

function saveTodo($pdo, $record) {
    if (!isset($record['task_type']) || !in_array(strtolower(trim($record['task_type'])), array('daily', 'weekly', 'monthly'), true)) {
        throw new Exception("task_type is required (daily, weekly or monthly)");
    }
    if (empty($record['category'])) {
        throw new Exception("category is required");
    }
    if (empty($record['title']) || trim($record['title']) === '') {
        throw new Exception("title is required");
    }
    if (!validDate($record['date_from'])) {
        throw new Exception("date_from is required (YYYY-MM-DD)");
    }
    if (!validDate($record['date_to'])) {
        throw new Exception("date_to is required (YYYY-MM-DD)");
    }
    if ($record['date_to'] < $record['date_from']) {
        throw new Exception("date_to must be on or after date_from");
    }
    $taskType = strtolower(trim($record['task_type']));
    $isDone = toBool(isset($record['is_done']) ? $record['is_done'] : false);
    $doneBy = isset($record['done_by']) ? $record['done_by'] : null;
    $sortOrder = isset($record['sort_order']) ? intval($record['sort_order']) : 0;
    if ($sortOrder === 0) {
        $maxStmt = $pdo->prepare("SELECT COALESCE(MAX(sort_order), 0) AS mx FROM task_todo WHERE task_type = :t AND category = :c");
        $maxStmt->bindValue(':t', $taskType);
        $maxStmt->bindValue(':c', $record['category']);
        $maxStmt->execute();
        $maxRow = $maxStmt->fetch(PDO::FETCH_ASSOC);
        $sortOrder = intval($maxRow['mx']) + 10;
    }
    $sql = "INSERT INTO task_todo
            (task_type, category, title, date_from, date_to, is_done, done_at, done_by, remarks, sort_order, updated_at)
            VALUES
            (:task_type, :category, :title, :date_from, :date_to, CAST(:is_done AS boolean), :done_at, :done_by, :remarks, :sort_order, NOW())
            RETURNING *";
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':task_type', $taskType);
    $stmt->bindValue(':category', $record['category']);
    $stmt->bindValue(':title', trim($record['title']));
    $stmt->bindValue(':date_from', $record['date_from']);
    $stmt->bindValue(':date_to', $record['date_to']);
    $stmt->bindValue(':is_done', $isDone ? 'true' : 'false');
    $stmt->bindValue(':done_at', $isDone ? date('Y-m-d H:i:s') : null);
    $stmt->bindValue(':done_by', $isDone ? $doneBy : null);
    $stmt->bindValue(':remarks', isset($record['remarks']) ? $record['remarks'] : null);
    $stmt->bindValue(':sort_order', $sortOrder, PDO::PARAM_INT);
    $stmt->execute();
    return normalizeRow($stmt->fetch(PDO::FETCH_ASSOC));
}

function updateTodo($pdo, $record) {
    if (empty($record['id'])) {
        throw new Exception("id is required for update");
    }
    $fields = array();
    $params = array(':id' => intval($record['id']));
    if (isset($record['task_type'])) {
        $taskType = strtolower(trim($record['task_type']));
        if (!in_array($taskType, array('daily', 'weekly', 'monthly'), true)) {
            throw new Exception("invalid task_type");
        }
        $fields[] = "task_type = :task_type";
        $params[':task_type'] = $taskType;
    }
    if (isset($record['category'])) {
        $fields[] = "category = :category";
        $params[':category'] = $record['category'];
    }
    if (isset($record['title'])) {
        $fields[] = "title = :title";
        $params[':title'] = trim($record['title']);
    }
    if (isset($record['date_from'])) {
        if (!validDate($record['date_from'])) {
            throw new Exception("invalid date_from");
        }
        $fields[] = "date_from = :date_from";
        $params[':date_from'] = $record['date_from'];
    }
    if (isset($record['date_to'])) {
        if (!validDate($record['date_to'])) {
            throw new Exception("invalid date_to");
        }
        $fields[] = "date_to = :date_to";
        $params[':date_to'] = $record['date_to'];
    }
    if (array_key_exists('remarks', $record)) {
        $fields[] = "remarks = :remarks";
        $params[':remarks'] = $record['remarks'];
    }
    if (isset($record['sort_order'])) {
        $fields[] = "sort_order = :sort_order";
        $params[':sort_order'] = intval($record['sort_order']);
    }
    if (isset($record['is_done'])) {
        $isDone = toBool($record['is_done']);
        $fields[] = "is_done = CAST(:is_done AS boolean)";
        $params[':is_done'] = $isDone ? 'true' : 'false';
        $fields[] = "done_at = :done_at";
        $fields[] = "done_by = :done_by";
        $params[':done_at'] = $isDone ? date('Y-m-d H:i:s') : null;
        $params[':done_by'] = $isDone && isset($record['done_by']) ? $record['done_by'] : null;
    }
    if (count($fields) === 0) {
        throw new Exception("no fields to update");
    }
    $fields[] = "updated_at = NOW()";
    $stmt = $pdo->prepare("UPDATE task_todo SET " . implode(', ', $fields) . " WHERE id = :id RETURNING *");
    bindParams($stmt, $params);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        throw new Exception("task not found");
    }
    return normalizeRow($row);
}

function deleteTodo($pdo, $record) {
    if (empty($record['id'])) {
        throw new Exception("id is required for delete");
    }
    $stmt = $pdo->prepare("DELETE FROM task_todo WHERE id = :id RETURNING id");
    $stmt->bindValue(':id', intval($record['id']), PDO::PARAM_INT);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        throw new Exception("task not found");
    }
    return $row;
}

function defaultDailyItems() {
    $planner = array(
        1 => 'Monday – Stock & Ordering',
        2 => 'Tuesday – Operations',
        3 => 'Wednesday – Stock & Marketing',
        4 => 'Thursday – Finance & Administration',
        5 => 'Friday – Stock & Weekend Preparation',
        6 => 'Saturday – Peak Operations',
        7 => 'Sunday – Weekly Review'
    );
    $items = array(
        array('section' => 'daily_management', 'category' => 'Operations', 'title' => 'All outlets open on time'),
        array('section' => 'daily_management', 'category' => 'Operations', 'title' => 'Outlet cleanliness'),
        array('section' => 'daily_management', 'category' => 'Operations', 'title' => 'SOP followed'),
        array('section' => 'daily_management', 'category' => 'Operations', 'title' => 'Hygiene maintained'),
        array('section' => 'daily_management', 'category' => 'Operations', 'title' => 'Product quality maintained'),
        array('section' => 'daily_management', 'category' => 'Staff', 'title' => 'Attendance'),
        array('section' => 'daily_management', 'category' => 'Staff', 'title' => 'Grooming'),
        array('section' => 'daily_management', 'category' => 'Staff', 'title' => 'Break time compliance'),
        array('section' => 'daily_management', 'category' => 'Staff', 'title' => 'OT monitoring'),
        array('section' => 'daily_management', 'category' => 'Staff', 'title' => 'Team morale'),
        array('section' => 'daily_management', 'category' => 'Finance', 'title' => 'Daily sales recorded'),
        array('section' => 'daily_management', 'category' => 'Finance', 'title' => 'Cash verified'),
        array('section' => 'daily_management', 'category' => 'Finance', 'title' => 'Duit Masuk checked (Abe Yus)'),
        array('section' => 'daily_management', 'category' => 'Finance', 'title' => 'Wastage updated'),
        array('section' => 'daily_management', 'category' => 'Marketing', 'title' => 'Grab'),
        array('section' => 'daily_management', 'category' => 'Marketing', 'title' => 'Foodpanda'),
        array('section' => 'daily_management', 'category' => 'Marketing', 'title' => 'ShopeeFood'),
        array('section' => 'daily_management', 'category' => 'Marketing', 'title' => 'Google Reviews'),
        array('section' => 'daily_management', 'category' => 'Marketing', 'title' => 'Social Media'),
        array('section' => 'daily_management', 'category' => 'Customer', 'title' => 'Complaints resolved'),
        array('section' => 'daily_management', 'category' => 'Customer', 'title' => 'Reviews responded'),
        array('section' => 'daily_management', 'category' => 'Customer', 'title' => 'Delivery performance monitored')
    );
    $plannerTasks = array(
        1 => array('Review weekend sales', 'Check stock balance in system (all outlets)', 'Approve stock orders (Ordering Day)', 'Check COGS and high-usage items', 'Follow up with suppliers if needed'),
        2 => array('Visit outlet(s)', 'SOP & hygiene spot check', 'Staff grooming inspection', 'Review customer complaints', 'Check Google Reviews & reply if necessary'),
        3 => array('Stock ordering (Ordering Day)', 'Check delivery platform performance', 'Review promotions & sales', 'Update WhatsApp Community / social media', 'Follow up on marketing activities'),
        4 => array('Check daily sales report (all outlets)', 'Verify cash reconciliation', 'Review staff attendance & OT', 'Check supplier invoices & payments', 'Send any staff reminders or memos'),
        5 => array('Stock ordering (Ordering Day)', 'Ensure weekend stock is sufficient', 'Check freezer/chiller inventory', 'Remind staff about SOP & customer service', 'Confirm weekend staffing schedule'),
        6 => array('Monitor outlet performance', 'Check delivery order accuracy', 'Monitor customer waiting time', 'Handle urgent operational issues', 'Visit busiest outlet if possible'),
        7 => array('Review weekly sales', 'Review COGS & wastage', 'Review staff performance', 'Plan improvements for next week', "Prepare Monday's ordering list")
    );
    foreach ($plannerTasks as $day => $titles) {
        foreach ($titles as $title) {
            $items[] = array(
                'section' => 'weekly_planner',
                'weekday' => $day,
                'planner_group' => $planner[$day],
                'title' => $title
            );
        }
    }
    return $items;
}

function defaultWeeklyItems() {
    return array(
        array('category' => 'Operations', 'title' => 'Monthly Management/Staff Meeting'),
        array('category' => 'Operations', 'title' => 'Spot Check Report'),
        array('category' => 'Operations', 'title' => 'SOP Audit'),
        array('category' => 'Operations', 'title' => 'Stock Audit'),
        array('category' => 'Operations', 'title' => 'Equipment Maintenance'),
        array('category' => 'Finance', 'title' => 'Profit & Loss Review'),
        array('category' => 'Finance', 'title' => 'COGS Analysis'),
        array('category' => 'Finance', 'title' => 'Sales Analysis'),
        array('category' => 'Finance', 'title' => 'Wastage Analysis'),
        array('category' => 'Finance', 'title' => 'Payroll'),
        array('category' => 'HR', 'title' => 'Grooming Allowance'),
        array('category' => 'HR', 'title' => 'Delivery Hero Allowance'),
        array('category' => 'HR', 'title' => 'Pantry Budget'),
        array('category' => 'HR', 'title' => 'Staff Performance Review'),
        array('category' => 'Business Development', 'title' => 'Mixue Kajang Expansion'),
        array('category' => 'Business Development', 'title' => 'Bakery Project Progress'),
        array('category' => 'Business Development', 'title' => 'Chikex Expansion'),
        array('category' => 'Business Development', 'title' => 'Marketing Plan Review')
    );
}

function defaultMonthlyItems() {
    return array(
        array('section' => 'monthly_management', 'category' => 'Operations', 'title' => 'Monthly Staff Meeting'),
        array('section' => 'monthly_management', 'category' => 'Operations', 'title' => 'Spot Check Report'),
        array('section' => 'monthly_management', 'category' => 'Operations', 'title' => 'SOP Audit'),
        array('section' => 'monthly_management', 'category' => 'Operations', 'title' => 'Stock Audit'),
        array('section' => 'monthly_management', 'category' => 'Operations', 'title' => 'Equipment Maintenance'),
        array('section' => 'monthly_management', 'category' => 'Finance', 'title' => 'Profit & Loss Review'),
        array('section' => 'monthly_management', 'category' => 'Finance', 'title' => 'COGS Analysis'),
        array('section' => 'monthly_management', 'category' => 'Finance', 'title' => 'Sales Analysis'),
        array('section' => 'monthly_management', 'category' => 'Finance', 'title' => 'Wastage Analysis'),
        array('section' => 'monthly_management', 'category' => 'Finance', 'title' => 'Payroll'),
        array('section' => 'monthly_management', 'category' => 'HR', 'title' => 'Grooming Allowance'),
        array('section' => 'monthly_management', 'category' => 'HR', 'title' => 'Delivery Hero Allowance'),
        array('section' => 'monthly_management', 'category' => 'HR', 'title' => 'Pantry Budget'),
        array('section' => 'monthly_management', 'category' => 'HR', 'title' => 'Staff Performance Review'),
        array('section' => 'monthly_management', 'category' => 'Business Development', 'title' => 'Mixue Kajang Expansion'),
        array('section' => 'monthly_management', 'category' => 'Business Development', 'title' => 'Bakery Project Progress'),
        array('section' => 'monthly_management', 'category' => 'Business Development', 'title' => 'Chikex Expansion'),
        array('section' => 'monthly_management', 'category' => 'Business Development', 'title' => 'Marketing Plan Review'),
        array('section' => 'monthly_checklist', 'title' => 'Monthly staff meeting'),
        array('section' => 'monthly_checklist', 'title' => 'Review profit & loss'),
        array('section' => 'monthly_checklist', 'title' => 'Review COGS by outlet'),
        array('section' => 'monthly_checklist', 'title' => 'Stock audit'),
        array('section' => 'monthly_checklist', 'title' => 'Equipment maintenance check'),
        array('section' => 'monthly_checklist', 'title' => 'Payroll & staff allowances'),
        array('section' => 'monthly_checklist', 'title' => 'Review supplier prices'),
        array('section' => 'monthly_checklist', 'title' => 'Marketing & promotion planning'),
        array('section' => 'monthly_checklist', 'title' => 'Reward outstanding staff'),
        array('section' => 'outstanding_project', 'category' => 'Mixue', 'title' => 'Serene Heights Evaluation'),
        array('section' => 'outstanding_project', 'category' => 'Mixue', 'title' => 'Kajang Expansion'),
        array('section' => 'outstanding_project', 'category' => 'Mixue', 'title' => 'Marketing'),
        array('section' => 'outstanding_project', 'category' => 'Mixue', 'title' => 'WhatsApp Community'),
        array('section' => 'outstanding_project', 'category' => 'Mixue', 'title' => 'Delivery Growth'),
        array('section' => 'outstanding_project', 'category' => 'Mixue', 'title' => 'Cold Chain Improvement'),
        array('section' => 'outstanding_project', 'category' => 'Bakery', 'title' => 'Proposal'),
        array('section' => 'outstanding_project', 'category' => 'Bakery', 'title' => 'Layout'),
        array('section' => 'outstanding_project', 'category' => 'Bakery', 'title' => '3D Design'),
        array('section' => 'outstanding_project', 'category' => 'Bakery', 'title' => 'Signboard'),
        array('section' => 'outstanding_project', 'category' => 'Bakery', 'title' => 'Business Plan'),
        array('section' => 'outstanding_project', 'category' => 'Ojim', 'title' => 'Weekly Videos (2)'),
        array('section' => 'outstanding_project', 'category' => 'Ojim', 'title' => 'Daily Bills Update'),
        array('section' => 'outstanding_project', 'category' => 'Ojim', 'title' => 'Social Media Growth'),
        array('section' => 'outstanding_project', 'category' => 'HQ', 'title' => 'Internal Memo'),
        array('section' => 'outstanding_project', 'category' => 'HQ', 'title' => 'Halal File'),
        array('section' => 'outstanding_project', 'category' => 'HQ', 'title' => 'Salary'),
        array('section' => 'outstanding_project', 'category' => 'HQ', 'title' => 'Recon & Expenses'),
        array('section' => 'outstanding_project', 'category' => 'HQ', 'title' => 'Delivery Data'),
        array('section' => 'outstanding_project', 'category' => 'HQ', 'title' => 'Monthly Meeting')
    );
}

function lockPeriod($pdo, $key) {
    $stmt = $pdo->prepare("SELECT pg_advisory_xact_lock(hashtext(:k))");
    $stmt->bindValue(':k', $key);
    $stmt->execute();
}

function ensureDaily($pdo, $date) {
    $pdo->beginTransaction();
    lockPeriod($pdo, 'daily:' . $date);
    $rows = fetchDaily($pdo, $date);
    if (count($rows) === 0) {
        $items = defaultDailyItems();
        foreach ($items as $i => $item) {
            $item['task_date'] = $date;
            $item['sort_order'] = ($i + 1) * 10;
            saveDaily($pdo, $item);
        }
        $rows = fetchDaily($pdo, $date);
    }
    $pdo->commit();
    return array_merge($rows, fetchTodoForDaily($pdo, $date));
}

function ensureWeekly($pdo, $weekStart) {
    $pdo->beginTransaction();
    lockPeriod($pdo, 'weekly:' . $weekStart);
    $rows = fetchWeekly($pdo, $weekStart);
    if (count($rows) === 0) {
        $items = defaultWeeklyItems();
        foreach ($items as $i => $item) {
            $item['week_start'] = $weekStart;
            $item['sort_order'] = ($i + 1) * 10;
            saveWeekly($pdo, $item);
        }
        $rows = fetchWeekly($pdo, $weekStart);
    }
    $pdo->commit();
    return array_merge($rows, fetchTodoForWeekly($pdo, $weekStart));
}

function ensureMonthly($pdo, $monthStartVal) {
    $pdo->beginTransaction();
    lockPeriod($pdo, 'monthly:' . $monthStartVal);
    $rows = fetchMonthly($pdo, $monthStartVal);
    if (count($rows) === 0) {
        $items = defaultMonthlyItems();
        foreach ($items as $i => $item) {
            $item['month_start'] = $monthStartVal;
            $item['sort_order'] = ($i + 1) * 10;
            saveMonthly($pdo, $item);
        }
        $rows = fetchMonthly($pdo, $monthStartVal);
    }
    $pdo->commit();
    return array_merge($rows, fetchTodoForMonthly($pdo, $monthStartVal));
}

function doFetch($pdo, $type, $input, $fromGet) {
    if ($type === 'todo') {
        $rows = fetchTodo($pdo);
        echo json_encode(array('status' => 'success', 'type' => $type, 'count' => count($rows), 'data' => $rows));
        return;
    }
    if ($type === 'daily') {
        $date = $fromGet
            ? (isset($_GET['date']) ? $_GET['date'] : date('Y-m-d'))
            : (isset($input['date']) ? $input['date'] : date('Y-m-d'));
        if (!validDate($date)) {
            throw new Exception("invalid date");
        }
        $rows = ensureDaily($pdo, $date);
        echo json_encode(array('status' => 'success', 'type' => $type, 'count' => count($rows), 'data' => $rows));
        return;
    }
    if ($type === 'weekly') {
        $weekStart = $fromGet
            ? (isset($_GET['week_start']) ? $_GET['week_start'] : (isset($_GET['date']) ? $_GET['date'] : date('Y-m-d')))
            : (isset($input['week_start']) ? $input['week_start'] : date('Y-m-d'));
        if (!validDate($weekStart)) {
            throw new Exception("invalid week_start");
        }
        $weekStart = mondayOf($weekStart);
        $rows = ensureWeekly($pdo, $weekStart);
        echo json_encode(array('status' => 'success', 'type' => $type, 'week_start' => $weekStart, 'count' => count($rows), 'data' => $rows));
        return;
    }
    $monthStartVal = $fromGet
        ? (isset($_GET['month_start']) ? $_GET['month_start'] : (isset($_GET['date']) ? $_GET['date'] : date('Y-m-01')))
        : (isset($input['month_start']) ? $input['month_start'] : date('Y-m-01'));
    if (!validDate($monthStartVal)) {
        throw new Exception("invalid month_start");
    }
    $monthStartVal = monthStart($monthStartVal);
    $rows = ensureMonthly($pdo, $monthStartVal);
    echo json_encode(array('status' => 'success', 'type' => $type, 'month_start' => $monthStartVal, 'count' => count($rows), 'data' => $rows));
}

try {
    $pdo = getConnection();
    $method = $_SERVER['REQUEST_METHOD'];
    $input = ($method === 'POST') ? jsonInput() : array();
    $type = resolveType($input);

    if ($method === 'GET') {
        doFetch($pdo, $type, $input, true);
        exit();
    }

    if ($method !== 'POST') {
        throw new Exception("method not allowed");
    }

    $action = isset($input['action']) ? strtolower($input['action']) : '';
    $isFetchPost = ($action === 'fetch')
        || (
            !isset($input['title']) && !isset($input['id']) && !isset($input[0])
            && (isset($input['date']) || isset($input['week_start']) || isset($input['month_start']))
        );

    if ($isFetchPost) {
        doFetch($pdo, $type, $input, false);
        exit();
    }

    $records = $input;
    if (isset($input['title']) || isset($input['id']) || isset($input['section']) || isset($input['category'])) {
        $records = array($input);
    }
    if (!isset($records[0])) {
        throw new Exception("invalid input");
    }

    $pdo->beginTransaction();
    $saved = array();
    foreach ($records as $record) {
        $recAction = isset($record['action']) ? strtolower($record['action']) : $action;
        $isTodo = ($type === 'todo' || (isset($record['source']) && $record['source'] === 'todo'));
        if ($recAction === 'delete') {
            if (!$isTodo) {
                throw new Exception("delete is only supported for to do tasks");
            }
            $saved[] = deleteTodo($pdo, $record);
            continue;
        }
        $doUpdate = ($recAction === 'update' || (!empty($record['id']) && $recAction !== 'save'));
        if ($isTodo) {
            $saved[] = $doUpdate ? updateTodo($pdo, $record) : saveTodo($pdo, $record);
        } elseif ($type === 'daily') {
            $saved[] = $doUpdate ? updateDaily($pdo, $record) : saveDaily($pdo, $record);
        } elseif ($type === 'weekly') {
            $saved[] = $doUpdate ? updateWeekly($pdo, $record) : saveWeekly($pdo, $record);
        } else {
            $saved[] = $doUpdate ? updateMonthly($pdo, $record) : saveMonthly($pdo, $record);
        }
    }
    $pdo->commit();

    echo json_encode(array(
        'status' => 'success',
        'type' => $type,
        'count' => count($saved),
        'data' => count($saved) === 1 ? $saved[0] : $saved
    ));
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode(array(
        'status' => 'error',
        'message' => $e->getMessage()
    ));
}
