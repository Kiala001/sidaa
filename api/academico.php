<?php
// ============================================================
//  SIDAA - API: Cursos, Disciplinas, Turmas, Matrículas
// ============================================================
session_start();
require_once '../includes/config.php';

header('Content-Type: application/json; charset=utf-8');

$user   = requireAuth();
$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    // ── CURSOS ──
    case 'cursos_listar':  cursosListar($user); break;
    case 'cursos_criar':   cursosCriar($user); break;
    case 'cursos_editar':  cursosEditar($user); break;
    case 'cursos_remover': cursosRemover($user); break;

    // ── DISCIPLINAS ──
    case 'disc_listar':  discListar($user); break;
    case 'disc_criar':   discCriar($user); break;
    case 'disc_editar':  discEditar($user); break;
    case 'disc_remover': discRemover($user); break;

    // ── TURMAS ──
    case 'turmas_listar':  turmasListar($user); break;
    case 'turmas_criar':   turmasCriar($user); break;
    case 'turmas_editar':  turmasEditar($user); break;
    case 'turmas_remover': turmasRemover($user); break;
    case 'turmas_detalhe': turmasDetalhe($user); break;

    // ── ESTUDANTES NA TURMA ──
    case 'matricula_listar':   matriculaListar($user); break;
    case 'matricula_adicionar':matriculaAdicionar($user); break;
    case 'matricula_remover':  matriculaRemover($user); break;
    case 'estudantes_disponiveis': estudantesDisponiveis($user); break;

    // ── DOCENTES / DISCIPLINAS NA TURMA ──
    case 'td_listar':   tdListar($user); break;
    case 'td_atribuir': tdAtribuir($user); break;
    case 'td_remover':  tdRemover($user); break;
    case 'docentes_lista': docentesLista($user); break;

    default: jsonResponse(['erro' => 'Acção inválida.'], 400);
}

// ============================================================
//  CURSOS
// ============================================================
function cursosListar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db = getDB();
    $stmt = $db->query("
        SELECT c.*, COUNT(DISTINCT t.id) AS total_turmas,
               COUNT(DISTINCT d.id) AS total_disciplinas
        FROM cursos c
        LEFT JOIN turmas t ON t.curso_id = c.id AND t.ativo = 1
        LEFT JOIN disciplinas d ON d.curso_id = c.id AND d.ativo = 1
        GROUP BY c.id
        ORDER BY c.nome
    ");
    jsonResponse(['dados' => $stmt->fetchAll()]);
}

function cursosCriar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db = getDB();
    $nome    = trim($_POST['nome'] ?? '');
    $codigo  = strtoupper(trim($_POST['codigo'] ?? ''));
    $duracao = (int)($_POST['duracao_anos'] ?? 4);

    if (!$nome || !$codigo) jsonResponse(['erro' => 'Nome e código são obrigatórios.'], 400);

    try {
        $db->prepare("INSERT INTO cursos (nome, codigo, duracao_anos) VALUES (?,?,?)")
           ->execute([$nome, $codigo, $duracao]);
        jsonResponse(['sucesso' => true, 'id' => $db->lastInsertId()]);
    } catch (PDOException $e) {
        jsonResponse(['erro' => 'Código já existe.'], 409);
    }
}

function cursosEditar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db = getDB();
    $id      = (int)($_POST['id'] ?? 0);
    $nome    = trim($_POST['nome'] ?? '');
    $codigo  = strtoupper(trim($_POST['codigo'] ?? ''));
    $duracao = (int)($_POST['duracao_anos'] ?? 4);
    $ativo   = (int)($_POST['ativo'] ?? 1);

    if (!$id || !$nome || !$codigo) jsonResponse(['erro' => 'Dados inválidos.'], 400);

    try {
        $db->prepare("UPDATE cursos SET nome=?, codigo=?, duracao_anos=?, ativo=? WHERE id=?")
           ->execute([$nome, $codigo, $duracao, $ativo, $id]);
        jsonResponse(['sucesso' => true]);
    } catch (PDOException $e) {
        jsonResponse(['erro' => 'Código já existe.'], 409);
    }
}

