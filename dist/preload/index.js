"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.folioAPI = void 0;
const electron_1 = require("electron");
exports.folioAPI = {
    openProject: (path) => electron_1.ipcRenderer.invoke('folio:open-project', path),
    saveProject: (data) => electron_1.ipcRenderer.invoke('folio:save-project', data),
};
electron_1.contextBridge.exposeInMainWorld('folioAPI', exports.folioAPI);
