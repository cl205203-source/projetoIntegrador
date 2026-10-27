document.addEventListener('DOMContentLoaded', () => {
    // Atualiza o título com base na turma recebida por parâmetro na URL
    const params = new URLSearchParams(window.location.search);
    const turmaParam = params.get('turma');
    const titleElem = document.getElementById('turma-title-header');

    if (turmaParam && titleElem) {
        titleElem.textContent = `Turmas - turma ${turmaParam}`;
    }

    // Filtro dinâmico da tabela de alunos
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#alunos-list .table-row');

            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? 'flex' : 'none';
            });
        });
    }

    // Feedback nos botões de ação
    document.querySelectorAll('.btn-blue-pill, .btn-blue-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            alert(`Ação realizada: ${e.target.innerText}`);
        });
    });
});