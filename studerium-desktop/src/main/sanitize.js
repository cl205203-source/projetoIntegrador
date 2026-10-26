// Sanitização de entradas: todo dado vindo da tela passa por aqui antes de ir ao banco.
// (Consultas SQL parametrizadas protegem contra SQL injection; a tela escapa HTML na saída.)

const LIMITES = {
  nome: 100, email: 150, cpf: 14, responsavel_cpf: 14, telefone: 20,
  endereco: 200, ra: 30, codigo: 30, formacao: 100, instituicao: 150, responsavel_nome: 100,
};

// Remove caracteres de controle e tags/sinais de HTML, normaliza espaços e limita o tamanho.
function texto(valor, max = 100) {
  return String(valor)
    .normalize('NFC')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function cpf(valor) {
  const d = String(valor).replace(/\D/g, '');
  if (!d) return null;
  if (d.length !== 11) throw new Error('CPF inválido: informe 11 dígitos.');
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function telefone(valor) {
  return String(valor).replace(/[^\d()+\- ]/g, '').trim().slice(0, LIMITES.telefone) || null;
}

function email(valor) {
  const e = texto(valor, LIMITES.email).toLowerCase();
  if (!e) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error('E-mail inválido.');
  return e;
}

// Sanitiza um campo de acordo com o nome da coluna. Vazio vira null.
function campo(nome, valor) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return null;
  if (nome === 'cpf' || nome === 'responsavel_cpf') return cpf(valor);
  if (nome === 'telefone') return telefone(valor);
  if (nome === 'email') return email(valor);
  return texto(valor, LIMITES[nome] || 100) || null;
}

// Inteiro positivo ou null.
function inteiro(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

module.exports = { campo, texto, cpf, telefone, email, inteiro };
