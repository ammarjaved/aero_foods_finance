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
    
    // Prepare and execute query - join with employees to check is_active status
    $stmt = $conn->prepare("SELECT u.id, u.password, u.is_admin, e.is_active 
                            FROM users u 
                            LEFT JOIN employees e ON LOWER(TRIM(e.short_name)) = LOWER(TRIM(u.username))
                            WHERE u.username = '$username'");
	//$stmt->execute([':username' => $username]);
    $stmt->execute();
	$user = $stmt->fetch(PDO::FETCH_ASSOC);
	
    // Check if user exists
    if (!$user) {
        echo json_encode([
            "status" => "error",
            "message" => "Invalid username or password"
        ]);
        exit;
    }

    // Check if user is inactive
    if (isset($user['is_active']) && strtolower(trim($user['is_active'])) === 'no') {
        echo json_encode([
            "status" => "error",
            "message" => "This account is inactive. Please contact administrator."
        ]);
        exit;
    }
  
    
    if ($password==$user['password']) {
        // Generate token
        $token = bin2hex(random_bytes(32));
        
        // Store token in database
        $updateStmt = $conn->prepare("UPDATE users SET token = :token WHERE id = :id");
        $updateStmt->execute(['token'=>$token, 'id'=>$user['id']]);
        
        // is_admin is the role the web app gates on:
        //   "yes"     -> administrator, full access
        //   "manager" -> sees everything an administrator sees, read only
        //   "no"      -> regular user
        $role = isset($user['is_admin']) ? strtolower(trim($user['is_admin'])) : 'no';
        if (!in_array($role, ['yes', 'no', 'manager'], true)) {
            $role = 'no';
        }
        // The built-in "admin" account predates the role column being used.
        if ($role !== 'manager' && strtolower(trim($username)) === 'admin') {
            $role = 'yes';
        }

        echo json_encode([
            "status" => "success",
            "message" => "Login successful",
            "token" => $token,
            "is_admin" => $role
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