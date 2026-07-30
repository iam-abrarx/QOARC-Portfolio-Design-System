import { z } from 'zod';
export declare const CustomDeviceDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    kind: z.ZodDefault<z.ZodEnum<{
        desktop: "desktop";
        laptop: "laptop";
        phone: "phone";
        tablet: "tablet";
        watch: "watch";
        tv: "tv";
        custom: "custom";
    }>>;
    aspectRatio: z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, z.core.$strip>;
    bezelSvg: z.ZodOptional<z.ZodString>;
    screenBounds: z.ZodDefault<z.ZodObject<{
        top: z.ZodDefault<z.ZodString>;
        left: z.ZodDefault<z.ZodString>;
        width: z.ZodDefault<z.ZodString>;
        height: z.ZodDefault<z.ZodString>;
        borderRadius: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type CustomDeviceDefinition = z.infer<typeof CustomDeviceDefinitionSchema>;
declare class DeviceRegistry {
    private devices;
    constructor();
    registerCustomDevice(def: CustomDeviceDefinition): CustomDeviceDefinition;
    getDeviceDefinition(id: string): CustomDeviceDefinition | undefined;
    getRegisteredDevices(): CustomDeviceDefinition[];
}
export declare const globalDeviceRegistry: DeviceRegistry;
export {};
