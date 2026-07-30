import React from 'react';
import { CustomDeviceDefinition } from '../../../devices/custom-device-builder';
interface CustomDeviceBuilderModalProps {
    onClose: () => void;
    onDeviceRegistered: (device: CustomDeviceDefinition) => void;
}
export declare const CustomDeviceBuilderModal: React.FC<CustomDeviceBuilderModalProps>;
export {};
