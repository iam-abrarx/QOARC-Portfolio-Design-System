export declare const folioAPI: {
    openProject: (path: string) => Promise<any>;
    saveProject: (data: {
        projectPath: string;
        document: any;
        system: any;
    }) => Promise<any>;
};