function cursosRemover(array $user): void {
    requireRole($user, ['Administrador']);
    $db  = getDB();
    $id  = (int)($_POST['id'] ?? 0);
    // verifica se há turmas activas
    $t = $db->prepare("SELECT COUNT(*) FROM turmas WHERE curso_id=? AND ativo=1");
    $t->execute([$id]);
    if ($t->fetchColumn() > 0) jsonResponse(['erro' => 'Existem turmas activas neste curso.'], 409);
    $db->prepare("UPDATE cursos SET ativo=0 WHERE id=?")->execute([$id]);
    jsonResponse(['sucesso' => true]);
}

// ============================================================
//  DISCIPLINAS
// ============================================================
function discListar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico', 'Docente']);
    $db      = getDB();
    $cursoId = $_GET['curso_id'] ?? null;
    $sql     = "SELECT d.*, c.nome AS curso_nome FROM disciplinas d
                LEFT JOIN cursos c ON c.id = d.curso_id WHERE d.ativo=1";
    $params  = [];
    if ($cursoId) { $sql .= " AND d.curso_id=?"; $params[] = $cursoId; }
    $sql .= " ORDER BY d.nome";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse(['dados' => $stmt->fetchAll()]);
}

function discCriar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db      = getDB();
    $nome    = trim($_POST['nome'] ?? '');
    $codigo  = strtoupper(trim($_POST['codigo'] ?? ''));
    $cursoId = $_POST['curso_id'] ? (int)$_POST['curso_id'] : null;
    $carga   = (int)($_POST['carga_horaria'] ?? 60);

    if (!$nome || !$codigo) jsonResponse(['erro' => 'Nome e código são obrigatórios.'], 400);

    try {
        $db->prepare("INSERT INTO disciplinas (nome, codigo, curso_id, carga_horaria) VALUES (?,?,?,?)")
           ->execute([$nome, $codigo, $cursoId, $carga]);
        jsonResponse(['sucesso' => true, 'id' => $db->lastInsertId()]);
    } catch (PDOException $e) {
        jsonResponse(['erro' => 'Código já existe.'], 409);
    }
}

function discEditar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db      = getDB();
    $id      = (int)($_POST['id'] ?? 0);
    $nome    = trim($_POST['nome'] ?? '');
    $codigo  = strtoupper(trim($_POST['codigo'] ?? ''));
    $cursoId = $_POST['curso_id'] ? (int)$_POST['curso_id'] : null;
    $carga   = (int)($_POST['carga_horaria'] ?? 60);
    $ativo   = (int)($_POST['ativo'] ?? 1);

    if (!$id || !$nome) jsonResponse(['erro' => 'Dados inválidos.'], 400);

    try {
        $db->prepare("UPDATE disciplinas SET nome=?, codigo=?, curso_id=?, carga_horaria=?, ativo=? WHERE id=?")
           ->execute([$nome, $codigo, $cursoId, $carga, $ativo, $id]);
        jsonResponse(['sucesso' => true]);
    } catch (PDOException $e) {
        jsonResponse(['erro' => 'Código já existe.'], 409);
    }
}

function discRemover(array $user): void {
    requireRole($user, ['Administrador']);
    $db = getDB();
    $id = (int)($_POST['id'] ?? 0);
    $db->prepare("UPDATE disciplinas SET ativo=0 WHERE id=?")->execute([$id]);
    jsonResponse(['sucesso' => true]);
}

// ============================================================
//  TURMAS
// ============================================================
function turmasListar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db   = getDB();
    $stmt = $db->query("
        SELECT t.*, c.nome AS curso_nome,
               COUNT(DISTINCT te.estudante_id) AS total_estudantes,
               COUNT(DISTINCT td.disciplina_id) AS total_disciplinas
        FROM turmas t
        LEFT JOIN cursos c ON c.id = t.curso_id
        LEFT JOIN turma_estudantes te ON te.turma_id = t.id AND te.ativo = 1
        LEFT JOIN turma_disciplinas td ON td.turma_id = t.id
        WHERE t.ativo = 1
        GROUP BY t.id
        ORDER BY t.ano_letivo DESC, t.nome
    ");
    jsonResponse(['dados' => $stmt->fetchAll()]);
}

