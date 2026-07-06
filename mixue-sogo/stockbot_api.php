<?php
/**
 * StockBot PHP Integration Helper
 * PHP 7 Compatible Version
 */

class StockBotClient
{
    private $apiUrl;
    private $timeout;

    public function __construct(
        $apiUrl = 'http://127.0.0.1:8000',
        $timeout = 300
    ) {
        $this->apiUrl = rtrim($apiUrl, '/');
        $this->timeout = $timeout;
    }

    /**
     * Send a chat message to StockBot.
     *
     * @param string $message
     * @param string|null $sessionId
     * @return array
     * @throws RuntimeException
     */
    public function chat($message, $sessionId = null)
    {
        $payload = ['message' => $message];
        if ($sessionId) {
            $payload['session_id'] = $sessionId;
        }

        return $this->request('POST', '/chat', $payload);
    }

    /**
     * Clear a session's conversation memory.
     *
     * @param string $sessionId
     * @return array
     */
    public function clearSession($sessionId)
    {
        return $this->request('DELETE', "/chat/{$sessionId}");
    }

    /**
     * Check if the API is running.
     *
     * @return bool
     */
    public function healthCheck()
    {
        try {
            $response = $this->request('GET', '/health');
            return isset($response['status']) && $response['status'] === 'ok';
        } catch (Exception $e) {
            return false;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Internal HTTP helper
    // ──────────────────────────────────────────────────────────────────────────
    private function request($method, $path, $data = [])
    {
        set_time_limit($this->timeout + 30);

        $url = $this->apiUrl . $path;
        $ch = curl_init($url);

        $headers = ['Content-Type: application/json', 'Accept: application/json'];

        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $this->timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_CUSTOMREQUEST  => $method,
        ));

        if ($method === 'POST' && !empty($data)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $body     = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            throw new RuntimeException("StockBot API connection failed: {$curlError}");
        }

        if ($httpCode >= 400) {
            $decoded = json_decode($body, true);
            $error = isset($decoded['detail']) ? $decoded['detail'] : 'Unknown error';
            throw new RuntimeException("StockBot API error ({$httpCode}): {$error}");
        }

        return json_decode($body, true);
    }
}


// ──────────────────────────────────────────────────────────────────────────────
// Example usage as an AJAX endpoint
// ──────────────────────────────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    set_time_limit(330);
    session_start();

    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST');
    header('Access-Control-Allow-Headers: Content-Type');

    $input = json_decode(file_get_contents('php://input'), true);

    $apiUrl = getenv('STOCKBOT_API_URL') ? getenv('STOCKBOT_API_URL') : 'http://127.0.0.1:8000';

    // PHP 7: use normal constructor instead of named arguments
    $bot = new StockBotClient($apiUrl);

    // ── Handle clear session action ────────────────────────────────
    if (!empty($input['action']) && $input['action'] === 'clear') {
        $sessionId = null;
        if (!empty($input['session_id'])) {
            $sessionId = $input['session_id'];
        } elseif (!empty($_SESSION['stockbot_session_id'])) {
            $sessionId = $_SESSION['stockbot_session_id'];
        }

        if ($sessionId) {
            try {
                $bot->clearSession($sessionId);
            } catch (RuntimeException $e) {
                // Ignore — session may already be gone
            }
        }

        unset($_SESSION['stockbot_session_id']);
        echo json_encode(array('status' => 'cleared'));
        exit;
    }

    // ── Handle chat message ────────────────────────────────────────
    if (empty($input['message'])) {
        http_response_code(400);
        echo json_encode(array('error' => 'Message is required'));
        exit;
    }

    $sessionId = isset($_SESSION['stockbot_session_id']) ? $_SESSION['stockbot_session_id'] : null;
    if (!empty($input['session_id'])) {
        $sessionId = $input['session_id'];
    }

    try {
        $response = $bot->chat($input['message'], $sessionId);

        $_SESSION['stockbot_session_id'] = $response['session_id'];

        echo json_encode(array(
            'reply'         => $response['reply'],
            'session_id'    => $response['session_id'],
            'message_count' => $response['message_count'],
        ));

    } catch (RuntimeException $e) {
        http_response_code(500);
        echo json_encode(array('error' => $e->getMessage()));
    }

    exit;
}

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}