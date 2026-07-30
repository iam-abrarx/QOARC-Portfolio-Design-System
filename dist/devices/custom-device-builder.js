"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalDeviceRegistry = exports.CustomDeviceDefinitionSchema = void 0;
const zod_1 = require("zod");
exports.CustomDeviceDefinitionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    kind: zod_1.z.enum(['phone', 'tablet', 'laptop', 'desktop', 'watch', 'tv', 'custom']).default('custom'),
    aspectRatio: zod_1.z.object({
        width: zod_1.z.number(),
        height: zod_1.z.number(),
    }),
    bezelSvg: zod_1.z.string().optional(),
    screenBounds: zod_1.z.object({
        top: zod_1.z.string().default('5%'),
        left: zod_1.z.string().default('5%'),
        width: zod_1.z.string().default('90%'),
        height: zod_1.z.string().default('90%'),
        borderRadius: zod_1.z.string().optional(),
    }).default({ top: '5%', left: '5%', width: '90%', height: '90%' }),
});
const BUILT_IN_DEVICES = [
    {
        id: 'phone',
        name: 'Mobile Phone (iPhone 15)',
        kind: 'phone',
        aspectRatio: { width: 393, height: 852 },
        screenBounds: { top: '0', left: '0', width: '100%', height: '100%', borderRadius: '24px' },
    },
    {
        id: 'tablet',
        name: 'Tablet Portrait',
        kind: 'tablet',
        aspectRatio: { width: 820, height: 1180 },
        screenBounds: { top: '0', left: '0', width: '100%', height: '100%', borderRadius: '16px' },
    },
    {
        id: 'laptop',
        name: 'Laptop (MacBook Pro 16")',
        kind: 'laptop',
        aspectRatio: { width: 1440, height: 900 },
        screenBounds: { top: '0', left: '0', width: '100%', height: '100%', borderRadius: '8px' },
    },
    {
        id: 'desktop',
        name: 'Desktop Monitor 16:9',
        kind: 'desktop',
        aspectRatio: { width: 1920, height: 1080 },
        screenBounds: { top: '0', left: '0', width: '100%', height: '100%', borderRadius: '4px' },
    },
];
class DeviceRegistry {
    devices = new Map();
    constructor() {
        BUILT_IN_DEVICES.forEach((d) => this.devices.set(d.id, d));
    }
    registerCustomDevice(def) {
        const validated = exports.CustomDeviceDefinitionSchema.parse(def);
        this.devices.set(validated.id, validated);
        return validated;
    }
    getDeviceDefinition(id) {
        return this.devices.get(id);
    }
    getRegisteredDevices() {
        return Array.from(this.devices.values());
    }
}
exports.globalDeviceRegistry = new DeviceRegistry();
