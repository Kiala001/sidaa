<?php
session_start();
require_once '../includes/config.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        login();
        break;
    case 'logout':
        logout();
        break;
    case 'session':
        sessionInfo();
        break;
    default:
        jsonResponse(['erro' => 'Acção inválida.'], 400);
}

function login(): void {
    $email = trim($_POST['email'] ?? '');
    $senha = $_POST['senha'] ?? '';

    if (!$email || !$senha) {
        jsonResponse(['erro' => 'Email e senha são obrigatórios.'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("
        SELECT u.id, u.nome, u.email, u.palavra_passe, u.ativo, p.nome AS perfil, u.numero
        FROM utilizadores u
        JOIN perfis p ON p.id = u.perfil_id
        WHERE u.email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($senha, $user['palavra_passe'])) {
        jsonResponse(['erro' => 'Credenciais inválidas.'], 401);
    }

    if (!$user['ativo']) {
        jsonResponse(['erro' => 'Conta desactivada. Contacte o administrador.'], 403);
    }

    unset($user['palavra_passe']);
    $_SESSION['user'] = $user;
    $_SESSION['last_activity'] = time();

    jsonResponse(['sucesso' => true, 'user' => $user]);
}

function logout(): void {
    session_destroy();
    jsonResponse(['sucesso' => true]);
}

function sessionInfo(): void {
    if (empty($_SESSION['user'])) {
        jsonResponse(['autenticado' => false]);
    }
    // timeout check
    if (time() - ($_SESSION['last_activity'] ?? 0) > SESSION_TIMEOUT) {
        session_destroy();
        jsonResponse(['autenticado' => false, 'motivo' => 'timeout']);
    }
    $_SESSION['last_activity'] = time();
    jsonResponse(['autenticado' => true, 'user' => $_SESSION['user']]);
}
