<?php
// ============================================================
//  SIDAA - Configuração da Base de Dados
// ============================================================
define('DB_HOST', 'localhost');
define('DB_NAME', 'sidaa');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

define('APP_NAME', 'SIDAA');
define('APP_VERSION', '1.0.0');
define('SESSION_TIMEOUT', 3600); // Indica 1 hora

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['erro' => 'Erro de conexão com a base de dados.']));
        }
    }
    return $pdo;
}

function jsonResponse(array $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requireAuth(): array {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (empty($_SESSION['user'])) {
        jsonResponse(['erro' => 'Não autenticado.'], 401);
    }
    return $_SESSION['user'];
}

function requireRole(array $user, array $roles): void {
    if (!in_array($user['perfil'], $roles)) {
        jsonResponse(['erro' => 'Sem permissão.'], 403);
    }
}
