<?php
session_start();
require_once '../includes/config.php';

header('Content-Type: application/json; charset=utf-8');

$user = requireAuth();
$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'listar':  listar($user); break;
    case 'criar':   criar($user); break;
    case 'editar':  editar($user); break;
    case 'remover': remover($user); break;
    default: jsonResponse(['erro' => 'Acção inválida.'], 400);
}

function listar(array $user): void {
    $db = getDB();
    $mes  = (int)($_GET['mes'] ?? date('n'));
    $ano  = (int)($_GET['ano'] ?? date('Y'));

    $inicio = sprintf('%04d-%02d-01', $ano, $mes);
    $fim    = date('Y-m-t', strtotime($inicio));

    if ($user['perfil'] === 'Estudante') {
        // Estudante vê eventos públicos e os da sua turma
        $stmt = $db->prepare("
            SELECT a.*, u.nome AS criador,
                   t.nome AS turma_nome, d.nome AS disciplina_nome
            FROM agenda a
            JOIN utilizadores u ON u.id = a.criado_por
            LEFT JOIN turmas t ON t.id = a.turma_id
            LEFT JOIN disciplinas d ON d.id = a.disciplina_id
            WHERE a.data_inicio BETWEEN ? AND ?
            AND (a.publico=1 OR a.turma_id IN (
                SELECT turma_id FROM turma_estudantes WHERE estudante_id=?
            ))
            ORDER BY a.data_inicio
        ");
        $stmt->execute([$inicio . ' 00:00:00', $fim . ' 23:59:59', $user['id']]);
    } elseif ($user['perfil'] === 'Docente') {
        $stmt = $db->prepare("
            SELECT a.*, u.nome AS criador,
                   t.nome AS turma_nome, d.nome AS disciplina_nome
            FROM agenda a
            JOIN utilizadores u ON u.id = a.criado_por
            LEFT JOIN turmas t ON t.id = a.turma_id
            LEFT JOIN disciplinas d ON d.id = a.disciplina_id
            WHERE a.data_inicio BETWEEN ? AND ?
            AND (a.publico=1 OR a.criado_por=?)
            ORDER BY a.data_inicio
        ");
        $stmt->execute([$inicio . ' 00:00:00', $fim . ' 23:59:59', $user['id']]);
    } else {
        $stmt = $db->prepare("
            SELECT a.*, u.nome AS criador,
                   t.nome AS turma_nome, d.nome AS disciplina_nome
            FROM agenda a
            JOIN utilizadores u ON u.id = a.criado_por
            LEFT JOIN turmas t ON t.id = a.turma_id
            LEFT JOIN disciplinas d ON d.id = a.disciplina_id
            WHERE a.data_inicio BETWEEN ? AND ?
            ORDER BY a.data_inicio
        ");
        $stmt->execute([$inicio . ' 00:00:00', $fim . ' 23:59:59']);
    }

    jsonResponse(['dados' => $stmt->fetchAll()]);
}

function criar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico', 'Docente']);
    $db = getDB();

    $titulo       = trim($_POST['titulo'] ?? '');
    $descricao    = trim($_POST['descricao'] ?? '');
    $tipo         = $_POST['tipo'] ?? 'Evento';
    $data_inicio  = $_POST['data_inicio'] ?? '';
    $data_fim     = $_POST['data_fim'] ?? null;
    $turma_id     = $_POST['turma_id'] ? (int)$_POST['turma_id'] : null;
    $disciplina_id = $_POST['disciplina_id'] ? (int)$_POST['disciplina_id'] : null;
    $publico      = isset($_POST['publico']) ? 1 : 0;

    if (!$titulo || !$data_inicio) {
        jsonResponse(['erro' => 'Título e data são obrigatórios.'], 400);
    }

    $stmt = $db->prepare("
        INSERT INTO agenda (titulo, descricao, tipo, data_inicio, data_fim, criado_por, turma_id, disciplina_id, publico)
        VALUES (?,?,?,?,?,?,?,?,?)
    ");
    $stmt->execute([$titulo, $descricao, $tipo, $data_inicio, $data_fim ?: null, $user['id'], $turma_id, $disciplina_id, $publico]);

    // Notificar
    if ($publico || $turma_id) {
        $where = $turma_id
            ? "SELECT estudante_id AS id FROM turma_estudantes WHERE turma_id=$turma_id"
            : "SELECT id FROM utilizadores WHERE ativo=1";
        $ids = $db->query($where)->fetchAll(PDO::FETCH_COLUMN);
        $stmtN = $db->prepare("INSERT INTO notificacoes (utilizador_id, titulo, mensagem) VALUES (?,?,?)");
        foreach ($ids as $uid) {
            if ($uid != $user['id']) {
                $stmtN->execute([$uid, "Novo evento: $titulo", "Data: $data_inicio"]);
            }
        }
    }

    jsonResponse(['sucesso' => true, 'id' => $db->lastInsertId()]);
}

function editar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico', 'Docente']);
    $db = getDB();

    $id          = (int)($_POST['id'] ?? 0);
    $titulo      = trim($_POST['titulo'] ?? '');
    $descricao   = trim($_POST['descricao'] ?? '');
    $tipo        = $_POST['tipo'] ?? 'Evento';
    $data_inicio = $_POST['data_inicio'] ?? '';
    $data_fim    = $_POST['data_fim'] ?: null;
    $publico     = isset($_POST['publico']) ? 1 : 0;

    // Apenas o criador ou admin pode editar
    $dono = $db->prepare("SELECT criado_por FROM agenda WHERE id=?");
    $dono->execute([$id]);
    $r = $dono->fetch();
    if (!$r || ($r['criado_por'] != $user['id'] && !in_array($user['perfil'], ['Administrador','Gestor Académico']))) {
        jsonResponse(['erro' => 'Sem permissão.'], 403);
    }

    $db->prepare("UPDATE agenda SET titulo=?, descricao=?, tipo=?, data_inicio=?, data_fim=?, publico=? WHERE id=?")
       ->execute([$titulo, $descricao, $tipo, $data_inicio, $data_fim, $publico, $id]);

    jsonResponse(['sucesso' => true]);
}

function remover(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico', 'Docente']);
    $db = getDB();
    $id = (int)($_POST['id'] ?? 0);

    $dono = $db->prepare("SELECT criado_por FROM agenda WHERE id=?");
    $dono->execute([$id]);
    $r = $dono->fetch();
    if (!$r || ($r['criado_por'] != $user['id'] && !in_array($user['perfil'], ['Administrador','Gestor Académico']))) {
        jsonResponse(['erro' => 'Sem permissão.'], 403);
    }

    $db->prepare("DELETE FROM agenda WHERE id=?")->execute([$id]);
    jsonResponse(['sucesso' => true]);
}
