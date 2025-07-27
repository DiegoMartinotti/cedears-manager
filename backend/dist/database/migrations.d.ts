export interface Migration {
    id: string;
    description: string;
    up: string;
    down: string;
}
export declare const migrations: Migration[];
export declare class MigrationRunner {
    private db;
    runMigrations(): Promise<void>;
    private getAppliedMigrations;
    private logMigration;
    rollbackMigration(migrationId: string): Promise<void>;
}
