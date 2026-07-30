"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const client_1 = __importDefault(require("react-dom/client"));
const AppShell_1 = require("./AppShell");
const container = document.getElementById('root');
if (container) {
    const root = client_1.default.createRoot(container);
    root.render((0, jsx_runtime_1.jsx)(AppShell_1.AppShell, {}));
}
