const path = require('path');
// Carrega o .env da raiz do projeto (deve vir antes dos demais módulos)
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');

const db = require('./db');

let sessao = null; // administrador logado

const acoes = {
  login: async (email, senha) => (sessao = await db.login(email, senha)),
  logout: async () => { sessao = null; return true; },
  list: (ent) => db.list(ent),
  save: (ent, dados) => db.save(ent, dados),
  remove: (ent, id) => {
    if (ent === 'administradores' && Number(id) === sessao.id) {
      throw new Error('Você não pode excluir o próprio usuário.');
    }
    return db.remove(ent, id);
  },
};

function registrarIpc() {
  for (const [nome, fn] of Object.entries(acoes)) {
    ipcMain.handle(nome, async (_evento, ...args) => {
      try {
        if (nome !== 'login' && nome !== 'logout' && !sessao) {
          throw new Error('Sessão expirada. Faça login novamente.');
        }
        return { ok: true, data: await fn(...args) };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    });
  }
}

function criarJanela() {
  const win = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    title: 'STUDERIUM - Moderador',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  // Bloqueia janelas novas e navegação para fora do app
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (ev) => ev.preventDefault());
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  try {
    await db.init();
  } catch (err) {
    dialog.showErrorBox(
      'Erro ao conectar ao banco de dados',
      `${err.message}\n\nConfira se o MySQL está rodando e se USER_NAME e USER_PASSWORD no arquivo .env estão corretos.`
    );
    return app.quit();
  }
  registrarIpc();
  criarJanela();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => { db.close(); });