function turmasCriar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db       = getDB();
    $nome     = trim($_POST['nome'] ?? '');
    $anoLetivo= trim($_POST['ano_letivo'] ?? '');
    $cursoId  = $_POST['curso_id'] ? (int)$_POST['curso_id'] : null;
    $anoCurr  = (int)($_POST['ano_curricular'] ?? 1);
    $turno    = $_POST['turno'] ?? 'Manhã';

    if (!$nome || !$anoLetivo) jsonResponse(['erro' => 'Nome e ano lectivo são obrigatórios.'], 400);

    $db->prepare("INSERT INTO turmas (nome, ano_letivo, curso_id, ano_curricular, turno) VALUES (?,?,?,?,?)")
       ->execute([$nome, $anoLetivo, $cursoId, $anoCurr, $turno]);
    jsonResponse(['sucesso' => true, 'id' => $db->lastInsertId()]);
}

function turmasEditar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db       = getDB();
    $id       = (int)($_POST['id'] ?? 0);
    $nome     = trim($_POST['nome'] ?? '');
    $anoLetivo= trim($_POST['ano_letivo'] ?? '');
    $cursoId  = $_POST['curso_id'] ? (int)$_POST['curso_id'] : null;
    $anoCurr  = (int)($_POST['ano_curricular'] ?? 1);
    $turno    = $_POST['turno'] ?? 'Manhã';
    $ativo    = (int)($_POST['ativo'] ?? 1);

    if (!$id || !$nome) jsonResponse(['erro' => 'Dados inválidos.'], 400);

    $db->prepare("UPDATE turmas SET nome=?, ano_letivo=?, curso_id=?, ano_curricular=?, turno=?, ativo=? WHERE id=?")
       ->execute([$nome, $anoLetivo, $cursoId, $anoCurr, $turno, $ativo, $id]);
    jsonResponse(['sucesso' => true]);
}

function turmasRemover(array $user): void {
    requireRole($user, ['Administrador']);
    $db = getDB();
    $id = (int)($_POST['id'] ?? 0);
    $db->prepare("UPDATE turmas SET ativo=0 WHERE id=?")->execute([$id]);
    jsonResponse(['sucesso' => true]);
}

