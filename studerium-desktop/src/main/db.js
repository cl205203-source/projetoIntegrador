// Camada de banco de dados (MySQL via mysql2).
// Usuário e senha vêm do arquivo .env (USER_NAME e USER_PASSWORD).
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const san = require('./sanitize');

let pool;

// ---------- senhas ----------
function hash(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(senha, salt, 32).toString('hex');
}
function verify(senha, stored) {
  const [salt, h] = String(stored).split(':');
  const teste = crypto.scryptSync(senha, salt, 32);
  return crypto.timingSafeEqual(Buffer.from(h, 'hex'), teste);
}

// ---------- esquema ----------
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS administradores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL, email VARCHAR(150) NOT NULL UNIQUE, cpf VARCHAR(14) NOT NULL UNIQUE,
    telefone VARCHAR(20), endereco VARCHAR(200), codigo VARCHAR(30) NOT NULL UNIQUE,
    instituicao VARCHAR(150) NOT NULL, senha VARCHAR(255) NOT NULL
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS turmas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS disciplinas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    turma_id INT NOT NULL,
    UNIQUE KEY uq_disciplina_turma (nome, turma_id),
    FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS alunos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL, email VARCHAR(150) NOT NULL UNIQUE, cpf VARCHAR(14) NOT NULL UNIQUE,
    endereco VARCHAR(200), ra VARCHAR(30) NOT NULL UNIQUE,
    turma_id INT NOT NULL,
    responsavel_nome VARCHAR(100), responsavel_cpf VARCHAR(14), telefone VARCHAR(20),
    senha VARCHAR(255) NOT NULL,
    FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS professores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL, email VARCHAR(150) NOT NULL UNIQUE, cpf VARCHAR(14) NOT NULL UNIQUE,
    telefone VARCHAR(20), endereco VARCHAR(200), codigo VARCHAR(30) NOT NULL UNIQUE,
    formacao VARCHAR(100), senha VARCHAR(255) NOT NULL
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS professor_disciplinas (
    professor_id INT NOT NULL,
    disciplina_id INT NOT NULL,
    PRIMARY KEY (professor_id, disciplina_id),
    FOREIGN KEY (professor_id) REFERENCES professores(id) ON DELETE CASCADE,
    FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
];

// Administrador criado na primeira execução (banco vazio)
const ADMIN_PADRAO = {
  nome: 'Administrador', email: 'admin@studerium.com', cpf: '000.000.000-00',
  codigo: 'ADM001', instituicao: 'Instituição padrão', senha: 'admin123',
};

// ---------- configuração das entidades ----------
const ENT = {
  alunos: {
    cols: ['nome', 'email', 'cpf', 'endereco', 'ra', 'turma_id', 'responsavel_nome', 'responsavel_cpf', 'telefone'],
    obrig: ['nome', 'email', 'cpf', 'ra', 'turma_id'],
    senha: true,
  },
  professores: {
    cols: ['nome', 'email', 'cpf', 'telefone', 'endereco', 'codigo', 'formacao'],
    obrig: ['nome', 'email', 'cpf', 'codigo'],
    senha: true,
  },
  administradores: {
    cols: ['nome', 'email', 'cpf', 'telefone', 'endereco', 'codigo', 'instituicao'],
    obrig: ['nome', 'email', 'cpf', 'codigo', 'instituicao'],
    senha: true,
  },
  turmas: { cols: ['nome'], obrig: ['nome'] },
  disciplinas: { cols: ['nome', 'turma_id'], obrig: ['nome', 'turma_id'] },
};

const ROTULO = {
  nome: 'Nome', email: 'E-mail', cpf: 'CPF', ra: 'RA', turma_id: 'Turma',
  codigo: 'Código', instituicao: 'Instituição',
};

// Só aceita nomes de entidade da lista (evita nomes como "constructor" ou "__proto__")
function entidade(ent) {
  if (typeof ent !== 'string' || !Object.hasOwn(ENT, ent)) throw new Error('Entidade inválida.');
  return ENT[ent];
}

// ---------- helpers ----------
async function all(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

function amigavel(err) {
  if (err.code === 'ER_DUP_ENTRY') {
    const chave = /for key '(?:\w+\.)?(\w+)'/.exec(err.message);
    const campo = { email: 'e-mail', cpf: 'CPF', ra: 'RA', codigo: 'código', nome: 'nome', uq_disciplina_turma: 'nome nesta turma' }[chave && chave[1]] || 'valor';
    return new Error(`Já existe um registro com este ${campo}.`);
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_NO_REFERENCED_ROW_2') {
    return new Error('Não é possível concluir: existem registros vinculados (ex.: alunos nesta turma).');
  }
  return err instanceof Error ? err : new Error(String(err));
}

async function tx(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await fn(conn);
    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw amigavel(err);
  } finally {
    conn.release();
  }
}

// ---------- inicialização ----------
async function init() {
  const e = process.env;
  const nomeBanco = e.DB_NAME;
  if (!nomeBanco) throw new Error('DB_NAME não definido no arquivo .env.');

  // Conecta diretamente ao banco existente sem tentar criar
  pool = mysql.createPool({
    host: e.DB_HOST || 'localhost',
    port: Number(e.DB_PORT) || 3306,
    user: e.USER_NAME,
    password: e.USER_PASSWORD || '',
    database: nomeBanco,
    waitForConnections: true,
    connectionLimit: 5
  });

  // Cria as tabelas se ainda não existirem
  for (const sql of SCHEMA) await pool.query(sql);

  const [{ n }] = await all('SELECT COUNT(*) AS n FROM administradores');
  if (Number(n) === 0) {
    const a = ADMIN_PADRAO;
    await pool.execute(
      'INSERT INTO administradores (nome, email, cpf, codigo, instituicao, senha) VALUES (?,?,?,?,?,?)',
      [a.nome, a.email, a.cpf, a.codigo, a.instituicao, hash(a.senha)]
    );
  }
}

