export interface ViewportSpec {
    name: 'desktop' | 'laptop' | 'phone' | 'tablet';
    width: number;
    height: number;
}
export declare const VIEWPORT_SPECS: ViewportSpec[];
export interface CaptureResult {
    hash: string;
    filename: string;
    path: string;
    viewport: string;
    width: number;
    height: number;
}
export declare function computeBufferHash(buffer: Buffer): string;
export declare function captureUrlScreenshots(targetUrl: string, outputDir: string): Promise<CaptureResult[]>;
