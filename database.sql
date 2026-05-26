-- ============================================================
--  SIDAA - Sistema de Informação e Dados Académicos Académicos
--  Base de Dados MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS sidaa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sidaa;

-- ============================================================
-- TABELA: perfis (roles)
-- ============================================================
CREATE TABLE perfis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO perfis (nome, descricao) VALUES
('Administrador', 'Acesso total ao sistema'),
('Gestor Académico', 'Gestão académica e relatórios'),
('Docente', 'Inserir e gerir notas das suas turmas'),
('Estudante', 'Consultar notas e agenda');

-- ============================================================
-- TABELA: utilizadores
-- ============================================================
CREATE TABLE utilizadores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    palavra_passe VARCHAR(255) NOT NULL,
    perfil_id INT NOT NULL,
    numero VARCHAR(20),
    telefone VARCHAR(20),
    ativo TINYINT(1) DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (perfil_id) REFERENCES perfis(id)
);

-- Admin padrão: admin@sidaa.ao / Admin@123
INSERT INTO utilizadores (nome, email, palavra_passe, perfil_id, numero) VALUES
('Administrador SIDAA', 'admin@sidaa.ao', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 'ADM001');

-- ============================================================
-- TABELA: cursos
-- ============================================================
CREATE TABLE cursos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    duracao_anos INT DEFAULT 4,
    ativo TINYINT(1) DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABELA: disciplinas
-- ============================================================
CREATE TABLE disciplinas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    curso_id INT,
    carga_horaria INT DEFAULT 60,
    ativo TINYINT(1) DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (curso_id) REFERENCES cursos(id)
);

-- ============================================================
-- TABELA: turmas
-- ============================================================
CREATE TABLE turmas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    ano_letivo VARCHAR(9) NOT NULL,
    curso_id INT,
    ano_curricular INT DEFAULT 1,
    turno ENUM('Manhã','Tarde','Noite') DEFAULT 'Manhã',
    ativo TINYINT(1) DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (curso_id) REFERENCES cursos(id)
);

-- ============================================================
-- TABELA: turma_estudantes (matrícula)
-- ============================================================
CREATE TABLE turma_estudantes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    turma_id INT NOT NULL,
    estudante_id INT NOT NULL,
    data_matricula DATE DEFAULT (CURRENT_DATE),
    ativo TINYINT(1) DEFAULT 1,
    UNIQUE KEY uk_turma_estudante (turma_id, estudante_id),
    FOREIGN KEY (turma_id) REFERENCES turmas(id),
    FOREIGN KEY (estudante_id) REFERENCES utilizadores(id)
);

-- ============================================================
-- TABELA: turma_disciplinas (docente atribuído)
-- ============================================================
CREATE TABLE turma_disciplinas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    turma_id INT NOT NULL,
    disciplina_id INT NOT NULL,
    docente_id INT NOT NULL,
    ano_letivo VARCHAR(9) NOT NULL,
    UNIQUE KEY uk_td (turma_id, disciplina_id, ano_letivo),
    FOREIGN KEY (turma_id) REFERENCES turmas(id),
    FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id),
    FOREIGN KEY (docente_id) REFERENCES utilizadores(id)
);

-- ============================================================
-- TABELA: notas
-- ============================================================
CREATE TABLE notas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudante_id INT NOT NULL,
    turma_id INT NOT NULL,
    disciplina_id INT NOT NULL,
    docente_id INT NOT NULL,
    nota1 DECIMAL(4,2) CHECK (nota1 BETWEEN 0 AND 20),
    nota2 DECIMAL(4,2) CHECK (nota2 BETWEEN 0 AND 20),
    nota3 DECIMAL(4,2) CHECK (nota3 BETWEEN 0 AND 20),
    media DECIMAL(4,2) GENERATED ALWAYS AS (
        CASE
            WHEN nota1 IS NOT NULL AND nota2 IS NOT NULL AND nota3 IS NOT NULL
                THEN ROUND((nota1 + nota2 + nota3) / 3, 2)
            WHEN nota1 IS NOT NULL AND nota2 IS NOT NULL
                THEN ROUND((nota1 + nota2) / 2, 2)
            WHEN nota1 IS NOT NULL
                THEN nota1
            ELSE NULL
        END
    ) STORED,
    situacao VARCHAR(20) GENERATED ALWAYS AS (
        CASE WHEN media IS NOT NULL AND media >= 10 THEN 'Aprovado'
             WHEN media IS NOT NULL THEN 'Reprovado'
             ELSE 'Pendente' END
    ) STORED,
    ano_letivo VARCHAR(9) NOT NULL,
    validado TINYINT(1) DEFAULT 0,
    validado_por INT,
    validado_em TIMESTAMP NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_nota (estudante_id, turma_id, disciplina_id, ano_letivo),
    FOREIGN KEY (estudante_id) REFERENCES utilizadores(id),
    FOREIGN KEY (turma_id) REFERENCES turmas(id),
    FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id),
    FOREIGN KEY (docente_id) REFERENCES utilizadores(id)
);