async function close() {
  if (pool) await pool.end();
}

// ---------- operações ----------
async function login(email, senha) {
  if (typeof email !== 'string' || typeof senha !== 'string') throw new Error('E-mail ou senha inválidos.');
  const u = (await all('SELECT id, nome, email, senha FROM administradores WHERE email = ?', [email.trim().toLowerCase().slice(0, 150)]))[0];
  if (!u || !verify(senha, u.senha)) throw new Error('E-mail ou senha inválidos.');
  return { id: u.id, nome: u.nome, email: u.email };
}

async function list(ent) {
  entidade(ent);
  const P = (cols, a) => cols.map((c) => `${a}.${c}`).join(', ');
  switch (ent) {
    case 'alunos':
      return all(`SELECT a.id, ${P(ENT.alunos.cols, 'a')}, t.nome AS turma_nome
                  FROM alunos a JOIN turmas t ON t.id = a.turma_id ORDER BY a.nome`);
    case 'professores':
      return all(`SELECT p.id, ${P(ENT.professores.cols, 'p')},
                    (SELECT GROUP_CONCAT(CONCAT(t.nome, ' - ', d.nome) SEPARATOR ', ')
                       FROM professor_disciplinas pd
                       JOIN disciplinas d ON d.id = pd.disciplina_id
                       JOIN turmas t ON t.id = d.turma_id
                      WHERE pd.professor_id = p.id) AS lecionadas,
                    (SELECT GROUP_CONCAT(pd.disciplina_id) FROM professor_disciplinas pd
                      WHERE pd.professor_id = p.id) AS disciplina_ids
                  FROM professores p ORDER BY p.nome`);
    case 'administradores':
      return all(`SELECT id, ${ENT.administradores.cols.join(', ')} FROM administradores ORDER BY nome`);
    case 'turmas':
      return all(`SELECT t.id, t.nome,
                    (SELECT COUNT(*) FROM alunos a WHERE a.turma_id = t.id) AS qtd_alunos,
                    (SELECT COUNT(DISTINCT pd.professor_id) FROM professor_disciplinas pd
                       JOIN disciplinas d ON d.id = pd.disciplina_id WHERE d.turma_id = t.id) AS qtd_professores,
                    (SELECT COUNT(*) FROM disciplinas d WHERE d.turma_id = t.id) AS qtd_disciplinas
                  FROM turmas t ORDER BY t.nome`);
    case 'disciplinas':
      return all(`SELECT d.id, d.nome, d.turma_id, t.nome AS turma_nome
                  FROM disciplinas d JOIN turmas t ON t.id = d.turma_id
                  ORDER BY t.nome, d.nome`);
  }
}

async function save(ent, d) {
  const cfg = entidade(ent);
  d = d && typeof d === 'object' ? d : {};

  // sanitização
  const v = {};
  for (const c of cfg.cols) v[c] = c === 'turma_id' ? san.inteiro(d[c]) : san.campo(c, d[c]);
  for (const c of cfg.obrig) {
    if (v[c] == null) throw new Error(`Preencha o campo obrigatório: ${ROTULO[c] || c}.`);
  }

  const id = d.id ? san.inteiro(d.id) : null;
  if (d.id && !id) throw new Error('Registro inválido.');
  const novo = !id;

  const senha = typeof d.senha === 'string' ? d.senha : '';
  if (cfg.senha) {
    if ((novo || senha) && (senha.length < 6 || senha.length > 72)) {
      throw new Error('A senha deve ter entre 6 e 72 caracteres.');
    }
  }
  const disciplinaIds = Array.isArray(d.disciplina_ids)
    ? [...new Set(d.disciplina_ids.map(san.inteiro).filter(Boolean))]
    : [];

  await tx(async (conn) => {
    const cols = [...cfg.cols];
    const vals = cols.map((c) => v[c]);
    if (cfg.senha && senha) { cols.push('senha'); vals.push(hash(senha)); }

    let regId = id;
    if (novo) {
      const [r] = await conn.execute(
        `INSERT INTO ${ent} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, vals);
      regId = r.insertId;
    } else {
      await conn.execute(`UPDATE ${ent} SET ${cols.map((c) => c + ' = ?').join(', ')} WHERE id = ?`, [...vals, id]);
    }

    if (ent === 'professores') {
      await conn.execute('DELETE FROM professor_disciplinas WHERE professor_id = ?', [regId]);
      for (const did of disciplinaIds) {
        await conn.execute('INSERT INTO professor_disciplinas (professor_id, disciplina_id) VALUES (?, ?)', [regId, did]);
      }
    }
  });
  return true;
}

async function remove(ent, id) {
  entidade(ent);
  const n = san.inteiro(id);
  if (!n) throw new Error('Registro inválido.');
  try {
    await pool.execute(`DELETE FROM ${ent} WHERE id = ?`, [n]);
  } catch (err) {
    throw amigavel(err);
  }
  return true;
}

module.exports = { init, close, login, list, save, remove };
