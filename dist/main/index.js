"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        title: 'Folio — Design System & Case Study Builder',
        webPreferences: {
            preload: path_1.default.join(__dirname, '../preload/index.js'),
            sandbox: false,
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    const rendererIndexPath = path_1.default.join(__dirname, '../renderer/index.html');
    if (fs_1.default.existsSync(rendererIndexPath)) {
        mainWindow.loadFile(rendererIndexPath);
    }
    else {
        mainWindow.loadURL('http://localhost:8731/index.html');
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
// IPC Handlers
electron_1.ipcMain.handle('folio:open-project', async (_, projectPath) => {
    if (!fs_1.default.existsSync(projectPath))
        throw new Error('Project path does not exist');
    const manifestRaw = fs_1.default.readFileSync(path_1.default.join(projectPath, 'project.json'), 'utf-8');
    return JSON.parse(manifestRaw);
});
electron_1.ipcMain.handle('folio:save-project', async (_, { projectPath, document, system }) => {
    const docPath = path_1.default.join(projectPath, 'documents/doc.doc.json');
    const sysPath = path_1.default.join(projectPath, 'systems/system.json');
    fs_1.default.writeFileSync(docPath, JSON.stringify(document, null, 2));
    fs_1.default.writeFileSync(sysPath, JSON.stringify(system, null, 2));
    return { success: true };
});
