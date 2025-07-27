import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('database')

class DatabaseConnection {
  private static instance: Database.Database | null = null
  private static readonly DB_PATH = process.env.DB_PATH || join(process.cwd(), 'database', 'cedears.db')

  static getInstance(): Database.Database {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = DatabaseConnection.createConnection()
    }
    return DatabaseConnection.instance
  }

  private static createConnection(): Database.Database {
    try {
      // Ensure database directory exists
      const dbDir = join(DatabaseConnection.DB_PATH, '..')
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true })
        logger.info(`Created database directory: ${dbDir}`)
      }

      // Create database connection
      const db = new Database(DatabaseConnection.DB_PATH)
      
      // Configure database
      db.pragma('journal_mode = WAL') // Write-Ahead Logging for better performance
      db.pragma('synchronous = NORMAL') // Balance between safety and performance
      db.pragma('cache_size = 1000') // Cache 1000 pages in memory
      db.pragma('temp_store = MEMORY') // Store temporary tables in memory
      db.pragma('foreign_keys = ON') // Enable foreign key constraints

      logger.info(`Database connected: ${DatabaseConnection.DB_PATH}`)
      
      return db
    } catch (error) {
      logger.error('Failed to connect to database:', error)
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  static close(): void {
    if (DatabaseConnection.instance) {
      DatabaseConnection.instance.close()
      DatabaseConnection.instance = null
      logger.info('Database connection closed')
    }
  }

  // Health check method
  static isHealthy(): boolean {
    try {
      const db = DatabaseConnection.getInstance()
      const result = db.prepare('SELECT 1 as health').get()
      return result !== undefined
    } catch (error) {
      logger.error('Database health check failed:', error)
      return false
    }
  }
}

export default DatabaseConnection