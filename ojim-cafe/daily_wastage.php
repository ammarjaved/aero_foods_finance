<?php
// Database connection configuration for PostgreSQL
$host = "192.168.1.34";
$port = "5432";
$dbname = "ojim_finance";
$username = "postgres";
$password = "Admin123";

// Set headers to allow cross-origin requests (CORS)
header("Access-Control-Allow-Origin: *"); // Replace * with your actual frontend domain in production
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Check if the request is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST method is allowed']);
    exit;
}

// Get the raw POST data and decode JSON
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// If JSON decode fails, try to read from $_POST (form-data)
if (json_last_error() !== JSON_ERROR_NONE || empty($data)) {
    $data = $_POST;
}

// If still no data, return error
if (empty($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'No data received']);
    exit;
}

// Connect to PostgreSQL database
try {
    $conn_string = "pgsql:host=$host;port=$port;dbname=$dbname;user=$username;password=$password";
    $conn = new PDO($conn_string);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Check if ID is provided for update
if (!isset($data['id']) || empty($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'ID is required for update operation']);
    exit;
}

try {
    // UPDATE operation
    $sql = "UPDATE daily_wastage SET 
            bubur_wastage = :bubur_wastage,
            bubur_cost = :bubur_cost,
            bubur_value = :bubur_value,
            ayam_cincang_wastage = :ayam_cincang_wastage,
            ayam_cincang_cost = :ayam_cincang_cost,
            ayam_cincang_value = :ayam_cincang_value,
            daging_cincang_wastage = :daging_cincang_wastage,
            daging_cincang_cost = :daging_cincang_cost,
            daging_cincang_value = :daging_cincang_value,
            halia_goreng_wastage = :halia_goreng_wastage,
            halia_goreng_cost = :halia_goreng_cost,
            halia_goreng_value = :halia_goreng_value,
            tempe_goreng_wastage = :tempe_goreng_wastage,
            tempe_goreng_cost = :tempe_goreng_cost,
            tempe_goreng_value = :tempe_goreng_value,
            kentang_goreng_wastage = :kentang_goreng_wastage,
            kentang_goreng_cost = :kentang_goreng_cost,
            kentang_goreng_value = :kentang_goreng_value,
            ikan_bilis_goreng_wastage = :ikan_bilis_goreng_wastage,
            ikan_bilis_goreng_cost = :ikan_bilis_goreng_cost,
            ikan_bilis_goreng_value = :ikan_bilis_goreng_value,
            peria_goreng_wastage = :peria_goreng_wastage,
            peria_goreng_cost = :peria_goreng_cost,
            peria_goreng_value = :peria_goreng_value,
            udang_goreng_wastage = :udang_goreng_wastage,
            udang_goreng_cost = :udang_goreng_cost,
            udang_goreng_value = :udang_goreng_value,
            kacang_goreng_wastage = :kacang_goreng_wastage,
            kacang_goreng_cost = :kacang_goreng_cost,
            kacang_goreng_value = :kacang_goreng_value,
            paru_sira_wastage = :paru_sira_wastage,
            paru_sira_cost = :paru_sira_cost,
            paru_sira_value = :paru_sira_value,
            sotong_lobak_manis_wastage = :sotong_lobak_manis_wastage,
            sotong_lobak_manis_cost = :sotong_lobak_manis_cost,
            sotong_lobak_manis_value = :sotong_lobak_manis_value,
            ikan_masin_lobak_manis_wastage = :ikan_masin_lobak_manis_wastage,
            ikan_masin_lobak_manis_cost = :ikan_masin_lobak_manis_cost,
            ikan_masin_lobak_manis_value = :ikan_masin_lobak_manis_value,
            telur_masin_wastage = :telur_masin_wastage,
            telur_masin_cost = :telur_masin_cost,
            telur_masin_value = :telur_masin_value,
            bawang_goreng_wastage = :bawang_goreng_wastage,
            bawang_goreng_cost = :bawang_goreng_cost,
            bawang_goreng_value = :bawang_goreng_value,
            daun_bawang_wastage = :daun_bawang_wastage,
            daun_bawang_cost = :daun_bawang_cost,
            daun_bawang_value = :daun_bawang_value,
            lada_sulah_wastage = :lada_sulah_wastage,
            lada_sulah_cost = :lada_sulah_cost,
            lada_sulah_value = :lada_sulah_value,
            chilli_flakes_wastage = :chilli_flakes_wastage,
            chilli_flakes_cost = :chilli_flakes_cost,
            chilli_flakes_value = :chilli_flakes_value,
            sambal_bilis_wastage = :sambal_bilis_wastage,
            sambal_bilis_cost = :sambal_bilis_cost,
            sambal_bilis_value = :sambal_bilis_value,
            cili_padi_wastage = :cili_padi_wastage,
            cili_padi_cost = :cili_padi_cost,
            cili_padi_value = :cili_padi_value,
            minyak_bijian_wastage = :minyak_bijian_wastage,
            minyak_bijian_cost = :minyak_bijian_cost,
            minyak_bijian_value = :minyak_bijian_value,
            kicap_cair_wastage = :kicap_cair_wastage,
            kicap_cair_cost = :kicap_cair_cost,
            kicap_cair_value = :kicap_cair_value,
            total_before_discount = :total_before_discount,
            discount = :discount,
            final_total = :final_total,
            day = :day,
            month_date = :month_date,
            rental = :rental,
            utilities = :utilities,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = :updated_by
        WHERE id = :id
        RETURNING id";
    
    $stmt = $conn->prepare($sql);

    // Bind all values with proper defaults
    // Bubur
    $stmt->bindValue(':bubur_wastage', $data['bubur_wastage'] ?? 0);
    $stmt->bindValue(':bubur_cost', $data['bubur_cost'] ?? 0);
    $stmt->bindValue(':bubur_value', $data['bubur_value'] ?? 0);
    
    // Ayam Cincang
    $stmt->bindValue(':ayam_cincang_wastage', $data['ayam_cincang_wastage'] ?? 0);
    $stmt->bindValue(':ayam_cincang_cost', $data['ayam_cincang_cost'] ?? 0);
    $stmt->bindValue(':ayam_cincang_value', $data['ayam_cincang_value'] ?? 0);
    
    // Daging Cincang
    $stmt->bindValue(':daging_cincang_wastage', $data['daging_cincang_wastage'] ?? 0);
    $stmt->bindValue(':daging_cincang_cost', $data['daging_cincang_cost'] ?? 0);
    $stmt->bindValue(':daging_cincang_value', $data['daging_cincang_value'] ?? 0);
    
    // Halia Goreng
    $stmt->bindValue(':halia_goreng_wastage', $data['halia_goreng_wastage'] ?? 0);
    $stmt->bindValue(':halia_goreng_cost', $data['halia_goreng_cost'] ?? 0);
    $stmt->bindValue(':halia_goreng_value', $data['halia_goreng_value'] ?? 0);
    
    // Tempe Goreng
    $stmt->bindValue(':tempe_goreng_wastage', $data['tempe_goreng_wastage'] ?? 0);
    $stmt->bindValue(':tempe_goreng_cost', $data['tempe_goreng_cost'] ?? 0);
    $stmt->bindValue(':tempe_goreng_value', $data['tempe_goreng_value'] ?? 0);
    
    // Kentang Goreng
    $stmt->bindValue(':kentang_goreng_wastage', $data['kentang_goreng_wastage'] ?? 0);
    $stmt->bindValue(':kentang_goreng_cost', $data['kentang_goreng_cost'] ?? 0);
    $stmt->bindValue(':kentang_goreng_value', $data['kentang_goreng_value'] ?? 0);
    
    // Ikan Bilis Goreng
    $stmt->bindValue(':ikan_bilis_goreng_wastage', $data['ikan_bilis_goreng_wastage'] ?? 0);
    $stmt->bindValue(':ikan_bilis_goreng_cost', $data['ikan_bilis_goreng_cost'] ?? 0);
    $stmt->bindValue(':ikan_bilis_goreng_value', $data['ikan_bilis_goreng_value'] ?? 0);
    
    // Peria Goreng
    $stmt->bindValue(':peria_goreng_wastage', $data['peria_goreng_wastage'] ?? 0);
    $stmt->bindValue(':peria_goreng_cost', $data['peria_goreng_cost'] ?? 0);
    $stmt->bindValue(':peria_goreng_value', $data['peria_goreng_value'] ?? 0);
    
    // Udang Goreng
    $stmt->bindValue(':udang_goreng_wastage', $data['udang_goreng_wastage'] ?? 0);
    $stmt->bindValue(':udang_goreng_cost', $data['udang_goreng_cost'] ?? 0);
    $stmt->bindValue(':udang_goreng_value', $data['udang_goreng_value'] ?? 0);
    
    // Kacang Goreng
    $stmt->bindValue(':kacang_goreng_wastage', $data['kacang_goreng_wastage'] ?? 0);
    $stmt->bindValue(':kacang_goreng_cost', $data['kacang_goreng_cost'] ?? 0);
    $stmt->bindValue(':kacang_goreng_value', $data['kacang_goreng_value'] ?? 0);
    
    // Paru Sira
    $stmt->bindValue(':paru_sira_wastage', $data['paru_sira_wastage'] ?? 0);
    $stmt->bindValue(':paru_sira_cost', $data['paru_sira_cost'] ?? 0);
    $stmt->bindValue(':paru_sira_value', $data['paru_sira_value'] ?? 0);
    
    // Sotong Lobak Manis
    $stmt->bindValue(':sotong_lobak_manis_wastage', $data['sotong_lobak_manis_wastage'] ?? 0);
    $stmt->bindValue(':sotong_lobak_manis_cost', $data['sotong_lobak_manis_cost'] ?? 0);
    $stmt->bindValue(':sotong_lobak_manis_value', $data['sotong_lobak_manis_value'] ?? 0);
    
    // Ikan Masin Lobak Manis
    $stmt->bindValue(':ikan_masin_lobak_manis_wastage', $data['ikan_masin_lobak_manis_wastage'] ?? 0);
    $stmt->bindValue(':ikan_masin_lobak_manis_cost', $data['ikan_masin_lobak_manis_cost'] ?? 0);
    $stmt->bindValue(':ikan_masin_lobak_manis_value', $data['ikan_masin_lobak_manis_value'] ?? 0);
    
    // Telur Masin
    $stmt->bindValue(':telur_masin_wastage', $data['telur_masin_wastage'] ?? 0);
    $stmt->bindValue(':telur_masin_cost', $data['telur_masin_cost'] ?? 0);
    $stmt->bindValue(':telur_masin_value', $data['telur_masin_value'] ?? 0);
    
    // Bawang Goreng
    $stmt->bindValue(':bawang_goreng_wastage', $data['bawang_goreng_wastage'] ?? 0);
    $stmt->bindValue(':bawang_goreng_cost', $data['bawang_goreng_cost'] ?? 0);
    $stmt->bindValue(':bawang_goreng_value', $data['bawang_goreng_value'] ?? 0);
    
    // Daun Bawang
    $stmt->bindValue(':daun_bawang_wastage', $data['daun_bawang_wastage'] ?? 0);
    $stmt->bindValue(':daun_bawang_cost', $data['daun_bawang_cost'] ?? 0);
    $stmt->bindValue(':daun_bawang_value', $data['daun_bawang_value'] ?? 0);
    
    // Lada Sulah
    $stmt->bindValue(':lada_sulah_wastage', $data['lada_sulah_wastage'] ?? 0);
    $stmt->bindValue(':lada_sulah_cost', $data['lada_sulah_cost'] ?? 0);
    $stmt->bindValue(':lada_sulah_value', $data['lada_sulah_value'] ?? 0);
    
    // Chilli Flakes
    $stmt->bindValue(':chilli_flakes_wastage', $data['chilli_flakes_wastage'] ?? 0);
    $stmt->bindValue(':chilli_flakes_cost', $data['chilli_flakes_cost'] ?? 0);
    $stmt->bindValue(':chilli_flakes_value', $data['chilli_flakes_value'] ?? 0);
    
    // Sambal Bilis
    $stmt->bindValue(':sambal_bilis_wastage', $data['sambal_bilis_wastage'] ?? 0);
    $stmt->bindValue(':sambal_bilis_cost', $data['sambal_bilis_cost'] ?? 0);
    $stmt->bindValue(':sambal_bilis_value', $data['sambal_bilis_value'] ?? 0);
    
    // Cili Padi
    $stmt->bindValue(':cili_padi_wastage', $data['cili_padi_wastage'] ?? 0);
    $stmt->bindValue(':cili_padi_cost', $data['cili_padi_cost'] ?? 0);
    $stmt->bindValue(':cili_padi_value', $data['cili_padi_value'] ?? 0);
    
    // Minyak Bijian
    $stmt->bindValue(':minyak_bijian_wastage', $data['minyak_bijian_wastage'] ?? 0);
    $stmt->bindValue(':minyak_bijian_cost', $data['minyak_bijian_cost'] ?? 0);
    $stmt->bindValue(':minyak_bijian_value', $data['minyak_bijian_value'] ?? 0);
    
    // Kicap Cair
    $stmt->bindValue(':kicap_cair_wastage', $data['kicap_cair_wastage'] ?? 0);
    $stmt->bindValue(':kicap_cair_cost', $data['kicap_cair_cost'] ?? 0);
    $stmt->bindValue(':kicap_cair_value', $data['kicap_cair_value'] ?? 0);
    
    // Total Values
    $stmt->bindValue(':total_before_discount', $data['total_before_discount'] ?? 0);
    $stmt->bindValue(':discount', $data['discount'] ?? 0);
    $stmt->bindValue(':final_total', $data['final_total'] ?? 0);
    
    // Additional Fields
    $stmt->bindValue(':day', $data['day'] ?? null);
    $stmt->bindValue(':month_date', $data['month_date'] ?? null);
    $stmt->bindValue(':rental', $data['rental'] ?? 0);
    $stmt->bindValue(':utilities', $data['utilities'] ?? 0);
    $stmt->bindValue(':updated_by', $data['updated_by'] ?? '');
    
    // Bind ID for WHERE clause
    $stmt->bindValue(':id', $data['id']);
    
    // Execute the query
    $stmt->execute();
    
    // Get the ID of the updated record
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $recordId = $result['id'];
    
    // Send success response
    http_response_code(200);
    echo json_encode([
        'success' => true, 
        'message' => 'Daily wastage data updated successfully', 
        'id' => $recordId
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

// Close the connection
$conn = null;
?>