
const Cursos = {
  dados: [],

  async render() {
    const r = await api.get('api/academico.php', { action: 'cursos_listar' });
    this.dados = r.dados || [];

    UI.html(`
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fa-solid fa-building-columns"></i> Cursos</div>
          <button class="btn btn-primario btn-sm" onclick="Cursos.abrirModal()">
            <i class="fa-solid fa-plus"></i> Novo Curso
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Nome</th><th>Código</th><th>Duração</th><th>Turmas</th><th>Disciplinas</th><th>Estado</th><th>Acções</th></tr>
            </thead>
            <tbody>
              ${this.dados.length ? this.dados.map(c => `
                <tr>
                  <td><strong>${c.nome}</strong></td>
                  <td><span class="badge badge-azul">${c.codigo}</span></td>
                  <td>${c.duracao_anos} anos</td>
                  <td>${c.total_turmas}</td>
                  <td>${c.total_disciplinas}</td>
                  <td>${c.ativo ? '<span class="badge badge-verde">Activo</span>' : '<span class="badge badge-cinza">Inactivo</span>'}</td>
                  <td>
                    <div style="display:flex;gap:.35rem">
                      <button class="btn btn-ghost btn-xs" onclick="Cursos.editar(${c.id})"><i class="fa-solid fa-pen"></i></button>
                      <button class="btn btn-perigo btn-xs" onclick="Cursos.remover(${c.id},'${c.nome}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="7"><div class="vazio"><i class="fa-solid fa-building-columns"></i><p>Nenhum curso encontrado.</p></div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL CURSO -->
      <div class="modal-overlay" id="modal-curso">
        <div class="modal" style="max-width:440px">
          <div class="modal-header">
            <span class="modal-titulo" id="modal-curso-titulo">Novo Curso</span>
            <button class="btn-fechar-modal" onclick="UI.modal('modal-curso').fechar()"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <form id="form-curso" onsubmit="Cursos.salvar(event)">
              <input type="hidden" id="curso-id">
              <div class="form-group">
                <label class="form-label">Nome do Curso *</label>
                <input class="form-control" id="curso-nome" required placeholder="Ex: Engenharia Informática">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Código *</label>
                  <input class="form-control" id="curso-codigo" required placeholder="Ex: EI" style="text-transform:uppercase">
                </div>
                <div class="form-group">
                  <label class="form-label">Duração (anos)</label>
                  <input class="form-control" type="number" id="curso-duracao" value="4" min="1" max="6">
                </div>
              </div>
              <div class="form-group" id="grupo-curso-ativo" style="display:none">
                <label class="form-label">Estado</label>
                <select class="form-control" id="curso-ativo">
                  <option value="1">Activo</option><option value="0">Inactivo</option>
                </select>
              </div>
              <div class="modal-footer" style="padding:0;margin-top:1rem">
                <button type="button" class="btn btn-ghost" onclick="UI.modal('modal-curso').fechar()">Cancelar</button>
                <button type="submit" class="btn btn-primario"><i class="fa-solid fa-floppy-disk"></i> Salvar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
  },

  abrirModal(c = null) {
    document.getElementById('modal-curso-titulo').textContent = c ? 'Editar Curso' : 'Novo Curso';
    document.getElementById('curso-id').value = c ? c.id : '';
    document.getElementById('curso-nome').value = c ? c.nome : '';
    document.getElementById('curso-codigo').value = c ? c.codigo : '';
    document.getElementById('curso-duracao').value = c ? c.duracao_anos : 4;
    document.getElementById('grupo-curso-ativo').style.display = c ? 'block' : 'none';
    if (c) document.getElementById('curso-ativo').value = c.ativo;
    UI.modal('modal-curso').abrir();
  },

  editar(id) { this.abrirModal(this.dados.find(c => c.id == id)); },

  async salvar(e) {
    e.preventDefault();
    const id = document.getElementById('curso-id').value;
    const r = await api.post('api/academico.php', {
      action: id ? 'cursos_editar' : 'cursos_criar',
      id, nome: document.getElementById('curso-nome').value,
      codigo: document.getElementById('curso-codigo').value,
      duracao_anos: document.getElementById('curso-duracao').value,
      ativo: document.getElementById('curso-ativo').value || 1,
    });
    if (r.erro) { UI.toast(r.erro, 'erro'); return; }
    UI.toast(id ? 'Curso actualizado!' : 'Curso criado!');
    UI.modal('modal-curso').fechar();
    this.render();
  },

  async remover(id, nome) {
    if (!UI.confirmar(`Desactivar o curso "${nome}"?`)) return;
    const r = await api.post('api/academico.php', { action: 'cursos_remover', id });
    if (r.erro) { UI.toast(r.erro, 'erro'); return; }
    UI.toast('Curso desactivado.');
    this.render();
  }
};

// ──────────────────────────────────────────────────────────────
//  DISCIPLINAS
// ──────────────────────────────────────────────────────────────
const Disciplinas = {
  dados: [],
  cursos: [],

  async render() {
    const [rDisc, rCursos] = await Promise.all([
      api.get('api/academico.php', { action: 'disc_listar' }),
      api.get('api/academico.php', { action: 'cursos_listar' })
    ]);
    this.dados  = rDisc.dados || [];
    this.cursos = rCursos.dados || [];

    UI.html(`
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fa-solid fa-book"></i> Disciplinas</div>
          <div style="display:flex;gap:.5rem;align-items:center">
            <select class="form-control" id="filtro-disc-curso" style="width:auto" onchange="Disciplinas.filtrar()">
              <option value="">Todos os cursos</option>
              ${this.cursos.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
            </select>
            <button class="btn btn-primario btn-sm" onclick="Disciplinas.abrirModal()">
              <i class="fa-solid fa-plus"></i> Nova
            </button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Nome</th><th>Código</th><th>Curso</th><th>Carga (h)</th><th>Estado</th><th>Acções</th></tr>
            </thead>
            <tbody id="tbody-disc">
              ${this._renderRows(this.dados)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL DISCIPLINA -->
      <div class="modal-overlay" id="modal-disc">
        <div class="modal" style="max-width:460px">
          <div class="modal-header">
            <span class="modal-titulo" id="modal-disc-titulo">Nova Disciplina</span>
            <button class="btn-fechar-modal" onclick="UI.modal('modal-disc').fechar()"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <form id="form-disc" onsubmit="Disciplinas.salvar(event)">
              <input type="hidden" id="disc-id">
              <div class="form-group">
                <label class="form-label">Nome *</label>
                <input class="form-control" id="disc-nome" required placeholder="Nome da disciplina">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Código *</label>
                  <input class="form-control" id="disc-codigo" required placeholder="Ex: BD" style="text-transform:uppercase">
                </div>
                <div class="form-group">
                  <label class="form-label">Carga horária</label>
                  <input class="form-control" type="number" id="disc-carga" value="60" min="15">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Curso</label>
                <select class="form-control" id="disc-curso">
                  <option value="">-- Sem curso específico --</option>
                  ${this.cursos.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
                </select>
              </div>
              <div class="form-group" id="grupo-disc-ativo" style="display:none">
                <label class="form-label">Estado</label>
                <select class="form-control" id="disc-ativo">
                  <option value="1">Activa</option><option value="0">Inactiva</option>
                </select>
              </div>
              <div class="modal-footer" style="padding:0;margin-top:1rem">
                <button type="button" class="btn btn-ghost" onclick="UI.modal('modal-disc').fechar()">Cancelar</button>
                <button type="submit" class="btn btn-primario"><i class="fa-solid fa-floppy-disk"></i> Salvar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
  },

  _renderRows(dados) {
    if (!dados.length) return `<tr><td colspan="6"><div class="vazio"><i class="fa-solid fa-book-open"></i><p>Nenhuma disciplina.</p></div></td></tr>`;
    return dados.map(d => `
      <tr>
        <td><strong>${d.nome}</strong></td>
        <td><span class="badge badge-azul">${d.codigo}</span></td>
        <td>${d.curso_nome || '<span style="color:var(--cinza-3)">--</span>'}</td>
        <td>${d.carga_horaria}h</td>
        <td>${d.ativo ? '<span class="badge badge-verde">Activa</span>' : '<span class="badge badge-cinza">Inactiva</span>'}</td>
        <td>
          <div style="display:flex;gap:.35rem">
            <button class="btn btn-ghost btn-xs" onclick="Disciplinas.editar(${d.id})"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-perigo btn-xs" onclick="Disciplinas.remover(${d.id},'${d.nome}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  async filtrar() {
    const cursoId = document.getElementById('filtro-disc-curso').value;
    const r = await api.get('api/academico.php', { action: 'disc_listar', curso_id: cursoId });
    this.dados = r.dados || [];
    document.getElementById('tbody-disc').innerHTML = this._renderRows(this.dados);
  },

  abrirModal(d = null) {
    document.getElementById('modal-disc-titulo').textContent = d ? 'Editar Disciplina' : 'Nova Disciplina';
    document.getElementById('disc-id').value = d ? d.id : '';
    document.getElementById('disc-nome').value = d ? d.nome : '';
    document.getElementById('disc-codigo').value = d ? d.codigo : '';
    document.getElementById('disc-carga').value = d ? d.carga_horaria : 60;
    document.getElementById('disc-curso').value = d ? (d.curso_id || '') : '';
    document.getElementById('grupo-disc-ativo').style.display = d ? 'block' : 'none';
    if (d) document.getElementById('disc-ativo').value = d.ativo;
    UI.modal('modal-disc').abrir();
  },

  editar(id) { this.abrirModal(this.dados.find(d => d.id == id)); },

  async salvar(e) {
    e.preventDefault();
    const id = document.getElementById('disc-id').value;
    const r = await api.post('api/academico.php', {
      action: id ? 'disc_editar' : 'disc_criar',
      id, nome: document.getElementById('disc-nome').value,
      codigo: document.getElementById('disc-codigo').value,
      carga_horaria: document.getElementById('disc-carga').value,
      curso_id: document.getElementById('disc-curso').value,
      ativo: document.getElementById('disc-ativo').value || 1,
    });
    if (r.erro) { UI.toast(r.erro, 'erro'); return; }
    UI.toast(id ? 'Disciplina actualizada!' : 'Disciplina criada!');
    UI.modal('modal-disc').fechar();
    this.render();
  },

  async remover(id, nome) {
    if (!UI.confirmar(`Desactivar a disciplina "${nome}"?`)) return;
    const r = await api.post('api/academico.php', { action: 'disc_remover', id });
    if (r.erro) { UI.toast(r.erro, 'erro'); return; }
    UI.toast('Disciplina desactivada.');
    this.render();
  }
};

// ──────────────────────────────────────────────────────────────
//  TURMAS
// ──────────────────────────────────────────────────────────────
const Turmas = {
  dados: [],
  cursos: [],

  async render() {
    const [rTurmas, rCursos] = await Promise.all([
      api.get('api/academico.php', { action: 'turmas_listar' }),
      api.get('api/academico.php', { action: 'cursos_listar' })
    ]);
    this.dados  = rTurmas.dados || [];
    this.cursos = rCursos.dados || [];

    UI.html(`
      <div class="card" style="margin-bottom:1.5rem">
        <div class="card-header">
          <div class="card-title"><i class="fa-solid fa-users-between-lines"></i> Turmas</div>
          <button class="btn btn-primario btn-sm" onclick="Turmas.abrirModal()">
            <i class="fa-solid fa-plus"></i> Nova Turma
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Nome</th><th>Curso</th><th>Ano Lectivo</th><th>Ano Curr.</th><th>Turno</th><th>Estudantes</th><th>Disciplinas</th><th>Acções</th></tr>
            </thead>
            <tbody>
              ${this.dados.length ? this.dados.map(t => `
                <tr>
                  <td><strong>${t.nome}</strong></td>
                  <td>${t.curso_nome || '--'}</td>
                  <td>${t.ano_letivo}</td>
                  <td>${t.ano_curricular}º</td>
                  <td><span class="badge badge-cinza">${t.turno}</span></td>
                  <td><span class="badge badge-azul"><i class="fa-solid fa-users"></i> ${t.total_estudantes}</span></td>
                  <td><span class="badge badge-ouro"><i class="fa-solid fa-book"></i> ${t.total_disciplinas}</span></td>
                  <td>
                    <div style="display:flex;gap:.35rem;flex-wrap:wrap">
                      <button class="btn btn-ghost btn-xs" onclick="Turmas.editar(${t.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                      <button class="btn btn-primario btn-xs" onclick="Turmas.abrirGestao(${t.id},'${t.nome}')" title="Gerir">
                        <i class="fa-solid fa-sliders"></i> Gerir
                      </button>
                      <button class="btn btn-perigo btn-xs" onclick="Turmas.remover(${t.id},'${t.nome}')" title="Remover"><i class="fa-solid fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="8"><div class="vazio"><i class="fa-solid fa-users-slash"></i><p>Nenhuma turma encontrada.</p></div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL TURMA -->
      <div class="modal-overlay" id="modal-turma">
        <div class="modal" style="max-width:500px">
          <div class="modal-header">
            <span class="modal-titulo" id="modal-turma-titulo">Nova Turma</span>
            <button class="btn-fechar-modal" onclick="UI.modal('modal-turma').fechar()"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <form id="form-turma" onsubmit="Turmas.salvar(event)">
              <input type="hidden" id="turma-id">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nome da Turma *</label>
                  <input class="form-control" id="turma-nome" required placeholder="Ex: EI-2024-T1">
                </div>
                <div class="form-group">
                  <label class="form-label">Ano Lectivo *</label>
                  <input class="form-control" id="turma-ano" required placeholder="2024/2025">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Curso</label>
                  <select class="form-control" id="turma-curso">
                    <option value="">-- Nenhum --</option>
                    ${this.cursos.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Ano Curricular</label>
                  <select class="form-control" id="turma-ano-curr">
                    ${[1,2,3,4,5].map(n => `<option value="${n}">${n}º Ano</option>`).join('')}
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Turno</label>
                  <select class="form-control" id="turma-turno">
                    <option>Manhã</option><option>Tarde</option><option>Noite</option>
                  </select>
                </div>
                <div class="form-group" id="grupo-turma-ativo" style="display:none">
                  <label class="form-label">Estado</label>
                  <select class="form-control" id="turma-ativo">
                    <option value="1">Activa</option><option value="0">Inactiva</option>
                  </select>
                </div>
              </div>
              <div class="modal-footer" style="padding:0;margin-top:1rem">
                <button type="button" class="btn btn-ghost" onclick="UI.modal('modal-turma').fechar()">Cancelar</button>
                <button type="submit" class="btn btn-primario"><i class="fa-solid fa-floppy-disk"></i> Salvar</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- MODAL GESTÃO DE TURMA -->
      <div class="modal-overlay" id="modal-gestao">
        <div class="modal" style="max-width:780px">
          <div class="modal-header">
            <span class="modal-titulo" id="modal-gestao-titulo">Gerir Turma</span>
            <button class="btn-fechar-modal" onclick="UI.modal('modal-gestao').fechar()"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body" id="gestao-body">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
    `);
  },

  abrirModal(t = null) {
    document.getElementById('modal-turma-titulo').textContent = t ? 'Editar Turma' : 'Nova Turma';
    document.getElementById('turma-id').value = t ? t.id : '';
    document.getElementById('turma-nome').value = t ? t.nome : '';
    document.getElementById('turma-ano').value = t ? t.ano_letivo : '';
    document.getElementById('turma-curso').value = t ? (t.curso_id || '') : '';
    document.getElementById('turma-ano-curr').value = t ? t.ano_curricular : 1;
    document.getElementById('turma-turno').value = t ? t.turno : 'Manhã';
    document.getElementById('grupo-turma-ativo').style.display = t ? 'block' : 'none';
    if (t) document.getElementById('turma-ativo').value = t.ativo;
    UI.modal('modal-turma').abrir();
  },

  editar(id) { this.abrirModal(this.dados.find(t => t.id == id)); },

  async salvar(e) {
    e.preventDefault();
    const id = document.getElementById('turma-id').value;
    const r = await api.post('api/academico.php', {
      action: id ? 'turmas_editar' : 'turmas_criar',
      id, nome: document.getElementById('turma-nome').value,
      ano_letivo: document.getElementById('turma-ano').value,
      curso_id: document.getElementById('turma-curso').value,
      ano_curricular: document.getElementById('turma-ano-curr').value,
      turno: document.getElementById('turma-turno').value,
      ativo: document.getElementById('turma-ativo').value || 1,
    });
    if (r.erro) { UI.toast(r.erro, 'erro'); return; }
    UI.toast(id ? 'Turma actualizada!' : 'Turma criada!');
    UI.modal('modal-turma').fechar();
    this.render();
  },

  async remover(id, nome) {
    if (!UI.confirmar(`Desactivar a turma "${nome}"?`)) return;
    const r = await api.post('api/academico.php', { action: 'turmas_remover', id });
    if (r.erro) { UI.toast(r.erro, 'erro'); return; }
    UI.toast('Turma desactivada.');
    this.render();
  },

  // ── GESTÃO INTERNA DA TURMA ────────────────────────────────
  async abrirGestao(turmaId, turmaNome) {
    document.getElementById('modal-gestao-titulo').textContent = `Gerir: ${turmaNome}`;
    UI.modal('modal-gestao').abrir();
    await this.renderGestao(turmaId, turmaNome);
  },

  async renderGestao(turmaId, turmaNome) {
    const [rMat, rTD, rDiscs, rDocentes] = await Promise.all([
      api.get('api/academico.php', { action: 'matricula_listar', turma_id: turmaId }),
      api.get('api/academico.php', { action: 'td_listar', turma_id: turmaId }),
      api.get('api/academico.php', { action: 'disc_listar' }),
      api.get('api/academico.php', { action: 'docentes_lista' }),
    ]);

    const matriculas = rMat.dados || [];
    const tdList     = rTD.dados || [];
    const discs      = rDiscs.dados || [];
    const docentes   = rDocentes.dados || [];

    document.getElementById('gestao-body').innerHTML = `
      <div class="tabs" style="margin-bottom:1.25rem">
        <button class="tab-btn ativo" onclick="UI._tabEl(this,'gtab-estudantes')">
          <i class="fa-solid fa-user-graduate"></i> Estudantes (${matriculas.length})
        </button>
        <button class="tab-btn" onclick="UI._tabEl(this,'gtab-disciplinas')">
          <i class="fa-solid fa-book"></i> Disciplinas/Docentes (${tdList.length})
        </button>
      </div>

      <!-- TAB ESTUDANTES -->
      <div class="tab-content ativo" id="gtab-estudantes">
        <div style="display:flex;justify-content:flex-end;margin-bottom:.75rem">
          <button class="btn btn-primario btn-sm" onclick="Turmas.abrirAdicionarEstudante(${turmaId},'${turmaNome}')">
            <i class="fa-solid fa-user-plus"></i> Adicionar Estudante(s)
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nº</th><th>Nome</th><th>Email</th><th>Matrícula</th><th>Acção</th></tr></thead>
            <tbody id="tbody-matriculas">
              ${matriculas.length ? matriculas.map(m => `
                <tr id="mat-row-${m.id}">
                  <td>${m.numero || '--'}</td>
                  <td><strong>${m.nome}</strong></td>
                  <td>${m.email}</td>
                  <td>${m.data_matricula || '--'}</td>
                  <td>
                    <button class="btn btn-perigo btn-xs" onclick="Turmas.removerEstudante(${turmaId},${m.id},'${m.nome}')">
                      <i class="fa-solid fa-user-minus"></i> Remover
                    </button>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="5"><div class="vazio"><i class="fa-solid fa-users-slash"></i><p>Nenhum estudante matriculado.</p></div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB DISCIPLINAS/DOCENTES -->
      <div class="tab-content" id="gtab-disciplinas">
        <div style="margin-bottom:1rem;padding:1rem;background:var(--cinza-1);border-radius:var(--radius);border:1px solid var(--cinza-2)">
          <div style="font-size:.88rem;font-weight:600;color:var(--azul);margin-bottom:.75rem">
            <i class="fa-solid fa-plus-circle"></i> Atribuir Disciplina ao Docente
          </div>
          <div class="form-row-3">
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Disciplina</label>
              <select class="form-control" id="sel-disc-atrib">
                <option value="">-- Seleccione --</option>
                ${discs.map(d => `<option value="${d.id}">${d.nome}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Docente</label>
              <select class="form-control" id="sel-doc-atrib">
                <option value="">-- Seleccione --</option>
                ${docentes.map(d => `<option value="${d.id}">${d.nome}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Ano Lectivo</label>
              <input class="form-control" id="inp-ano-atrib" value="2024/2025" placeholder="2024/2025">
            </div>
          </div>
          <div style="margin-top:.75rem;text-align:right">
            <button class="btn btn-primario btn-sm" onclick="Turmas.atribuirDisciplina(${turmaId},'${turmaNome}')">
              <i class="fa-solid fa-link"></i> Atribuir
            </button>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead><tr><th>Disciplina</th><th>Código</th><th>Docente</th><th>Nº Docente</th><th>Ano Lectivo</th><th>Acção</th></tr></thead>
            <tbody id="tbody-td">
              ${tdList.length ? tdList.map(td => `
                <tr id="td-row-${td.id}">
                  <td><strong>${td.disciplina}</strong></td>
                  <td><span class="badge badge-azul">${td.codigo}</span></td>
                  <td>${td.docente}</td>
                  <td>${td.docente_numero || '--'}</td>
                  <td>${td.ano_letivo}</td>
                  <td>
                    <button class="btn btn-perigo btn-xs" onclick="Turmas.removerAtribuicao(${td.id},'${td.disciplina}')">
                      <i class="fa-solid fa-unlink"></i> Remover
                    </button>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="6"><div class="vazio"><i class="fa-solid fa-book-open"></i><p>Nenhuma disciplina atribuída.</p></div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // store context
    window._gestaoTurmaId   = turmaId;
    window._gestaoTurmaNome = turmaNome;
  },

  // ── ADICIONAR ESTUDANTES ───────────────────────────────────
  async abrirAdicionarEstudante(turmaId, turmaNome) {
    const r = await api.get('api/academico.php', { action: 'estudantes_disponiveis', turma_id: turmaId });
    const disponiveis = r.dados || [];

    // cria modal temporário
    let m = document.getElementById('modal-add-estudante');
    if (!m) {
      m = document.createElement('div');
      m.className = 'modal-overlay';
      m.id = 'modal-add-estudante';
      m.innerHTML = `
        <div class="modal" style="max-width:560px">
          <div class="modal-header">
            <span class="modal-titulo">Adicionar Estudantes — ${turmaNome}</span>
            <button class="btn-fechar-modal" onclick="UI.modal('modal-add-estudante').fechar()"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body" id="add-est-body"></div>
        </div>`;
      document.body.appendChild(m);
    }

    document.getElementById('add-est-body').innerHTML = `
      <div style="margin-bottom:.75rem">
        <input class="form-control" id="busca-est" placeholder="Pesquisar estudante..." oninput="Turmas._filtrarEstudantes()" autocomplete="off">
      </div>
      <div style="font-size:.8rem;color:var(--texto-leve);margin-bottom:.5rem">
        Seleccione um ou mais estudantes para matricular:
      </div>
      <div id="lista-est-disp" style="max-height:320px;overflow-y:auto;border:1px solid var(--cinza-2);border-radius:8px">
        ${disponiveis.length ? disponiveis.map(e => `
          <label style="display:flex;align-items:center;gap:.75rem;padding:.65rem 1rem;border-bottom:1px solid var(--cinza-2);cursor:pointer;transition:background .15s" class="est-item" onmouseover="this.style.background='var(--cinza-1)'" onmouseout="this.style.background=''">
            <input type="checkbox" value="${e.id}" class="chk-est" style="width:16px;height:16px;accent-color:var(--azul-claro)">
            <div>
              <div style="font-weight:500;font-size:.9rem">${e.nome}</div>
              <div style="font-size:.78rem;color:var(--texto-leve)">${e.numero ? e.numero + ' · ' : ''}${e.email}</div>
            </div>
          </label>
        `).join('') : `<div class="vazio"><i class="fa-solid fa-check-double"></i><p>Todos os estudantes já estão matriculados.</p></div>`}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1rem">
        <span style="font-size:.82rem;color:var(--texto-leve)" id="contagem-sel">0 seleccionado(s)</span>
        <div style="display:flex;gap:.5rem">
          <button class="btn btn-ghost btn-sm" onclick="UI.modal('modal-add-estudante').fechar()">Cancelar</button>
          <button class="btn btn-primario btn-sm" onclick="Turmas.confirmarAdicionar(${turmaId},'${turmaNome}')">
            <i class="fa-solid fa-user-plus"></i> Matricular
          </button>
        </div>
      </div>
    `;

    // contador
    document.getElementById('lista-est-disp').addEventListener('change', () => {
      const n = document.querySelectorAll('.chk-est:checked').length;
      document.getElementById('contagem-sel').textContent = `${n} seleccionado(s)`;
    });

    window._estDisponiveis = disponiveis;
    UI.modal('modal-add-estudante').abrir();
  },

  _filtrarEstudantes() {
    const busca = document.getElementById('busca-est').value.toLowerCase();
    document.querySelectorAll('.est-item').forEach(el => {
      const txt = el.textContent.toLowerCase();
      el.style.display = txt.includes(busca) ? '' : 'none';
    });
  },

  async confirmarAdicionar(turmaId, turmaNome) {
    const ids = [...document.querySelectorAll('.chk-est:checked')].map(c => c.value);
    if (!ids.length) { UI.toast('Seleccione pelo menos um estudante.', 'aviso'); return; }
    const r = await api.post('api/academico.php', {
      action: 'matricula_adicionar',
      turma_id: turmaId,
      estudante_ids: JSON.stringify(ids)
    });
    if (r.erro) { UI.toast(r.erro, 'erro'); return; }
    UI.toast(`${r.adicionados} estudante(s) matriculado(s)!`);
    UI.modal('modal-add-estudante').fechar();
    await this.renderGestao(turmaId, turmaNome);
    UI.modal('modal-gestao').abrir();
  },

  async removerEstudante(turmaId, estudanteId, nome) {
    if (!UI.confirmar(`Remover "${nome}" da turma?`)) return;
    const r = await api.post('api/academico.php', {
      action: 'matricula_remover', turma_id: turmaId, estudante_id: estudanteId
    });
    if (r.erro) { UI.toast(r.erro, 'erro'); return; }
    UI.toast('Estudante removido da turma.');
    await this.renderGestao(turmaId, window._gestaoTurmaNome);
    UI.modal('modal-gestao').abrir();
  },

  // ── ATRIBUIÇÃO DISCIPLINA/DOCENTE ──────────────────────────
  async atribuirDisciplina(turmaId, turmaNome) {
    const discId   = document.getElementById('sel-disc-atrib').value;
    const docId    = document.getElementById('sel-doc-atrib').value;
    const anoLetivo= document.getElementById('inp-ano-atrib').value.trim();

    if (!discId || !docId || !anoLetivo) {
      UI.toast('Seleccione a disciplina, o docente e o ano lectivo.', 'aviso'); return;
    }

    const r = await api.post('api/academico.php', {
      action: 'td_atribuir',
      turma_id: turmaId, disciplina_id: discId, docente_id: docId, ano_letivo: anoLetivo
    });
    if (r.erro) { UI.toast(r.erro, 'erro'); return; }
    UI.toast('Disciplina atribuída com sucesso!');
    await this.renderGestao(turmaId, turmaNome);
    UI.modal('modal-gestao').abrir();
    // reactivar tab disciplinas
    setTimeout(() => {
      const btns = document.querySelectorAll('.tabs .tab-btn');
      if (btns[1]) btns[1].click();
    }, 100);
  },

  async removerAtribuicao(id, disciplina) {
    if (!UI.confirmar(`Remover a atribuição de "${disciplina}"?`)) return;
    const r = await api.post('api/academico.php', { action: 'td_remover', id });
    if (r.erro) { UI.toast(r.erro, 'erro'); return; }
    UI.toast('Atribuição removida.');
    const turmaId   = window._gestaoTurmaId;
    const turmaNome = window._gestaoTurmaNome;
    await this.renderGestao(turmaId, turmaNome);
    UI.modal('modal-gestao').abrir();
  }
};

// ──────────────────────────────────────────────────────────────
//  TAB HELPER (dentro de modais)
// ──────────────────────────────────────────────────────────────
UI._tabEl = function(btn, alvoId) {
  const container = btn.closest('.tabs');
  container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('ativo'));
  btn.classList.add('ativo');
  // tabs dentro do modal-gestao
  document.querySelectorAll('#gestao-body .tab-content').forEach(t => t.classList.remove('ativo'));
  document.getElementById(alvoId).classList.add('ativo');
};
