const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- configuração das telas ----------
// Campo: n = nome da coluna, l = rótulo, req = obrigatório, max = tamanho máximo,
// t = tipo especial (turma, disciplinas, password), mask = máscara (cpf, tel), full = linha inteira
const f = (n, l, o = {}) => ({ n, l, max: 100, ...o });
const SEC = (titulo) => ({ secao: titulo });
const CPF = { mask: 'cpf', max: 14, ph: '000.000.000-00' };
const TEL = { mask: 'tel', max: 15, ph: '(00) 00000-0000' };
const SENHA = f('senha', 'Senha', { t: 'password', max: 72 });

const ENT = {
  alunos: {
    titulo: 'Alunos', singular: 'aluno', novo: 'Novo aluno', icone: 'bi-mortarboard', grupo: 'Cadastros', precisaTurma: true,
    sub: 'Cadastro dos alunos e vínculo com a turma.',
    colunas: [{ c: 'ra', l: 'RA' }, { c: 'nome', l: 'Nome' }, { c: 'email', l: 'E-mail' }, { c: 'turma_nome', l: 'Turma', tipo: 'etiqueta' }, { c: 'telefone', l: 'Telefone' }],
    campos: [
      SEC('Dados do aluno'),
      f('nome', 'Nome', { req: true }),
      f('ra', 'RA (Registro Acadêmico)', { req: true, max: 30 }),
      f('cpf', 'CPF', { req: true, ...CPF }),
      f('turma_id', 'Turma', { req: true, t: 'turma' }),
      f('telefone', 'Telefone para contato', TEL),
      f('endereco', 'Endereço', { max: 200 }),
      SEC('Responsável'),
      f('responsavel_nome', 'Nome do responsável'),
      f('responsavel_cpf', 'CPF do responsável', CPF),
      SEC('Acesso ao aplicativo'),
      f('email', 'E-mail (login)', { req: true, t: 'email', max: 150 }),
      SENHA,
    ],
  },
  professores: {
    titulo: 'Professores', singular: 'professor', novo: 'Novo professor', icone: 'bi-person-workspace', grupo: 'Cadastros',
    sub: 'Cadastro dos professores e das turmas/disciplinas que lecionam.',
    colunas: [{ c: 'codigo', l: 'Código' }, { c: 'nome', l: 'Nome' }, { c: 'email', l: 'E-mail' }, { c: 'formacao', l: 'Formação' }, { c: 'lecionadas', l: 'Turmas / disciplinas', tipo: 'cortado' }],
    campos: [
      SEC('Dados do professor'),
      f('nome', 'Nome', { req: true }),
      f('codigo', 'Código', { req: true, max: 30 }),
      f('cpf', 'CPF', { req: true, ...CPF }),
      f('formacao', 'Formação'),
      f('telefone', 'Telefone', TEL),
      f('endereco', 'Endereço', { max: 200 }),
      SEC('Acesso ao sistema'),
      f('email', 'E-mail (login)', { req: true, t: 'email', max: 150 }),
      SENHA,
      SEC('Turmas e disciplinas lecionadas'),
      f('disciplina_ids', '', { t: 'disciplinas', full: true }),
    ],
  },
  administradores: {
    titulo: 'Administradores', singular: 'administrador', novo: 'Novo administrador', icone: 'bi-shield-lock', grupo: 'Cadastros',
    sub: 'Moderadores com acesso a este sistema desktop.',
    colunas: [{ c: 'codigo', l: 'Código' }, { c: 'nome', l: 'Nome' }, { c: 'email', l: 'E-mail' }, { c: 'instituicao', l: 'Instituição' }],
    campos: [
      SEC('Dados do administrador'),
      f('nome', 'Nome', { req: true }),
      f('codigo', 'Código', { req: true, max: 30 }),
      f('cpf', 'CPF', { req: true, ...CPF }),
      f('instituicao', 'Instituição', { req: true, max: 150 }),
      f('telefone', 'Telefone', TEL),
      f('endereco', 'Endereço', { max: 200 }),
      SEC('Acesso ao sistema'),
      f('email', 'E-mail (login)', { req: true, t: 'email', max: 150 }),
      SENHA,
    ],
  },
  turmas: {
    titulo: 'Turmas', singular: 'turma', novo: 'Nova turma', icone: 'bi-people', grupo: 'Estrutura',
    sub: 'Turmas da instituição. Alunos e professores são vinculados a elas.',
    colunas: [{ c: 'nome', l: 'Turma' }, { c: 'qtd_alunos', l: 'Alunos' }, { c: 'qtd_professores', l: 'Professores' }, { c: 'qtd_disciplinas', l: 'Disciplinas' }],
    campos: [f('nome', 'Nome da turma', { req: true, full: true, ph: 'Ex.: 1º Ano A' })],
  },
  disciplinas: {
    titulo: 'Disciplinas', singular: 'disciplina', novo: 'Nova disciplina', icone: 'bi-journal-bookmark', grupo: 'Estrutura', precisaTurma: true,
    sub: 'Disciplinas de cada turma.',
    colunas: [{ c: 'nome', l: 'Disciplina' }, { c: 'turma_nome', l: 'Turma', tipo: 'etiqueta' }],
    campos: [
      f('nome', 'Nome da disciplina', { req: true }),
      f('turma_id', 'Turma', { req: true, t: 'turma' }),
    ],
  },
};

