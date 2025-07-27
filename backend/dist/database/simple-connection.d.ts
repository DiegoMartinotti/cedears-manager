interface SimpleDatabase {
    instruments: any[];
    portfolio_positions: any[];
    trades: any[];
    quotes: any[];
    commission_config: any[];
    financial_goals: any[];
    migrations_log: any[];
}
declare class SimpleDatabaseConnection {
    private static instance;
    private static readonly DB_PATH;
    static getInstance(): SimpleDatabase;
    private static createConnection;
    static save(db?: SimpleDatabase): void;
    static close(): void;
    static isHealthy(): boolean;
    static insert(table: keyof SimpleDatabase, data: any): any;
    static findById(table: keyof SimpleDatabase, id: number): any;
    static findBy(table: keyof SimpleDatabase, criteria: any): any;
    static findAll(table: keyof SimpleDatabase, criteria?: any): any[];
    static update(table: keyof SimpleDatabase, id: number, data: any): any;
    static delete(table: keyof SimpleDatabase, id: number): boolean;
    static search(table: keyof SimpleDatabase, searchTerm: string, fields: string[]): any[];
}
export default SimpleDatabaseConnection;