-- ============================================================
-- TABELA: log_notas (auditoria)
-- ============================================================
CREATE TABLE log_notas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nota_id INT NOT NULL,
    campo_alterado VARCHAR(50),
    valor_anterior VARCHAR(20),
    valor_novo VARCHAR(20),
    alterado_por INT NOT NULL,
    alterado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nota_id) REFERENCES notas(id),
    FOREIGN KEY (alterado_por) REFERENCES utilizadores(id)
);

-- ============================================================
-- TABELA: agenda (eventos)
-- ============================================================
CREATE TABLE agenda (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    tipo ENUM('Aula','Prova','Entrega','Evento','Reunião','Outro') DEFAULT 'Evento',
    data_inicio DATETIME NOT NULL,
    data_fim DATETIME,
    criado_por INT NOT NULL,
    turma_id INT,
    disciplina_id INT,
    publico TINYINT(1) DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (criado_por) REFERENCES utilizadores(id),
    FOREIGN KEY (turma_id) REFERENCES turmas(id),
    FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id)
);

-- ============================================================
-- TABELA: notificacoes
-- ============================================================
CREATE TABLE notificacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilizador_id INT NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensagem TEXT,
    lida TINYINT(1) DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
);

-- ============================================================
-- DADOS DE DEMONSTRAÇÃO
-- ============================================================

INSERT INTO cursos (nome, codigo) VALUES
('Engenharia Informática', 'EI'),
('Gestão de Empresas', 'GE'),
('Direito', 'DIR');

INSERT INTO disciplinas (nome, codigo, curso_id) VALUES
('Algoritmos e Estruturas de Dados', 'AED', 1),
('Programação Orientada a Objetos', 'POO', 1),
('Base de Dados', 'BD', 1),
('Redes de Computadores', 'RC', 1),
('Matemática Discreta', 'MAD', 1),
('Gestão Financeira', 'GF', 2),
('Marketing', 'MKT', 2),
('Direito Civil', 'DC', 3);

INSERT INTO turmas (nome, ano_letivo, curso_id, ano_curricular, turno) VALUES
('EI-2024-T1', '2024/2025', 1, 1, 'Manhã'),
('EI-2024-T2', '2024/2025', 1, 2, 'Tarde'),
('GE-2024-T1', '2024/2025', 2, 1, 'Manhã');

-- Docentes de exemplo (senha: Admin@123)
INSERT INTO utilizadores (nome, email, palavra_passe, perfil_id, numero) VALUES
('Prof. António Silva', 'antonio@sidaa.ao', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3, 'DOC001'),
('Prof. Maria Santos', 'maria@sidaa.ao', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3, 'DOC002'),
('Gestor João Costa', 'joao@sidaa.ao', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2, 'GES001'),
('Est. Ana Fernandes', 'ana@sidaa.ao', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 'EST001'),
('Est. Pedro Neto', 'pedro@sidaa.ao', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 'EST002'),
('Est. Luísa Pinto', 'luisa@sidaa.ao', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 'EST003');

INSERT INTO turma_disciplinas (turma_id, disciplina_id, docente_id, ano_letivo) VALUES
(1, 1, 2, '2024/2025'),
(1, 2, 2, '2024/2025'),
(1, 3, 3, '2024/2025'),
(2, 4, 2, '2024/2025');

INSERT INTO turma_estudantes (turma_id, estudante_id) VALUES
(1, 5), (1, 6), (1, 7);

INSERT INTO notas (estudante_id, turma_id, disciplina_id, docente_id, nota1, nota2, nota3, ano_letivo) VALUES
(5, 1, 1, 2, 15.5, 14.0, 16.0, '2024/2025'),
(5, 1, 2, 2, 12.0, 13.5, 11.0, '2024/2025'),
(6, 1, 1, 2, 18.0, 17.5, 19.0, '2024/2025'),
(7, 1, 1, 2, 8.0, 9.5, 7.0, '2024/2025');

INSERT INTO agenda (titulo, descricao, tipo, data_inicio, data_fim, criado_por, turma_id, disciplina_id, publico) VALUES
('Prova de AED', 'Primeira avaliação de Algoritmos', 'Prova', '2025-04-10 08:00:00', '2025-04-10 10:00:00', 2, 1, 1, 1),
('Entrega de Projecto POO', 'Entrega do projecto final', 'Entrega', '2025-04-20 23:59:00', NULL, 2, 1, 2, 1),
('Reunião Docentes', 'Reunião pedagógica mensal', 'Reunião', '2025-04-15 14:00:00', '2025-04-15 16:00:00', 2, NULL, NULL, 0);