let atual = 'inicio';
let dados = [];
let turmas = [];
let disciplinas = [];

const modalForm = new bootstrap.Modal('#modal-form');
const modalConfirma = new bootstrap.Modal('#modal-confirma');
const toast = bootstrap.Toast.getOrCreateInstance('#toast', { delay: 3500 });

// ---------- utilidades ----------
async function chamar(fn, ...args) {
  const r = await window.api[fn](...args);
  if (!r.ok) {
    if (/^Sessão expirada/.test(r.error)) sair();
    throw new Error(r.error);
  }
  return r.data;
}

function aviso(texto, tipo = 'ok') {
  const el = $('#toast');
  el.classList.remove('ok', 'erro', 'info');
  el.classList.add(tipo);
  $('#toast-texto').textContent = texto;
  toast.show();
}

function confirmar(texto) {
  return new Promise((resolve) => {
    let resposta = false;
    $('#confirma-texto').textContent = texto;
    $('#confirma-ok').onclick = () => { resposta = true; modalConfirma.hide(); };
    $('#modal-confirma').addEventListener('hidden.bs.modal', () => resolve(resposta), { once: true });
    modalConfirma.show();
  });
}

function mostrarErro(el, msg) {
  el.textContent = msg;
  el.classList.remove('d-none');
}

// Máscaras simples de CPF e telefone
function aplicarMascara(tipo, valor) {
  const d = valor.replace(/\D/g, '');
  if (tipo === 'cpf') {
    return d.slice(0, 11).replace(/(\d{3})(\d{1,3})?(\d{1,3})?(\d{1,2})?/, (_, a, b, c, e) =>
      a + (b ? '.' + b : '') + (c ? '.' + c : '') + (e ? '-' + e : ''));
  }
  const t = d.slice(0, 11);
  if (t.length <= 2) return t ? '(' + t : '';
  if (t.length <= 6) return `(${t.slice(0, 2)}) ${t.slice(2)}`;
  if (t.length <= 10) return `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}`;
  return `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}`;
}

// ---------- login / logout ----------
$('#login-ver').addEventListener('click', () => {
  const inp = $('#login-senha');
  const mostrar = inp.type === 'password';
  inp.type = mostrar ? 'text' : 'password';
  $('#login-ver i').className = mostrar ? 'bi bi-eye-slash' : 'bi bi-eye';
});

