// ============================================================
//  SIDAA - Aplicação Principal
// ============================================================

const App = {
  user: null,
  paginaAtual: '',

  async init() {
    const r = await api.get('api/auth.php', { action: 'session' });
    if (r.autenticado) {
      App.user = r.user;
      App.entrar();
    }
    UI.initLogin();
  },

  entrar() {
    document.getElementById('login-screen').classList.add('oculto');
    document.getElementById('app').classList.remove('oculto');
    UI.renderSidebar();
    App.navegar('dashboard');
    Notificacoes.iniciar();
  },

  async sair() {
    await api.post('api/auth.php', { action: 'logout' });
    App.user = null;
    location.reload();
  },

  navegar(pagina) {
    App.paginaAtual = pagina;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('ativo', el.dataset.pagina === pagina);
    });
    const mapa = {
      dashboard:    { titulo: 'Dashboard', fn: Paginas.dashboard },
      utilizadores: { titulo: 'Gerir Utilizadores', fn: Paginas.utilizadores },
      notas:        { titulo: 'Gerir Notas', fn: Paginas.notas },
      relatorios:   { titulo: 'Relatórios', fn: Paginas.relatorios },
      agenda:       { titulo: 'Agenda Digital', fn: Paginas.agenda },
    };
    const p = mapa[pagina] || mapa.dashboard;
    document.getElementById('topbar-titulo').textContent = p.titulo;
    const body = document.getElementById('page-body');
    body.innerHTML = '<div class="loading"><div class="spinner"></div> A carregar...</div>';
    p.fn();
    // fechar sidebar no mobile
    document.querySelector('.sidebar').classList.remove('aberta');
    document.querySelector('.sidebar-overlay').classList.remove('visivel');
  }
};

