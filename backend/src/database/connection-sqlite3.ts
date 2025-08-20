import sqlite3 from 'sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('database')

class DatabaseConnection {
  private static instance: sqlite3.Database | null = null
  private static readonly DB_PATH = process.env.DB_PATH || join(process.cwd(), 'database', 'cedears.db')

  static getInstance(): sqlite3.Database {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = DatabaseConnection.createConnection()
    }
    return DatabaseConnection.instance
  }

  private static createConnection(): sqlite3.Database {
    try {
      // Ensure database directory exists
      const dbDir = join(DatabaseConnection.DB_PATH, '..')
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true })
        logger.info(`Created database directory: ${dbDir}`)
      }

      // Create database connection
      const db = new sqlite3.Database(DatabaseConnection.DB_PATH, (err: Error | null) => {
        if (err) {
          logger.error('Failed to connect to database:', err)
          throw err
        }
        logger.info(`Database connected: ${DatabaseConnection.DB_PATH}`)
      })

      // Configure database
      db.serialize(() => {
        db.run('PRAGMA journal_mode = WAL') // Write-Ahead Logging for better performance
        db.run('PRAGMA synchronous = NORMAL') // Balance between safety and performance
        db.run('PRAGMA cache_size = 1000') // Cache 1000 pages in memory
        db.run('PRAGMA temp_store = MEMORY') // Store temporary tables in memory
        db.run('PRAGMA foreign_keys = ON') // Enable foreign key constraints
      })

      return db
    } catch (error) {
      logger.error('Failed to connect to database:', error)
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  static close(): void {
    if (DatabaseConnection.instance) {
      DatabaseConnection.instance.close((err: Error | null) => {
        if (err) {
          logger.error('Error closing database:', err)
        } else {
          logger.info('Database connection closed')
        }
      })
      DatabaseConnection.instance = null
    }
  }

  // Health check method
  static isHealthy(): boolean {
    try {
      if (!DatabaseConnection.instance) {
        return false
      }
      
      // Simple health check - we'll implement a proper async one later
      return true
    } catch (error) {
      logger.error('Database health check failed:', error)
      return false
    }
  }

  // Promise wrapper for database operations
  static run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      const db = DatabaseConnection.getInstance()
      db.run(sql, params, function(this: sqlite3.RunResult, err: Error | null) {
        if (err) {
          reject(err)
        } else {
          resolve(this)
        }
      })
    })
  }

  static get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      const db = DatabaseConnection.getInstance()
      db.get(sql, params, (err: Error | null, row: any) => {
        if (err) {
          reject(err)
        } else {
          resolve(row)
        }
      })
    })
  }

  static all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const db = DatabaseConnection.getInstance()
      db.all(sql, params, (err: Error | null, rows: any[]) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  static exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = DatabaseConnection.getInstance()
      db.exec(sql, (err: Error | null) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}

export default DatabaseConnection