$('#form-login').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (!ev.target.reportValidity()) return;
  const erro = $('#login-erro');
  const btn = $('#login-btn');
  erro.classList.add('d-none');
  btn.disabled = true;
  btn.textContent = 'Entrando...';
  try {
    const u = await chamar('login', $('#login-email').value, $('#login-senha').value);
    $('#usuario').textContent = u.nome;
    $('#tela-login').classList.add('d-none');
    $('#tela-app').classList.remove('d-none');
    $('#form-login').reset();
    await abrir('inicio');
  } catch (e) {
    mostrarErro(erro, e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});

async function sair() {
  await window.api.logout();
  modalForm.hide();
  modalConfirma.hide();
  $('#tela-app').classList.add('d-none');
  $('#tela-login').classList.remove('d-none');
  $('#login-email').focus();
}
$('#btn-sair').addEventListener('click', sair);

// ---------- menu ----------
function montarMenu() {
  const item = (k, icone, titulo) => `<button class="menu-item" data-ir="${k}"><i class="bi ${icone}"></i> ${titulo}</button>`;
  let html = item('inicio', 'bi-house-door', 'Início');
  for (const grupo of ['Cadastros', 'Estrutura']) {
    html += `<div class="menu-grupo">${grupo}</div>`;
    for (const [k, e] of Object.entries(ENT)) if (e.grupo === grupo) html += item(k, e.icone, e.titulo);
  }
  $('#menu').innerHTML = html;
}
montarMenu();

// navegação por qualquer elemento com data-ir
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-ir]');
  if (b) abrir(b.dataset.ir);
});

async function abrir(chave) {
  atual = chave;
  document.querySelectorAll('.menu-item').forEach((b) => b.classList.toggle('ativo', b.dataset.ir === chave));
  const inicio = chave === 'inicio';
  $('#view-inicio').classList.toggle('d-none', !inicio);
  $('#view-lista').classList.toggle('d-none', inicio);
  $('#acoes-topo').classList.toggle('d-none', inicio);

  if (inicio) {
    $('#titulo').textContent = 'Início';
    $('#subtitulo').textContent = 'Visão geral do sistema.';
    return carregarInicio();
  }
  const e = ENT[chave];
  $('#titulo').textContent = e.titulo;
  $('#subtitulo').textContent = e.sub;
  $('#btn-novo-texto').textContent = e.novo;
  $('#busca').value = '';
  $('#thead').innerHTML = '<tr>' + e.colunas.map((c) => `<th>${c.l}</th>`).join('') + '<th class="text-end">Ações</th></tr>';
  await carregar();
}

// ---------- início ----------
async function carregarInicio() {
  try {
    const chaves = ['alunos', 'professores', 'turmas', 'disciplinas', 'administradores'];
    const listas = await Promise.all(chaves.map((k) => chamar('list', k)));
    $('#cards').innerHTML = chaves.map((k, i) => `
      <div class="col-md-6 col-xl-4">
        <button class="card-resumo" data-ir="${k}">
          <span class="icone"><i class="bi ${ENT[k].icone}"></i></span>
          <span><div class="numero">${listas[i].length}</div><div class="rotulo">${ENT[k].titulo}</div></span>
        </button>
      </div>`).join('');
  } catch (e) {
    aviso(e.message, 'erro');
  }
}

// ---------- listagem ----------
async function carregar() {
  const e = ENT[atual];
  try {
    dados = await chamar('list', atual);
    if (e.precisaTurma) {
      turmas = await chamar('list', 'turmas');
      $('#aviso-turma').classList.toggle('d-none', turmas.length > 0);
      $('#aviso-turma').classList.toggle('d-flex', turmas.length === 0);
      $('#btn-novo').disabled = turmas.length === 0;
    } else {
      $('#aviso-turma').classList.add('d-none');
      $('#aviso-turma').classList.remove('d-flex');
      $('#btn-novo').disabled = false;
    }
    desenhar();
  } catch (err) {
    aviso(err.message, 'erro');
  }
}

