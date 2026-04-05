<?php
session_start();
require_once '../includes/config.php';

header('Content-Type: application/json; charset=utf-8');

$user = requireAuth();
$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'minhas_turmas':    minhasTurmas($user); break;
    case 'estudantes_turma': estudantesTurma($user); break;
    case 'listar':           listar($user); break;
    case 'inserir':          inserir($user); break;
    case 'editar':           editar($user); break;
    case 'validar':          validar($user); break;
    case 'minhas_notas':     minhasNotas($user); break;
    default: jsonResponse(['erro' => 'Acção inválida.'], 400);
}

function minhasTurmas(array $user): void {
    $db = getDB();
    if ($user['perfil'] === 'Docente') {
        $stmt = $db->prepare("
            SELECT DISTINCT t.id, t.nome, t.ano_letivo, d.id AS disciplina_id, d.nome AS disciplina
            FROM turma_disciplinas td
            JOIN turmas t ON t.id = td.turma_id
            JOIN disciplinas d ON d.id = td.disciplina_id
            WHERE td.docente_id = ? AND t.ativo = 1
            ORDER BY t.nome, d.nome
        ");
        $stmt->execute([$user['id']]);
    } else {
        $stmt = $db->query("
            SELECT t.id, t.nome, t.ano_letivo, d.id AS disciplina_id, d.nome AS disciplina
            FROM turmas t
            JOIN turma_disciplinas td ON td.turma_id = t.id
            JOIN disciplinas d ON d.id = td.disciplina_id
            WHERE t.ativo = 1
            ORDER BY t.nome, d.nome
        ");
    }
    jsonResponse(['dados' => $stmt->fetchAll()]);
}

function estudantesTurma(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico', 'Docente']);
    $db = getDB();
    $turma_id = (int)($_GET['turma_id'] ?? 0);
    $disciplina_id = (int)($_GET['disciplina_id'] ?? 0);
    $ano = $_GET['ano_letivo'] ?? '2024/2025';

    $stmt = $db->prepare("
        SELECT u.id, u.nome, u.numero,
               n.id AS nota_id, n.nota1, n.nota2, n.nota3, n.media, n.situacao, n.validado
        FROM turma_estudantes te
        JOIN utilizadores u ON u.id = te.estudante_id
        LEFT JOIN notas n ON n.estudante_id = u.id AND n.turma_id = ? AND n.disciplina_id = ? AND n.ano_letivo = ?
        WHERE te.turma_id = ? AND te.ativo = 1
        ORDER BY u.nome
    ");
    $stmt->execute([$turma_id, $disciplina_id, $ano, $turma_id]);
    jsonResponse(['dados' => $stmt->fetchAll()]);
}

function listar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico', 'Docente']);
    $db = getDB();
    $turma_id = (int)($_GET['turma_id'] ?? 0);
    $disciplina_id = (int)($_GET['disciplina_id'] ?? 0);

    $stmt = $db->prepare("
        SELECT n.*, u.nome AS estudante_nome, u.numero,
               d.nome AS disciplina, t.nome AS turma
        FROM notas n
        JOIN utilizadores u ON u.id = n.estudante_id
        JOIN disciplinas d ON d.id = n.disciplina_id
        JOIN turmas t ON t.id = n.turma_id
        WHERE n.turma_id = ? AND n.disciplina_id = ?
        ORDER BY u.nome
    ");
    $stmt->execute([$turma_id, $disciplina_id]);
    jsonResponse(['dados' => $stmt->fetchAll()]);
}

function inserir(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico', 'Docente']);
    $db = getDB();

    $estudante_id  = (int)($_POST['estudante_id'] ?? 0);
    $turma_id      = (int)($_POST['turma_id'] ?? 0);
    $disciplina_id = (int)($_POST['disciplina_id'] ?? 0);
    $nota1 = isset($_POST['nota1']) && $_POST['nota1'] !== '' ? (float)$_POST['nota1'] : null;
    $nota2 = isset($_POST['nota2']) && $_POST['nota2'] !== '' ? (float)$_POST['nota2'] : null;
    $nota3 = isset($_POST['nota3']) && $_POST['nota3'] !== '' ? (float)$_POST['nota3'] : null;
    $ano   = $_POST['ano_letivo'] ?? '2024/2025';

    foreach ([$nota1, $nota2, $nota3] as $n) {
        if ($n !== null && ($n < 0 || $n > 20)) {
            jsonResponse(['erro' => 'Notas devem estar entre 0 e 20.'], 400);
        }
    }

    try {
        $stmt = $db->prepare("
            INSERT INTO notas (estudante_id, turma_id, disciplina_id, docente_id, nota1, nota2, nota3, ano_letivo)
            VALUES (?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE nota1=VALUES(nota1), nota2=VALUES(nota2), nota3=VALUES(nota3)
        ");
        $stmt->execute([$estudante_id, $turma_id, $disciplina_id, $user['id'], $nota1, $nota2, $nota3, $ano]);
        jsonResponse(['sucesso' => true]);
    } catch (PDOException $e) {
        jsonResponse(['erro' => 'Erro ao inserir nota.'], 500);
    }
}

function editar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico', 'Docente']);
    $db = getDB();

    $nota_id = (int)($_POST['nota_id'] ?? 0);
    $campo   = $_POST['campo'] ?? '';
    $valor   = $_POST['valor'] !== '' ? (float)$_POST['valor'] : null;

    if (!in_array($campo, ['nota1', 'nota2', 'nota3'])) {
        jsonResponse(['erro' => 'Campo inválido.'], 400);
    }
    if ($valor !== null && ($valor < 0 || $valor > 20)) {
        jsonResponse(['erro' => 'Nota deve estar entre 0 e 20.'], 400);
    }

    // log anterior
    $stmt = $db->prepare("SELECT $campo FROM notas WHERE id=?");
    $stmt->execute([$nota_id]);
    $anterior = $stmt->fetchColumn();

    $db->prepare("UPDATE notas SET $campo=? WHERE id=?")->execute([$valor, $nota_id]);

    $db->prepare("INSERT INTO log_notas (nota_id, campo_alterado, valor_anterior, valor_novo, alterado_por) VALUES (?,?,?,?,?)")
       ->execute([$nota_id, $campo, $anterior, $valor, $user['id']]);

    jsonResponse(['sucesso' => true]);
}

function validar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db = getDB();
    $nota_id = (int)($_POST['nota_id'] ?? 0);
    $db->prepare("UPDATE notas SET validado=1, validado_por=?, validado_em=NOW() WHERE id=?")
       ->execute([$user['id'], $nota_id]);
    jsonResponse(['sucesso' => true]);
}

function minhasNotas(array $user): void {
    requireRole($user, ['Estudante']);
    $db = getDB();
    $stmt = $db->prepare("
        SELECT n.nota1, n.nota2, n.nota3, n.media, n.situacao,
               d.nome AS disciplina, t.nome AS turma, n.ano_letivo, n.validado
        FROM notas n
        JOIN disciplinas d ON d.id = n.disciplina_id
        JOIN turmas t ON t.id = n.turma_id
        WHERE n.estudante_id = ?
        ORDER BY n.ano_letivo DESC, d.nome
    ");
    $stmt->execute([$user['id']]);
    jsonResponse(['dados' => $stmt->fetchAll()]);
}
