document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const username = document.getElementById('username').value;
            
            // Navega na MESMA aba para turmas.html enviando o nome do usuário
            window.location.href = `turmas.html?user=${encodeURIComponent(username)}`;
        });
    }
});