function celula(col, r) {
  const v = r[col.c];
  if (v === null || v === undefined || v === '') return '<span class="text-muted">—</span>';
  if (col.tipo === 'etiqueta') return `<span class="etiqueta">${esc(v)}</span>`;
  if (col.tipo === 'cortado') return `<span class="texto-cortado d-inline-block" title="${esc(v)}">${esc(v)}</span>`;
  return esc(v);
}

function desenhar() {
  const e = ENT[atual];
  const q = $('#busca').value.trim().toLowerCase();
  const linhas = dados.filter((r) => !q || e.colunas.some((c) => String(r[c.c] ?? '').toLowerCase().includes(q)));

  if (!linhas.length) {
    const msg = dados.length ? 'Nenhum resultado para a busca.' : `Nenhum ${e.singular} cadastrado ainda.`;
    $('#tbody').innerHTML = `<tr><td colspan="${e.colunas.length + 1}"><div class="vazio"><i class="bi ${e.icone}"></i>${msg}</div></td></tr>`;
  } else {
    $('#tbody').innerHTML = linhas.map((r) =>
      '<tr>' + e.colunas.map((c) => `<td>${celula(c, r)}</td>`).join('') +
      `<td class="text-end text-nowrap">
         <button class="btn btn-sm btn-outline-primary btn-icone" title="Editar" data-acao="editar" data-id="${r.id}"><i class="bi bi-pencil"></i></button>
         <button class="btn btn-sm btn-outline-secondary btn-icone" title="Excluir" data-acao="excluir" data-id="${r.id}"><i class="bi bi-trash"></i></button>
       </td></tr>`).join('');
  }
  $('#rodape-tabela').textContent = `${linhas.length} de ${dados.length} registro(s)`;
}

$('#busca').addEventListener('input', desenhar);
$('#btn-novo').addEventListener('click', () => abrirForm(null));

$('#tbody').addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-acao]');
  if (!b) return;
  const reg = dados.find((r) => r.id === Number(b.dataset.id));
  if (!reg) return;
  if (b.dataset.acao === 'editar') return abrirForm(reg);

  if (await confirmar(`Excluir ${ENT[atual].singular} "${reg.nome}"? Esta ação não pode ser desfeita.`)) {
    try {
      await chamar('remove', atual, reg.id);
      aviso('Registro excluído.');
      await carregar();
    } catch (e) {
      aviso(e.message, 'erro');
    }
  }
});