// ============================================================
//  API Helper
// ============================================================
const api = {
  async get(url, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${url}${qs ? '?' + qs : ''}`, { credentials: 'same-origin' });
    return r.json();
  },
  async post(url, data = {}) {
    const body = new URLSearchParams(data);
    const r = await fetch(url, { method: 'POST', body, credentials: 'same-origin' });
    return r.json();
  }
};

// ============================================================
//  UI Helpers
// ============================================================
const UI = {
  initLogin() {
    const form = document.getElementById('form-login');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> A entrar...';
      const erro = document.getElementById('login-erro');
      erro.classList.remove('visivel');
      const r = await api.post('api/auth.php', {
        action: 'login',
        email: form.email.value,
        senha: form.senha.value
      });
      btn.disabled = false; btn.textContent = 'Entrar';
      if (r.erro) {
        erro.textContent = r.erro;
        erro.classList.add('visivel');
      } else {
        App.user = r.user;
        App.entrar();
      }
    });
  },

  renderSidebar() {
    const u = App.user;
    const inicial = u.nome.split(' ').slice(0, 2).map(n => n[0]).join('');
    document.getElementById('sidebar-avatar').textContent = inicial;
    document.getElementById('sidebar-nome').textContent = u.nome.split(' ').slice(0, 2).join(' ');
    document.getElementById('sidebar-perfil').textContent = u.perfil;

    const nav = document.getElementById('sidebar-nav');
    const itens = [
      { pagina: 'dashboard', icon: 'fa-home', label: 'Dashboard', roles: ['Administrador','Gestor Académico','Docente','Estudante'] },
      { sep: 'Académico' },
      { pagina: 'notas', icon: 'fa-star', label: 'Notas', roles: ['Administrador','Gestor Académico','Docente','Estudante'] },
      { pagina: 'relatorios', icon: 'fa-file', label: 'Relatórios', roles: ['Administrador','Gestor Académico','Docente'] },
      { pagina: 'agenda', icon: 'fa-calendar', label: 'Agenda', roles: ['Administrador','Gestor Académico','Docente','Estudante'] },
      { sep: 'Administração' },
      { pagina: 'utilizadores', icon: 'fa-users', label: 'Utilizadores', roles: ['Administrador','Gestor Académico'] },
    ];

    nav.innerHTML = itens.map(item => {
      if (item.sep) return `<div class="nav-section-title">${item.sep}</div>`;
      if (!item.roles.includes(u.perfil)) return '';
      return `<div class="nav-item" data-pagina="${item.pagina}" onclick="App.navegar('${item.pagina}')">
        <i class="fa ${item.icon}"></i> ${item.label}
      </div>`;
    }).join('');
  },

  body() { return document.getElementById('page-body'); },

  html(h) { UI.body().innerHTML = h; },

  toast(msg, tipo = 'sucesso') {
    const t = document.createElement('div');
    const cores = { sucesso: '#10B981', erro: '#EF4444', aviso: '#F59E0B' };
    t.style.cssText = `
      position:fixed;bottom:1.5rem;right:1.5rem;
      background:${cores[tipo]};color:#fff;
      padding:.8rem 1.25rem;border-radius:10px;
      font-size:.9rem;font-weight:500;z-index:9999;
      box-shadow:0 4px 20px rgba(0,0,0,.2);
      animation:slideUp .3s both;
    `;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  },

  modal(id) {
    return {
      abrir() { document.getElementById(id).classList.add('aberto'); },
      fechar() { document.getElementById(id).classList.remove('aberto'); }
    };
  },

  badge(situacao) {
    if (situacao === 'Aprovado') return '<span class="badge badge-verde"><i class="fa fa-check"></i> Aprovado</span>';
    if (situacao === 'Reprovado') return '<span class="badge badge-vermelho"><i class="fa fa-close"></i> Reprovado</span>';
    return '<span class="badge badge-cinza">Pendente</span>';
  },

  confirmar(msg) { return confirm(msg); }
};

// ============================================================
//  NOTIFICAÇÕES
// ============================================================
const Notificacoes = {
  intervalo: null,

  iniciar() {
    this.carregar();
    this.intervalo = setInterval(() => this.verificarNaoLidas(), 30000);
    document.getElementById('btn-notif').addEventListener('click', e => {
      e.stopPropagation();
      document.getElementById('notif-panel').classList.toggle('aberto');
      if (document.getElementById('notif-panel').classList.contains('aberto')) this.carregar();
    });
    document.addEventListener('click', () => {
      document.getElementById('notif-panel').classList.remove('aberto');
    });
    document.getElementById('notif-panel').addEventListener('click', e => e.stopPropagation());
    document.getElementById('btn-marcar-todas').addEventListener('click', async () => {
      await api.post('api/notificacoes.php', { action: 'marcar_todas' });
      this.carregar();
    });
  },

  async verificarNaoLidas() {
    const r = await api.get('api/notificacoes.php', { action: 'nao_lidas' });
    const badge = document.getElementById('badge-notif');
    if (r.total > 0) {
      badge.textContent = r.total > 9 ? '9+' : r.total;
      badge.classList.add('visivel');
    } else {
      badge.classList.remove('visivel');
    }
  },

  async carregar() {
    this.verificarNaoLidas();
    const r = await api.get('api/notificacoes.php', { action: 'listar' });
    const lista = document.getElementById('notif-lista');
    if (!r.dados || r.dados.length === 0) {
      lista.innerHTML = '<div class="notif-vazia"><i class="fa fa-bell"></i><br>Sem notificações</div>';
      return;
    }
    lista.innerHTML = r.dados.map(n => `
      <div class="notif-item ${!n.lida ? 'nao-lida' : ''}" onclick="Notificacoes.marcarLida(${n.id}, this)">
        <div class="notif-titulo">${n.titulo}</div>
        <div class="notif-msg">${n.mensagem || ''}</div>
        <div class="notif-hora">${formatarData(n.criado_em)}</div>
      </div>
    `).join('');
  },

  async marcarLida(id, el) {
    el.classList.remove('nao-lida');
    await api.post('api/notificacoes.php', { action: 'marcar_lida', id });
    this.verificarNaoLidas();
  }
};

// ============================================================
//  PÁGINAS
// ============================================================
const Paginas = {

  // ── DASHBOARD ─────────────────────────────────────────────
  async dashboard() {
    const u = App.user;
    if (u.perfil === 'Estudante') {
      const r = await api.get('api/notas.php', { action: 'minhas_notas' });
      const dados = r.dados || [];
      const aprovadas = dados.filter(n => n.situacao === 'Aprovado').length;
      const reprovadas = dados.filter(n => n.situacao === 'Reprovado').length;
      const medias = dados.filter(n => n.media).map(n => parseFloat(n.media));
      const mediaGeral = medias.length ? (medias.reduce((a,b) => a+b, 0) / medias.length).toFixed(2) : '--';

      UI.html(`
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon azul"><i class="fa fa-book-open"></i></div>
            <div><div class="stat-valor">${dados.length}</div><div class="stat-label">Disciplinas</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon verde"><i class="fa fa-check-circle"></i></div>
            <div><div class="stat-valor">${aprovadas}</div><div class="stat-label">Aprovadas</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon vermelho"><i class="fa fa-times-circle"></i></div>
            <div><div class="stat-valor">${reprovadas}</div><div class="stat-label">Reprovadas</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon ouro"><i class="fa fa-star"></i></div>
            <div><div class="stat-valor">${mediaGeral}</div><div class="stat-label">Média Geral</div></div>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fa fa-star-half-stroke"></i> As Minhas Notas</div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Disciplina</th><th>Turma</th><th>N1</th><th>N2</th><th>N3</th><th>Média</th><th>Situação</th></tr></thead>
              <tbody>
                ${dados.length ? dados.map(n => `
                  <tr>
                    <td><strong>${n.disciplina}</strong></td>
                    <td>${n.turma}</td>
                    <td>${n.nota1 ?? '--'}</td>
                    <td>${n.nota2 ?? '--'}</td>
                    <td>${n.nota3 ?? '--'}</td>
                    <td><strong>${n.media ?? '--'}</strong></td>
                    <td>${UI.badge(n.situacao)}</td>
                  </tr>
                `).join('') : '<tr><td colspan="7" class="vazio">Sem notas registadas.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `);
    } else {
      // Admin / Gestor / Docente
      const r = await api.get('api/relatorios.php', { action: 'institucional', ano_letivo: '2024/2025' });
      const s = r.resumo || {};
      UI.html(`
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon azul"><i class="fa fa-graduation-cap"></i></div>
            <div><div class="stat-valor">${s.total_estudantes ?? 0}</div><div class="stat-label">Estudantes</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon ouro"><i class="fa fa-users"></i></div>
            <div><div class="stat-valor">${s.total_docentes ?? 0}</div><div class="stat-label">Docentes</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon verde"><i class="fa fa-check-circle"></i></div>
            <div><div class="stat-valor">${s.total_aprovados ?? 0}</div><div class="stat-label">Aprovações</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon vermelho"><i class="fa fa-times-circle"></i></div>
            <div><div class="stat-valor">${s.total_reprovados ?? 0}</div><div class="stat-label">Reprovações</div></div>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fa fa-chart-bar"></i> Desempenho por Curso (2024/2025)</div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Curso</th><th>Estudantes</th><th>Avaliações</th><th>Aprovados</th><th>Média</th></tr></thead>
              <tbody>
                ${(r.por_curso || []).map(c => `
                  <tr>
                    <td><strong>${c.curso}</strong></td>
                    <td>${c.estudantes}</td>
                    <td>${c.avaliacoes}</td>
                    <td>${c.aprovados ?? 0}</td>
                    <td>${c.media ?? '--'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `);
    }
  },

  // ── UTILIZADORES ──────────────────────────────────────────
  async utilizadores() {
    const [rLista, rPerfis] = await Promise.all([
      api.get('api/utilizadores.php', { action: 'listar' }),
      api.get('api/utilizadores.php', { action: 'perfis' })
    ]);
    const dados = rLista.dados || [];
    const perfis = rPerfis.dados || [];

    UI.html(`
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fa fa-users"></i> Utilizadores</div>
          <div style="display:flex;gap:.5rem;align-items:center;">
            <select class="form-control" id="filtro-perfil" style="width:auto;" onchange="Paginas._filtrarUtilizadores()">
              <option value="">Todos os perfis</option>
              ${perfis.map(p => `<option value="${p.id}">${p.nome}</option>`).join('')}
            </select>
            <button class="btn btn-primario" onclick="Paginas._abrirModalUtil()">
              <i class="fa fa-plus"></i> Novo
            </button>
          </div>
        </div>
        <div class="table-wrap">
          <table id="tabela-util">
            <thead>
              <tr><th>Nome</th><th>Email</th><th>Nº</th><th>Perfil</th><th>Estado</th><th>Acções</th></tr>
            </thead>
            <tbody id="tbody-util">
              ${Paginas._renderUtilizadores(dados)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL UTILIZADOR -->
      <div class="modal-overlay" id="modal-util">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-titulo" id="modal-util-titulo">Novo Utilizador</span>
            <button class="btn-fechar-modal" onclick="UI.modal('modal-util').fechar()"><i class="fa fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <form id="form-util" onsubmit="Paginas._salvarUtil(event)">
              <input type="hidden" id="util-id">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nome completo *</label>
                  <input class="form-control" id="util-nome" required placeholder="Nome completo">
                </div>
                <div class="form-group">
                  <label class="form-label">Nº de identificação</label>
                  <input class="form-control" id="util-numero" placeholder="Ex: EST001">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Email *</label>
                <input class="form-control" type="email" id="util-email" required placeholder="email@exemplo.ao">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Perfil *</label>
                  <select class="form-control" id="util-perfil" required>
                    ${perfis.map(p => `<option value="${p.id}">${p.nome}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Telefone</label>
                  <input class="form-control" id="util-tel" placeholder="+244...">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Palavra-passe <span id="senha-hint" style="color:var(--texto-leve);font-size:.8rem">(deixar vazio para não alterar)</span></label>
                <input class="form-control" type="password" id="util-senha" placeholder="Mínimo 6 caracteres">
              </div>
              <div class="form-group" id="grupo-ativo" style="display:none">
                <label class="form-label">Estado</label>
                <select class="form-control" id="util-ativo">
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>
              <div class="modal-footer" style="padding:0;margin-top:1rem">
                <button type="button" class="btn btn-ghost" onclick="UI.modal('modal-util').fechar()">Cancelar</button>
                <button type="submit" class="btn btn-primario"><i class="fa fa-floppy-disk"></i> Salvar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);

    // store data
    window._utilData = dados;
    window._perfilData = perfis;
  },

  _renderUtilizadores(dados) {
    if (!dados.length) return '<tr><td colspan="6"><div class="vazio"><i class="fa fa-users"></i><p>Nenhum utilizador encontrado.</p></div></td></tr>';
    const podeRemover = App.user.perfil === 'Administrador';
    return dados.map(u => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:.75rem">
            <div style="width:34px;height:34px;border-radius:50%;background:var(--azul-claro);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:.8rem;flex-shrink:0">
              ${u.nome.split(' ').slice(0,2).map(n=>n[0]).join('')}
            </div>
            <span>${u.nome}</span>
          </div>
        </td>
        <td>${u.email}</td>
        <td>${u.numero || '--'}</td>
        <td><span class="badge badge-azul">${u.perfil}</span></td>
        <td>${u.ativo ? '<span class="badge badge-verde">Activo</span>' : '<span class="badge badge-cinza">Inactivo</span>'}</td>
        <td>
          <div style="display:flex;gap:.4rem">
            <button class="btn btn-ghost btn-xs" onclick="Paginas._editarUtil(${u.id})">
              <i class="fa fa-pencil"></i>
            </button>
            ${podeRemover && u.id != App.user.id ? `
              <button class="btn btn-perigo btn-xs" onclick="Paginas._removerUtil(${u.id}, '${u.nome}')">
                <i class="fa fa-trash"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  async _filtrarUtilizadores() {
    const pfId = document.getElementById('filtro-perfil').value;
    const r = await api.get('api/utilizadores.php', { action: 'listar', perfil_id: pfId });
    document.getElementById('tbody-util').innerHTML = Paginas._renderUtilizadores(r.dados || []);
    window._utilData = r.dados || [];
  },

  _abrirModalUtil() {
    document.getElementById('modal-util-titulo').textContent = 'Novo Utilizador';
    document.getElementById('util-id').value = '';
    document.getElementById('form-util').reset();
    document.getElementById('senha-hint').style.display = 'none';
    document.getElementById('grupo-ativo').style.display = 'none';
    UI.modal('modal-util').abrir();
  },

  _editarUtil(id) {
    const u = (window._utilData || []).find(x => x.id == id);
    if (!u) return;
    document.getElementById('modal-util-titulo').textContent = 'Editar Utilizador';
    document.getElementById('util-id').value = u.id;
    document.getElementById('util-nome').value = u.nome;
    document.getElementById('util-email').value = u.email;
    document.getElementById('util-numero').value = u.numero || '';
    document.getElementById('util-tel').value = u.telefone || '';
    document.getElementById('util-ativo').value = u.ativo;
    document.getElementById('grupo-ativo').style.display = 'block';
    document.getElementById('senha-hint').style.display = 'inline';
    // set perfil
    const pf = (window._perfilData || []).find(p => p.nome === u.perfil);
    if (pf) document.getElementById('util-perfil').value = pf.id;
    UI.modal('modal-util').abrir();
  },

  async _salvarUtil(e) {
    e.preventDefault();
    const id = document.getElementById('util-id').value;
    const payload = {
      action: id ? 'editar' : 'criar',
      id, nome: document.getElementById('util-nome').value,
      email: document.getElementById('util-email').value,
      numero: document.getElementById('util-numero').value,
      telefone: document.getElementById('util-tel').value,
      perfil_id: document.getElementById('util-perfil').value,
      senha: document.getElementById('util-senha').value,
      ativo: document.getElementById('util-ativo').value,
    };
    const r = await api.post('api/utilizadores.php', payload);
    if (r.erro) { UI.toast(r.erro, 'erro'); return; }
    UI.toast(id ? 'Utilizador actualizado!' : 'Utilizador criado!');
    UI.modal('modal-util').fechar();
    Paginas.utilizadores();
  },

  async _removerUtil(id, nome) {
    if (!UI.confirmar(`Desactivar utilizador "${nome}"?`)) return;
    const r = await api.post('api/utilizadores.php', { action: 'remover', id });
    if (r.erro) { UI.toast(r.erro, 'erro'); return; }
    UI.toast('Utilizador desactivado.');
    Paginas.utilizadores();
  },

  // ── NOTAS ─────────────────────────────────────────────────
  async notas() {
    if (App.user.perfil === 'Estudante') {
      Paginas.dashboard(); return;
    }
    const r = await api.get('api/notas.php', { action: 'minhas_turmas' });
    const turmasDisciplinas = r.dados || [];

    // Agrupa turmas únicas
    const turmas = [];
    turmasDisciplinas.forEach(td => {
      if (!turmas.find(t => t.id === td.id)) turmas.push({ id: td.id, nome: td.nome, ano: td.ano_letivo });
    });

    UI.html(`
      <div class="card" style="margin-bottom:1.5rem">
        <div class="card-header">
          <div class="card-title"><i class="fa fa-star-half-stroke"></i> Lançamento de Notas</div>
        </div>
        <div class="card-body">
          <div class="form-row-3">
            <div class="form-group">
              <label class="form-label">Turma</label>
              <select class="form-control" id="sel-turma" onchange="Paginas._carregarDisciplinas()">
                <option value="">-- Seleccione --</option>
                ${turmas.map(t => `<option value="${t.id}">${t.nome} (${t.ano})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Disciplina</label>
              <select class="form-control" id="sel-disciplina" onchange="Paginas._carregarEstudantes()">
                <option value="">-- Seleccione --</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Ano Lectivo</label>
              <select class="form-control" id="sel-ano">
                <option value="2024/2025">2024/2025</option>
                <option value="2023/2024">2023/2024</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div id="painel-notas"></div>
    `);
    window._turmasDisciplinas = turmasDisciplinas;
  },

  _carregarDisciplinas() {
    const turmaId = document.getElementById('sel-turma').value;
    const sel = document.getElementById('sel-disciplina');
    const discs = (window._turmasDisciplinas || []).filter(td => td.id == turmaId);
    sel.innerHTML = '<option value="">-- Seleccione --</option>' +
      discs.map(d => `<option value="${d.disciplina_id}">${d.disciplina}</option>`).join('');
    document.getElementById('painel-notas').innerHTML = '';
  },

  async _carregarEstudantes() {
    const turmaId = document.getElementById('sel-turma').value;
    const discId  = document.getElementById('sel-disciplina').value;
    const ano     = document.getElementById('sel-ano').value;
    if (!turmaId || !discId) return;

    document.getElementById('painel-notas').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    const r = await api.get('api/notas.php', {
      action: 'estudantes_turma',
      turma_id: turmaId, disciplina_id: discId, ano_letivo: ano
    });
    const dados = r.dados || [];
    const podeValidar = ['Administrador','Gestor Académico'].includes(App.user.perfil);

    document.getElementById('painel-notas').innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fa fa-users"></i> Estudantes (${dados.length})</div>
          <button class="btn btn-sucesso btn-sm" onclick="Paginas._salvarTodasNotas()">
            <i class="fa fa-floppy-disk"></i> Salvar Todas
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Nº</th><th>Nome</th><th>Nota 1</th><th>Nota 2</th><th>Nota 3</th><th>Média</th><th>Situação</th>${podeValidar ? '<th>Validar</th>' : ''}</tr>
            </thead>
            <tbody>
              ${dados.map(e => `
                <tr data-estudante="${e.id}" data-nota-id="${e.nota_id || ''}">
                  <td>${e.numero || '--'}</td>
                  <td>${e.nome}</td>
                  <td><input class="nota-input" type="number" min="0" max="20" step="0.5" value="${e.nota1 ?? ''}" data-campo="nota1" oninput="Paginas._calcularMedia(this)"></td>
                  <td><input class="nota-input" type="number" min="0" max="20" step="0.5" value="${e.nota2 ?? ''}" data-campo="nota2" oninput="Paginas._calcularMedia(this)"></td>
                  <td><input class="nota-input" type="number" min="0" max="20" step="0.5" value="${e.nota3 ?? ''}" data-campo="nota3" oninput="Paginas._calcularMedia(this)"></td>
                  <td class="media-cell"><strong>${e.media ?? '--'}</strong></td>
                  <td class="sit-cell">${UI.badge(e.situacao || 'Pendente')}</td>
                  ${podeValidar ? `<td>${e.nota_id && !e.validado ? `<button class="btn btn-ouro btn-xs" onclick="Paginas._validarNota(${e.nota_id}, this)"><i class="fa fa-check-double"></i> Validar</button>` : (e.validado ? '<span class="badge badge-verde"><i class="fa fa-check"></i> Validada</span>' : '--')}</td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  _calcularMedia(input) {
    const tr = input.closest('tr');
    const n1 = parseFloat(tr.querySelector('[data-campo=nota1]').value) || null;
    const n2 = parseFloat(tr.querySelector('[data-campo=nota2]').value) || null;
    const n3 = parseFloat(tr.querySelector('[data-campo=nota3]').value) || null;
    const notas = [n1, n2, n3].filter(n => n !== null);
    const media = notas.length ? (notas.reduce((a,b) => a+b, 0) / notas.length).toFixed(2) : null;
    tr.querySelector('.media-cell').innerHTML = `<strong>${media ?? '--'}</strong>`;
    const sit = media !== null ? (media >= 10 ? 'Aprovado' : 'Reprovado') : 'Pendente';
    tr.querySelector('.sit-cell').innerHTML = UI.badge(sit);
  },

  async _salvarTodasNotas() {
    const turmaId = document.getElementById('sel-turma').value;
    const discId  = document.getElementById('sel-disciplina').value;
    const ano     = document.getElementById('sel-ano').value;
    const rows    = document.querySelectorAll('[data-estudante]');
    let erros = 0;

    for (const tr of rows) {
      const estId = tr.dataset.estudante;
      const n1 = tr.querySelector('[data-campo=nota1]').value;
      const n2 = tr.querySelector('[data-campo=nota2]').value;
      const n3 = tr.querySelector('[data-campo=nota3]').value;
      const r = await api.post('api/notas.php', {
        action: 'inserir', estudante_id: estId,
        turma_id: turmaId, disciplina_id: discId,
        nota1: n1, nota2: n2, nota3: n3, ano_letivo: ano
      });
      if (r.erro) erros++;
    }

    if (erros) UI.toast(`${erros} erro(s) ao salvar notas.`, 'erro');
    else UI.toast('Notas guardadas com sucesso!');
    Paginas._carregarEstudantes();
  },

  async _validarNota(notaId, btn) {
    const r = await api.post('api/notas.php', { action: 'validar', nota_id: notaId });
    if (r.erro) { UI.toast(r.erro, 'erro'); return; }
    btn.outerHTML = '<span class="badge badge-verde"><i class="fa fa-check"></i> Validada</span>';
    UI.toast('Nota validada!');
  },

  // ── RELATÓRIOS ────────────────────────────────────────────
  async relatorios() {
    const [rTurmas, rDiscs] = await Promise.all([
      api.get('api/relatorios.php', { action: 'turmas' }),
      api.get('api/relatorios.php', { action: 'disciplinas' })
    ]);
    const turmas = rTurmas.dados || [];
    const discs  = rDiscs.dados || [];
    const podeInstit = ['Administrador','Gestor Académico'].includes(App.user.perfil);

    UI.html(`
      <div class="tabs">
        <button class="tab-btn ativo" onclick="UI._tab(this,'tab-turma')"><i class="fa fa-users"></i> Por Turma</button>
        <button class="tab-btn" onclick="UI._tab(this,'tab-disciplina')"><i class="fa fa-book"></i> Por Disciplina</button>
        ${podeInstit ? '<button class="tab-btn" onclick="UI._tab(this,\'tab-inst\')"><i class="fa fa-building"></i> Institucional</button>' : ''}
      </div>

      <div class="tab-content ativo" id="tab-turma">
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fa fa-users"></i> Desempenho por Turma</div>
          </div>
          <div class="card-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Turma</label>
                <select class="form-control" id="rel-turma">
                  <option value="">-- Seleccione --</option>
                  ${turmas.map(t => `<option value="${t.id}">${t.nome}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Ano Lectivo</label>
                <select class="form-control" id="rel-turma-ano">
                  <option value="2024/2025">2024/2025</option>
                  <option value="2023/2024">2023/2024</option>
                </select>
              </div>
            </div>
            <button class="btn btn-primario" onclick="Paginas._gerarRelatorioTurma()">
              <i class="fa fa-magnifying-glass"></i> Gerar Relatório
            </button>
          </div>
          <div id="res-turma"></div>
        </div>
      </div>

      <div class="tab-content" id="tab-disciplina">
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fa fa-book"></i> Desempenho por Disciplina</div>
          </div>
          <div class="card-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Disciplina</label>
                <select class="form-control" id="rel-disc">
                  <option value="">-- Seleccione --</option>
                  ${discs.map(d => `<option value="${d.id}">${d.nome}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Ano Lectivo</label>
                <select class="form-control" id="rel-disc-ano">
                  <option value="2024/2025">2024/2025</option>
                </select>
              </div>
            </div>
            <button class="btn btn-primario" onclick="Paginas._gerarRelatorioDisc()">
              <i class="fa fa-magnifying-glass"></i> Gerar Relatório
            </button>
          </div>
          <div id="res-disc"></div>
        </div>
      </div>

      ${podeInstit ? `
      <div class="tab-content" id="tab-inst">
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fa fa-building"></i> Relatório Institucional</div>
            <button class="btn btn-primario btn-sm" onclick="Paginas._gerarRelatorioInst()">
              <i class="fa fa-rotate"></i> Actualizar
            </button>
          </div>
          <div id="res-inst"><div class="loading"><div class="spinner"></div></div></div>
        </div>
      </div>
      ` : ''}
    `);

    if (podeInstit) Paginas._gerarRelatorioInst();
  },

  async _gerarRelatorioTurma() {
    const id  = document.getElementById('rel-turma').value;
    const ano = document.getElementById('rel-turma-ano').value;
    if (!id) { UI.toast('Seleccione uma turma.', 'aviso'); return; }
    document.getElementById('res-turma').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    const r = await api.get('api/relatorios.php', { action: 'por_turma', turma_id: id, ano_letivo: ano });
    const dados = r.dados || [];
    document.getElementById('res-turma').innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Estudante</th><th>Nº</th><th>Disciplinas</th><th>Aprovadas</th><th>Reprovadas</th><th>Média Geral</th></tr></thead>
          <tbody>
            ${dados.length ? dados.map(d => `
              <tr>
                <td><strong>${d.estudante}</strong></td>
                <td>${d.numero || '--'}</td>
                <td>${d.total_disciplinas}</td>
                <td><span class="situacao-aprovado">${d.aprovadas}</span></td>
                <td><span class="situacao-reprovado">${d.reprovadas}</span></td>
                <td><strong>${d.media_geral ?? '--'}</strong></td>
              </tr>
            `).join('') : '<tr><td colspan="6" class="vazio">Sem dados.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  },

  async _gerarRelatorioDisc() {
    const id  = document.getElementById('rel-disc').value;
    const ano = document.getElementById('rel-disc-ano').value;
    if (!id) { UI.toast('Seleccione uma disciplina.', 'aviso'); return; }
    document.getElementById('res-disc').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    const r = await api.get('api/relatorios.php', { action: 'por_disciplina', disciplina_id: id, ano_letivo: ano });
    const dados = r.dados || [];
    document.getElementById('res-disc').innerHTML = dados.length ? `
      <div style="padding:1rem 1.5rem">
        ${dados.map(d => `
          <div class="stats-grid" style="margin-bottom:0">
            <div class="stat-card"><div class="stat-icon azul"><i class="fa fa-users"></i></div>
              <div><div class="stat-valor">${d.total_alunos}</div><div class="stat-label">Total Alunos</div></div></div>
            <div class="stat-card"><div class="stat-icon verde"><i class="fa fa-check"></i></div>
              <div><div class="stat-valor">${d.aprovados}</div><div class="stat-label">Aprovados</div></div></div>
            <div class="stat-card"><div class="stat-icon vermelho"><i class="fa fa-xmark"></i></div>
              <div><div class="stat-valor">${d.reprovados}</div><div class="stat-label">Reprovados</div></div></div>
            <div class="stat-card"><div class="stat-icon ouro"><i class="fa fa-star"></i></div>
              <div><div class="stat-valor">${d.media ?? '--'}</div><div class="stat-label">Média</div></div></div>
          </div>
        `).join('')}
      </div>
    ` : '<div class="vazio">Sem dados.</div>';
  },

  async _gerarRelatorioInst() {
    const r = await api.get('api/relatorios.php', { action: 'institucional', ano_letivo: '2024/2025' });
    const s = r.resumo || {};
    document.getElementById('res-inst').innerHTML = `
      <div style="padding:1.5rem">
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-icon azul"><i class="fa fa-graduation-cap"></i></div>
            <div><div class="stat-valor">${s.total_estudantes ?? 0}</div><div class="stat-label">Estudantes</div></div></div>
          <div class="stat-card"><div class="stat-icon ouro"><i class="fa fa-chalkboard-teacher"></i></div>
            <div><div class="stat-valor">${s.total_docentes ?? 0}</div><div class="stat-label">Docentes</div></div></div>
          <div class="stat-card"><div class="stat-icon verde"><i class="fa fa-check"></i></div>
            <div><div class="stat-valor">${s.total_aprovados ?? 0}</div><div class="stat-label">Aprovações</div></div></div>
          <div class="stat-card"><div class="stat-icon vermelho"><i class="fa fa-xmark"></i></div>
            <div><div class="stat-valor">${s.total_reprovados ?? 0}</div><div class="stat-label">Reprovações</div></div></div>
        </div>
        <div class="card" style="margin-top:1.5rem">
          <div class="card-header"><div class="card-title">Desempenho por Curso</div></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Curso</th><th>Estudantes</th><th>Avaliações</th><th>Aprovados</th><th>Média</th></tr></thead>
              <tbody>
                ${(r.por_curso || []).map(c => `<tr>
                  <td><strong>${c.curso}</strong></td>
                  <td>${c.estudantes}</td>
                  <td>${c.avaliacoes}</td>
                  <td>${c.aprovados ?? 0}</td>
                  <td>${c.media ?? '--'}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  // ── AGENDA ────────────────────────────────────────────────
  async agenda() {
    const agora = new Date();
    window._agCurMes = agora.getMonth() + 1;
    window._agCurAno = agora.getFullYear();

    UI.html(`
      <div style="display:grid;grid-template-columns:1fr 320px;gap:1.5rem;align-items:start">
        <div id="calendario-wrap"></div>
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
            <h3 style="font-size:1rem;font-weight:600;color:var(--azul)"><i class="fa fa-list"></i> Eventos do Mês</h3>
            ${['Administrador','Gestor Académico','Docente'].includes(App.user.perfil) ? `
              <button class="btn btn-primario btn-sm" onclick="Agenda.abrirModal()">
                <i class="fa fa-plus"></i> Novo
              </button>
            ` : ''}
          </div>
          <div id="lista-eventos"></div>
        </div>
      </div>

      <!-- MODAL EVENTO -->
      <div class="modal-overlay" id="modal-evento">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-titulo" id="modal-ev-titulo">Novo Evento</span>
            <button class="btn-fechar-modal" onclick="UI.modal('modal-evento').fechar()"><i class="fa fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <form id="form-evento" onsubmit="Agenda.salvar(event)">
              <input type="hidden" id="ev-id">
              <div class="form-group">
                <label class="form-label">Título *</label>
                <input class="form-control" id="ev-titulo" required placeholder="Título do evento">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Tipo</label>
                  <select class="form-control" id="ev-tipo">
                    <option>Aula</option><option>Prova</option><option>Entrega</option>
                    <option>Evento</option><option>Reunião</option><option>Outro</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Público</label>
                  <select class="form-control" id="ev-publico">
                    <option value="1">Sim</option>
                    <option value="0">Não</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Data/Hora Início *</label>
                  <input class="form-control" type="datetime-local" id="ev-inicio" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Data/Hora Fim</label>
                  <input class="form-control" type="datetime-local" id="ev-fim">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Descrição</label>
                <textarea class="form-control" id="ev-desc" rows="3" placeholder="Descrição opcional..."></textarea>
              </div>
              <div class="modal-footer" style="padding:0;margin-top:1rem">
                <button type="button" class="btn btn-ghost" onclick="UI.modal('modal-evento').fechar()">Cancelar</button>
                <button type="submit" class="btn btn-primario"><i class="fa fa-floppy-disk"></i> Salvar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);

    Agenda.renderCalendario();
  }
};

// ── TAB helper ──────────────────────────────────────────────
UI._tab = function(btn, alvoId) {
  btn.closest('.tabs').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('ativo'));
  btn.classList.add('ativo');
  const container = btn.closest('.tabs').nextElementSibling.parentElement || document;
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('ativo'));
  document.getElementById(alvoId).classList.add('ativo');
};

// ============================================================
//  AGENDA MODULE
// ============================================================
const Agenda = {
  dados: [],

  async renderCalendario() {
    const mes = window._agCurMes;
    const ano = window._agCurAno;
    const r = await api.get('api/agenda.php', { action: 'listar', mes, ano });
    this.dados = r.dados || [];

    const nomesMeses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                        'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const hoje = new Date();

    const primeiroDia = new Date(ano, mes - 1, 1).getDay();
    const diasNoMes   = new Date(ano, mes, 0).getDate();
    const diasMesAnt  = new Date(ano, mes - 1, 0).getDate();

    const eventsByDay = {};
    this.dados.forEach(ev => {
      const d = new Date(ev.data_inicio);
      if (d.getMonth() + 1 === mes && d.getFullYear() === ano) {
        const dia = d.getDate();
        if (!eventsByDay[dia]) eventsByDay[dia] = [];
        eventsByDay[dia].push(ev);
      }
    });

    let diasHtml = '';
    // dias do mês anterior
    for (let i = primeiroDia - 1; i >= 0; i--) {
      diasHtml += `<div class="cal-dia outro-mes"><div class="cal-dia-num">${diasMesAnt - i}</div></div>`;
    }
    // dias do mês atual
    for (let d = 1; d <= diasNoMes; d++) {
      const isHoje = d === hoje.getDate() && mes === hoje.getMonth()+1 && ano === hoje.getFullYear();
      const evs = eventsByDay[d] || [];
      const evsHtml = evs.slice(0, 3).map(ev =>
        `<div class="cal-evento ${ev.tipo}" title="${ev.titulo}">${ev.titulo}</div>`
      ).join('') + (evs.length > 3 ? `<div style="font-size:.65rem;color:var(--texto-leve)">+${evs.length-3} mais</div>` : '');
      diasHtml += `<div class="cal-dia${isHoje?' hoje':''}" onclick="Agenda.verDia(${d})">
        <div class="cal-dia-num">${d}</div>${evsHtml}
      </div>`;
    }
    // completar com próximo mês
    const total = primeiroDia + diasNoMes;
    const resto = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let d = 1; d <= resto; d++) {
      diasHtml += `<div class="cal-dia outro-mes"><div class="cal-dia-num">${d}</div></div>`;
    }

    document.getElementById('calendario-wrap').innerHTML = `
      <div class="calendario">
        <div class="cal-header">
          <button class="cal-nav-btn" onclick="Agenda.navMes(-1)"><i class="fa fa-chevron-left"></i></button>
          <h3>${nomesMeses[mes-1]} ${ano}</h3>
          <button class="cal-nav-btn" onclick="Agenda.navMes(1)"><i class="fa fa-chevron-right"></i></button>
        </div>
        <div class="cal-grid-header">
          ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => `<span>${d}</span>`).join('')}
        </div>
        <div class="cal-grid">${diasHtml}</div>
      </div>
    `;

    this.renderLista();
  },

  renderLista() {
    const lista = document.getElementById('lista-eventos');
    const podeEdit = ['Administrador','Gestor Académico','Docente'].includes(App.user.perfil);
    if (!this.dados.length) {
      lista.innerHTML = '<div class="vazio"><i class="fa-regular fa-calendar-xmark"></i><p>Sem eventos neste mês.</p></div>';
      return;
    }
    lista.innerHTML = this.dados.map(ev => {
      const d = new Date(ev.data_inicio);
      return `
        <div class="card" style="margin-bottom:.75rem;padding:1rem">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-weight:600;color:var(--azul);margin-bottom:.25rem">${ev.titulo}</div>
              <div style="font-size:.8rem;color:var(--texto-leve)">
                <i class="fa-regular fa-clock"></i> ${d.toLocaleDateString('pt-AO')} ${d.toLocaleTimeString('pt-AO',{hour:'2-digit',minute:'2-digit'})}
              </div>
              ${ev.turma_nome ? `<div style="font-size:.78rem;color:var(--texto-leve);margin-top:.2rem"><i class="fa fa-users"></i> ${ev.turma_nome}</div>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;gap:.4rem;align-items:flex-end">
              <span class="badge cal-evento ${ev.tipo}" style="background:transparent;padding:0">${ev.tipo}</span>
              ${podeEdit && ev.criado_por == App.user.id ? `
                <div style="display:flex;gap:.3rem">
                  <button class="btn btn-ghost btn-xs" onclick="Agenda.editarEvento(${ev.id})"><i class="fa fa-pen"></i></button>
                  <button class="btn btn-perigo btn-xs" onclick="Agenda.removerEvento(${ev.id})"><i class="fa fa-trash"></i></button>
                </div>
              ` : ''}
            </div>
          </div>
          ${ev.descricao ? `<div style="font-size:.82rem;color:var(--texto-leve);margin-top:.5rem;border-top:1px solid var(--cinza-2);padding-top:.5rem">${ev.descricao}</div>` : ''}
        </div>
      `;
    }).join('');
  },

  navMes(delta) {
    window._agCurMes += delta;
    if (window._agCurMes > 12) { window._agCurMes = 1; window._agCurAno++; }
    if (window._agCurMes < 1)  { window._agCurMes = 12; window._agCurAno--; }
    this.renderCalendario();
  },

  verDia(dia) {
    const evs = this.dados.filter(ev => {
      const d = new Date(ev.data_inicio);
      return d.getDate() === dia && d.getMonth()+1 === window._agCurMes;
    });
    if (!evs.length) { UI.toast('Sem eventos neste dia.', 'aviso'); return; }
    alert(evs.map(ev => `• ${ev.titulo} (${ev.tipo})`).join('\n'));
  },

  abrirModal(ev = null) {
    document.getElementById('modal-ev-titulo').textContent = ev ? 'Editar Evento' : 'Novo Evento';
    document.getElementById('ev-id').value = ev ? ev.id : '';
    document.getElementById('ev-titulo').value = ev ? ev.titulo : '';
    document.getElementById('ev-tipo').value = ev ? ev.tipo : 'Evento';
    document.getElementById('ev-desc').value = ev ? (ev.descricao || '') : '';
    document.getElementById('ev-publico').value = ev ? (ev.publico ? '1' : '0') : '1';
    document.getElementById('ev-inicio').value = ev ? ev.data_inicio.slice(0,16) : '';
    document.getElementById('ev-fim').value = ev && ev.data_fim ? ev.data_fim.slice(0,16) : '';
    UI.modal('modal-evento').abrir();
  },

  editarEvento(id) {
    const ev = this.dados.find(e => e.id == id);
    if (ev) this.abrirModal(ev);
  },

  async salvar(e) {
    e.preventDefault();
    const id = document.getElementById('ev-id').value;
    const payload = {
      action: id ? 'editar' : 'criar',
      id, titulo: document.getElementById('ev-titulo').value,
      tipo: document.getElementById('ev-tipo').value,
      descricao: document.getElementById('ev-desc').value,
      data_inicio: document.getElementById('ev-inicio').value,
      data_fim: document.getElementById('ev-fim').value,
      publico: document.getElementById('ev-publico').value,
    };
    const r = await api.post('api/agenda.php', payload);
    if (r.erro) { UI.toast(r.erro, 'erro'); return; }
    UI.toast(id ? 'Evento actualizado!' : 'Evento criado!');
    UI.modal('modal-evento').fechar();
    this.renderCalendario();
  },

  async removerEvento(id) {
    if (!UI.confirmar('Remover este evento?')) return;
    const r = await api.post('api/agenda.php', { action: 'remover', id });
    if (r.erro) { UI.toast(r.erro, 'erro'); return; }
    UI.toast('Evento removido.');
    this.renderCalendario();
  }
};

// ============================================================
//  UTILS
// ============================================================
function formatarData(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('pt-AO') + ' ' + d.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
}

// ── Sidebar mobile toggle ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-menu-toggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('aberta');
    document.querySelector('.sidebar-overlay').classList.toggle('visivel');
  });
  document.querySelector('.sidebar-overlay').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.remove('aberta');
    document.querySelector('.sidebar-overlay').classList.remove('visivel');
  });
  App.init();
});
