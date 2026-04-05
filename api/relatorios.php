<?php
session_start();
require_once '../includes/config.php';

header('Content-Type: application/json; charset=utf-8');

$user = requireAuth();
requireRole($user, ['Administrador', 'Gestor Académico', 'Docente']);

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'por_estudante':  relatorioPorEstudante($user); break;
    case 'por_turma':      relatorioPorTurma($user); break;
    case 'por_disciplina': relatorioPorDisciplina($user); break;
    case 'institucional':  relatorioInstitucional($user); break;
    case 'turmas':         listarTurmas($user); break;
    case 'disciplinas':    listarDisciplinas($user); break;
    default: jsonResponse(['erro' => 'Acção inválida.'], 400);
}

function relatorioPorEstudante(array $user): void {
    $db = getDB();
    $estudante_id = (int)($_GET['estudante_id'] ?? 0);
    $ano = $_GET['ano_letivo'] ?? '2024/2025';

    $stmt = $db->prepare("
        SELECT u.nome, u.numero, d.nome AS disciplina, t.nome AS turma,
               n.nota1, n.nota2, n.nota3, n.media, n.situacao, n.validado
        FROM notas n
        JOIN utilizadores u ON u.id = n.estudante_id
        JOIN disciplinas d ON d.id = n.disciplina_id
        JOIN turmas t ON t.id = n.turma_id
        WHERE n.estudante_id = ? AND n.ano_letivo = ?
        ORDER BY d.nome
    ");
    $stmt->execute([$estudante_id, $ano]);
    $dados = $stmt->fetchAll();

    $aprovadas = array_filter($dados, fn($r) => $r['situacao'] === 'Aprovado');
    $reprovadas = array_filter($dados, fn($r) => $r['situacao'] === 'Reprovado');
    $medias = array_filter(array_column($dados, 'media'), fn($m) => $m !== null);

    jsonResponse([
        'dados' => $dados,
        'resumo' => [
            'total' => count($dados),
            'aprovadas' => count($aprovadas),
            'reprovadas' => count($reprovadas),
            'media_geral' => $medias ? round(array_sum($medias) / count($medias), 2) : null
        ]
    ]);
}

function relatorioPorTurma(array $user): void {
    $db = getDB();
    $turma_id = (int)($_GET['turma_id'] ?? 0);
    $ano = $_GET['ano_letivo'] ?? '2024/2025';

    $stmt = $db->prepare("
        SELECT u.nome AS estudante, u.numero,
               COUNT(n.id) AS total_disciplinas,
               SUM(CASE WHEN n.situacao='Aprovado' THEN 1 ELSE 0 END) AS aprovadas,
               SUM(CASE WHEN n.situacao='Reprovado' THEN 1 ELSE 0 END) AS reprovadas,
               ROUND(AVG(n.media),2) AS media_geral
        FROM turma_estudantes te
        JOIN utilizadores u ON u.id = te.estudante_id
        LEFT JOIN notas n ON n.estudante_id = u.id AND n.turma_id = te.turma_id AND n.ano_letivo = ?
        WHERE te.turma_id = ? AND te.ativo = 1
        GROUP BY u.id, u.nome, u.numero
        ORDER BY u.nome
    ");
    $stmt->execute([$ano, $turma_id]);
    jsonResponse(['dados' => $stmt->fetchAll()]);
}

function relatorioPorDisciplina(array $user): void {
    $db = getDB();
    $disciplina_id = (int)($_GET['disciplina_id'] ?? 0);
    $ano = $_GET['ano_letivo'] ?? '2024/2025';

    $stmt = $db->prepare("
        SELECT d.nome AS disciplina,
               COUNT(n.id) AS total_alunos,
               SUM(CASE WHEN n.situacao='Aprovado' THEN 1 ELSE 0 END) AS aprovados,
               SUM(CASE WHEN n.situacao='Reprovado' THEN 1 ELSE 0 END) AS reprovados,
               ROUND(AVG(n.media),2) AS media,
               ROUND(MIN(n.media),2) AS minima,
               ROUND(MAX(n.media),2) AS maxima
        FROM notas n
        JOIN disciplinas d ON d.id = n.disciplina_id
        WHERE n.disciplina_id = ? AND n.ano_letivo = ?
        GROUP BY d.id, d.nome
    ");
    $stmt->execute([$disciplina_id, $ano]);
    jsonResponse(['dados' => $stmt->fetchAll()]);
}

function relatorioInstitucional(array $user): void {
    requireRole($user, ['Administrador', 'Gestor Académico']);
    $db = getDB();
    $ano = $_GET['ano_letivo'] ?? '2024/2025';

    $stmt = $db->prepare("
        SELECT
            (SELECT COUNT(*) FROM utilizadores WHERE perfil_id=4 AND ativo=1) AS total_estudantes,
            (SELECT COUNT(*) FROM utilizadores WHERE perfil_id=3 AND ativo=1) AS total_docentes,
            (SELECT COUNT(*) FROM turmas WHERE ativo=1) AS total_turmas,
            (SELECT COUNT(*) FROM notas WHERE ano_letivo=?) AS total_avaliacoes,
            (SELECT COUNT(*) FROM notas WHERE situacao='Aprovado' AND ano_letivo=?) AS total_aprovados,
            (SELECT COUNT(*) FROM notas WHERE situacao='Reprovado' AND ano_letivo=?) AS total_reprovados,
            (SELECT ROUND(AVG(media),2) FROM notas WHERE media IS NOT NULL AND ano_letivo=?) AS media_geral
    ");
    $stmt->execute([$ano, $ano, $ano, $ano]);
    $resumo = $stmt->fetch();

    // Por curso
    $stmt2 = $db->prepare("
        SELECT c.nome AS curso,
               COUNT(DISTINCT te.estudante_id) AS estudantes,
               COUNT(n.id) AS avaliacoes,
               SUM(CASE WHEN n.situacao='Aprovado' THEN 1 ELSE 0 END) AS aprovados,
               ROUND(AVG(n.media),2) AS media
        FROM cursos c
        LEFT JOIN turmas t ON t.curso_id = c.id AND t.ativo=1
        LEFT JOIN turma_estudantes te ON te.turma_id = t.id
        LEFT JOIN notas n ON n.turma_id = t.id AND n.ano_letivo=?
        GROUP BY c.id, c.nome
        ORDER BY c.nome
    ");
    $stmt2->execute([$ano]);

    jsonResponse(['resumo' => $resumo, 'por_curso' => $stmt2->fetchAll()]);
}

function listarTurmas(array $user): void {
    $db = getDB();
    if ($user['perfil'] === 'Docente') {
        $stmt = $db->prepare("
            SELECT DISTINCT t.id, t.nome, t.ano_letivo
            FROM turmas t JOIN turma_disciplinas td ON td.turma_id = t.id
            WHERE td.docente_id = ? AND t.ativo=1
        ");
        $stmt->execute([$user['id']]);
    } else {
        $stmt = $db->query("SELECT id, nome, ano_letivo FROM turmas WHERE ativo=1 ORDER BY nome");
    }
    jsonResponse(['dados' => $stmt->fetchAll()]);
}

function listarDisciplinas(array $user): void {
    $db = getDB();
    $stmt = $db->query("SELECT id, nome FROM disciplinas WHERE ativo=1 ORDER BY nome");
    jsonResponse(['dados' => $stmt->fetchAll()]);
}
