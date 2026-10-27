document.addEventListener('DOMContentLoaded', () => {
    // Ler nome do usuário da URL se fornecido
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get('user');
    const loggedUserElem = document.getElementById('logged-user-name');
    
    if (userParam && loggedUserElem) {
        loggedUserElem.textContent = userParam.toUpperCase();
    }

    // Toggle Menu do Usuário
    const userBtn = document.getElementById('user-icon-btn');
    const dropdown = document.getElementById('user-dropdown');

    if (userBtn && dropdown) {
        userBtn.addEventListener('click', () => {
            dropdown.classList.toggle('hidden');
        });
    }
});