// ---------- formulário ----------
function campoHtml(c, reg, novo) {
  if (c.secao) return `<div class="col-12 secao-form">${esc(c.secao)}</div>`;

  const col = c.full ? 'col-12' : 'col-md-6';
  const val = reg ? reg[c.n] : '';
  const req = c.req || (c.t === 'password' && novo) ? 'required' : '';
  const rotulo = c.l ? `<label class="form-label" for="f-${c.n}">${esc(c.l)}${req ? ' *' : ''}</label>` : '';

  if (c.t === 'turma') {
    const ops = turmas.map((t) => `<option value="${t.id}" ${t.id === val ? 'selected' : ''}>${esc(t.nome)}</option>`).join('');
    return `<div class="${col}">${rotulo}<select class="form-select" id="f-${c.n}" name="${c.n}" ${req}><option value="">Selecione...</option>${ops}</select></div>`;
  }

  if (c.t === 'disciplinas') {
    const marcadas = reg && reg.disciplina_ids ? String(reg.disciplina_ids).split(',').map(Number) : [];
    let itens = '';
    let turmaAtual = null;
    for (const d of disciplinas) {
      if (d.turma_nome !== turmaAtual) { turmaAtual = d.turma_nome; itens += `<div class="turma-nome">${esc(turmaAtual)}</div>`; }
      itens += `<div class="form-check"><input class="form-check-input" type="checkbox" name="disciplina_ids" value="${d.id}" id="d${d.id}" ${marcadas.includes(d.id) ? 'checked' : ''}>
        <label class="form-check-label" for="d${d.id}">${esc(d.nome)}</label></div>`;
    }
    if (!itens) itens = '<span class="text-muted small">Nenhuma disciplina cadastrada ainda. Crie as disciplinas em "Disciplinas" e depois associe aqui.</span>';
    return `<div class="${col}"><div class="lista-checks">${itens}</div></div>`;
  }

  if (c.t === 'password') {
    const dica = novo ? 'Mínimo de 6 caracteres' : 'Deixe em branco para manter a atual';
    return `<div class="${col}">${rotulo}<div class="input-group">
      <input class="form-control" type="password" id="f-senha" name="senha" minlength="6" maxlength="72" placeholder="${dica}" autocomplete="new-password" ${req}>
      <button class="btn btn-outline-secondary" type="button" data-ver title="Mostrar/ocultar senha"><i class="bi bi-eye"></i></button></div></div>`;
  }

  const mask = c.mask ? `data-mask="${c.mask}"` : '';
  const ph = c.ph ? `placeholder="${esc(c.ph)}"` : '';
  return `<div class="${col}">${rotulo}<input class="form-control" type="${c.t || 'text'}" id="f-${c.n}" name="${c.n}" value="${esc(val)}" maxlength="${c.max}" ${mask} ${ph} autocomplete="off" ${req}></div>`;
}

async function abrirForm(reg) {
  const e = ENT[atual];
  try {
    if (e.campos.some((c) => c.t === 'turma')) {
      turmas = await chamar('list', 'turmas');
      if (!turmas.length) return aviso('Cadastre uma turma antes de continuar.', 'info');
    }
    if (e.campos.some((c) => c.t === 'disciplinas')) disciplinas = await chamar('list', 'disciplinas');
  } catch (err) {
    return aviso(err.message, 'erro');
  }
  const novo = !reg;
  $('#form-titulo').textContent = (novo ? 'Novo ' : 'Editar ') + e.singular;
  $('#form-campos').innerHTML = e.campos.map((c) => campoHtml(c, reg, novo)).join('');
  $('#form-erro').classList.add('d-none');
  $('#form').dataset.id = reg ? reg.id : '';
  modalForm.show();
  $('#modal-form').addEventListener('shown.bs.modal', () => {
    const primeiro = $('#form-campos input, #form-campos select');
    if (primeiro) primeiro.focus();
  }, { once: true });
}

// máscaras e botão de mostrar senha (delegação de eventos)
$('#form-campos').addEventListener('input', (ev) => {
  const m = ev.target.dataset && ev.target.dataset.mask;
  if (m) ev.target.value = aplicarMascara(m, ev.target.value);
});
$('#form-campos').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-ver]');
  if (!b) return;
  const inp = $('#f-senha');
  const mostrar = inp.type === 'password';
  inp.type = mostrar ? 'text' : 'password';
  $('i', b).className = mostrar ? 'bi bi-eye-slash' : 'bi bi-eye';
});

$('#form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (!ev.target.reportValidity()) return;

  const fd = new FormData(ev.target);
  const d = { id: ev.target.dataset.id ? Number(ev.target.dataset.id) : undefined };
  for (const c of ENT[atual].campos) {
    if (c.secao) continue;
    if (c.t === 'disciplinas') d.disciplina_ids = fd.getAll('disciplina_ids').map(Number);
    else d[c.n] = fd.get(c.n);
  }

  const btn = $('#form-salvar');
  btn.disabled = true;
  try {
    await chamar('save', atual, d);
    modalForm.hide();
    aviso('Registro salvo com sucesso.');
    await carregar();
  } catch (e) {
    mostrarErro($('#form-erro'), e.message);
    $('.modal-body', $('#modal-form')).scrollTop = 0;
  } finally {
    btn.disabled = false;
  }
});
