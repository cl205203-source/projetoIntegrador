// Dados e funções compartilhadas do sistema integrado
const DB = {
    get(chave, padrao) {
        try {
            const valor = JSON.parse(localStorage.getItem(chave));
            return valor == null ? padrao : valor;
        } catch {
            return padrao;
        }
    },
    set(chave, valor) {
        localStorage.setItem(chave, JSON.stringify(valor));
    }
};

if (!DB.get('alunos')) {
    DB.set('alunos', [
        { ra: '123', nome: 'Aluno Exemplo', prioridade: false },
        { ra: '124', nome: 'Ana Clara Silva', prioridade: false },
        { ra: '125', nome: 'Bruno Oliveira', prioridade: false }
    ]);
}

const $ = seletor => document.querySelector(seletor);
const params = new URLSearchParams(location.search);
const esc = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[c]));
const alunos = () => DB.get('alunos', []);
const hoje = () => new Date().toISOString().slice(0, 10);
const fmt = data => data ? data.split('-').reverse().join('/') : '';

function mediaNotas(ra) {
    let soma = 0, pesos = 0;
    DB.get('notas', []).forEach(item => {
        const nota = parseFloat(item.notas?.[ra]);
        if (!Number.isNaN(nota)) {
            soma += nota * Number(item.peso || 0);
            pesos += Number(item.peso || 0);
        }
    });
    return pesos ? soma / pesos : null;
}

function faltasInfo(ra) {
    const chamadas = DB.get('faltas', []);
    return {
        faltas: chamadas.filter(c => (c.ausentes || []).includes(ra)).length,
        total: chamadas.length
    };
}

function registrarEstratégia(disciplina, mudanca, resumo, status) {
    const lista = DB.get('estrategias', []);
    lista.push({ data: hoje(), disciplina, mudanca, resumo, status });
    DB.set('estrategias', lista);
}
