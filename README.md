# SIDAA — Sistema de Informação e Dados Académicos

Sistema de gestão académica para o INSTIC, desenvolvido com HTML, CSS, JavaScript e PHP puro.

---

## Estrutura de Ficheiros

```
sidaa/
├── index.html                  ← Ponto de entrada (SPA)
├── database.sql                ← Script SQL completo
├── includes/
│   └── config.php              ← Configuração BD + helpers
├── api/
│   ├── auth.php                ← Login / Logout / Sessão
│   ├── utilizadores.php        ← CRUD de utilizadores
│   ├── notas.php               ← Lançamento e gestão de notas
│   ├── relatorios.php          ← Geração de relatórios
│   ├── agenda.php              ← Agenda / eventos
│   └── notificacoes.php        ← Sistema de notificações
└── assets/
    ├── css/style.css           ← Estilos principais
    └── js/app.js               ← Lógica da aplicação (SPA)
```

---

## Requisitos

- PHP 8.0+
- MySQL 8.0+ (ou MariaDB 10.6+)
- Servidor web (Apache/Nginx) ou `php -S localhost:8000`

---

## Instalação

### 1. Base de dados

```bash
mysql -u root -p < database.sql

// Deve ter o mysql instalado na maquina para o comando acima funcional
```

Ou via phpMyAdmin: importar o ficheiro `database.sql`.

### 2. Configuração

Editar `includes/config.php`:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'sidaa');
define('DB_USER', 'root');       // ← seu utilizador MySQL
define('DB_PASS', '');           // ← sua senha MySQL
```

### 3. Servidor

**Opção A – PHP built-in (desenvolvimento):**
```bash
cd sidaa/
php -S localhost:8000
# Aceder: http://localhost:8000
```

**Opção B – Apache:**
- Colocar a pasta `sidaa/` em `htdocs/` ou `www/`
- Aceder via `http://localhost/sidaa/`

**Opção C – Nginx:**
```nginx
server {
    listen 80;
    root /var/www/sidaa;
    index index.html;
    location /api/ {
        try_files $uri $uri/ =404;
        fastcgi_pass unix:/run/php/php8.1-fpm.sock;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
```

---

## Contas de Demonstração

| Perfil | Email | Senha |
|--------|-------|-------|
| Administrador | admin@sidaa.ao | password |
| Gestor Académico | joao@sidaa.ao | password |
| Docente | antonio@sidaa.ao | password |
| Estudante | ana@sidaa.ao | password |

> **Importante:** As senhas no `database.sql` usam o hash bcrypt de `password`. Pode alterar via painel após login.

---

## Perfis e Permissões

| Funcionalidade | Admin | Gestor | Docente | Estudante |
|---|:---:|:---:|:---:|:---:|
| Gerir Utilizadores | Sim | Sim* | Não | Não |
| Remover Utilizadores | Sim | Sim | Não | Não |
| Lançar Notas | Sim | Sim | Sim** | Não |
| Validar Notas | Sim | Sim | Não | Não |
| Ver Notas | Sim | Sim | Sim** | Sim*** |
| Relatórios | Sim | Sim | Sim** | Não |
| Relatório Institucional | Sim | Sim | Não | Não |
| Criar Eventos Agenda | Sim | Sim | Sim | Não |
| Ver Agenda | Sim | Sim | Sim | Sim |

*Gestor só pode criar/editar Docentes e Estudantes  
**Docente apenas das suas turmas/disciplinas  
***Estudante só vê as suas próprias notas

---

## 📊 Regras de Negócio

- Notas entre **0 e 20** (validação no frontend e backend)
- **Média** calculada automaticamente pela base de dados (coluna gerada)
- **Aprovado** se média ≥ 10, **Reprovado** se média < 10
- Alterações de notas registadas em **log_notas** (auditoria)
- Notas precisam de ser **validadas** por Admin/Gestor para produzir efeito oficial
- Estudantes só visualizam; docentes inserem/editam
- Eventos públicos visíveis a todos; eventos de turma apenas aos seus membros

---

## 🛠️ Tecnologias

- **Frontend:** HTML5, CSS3, JavaScript (ES2020+), Font Awesome 6
- **Backend:** PHP 8.0+ (puro, sem frameworks)
- **Base de Dados:** MySQL 8.0+ com PDO
- **Autenticação:** Sessions PHP + bcrypt
- **Comunicação:** Fetch API (AJAX)
- **Design:** SPA (Single Page Application) com CSS variables

---

## 📝 Notas Técnicas

- Todas as queries usam **prepared statements** (proteção contra SQL Injection)
- Passwords com **bcrypt** (password_hash/password_verify)
- Sessão com **timeout** configurável (padrão: 1 hora)
- API retorna sempre **JSON**
- Colunas `media` e `situacao` são **generated columns** no MySQL (calculadas automaticamente)
