<!DOCTYPE html>
<html lang="pt-AO">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SIDAA — Sistema de Informação e Dados Académicos</title>
  <meta name="description" content="SIDAA - Sistema integrado de gestão académica do INSTIC">

  <!-- Font Awesome 6 -->
  <link rel="stylesheet" href="assets/font-awesome-4.7.0/css/font-awesome.min.css">
  <link rel="stylesheet" href="assets/icons-reference/font-icon-style.css">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">

  <!-- Styles -->
  <link rel="stylesheet" href="assets/css/style.css">

</head>
<body>

<!-- ═══════════════════════════════════════════════════════════
     TELA DE LOGIN
═══════════════════════════════════════════════════════════ -->
<div id="login-screen">
  <div class="login-card">
    <div class="login-logo">
      <div class="logo-icon">
        <i class="fa fa-graduation-cap"></i>
      </div>
      <h1>SIDAA</h1>
      <p>Sistema de Informação e Dados Académicos</p>
    </div>

    <div class="login-erro" id="login-erro"></div>

    <form id="form-login" autocomplete="on">
      <div class="form-group">
        <label class="form-label" for="email">
          <i class="fa fa-envelope" style="color:var(--azul-claro);margin-right:.35rem"></i>
          Email
        </label>
        <input class="form-control" type="email" id="email" name="email"
               placeholder="email@instic.ao" required autocomplete="email">
      </div>
      <div class="form-group">
        <label class="form-label" for="senha">
          <i class="fa fa-lock" style="color:var(--azul-claro);margin-right:.35rem"></i>
          Palavra-passe
        </label>
        <div style="position:relative">
          <input class="form-control" type="password" id="senha" name="senha"
                 placeholder="••••••••" required autocomplete="current-password"
                 style="padding-right:2.5rem">
          <button type="button" onclick="toggleSenha()"
                  style="position:absolute;right:.75rem;top:50%;transform:translateY(-50%);border:none;background:none;cursor:pointer;color:var(--texto-leve);font-size:.9rem"
                  id="btn-toggle-senha">
            <i class="fa fa-eye"></i>
          </button>
        </div>
      </div>

      <button type="submit" class="btn btn-primario" style="width:100%;justify-content:center;padding:.75rem;margin-top:.5rem;font-size:1rem">
        <i class="fa fa-right-to-bracket"></i> Entrar
      </button>
    </form>

    <div style="margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid var(--cinza-2)">
      <p style="font-size:.78rem;color:var(--texto-leve);text-align:center;margin-bottom:.75rem;font-weight:500">Contas de demonstração:</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem">
        <button class="btn btn-ghost btn-sm" style="justify-content:center;font-size:.78rem" onclick="preencherDemo('admin@sidaa.ao')">
          <i class="fa fa-shield"></i> Admin
        </button>
        <button class="btn btn-ghost btn-sm" style="justify-content:center;font-size:.78rem" onclick="preencherDemo('antonio@sidaa.ao')">
          <i class="fa fa-user"></i> Docente
        </button>
        <button class="btn btn-ghost btn-sm" style="justify-content:center;font-size:.78rem" onclick="preencherDemo('joao@sidaa.ao')">
          <i class="fa fa-user-o"></i> Gestor
        </button>
        <button class="btn btn-ghost btn-sm" style="justify-content:center;font-size:.78rem" onclick="preencherDemo('ana@sidaa.ao')">
          <i class="fa fa-graduation-cap"></i> Estudante
        </button>
      </div>
    </div>

    <p style="text-align:center;color:var(--cinza-3);font-size:.73rem;margin-top:1.25rem">
      INSTIC &copy; 2025/2026 - SIDAA v1.0
    </p>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     APLICAÇÃO PRINCIPAL
═══════════════════════════════════════════════════════════ -->
<div id="app" class="oculto">

  <!-- SIDEBAR OVERLAY (mobile) -->
  <div class="sidebar-overlay"></div>

  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div class="sidebar-logo">
      <div class="marca">
        <div class="icone-marca"><i class="fa fa-graduation-cap"></i></div>
        <div>
          <div class="nome-marca">SIDAA</div>
          <div class="sub-marca">Gestão Académica</div>
        </div>
      </div>
    </div>

    <div class="sidebar-user">
      <div class="info">
        <div class="avatar" id="sidebar-avatar">--</div>
        <div>
          <div class="nome" id="sidebar-nome">Utilizador</div>
          <div class="perfil-badge" id="sidebar-perfil">--</div>
        </div>
      </div>
    </div>

    <nav class="sidebar-nav" id="sidebar-nav">
      <!-- gerado via JS -->
    </nav>

    <div class="sidebar-footer">
      <button class="btn-sair" onclick="App.sair()">
        <i class="fa fa-right"></i>
        Terminar Sessão
      </button>
    </div>
  </aside>

  <!-- CONTEÚDO PRINCIPAL -->
  <div class="main-content">

    <!-- TOPBAR -->
    <header class="topbar">
      <button class="btn-menu-toggle" id="btn-menu-toggle">
        <i class="fa fa-bars"></i>
      </button>

      <div class="topbar-titulo" id="topbar-titulo">Dashboard</div>

      <!-- Notificações -->
      <button class="btn-notif" id="btn-notif" title="Notificações">
        <i class="fa fa-bell"></i>
        <span class="badge-notif" id="badge-notif">0</span>
      </button>
    </header>

    <!-- PAINEL DE NOTIFICAÇÕES -->
    <div id="notif-panel" class="notif-panel">
      <div class="notif-panel-header">
        <h4><i class="fa fa-bell"></i> Notificações</h4>
        <button class="btn btn-ghost btn-xs" id="btn-marcar-todas">
          <i class="fa fa-check-double"></i> Marcar todas
        </button>
      </div>
      <div id="notif-lista">
        <div class="notif-vazia">A carregar...</div>
      </div>
    </div>

    <!-- CORPO DA PÁGINA -->
    <main class="page-body" id="page-body">
      <div class="loading"><div class="spinner"></div> A carregar...</div>
    </main>

  </div><!-- /.main-content -->

</div><!-- /#app -->

<script>
function toggleSenha() {
  const inp = document.getElementById('senha');
  const ico = document.querySelector('#btn-toggle-senha i');
  if (inp.type === 'password') {
    inp.type = 'text';
    ico.className = 'fa fa-eye-slash';
  } else {
    inp.type = 'password';
    ico.className = 'fa fa-eye';
  }
}
function preencherDemo(email) {
  document.getElementById('email').value = email;
  document.getElementById('senha').value = 'password';
}
</script>

<!-- App JS -->
<script src="assets/js/app.js"></script>

</body>
</html>
