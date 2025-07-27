import sqlite3 from 'sqlite3';
declare class DatabaseConnection {
    private static instance;
    private static readonly DB_PATH;
    static getInstance(): sqlite3.Database;
    private static createConnection;
    static close(): void;
    static isHealthy(): boolean;
    static run(sql: string, params?: any[]): Promise<sqlite3.RunResult>;
    static get(sql: string, params?: any[]): Promise<any>;
    static all(sql: string, params?: any[]): Promise<any[]>;
    static exec(sql: string): Promise<void>;
}
export default DatabaseConnection;
