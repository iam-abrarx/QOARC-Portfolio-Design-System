"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIEWPORT_SPECS = void 0;
exports.computeBufferHash = computeBufferHash;
exports.captureUrlScreenshots = captureUrlScreenshots;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
exports.VIEWPORT_SPECS = [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'laptop', width: 1440, height: 900 },
    { name: 'phone', width: 393, height: 852 },
    { name: 'tablet', width: 820, height: 1180 },
];
function computeBufferHash(buffer) {
    const hashSum = crypto_1.default.createHash('sha256');
    hashSum.update(buffer);
    return 'sha256:' + hashSum.digest('hex');
}
async function captureUrlScreenshots(targetUrl, outputDir) {
    const results = [];
    const assetsDir = path_1.default.join(outputDir, 'assets');
    fs_1.default.mkdirSync(assetsDir, { recursive: true });
    for (const vp of exports.VIEWPORT_SPECS) {
        const filename = `capture_${vp.name}_${vp.width}x${vp.height}.png`;
        const fullPath = path_1.default.join(assetsDir, filename);
        // Mock buffer capture representing viewport render
        const mockImageContent = `PNG_CAPTURE_MOCK:${targetUrl}:${vp.name}:${vp.width}x${vp.height}:${Date.now()}`;
        const buffer = Buffer.from(mockImageContent);
        fs_1.default.writeFileSync(fullPath, buffer);
        const hash = computeBufferHash(buffer);
        results.push({
            hash,
            filename,
            path: `assets/${filename}`,
            viewport: vp.name,
            width: vp.width,
            height: vp.height,
        });
    }
    return results;
}
