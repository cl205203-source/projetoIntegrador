document.addEventListener('DOMContentLoaded', () => {
    const actionButtons = document.querySelectorAll('.btn-action');
    const STORAGE_KEY = 'studerium-notificacoes-resolvidas';

    let notificacoesResolvidas = [];

    try {
        notificacoesResolvidas =
            JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

        if (!Array.isArray(notificacoesResolvidas)) {
            notificacoesResolvidas = [];
        }
    } catch (erro) {
        notificacoesResolvidas = [];
    }

    document.querySelectorAll('.notification-card').forEach(card => {
        const id = card.dataset.notificationId;

        if (id && notificacoesResolvidas.includes(id)) {
            card.remove();
        }
    });

    actionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const card = button.closest('.notification-card');

            if (!card) {
                return;
            }

            const id = card.dataset.notificationId;

            if (id && !notificacoesResolvidas.includes(id)) {
                notificacoesResolvidas.push(id);

                try {
                    localStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify(notificacoesResolvidas)
                    );
                } catch (erro) {
                    console.error(
                        'Não foi possível salvar as notificações.',
                        erro
                    );
                }
            }

            card.style.opacity = '0';
            card.style.transform = 'scale(0.8)';
            card.style.transition = 'all 0.3s ease';

            setTimeout(() => {
                card.remove();
            }, 300);
        });
    });
});