function turmasDetalhe(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db = getDB();
    $id = (int)($_GET['id'] ?? 0);
    $stmt = $db->prepare("
        SELECT t.*, c.nome AS curso_nome
        FROM turmas t LEFT JOIN cursos c ON c.id = t.curso_id
        WHERE t.id = ?
    ");
    $stmt->execute([$id]);
    jsonResponse(['dados' => $stmt->fetch()]);
}

// ============================================================
//  MATRÍCULAS (estudantes na turma)
// ============================================================
function matriculaListar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db      = getDB();
    $turmaId = (int)($_GET['turma_id'] ?? 0);
    $stmt    = $db->prepare("
        SELECT te.id AS matricula_id, te.data_matricula, te.ativo,
               u.id, u.nome, u.email, u.numero
        FROM turma_estudantes te
        JOIN utilizadores u ON u.id = te.estudante_id
        WHERE te.turma_id = ? AND te.ativo = 1
        ORDER BY u.nome
    ");
    $stmt->execute([$turmaId]);
    jsonResponse(['dados' => $stmt->fetchAll()]);
}

function estudantesDisponiveis(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db      = getDB();
    $turmaId = (int)($_GET['turma_id'] ?? 0);
    // estudantes não matriculados nesta turma
    $stmt = $db->prepare("
        SELECT u.id, u.nome, u.email, u.numero
        FROM utilizadores u
        JOIN perfis p ON p.id = u.perfil_id
        WHERE p.nome = 'Estudante' AND u.ativo = 1
          AND u.id NOT IN (
              SELECT estudante_id FROM turma_estudantes WHERE turma_id = ? AND ativo = 1
          )
        ORDER BY u.nome
    ");
    $stmt->execute([$turmaId]);
    jsonResponse(['dados' => $stmt->fetchAll()]);
}

function matriculaAdicionar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db          = getDB();
    $turmaId     = (int)($_POST['turma_id'] ?? 0);
    $estudanteIds = json_decode($_POST['estudante_ids'] ?? '[]', true);

    if (!$turmaId || empty($estudanteIds)) jsonResponse(['erro' => 'Dados inválidos.'], 400);

    $stmt = $db->prepare("
        INSERT INTO turma_estudantes (turma_id, estudante_id)
        VALUES (?,?)
        ON DUPLICATE KEY UPDATE ativo=1
    ");
    $ok = 0;
    foreach ($estudanteIds as $eId) {
        try { $stmt->execute([$turmaId, (int)$eId]); $ok++; }
        catch (PDOException $e) {}
    }
    jsonResponse(['sucesso' => true, 'adicionados' => $ok]);
}

function matriculaRemover(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db          = getDB();
    $turmaId     = (int)($_POST['turma_id'] ?? 0);
    $estudanteId = (int)($_POST['estudante_id'] ?? 0);
    $db->prepare("UPDATE turma_estudantes SET ativo=0 WHERE turma_id=? AND estudante_id=?")
       ->execute([$turmaId, $estudanteId]);
    jsonResponse(['sucesso' => true]);
}

// ============================================================
//  TURMA_DISCIPLINAS (docente atribuído)
// ============================================================
function tdListar(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db      = getDB();
    $turmaId = (int)($_GET['turma_id'] ?? 0);
    $stmt    = $db->prepare("
        SELECT td.id, td.ano_letivo,
               d.id AS disciplina_id, d.nome AS disciplina, d.codigo,
               u.id AS docente_id, u.nome AS docente, u.numero AS docente_numero
        FROM turma_disciplinas td
        JOIN disciplinas d ON d.id = td.disciplina_id
        JOIN utilizadores u ON u.id = td.docente_id
        WHERE td.turma_id = ?
        ORDER BY d.nome
    ");
    $stmt->execute([$turmaId]);
    jsonResponse(['dados' => $stmt->fetchAll()]);
}

function tdAtribuir(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db           = getDB();
    $turmaId      = (int)($_POST['turma_id'] ?? 0);
    $disciplinaId = (int)($_POST['disciplina_id'] ?? 0);
    $docenteId    = (int)($_POST['docente_id'] ?? 0);
    $anoLetivo    = trim($_POST['ano_letivo'] ?? '');

    if (!$turmaId || !$disciplinaId || !$docenteId || !$anoLetivo)
        jsonResponse(['erro' => 'Todos os campos são obrigatórios.'], 400);

    // verifica se docente existe e tem perfil correto
    $chk = $db->prepare("SELECT p.nome FROM utilizadores u JOIN perfis p ON p.id=u.perfil_id WHERE u.id=?");
    $chk->execute([$docenteId]);
    $perfil = $chk->fetchColumn();
    if (!in_array($perfil, ['Docente','Administrador','Gestor Académico']))
        jsonResponse(['erro' => 'Utilizador não tem perfil de docente.'], 400);

    try {
        $db->prepare("
            INSERT INTO turma_disciplinas (turma_id, disciplina_id, docente_id, ano_letivo)
            VALUES (?,?,?,?)
            ON DUPLICATE KEY UPDATE docente_id=VALUES(docente_id)
        ")->execute([$turmaId, $disciplinaId, $docenteId, $anoLetivo]);
        jsonResponse(['sucesso' => true]);
    } catch (PDOException $e) {
        jsonResponse(['erro' => 'Erro ao atribuir.'], 500);
    }
}

function tdRemover(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db = getDB();
    $id = (int)($_POST['id'] ?? 0);
    $db->prepare("DELETE FROM turma_disciplinas WHERE id=?")->execute([$id]);
    jsonResponse(['sucesso' => true]);
}

function docentesLista(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db   = getDB();
    $stmt = $db->query("
        SELECT u.id, u.nome, u.numero, u.email
        FROM utilizadores u
        JOIN perfis p ON p.id = u.perfil_id
        WHERE p.nome IN ('Docente','Administrador','Gestor Académico') AND u.ativo=1
        ORDER BY u.nome
    ");
    jsonResponse(['dados' => $stmt->fetchAll()]);
}
