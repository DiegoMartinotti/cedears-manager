import Database from 'better-sqlite3';
declare class DatabaseConnection {
    private static instance;
    private static readonly DB_PATH;
    static getInstance(): Database.Database;
    private static createConnection;
    static close(): void;
    static isHealthy(): boolean;
}
export default DatabaseConnection;
