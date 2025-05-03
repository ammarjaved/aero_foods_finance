<?php
// Enable CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Max-Age: 3600");
    exit(0);
}

// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");
// Database configuration for PostgreSQL
$host = "192.168.1.34";
$dbname = "aero_foods_finance";
$username = "postgres";
$password = "Admin123";
$port = "5432";

try {
    // Create PostgreSQL database connection
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;user=$username;password=$password";
    $conn = new PDO($dsn);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get POST data
   // $data = json_decode(file_get_contents("php://input"), true);
   //$data =file_get_contents('php://input');
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

   
    
    // Validate input
    if (empty($username) || empty($password)) {
        throw new Exception("Email and password are required");
    }
    
    // Prepare and execute query
    $stmt = $conn->prepare("SELECT id, password FROM users WHERE username ='$username'");
	//$stmt->execute([':username' => $username]);
    $stmt->execute();
	$user = $stmt->fetch(PDO::FETCH_ASSOC);
	
  
    
    if ($password==$user['password']) {
        // Generate token
        $token = bin2hex(random_bytes(32));
        
        // Store token in database
        $updateStmt = $conn->prepare("UPDATE users SET token = :token WHERE id = :id");
        $updateStmt->execute(['token'=>$token, 'id'=>$user['id']]);
        
        echo json_encode([
            "status" => "success",
            "message" => "Login successful",
            "token" => $token
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "Invalid email or password"
        ]);
    }
    
} catch(Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>