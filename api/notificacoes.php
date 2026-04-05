<?php
session_start();
require_once '../includes/config.php';

header('Content-Type: application/json; charset=utf-8');

$user = requireAuth();
$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'listar':
        $stmt = getDB()->prepare("SELECT * FROM notificacoes WHERE utilizador_id=? ORDER BY criado_em DESC LIMIT 20");
        $stmt->execute([$user['id']]);
        jsonResponse(['dados' => $stmt->fetchAll()]);
        break;
    case 'marcar_lida':
        $id = (int)($_POST['id'] ?? 0);
        getDB()->prepare("UPDATE notificacoes SET lida=1 WHERE id=? AND utilizador_id=?")->execute([$id, $user['id']]);
        jsonResponse(['sucesso' => true]);
        break;
    case 'marcar_todas':
        getDB()->prepare("UPDATE notificacoes SET lida=1 WHERE utilizador_id=?")->execute([$user['id']]);
        jsonResponse(['sucesso' => true]);
        break;
    case 'nao_lidas':
        $stmt = getDB()->prepare("SELECT COUNT(*) FROM notificacoes WHERE utilizador_id=? AND lida=0");
        $stmt->execute([$user['id']]);
        jsonResponse(['total' => (int)$stmt->fetchColumn()]);
        break;
    default:
        jsonResponse(['erro' => 'Acção inválida.'], 400);
}
