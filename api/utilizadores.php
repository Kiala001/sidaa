<?php
session_start();
require_once '../includes/config.php';

header('Content-Type: application/json; charset=utf-8');

$user = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'listar':
        listar($user);
        break;
    case 'criar':
        criar($user);
        break;
    case 'editar':
        editar($user);
        break;
    case 'remover':
        remover($user);
        break;
    case 'perfis':
        listarPerfis($user);
        break;
    default:
        jsonResponse(['erro' => 'Acção inválida.'], 400);
}

function listar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db = getDB();
    $perfil_id = $_GET['perfil_id'] ?? null;
    $sql = "SELECT u.id, u.nome, u.email, u.numero, u.telefone, u.ativo,
                   p.nome AS perfil, u.criado_em
            FROM utilizadores u
            JOIN perfis p ON p.id = u.perfil_id
            WHERE 1=1";
    $params = [];
    if ($perfil_id) {
        $sql .= " AND u.perfil_id = ?";
        $params[] = $perfil_id;
    }
    $sql .= " ORDER BY p.id, u.nome";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse(['dados' => $stmt->fetchAll()]);
}

function criar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db = getDB();

    $nome    = trim($_POST['nome'] ?? '');
    $email   = trim($_POST['email'] ?? '');
    $senha   = $_POST['senha'] ?? '';
    $perfil  = (int)($_POST['perfil_id'] ?? 0);
    $numero  = trim($_POST['numero'] ?? '');
    $tel     = trim($_POST['telefone'] ?? '');

    if (!$nome || !$email || !$senha || !$perfil) {
        jsonResponse(['erro' => 'Campos obrigatórios em falta.'], 400);
    }

    // Gestor só pode criar Docente e Estudante
    if ($user['perfil'] === 'Gestor Académico' && $perfil <= 2) {
        jsonResponse(['erro' => 'Sem permissão para criar este perfil.'], 403);
    }

    $hash = password_hash($senha, PASSWORD_BCRYPT);
    try {
        $stmt = $db->prepare("INSERT INTO utilizadores (nome, email, palavra_passe, perfil_id, numero, telefone) VALUES (?,?,?,?,?,?)");
        $stmt->execute([$nome, $email, $hash, $perfil, $numero, $tel]);
        jsonResponse(['sucesso' => true, 'id' => $db->lastInsertId()]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            jsonResponse(['erro' => 'Email já registado.'], 409);
        }
        jsonResponse(['erro' => 'Erro ao criar utilizador.'], 500);
    }
}

function editar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db = getDB();

    $id     = (int)($_POST['id'] ?? 0);
    $nome   = trim($_POST['nome'] ?? '');
    $email  = trim($_POST['email'] ?? '');
    $numero = trim($_POST['numero'] ?? '');
    $tel    = trim($_POST['telefone'] ?? '');
    $ativo  = isset($_POST['ativo']) ? (int)$_POST['ativo'] : 1;
    $senha  = $_POST['senha'] ?? '';

    if (!$id || !$nome || !$email) {
        jsonResponse(['erro' => 'Campos obrigatórios em falta.'], 400);
    }

    $sql = "UPDATE utilizadores SET nome=?, email=?, numero=?, telefone=?, ativo=?";
    $params = [$nome, $email, $numero, $tel, $ativo];

    if ($senha) {
        $sql .= ", palavra_passe=?";
        $params[] = password_hash($senha, PASSWORD_BCRYPT);
    }

    $sql .= " WHERE id=?";
    $params[] = $id;

    try {
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        jsonResponse(['sucesso' => true]);
    } catch (PDOException $e) {
        jsonResponse(['erro' => 'Erro ao actualizar.'], 500);
    }
}

function remover(array $user): void {
    requireRole($user, ['Administrador']);
    $db = getDB();
    $id = (int)($_POST['id'] ?? 0);
    if (!$id || $id === (int)$user['id']) {
        jsonResponse(['erro' => 'Não pode remover este utilizador.'], 400);
    }
    $stmt = $db->prepare("UPDATE utilizadores SET ativo=0 WHERE id=?");
    $stmt->execute([$id]);
    jsonResponse(['sucesso' => true]);
}

function listarPerfis(array $user): void {
    $db = getDB();
    $stmt = $db->query("SELECT id, nome FROM perfis ORDER BY id");
    jsonResponse(['dados' => $stmt->fetchAll()]);
}
