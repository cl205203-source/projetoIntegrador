# STUDERIUM – Desktop do Moderador (Electron + MySQL)

CRUD de alunos, professores, administradores, turmas e disciplinas (RF01 a RF03, RF06, RF07 e RF08).

## Como rodar

Requer Node.js 18 ou superior e acesso ao servidor MySQL configurado no `.env`.

```bash
npm install
npm start
```

As tabelas são criadas automaticamente na primeira execução. O banco (`DB_NAME`) precisa já existir no servidor.

## Login inicial

- E-mail: `admin@studerium.com`
- Senha: `admin123`

Esse administrador é criado só quando a tabela está vazia. Depois de entrar, crie os seus em "Administradores".

## Como cadastrar usuários

Não existe cadastro público: **todos os usuários são criados pelo administrador** neste aplicativo. Siga esta ordem:

1. **Turmas** → "Nova turma" (ex.: `1º Ano A`).
2. **Disciplinas** → "Nova disciplina": informe o nome e a turma.
3. **Alunos** → "Novo aluno": preencha nome, RA, CPF, turma, e-mail e senha. O e-mail e a senha serão o login do aluno no aplicativo mobile.
4. **Professores** → "Novo professor": preencha os dados, e-mail e senha, e marque as turmas/disciplinas que ele leciona.
5. **Administradores** → "Novo administrador": cria outro moderador com acesso a este desktop.

Para alterar a senha de alguém, clique em editar (lápis) e digite uma nova senha. Deixando em branco, a atual é mantida.

## Arquivo .env

| Campo | Descrição |
|---|---|
| `DB_HOST` | Endereço do MySQL |
| `DB_PORT` | Porta do MySQL |
| `DB_NAME` | Nome do banco (já existente) |
| `USER_NAME` | Usuário do MySQL |
| `USER_PASSWORD` | Senha do MySQL |

Não compartilhe este arquivo: ele contém a senha do banco.

## Estrutura

- `src/main/` – processo principal do Electron
  - `main.js` – janela, sessão e IPC
  - `preload.js` – ponte segura entre a tela e o processo principal
  - `db.js` – conexão MySQL e operações de CRUD
  - `sanitize.js` – sanitização das entradas
- `src/renderer/` – telas (`index.html`, `app.js`, `styles.css`) com Bootstrap e Bootstrap Icons
- `.env` – acesso ao banco de dados
- `test-sanitize.js` – teste da sanitização (`npm test`)

## Segurança

- **CSP** no `index.html`: só scripts, estilos e fontes do próprio app, sem inline e sem conexões externas.
- **Sanitização** (`src/main/sanitize.js`): todo dado vindo da tela é limpo no processo principal (remove tags HTML e caracteres de controle, valida e-mail e CPF, limita tamanhos).
- **SQL injection**: consultas parametrizadas e nomes de tabela vindos de uma lista fixa.
- **XSS**: a tela escapa o HTML de tudo que exibe.
- Janela com `contextIsolation` e `sandbox`, sem `nodeIntegration`, sem abrir novas janelas.
- Senhas guardadas com hash (scrypt).

## Regras implementadas

- Aluno só é salvo com turma (obrigatória).
- Professor é associado a uma ou mais turmas/disciplinas.
- Turma com alunos não pode ser excluída.
- Só administradores logados acessam o CRUD; o administrador não pode excluir a si mesmo.
