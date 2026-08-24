<?php
// auth_version.php - Current session version.
//
// Every logged-in browser stores the version it logged in with. When the value
// below changes, the app clears the stored token and sends the user back to the
// login screen.
//
// TO LOG EVERYBODY OUT: edit AUTH_VERSION below to any new value (a date plus a
// counter is easiest) and upload this file. No rebuild needed.

const AUTH_VERSION = "2026-08-19-01";

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

// An auth_version.txt sitting next to this file still wins when it is readable,
// so the old workflow keeps working where the web server can read it.
$versionFile = __DIR__ . "/auth_version.txt";
$version = is_readable($versionFile) ? trim(file_get_contents($versionFile)) : "";

if ($version === "") {
    $version = AUTH_VERSION;
}

echo json_encode(["status" => "success", "version" => $version]);
?>
