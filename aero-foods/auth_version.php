<?php
// auth_version.php - Current session version.
//
// Every logged-in browser stores the version it logged in with. When the value
// below changes, the app clears the stored token and sends the user back to the
// login screen. To force everybody to log in again, just edit
// auth_version.txt (any new value works - a date + counter is easiest).

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Max-Age: 3600");
    exit(0);
}

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Never let a proxy or the browser cache this response.
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");

$versionFile = __DIR__ . "/auth_version.txt";
$version = is_readable($versionFile) ? trim(file_get_contents($versionFile)) : "";

if ($version === "") {
    $version = "1";
}

echo json_encode(["status" => "success", "version" => $version]);
?>
