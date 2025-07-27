import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('database')

// Simple in-memory database simulation for development
interface SimpleDatabase {
  instruments: any[]
  portfolio_positions: any[]
  trades: any[]
  quotes: any[]
  commission_config: any[]
  financial_goals: any[]
  migrations_log: any[]
}

class SimpleDatabaseConnection {
  private static instance: SimpleDatabase | null = null
  private static readonly DB_PATH = process.env.DB_PATH || join(process.cwd(), 'database', 'simple-db.json')

  static getInstance(): SimpleDatabase {
    if (!SimpleDatabaseConnection.instance) {
      SimpleDatabaseConnection.instance = SimpleDatabaseConnection.createConnection()
    }
    return SimpleDatabaseConnection.instance
  }

  private static createConnection(): SimpleDatabase {
    try {
      // Ensure database directory exists
      const dbDir = join(SimpleDatabaseConnection.DB_PATH, '..')
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true })
        logger.info(`Created database directory: ${dbDir}`)
      }

      // Try to load existing database
      if (existsSync(SimpleDatabaseConnection.DB_PATH)) {
        try {
          const data = readFileSync(SimpleDatabaseConnection.DB_PATH, 'utf8')
          const db = JSON.parse(data) as SimpleDatabase
          logger.info(`Database loaded from: ${SimpleDatabaseConnection.DB_PATH}`)
          return db
        } catch (error) {
          logger.warn('Failed to load existing database, creating new one:', error)
        }
      }

      // Create new database
      const db: SimpleDatabase = {
        instruments: [],
        portfolio_positions: [],
        trades: [],
        quotes: [],
        commission_config: [],
        financial_goals: [],
        migrations_log: []
      }

      SimpleDatabaseConnection.save(db)
      logger.info(`New database created: ${SimpleDatabaseConnection.DB_PATH}`)

      return db
    } catch (error) {
      logger.error('Failed to connect to database:', error)
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  static save(db?: SimpleDatabase): void {
    try {
      const database = db || SimpleDatabaseConnection.instance
      if (database) {
        writeFileSync(SimpleDatabaseConnection.DB_PATH, JSON.stringify(database, null, 2))
      }
    } catch (error) {
      logger.error('Failed to save database:', error)
    }
  }

  static close(): void {
    if (SimpleDatabaseConnection.instance) {
      SimpleDatabaseConnection.save()
      SimpleDatabaseConnection.instance = null
      logger.info('Database connection closed')
    }
  }

  // Health check method
  static isHealthy(): boolean {
    try {
      const db = SimpleDatabaseConnection.getInstance()
      return db !== null
    } catch (error) {
      logger.error('Database health check failed:', error)
      return false
    }
  }

  // Helper methods for CRUD operations
  static insert(table: keyof SimpleDatabase, data: any): any {
    const db = SimpleDatabaseConnection.getInstance()
    const id = Math.max(0, ...db[table].map((item: any) => item.id || 0)) + 1
    const record = { ...data, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    db[table].push(record)
    SimpleDatabaseConnection.save()
    return record
  }

  static findById(table: keyof SimpleDatabase, id: number): any {
    const db = SimpleDatabaseConnection.getInstance()
    return db[table].find((item: any) => item.id === id) || null
  }

  static findBy(table: keyof SimpleDatabase, criteria: any): any {
    const db = SimpleDatabaseConnection.getInstance()
    return db[table].find((item: any) => {
      return Object.entries(criteria).every(([key, value]) => item[key] === value)
    }) || null
  }

  static findAll(table: keyof SimpleDatabase, criteria?: any): any[] {
    const db = SimpleDatabaseConnection.getInstance()
    if (!criteria) {
      return db[table]
    }
    
    return db[table].filter((item: any) => {
      return Object.entries(criteria).every(([key, value]) => {
        if (value === undefined) return true
        return item[key] === value
      })
    })
  }

  static update(table: keyof SimpleDatabase, id: number, data: any): any {
    const db = SimpleDatabaseConnection.getInstance()
    const index = db[table].findIndex((item: any) => item.id === id)
    
    if (index === -1) {
      return null
    }

    const updated = { ...db[table][index], ...data, updated_at: new Date().toISOString() }
    db[table][index] = updated
    SimpleDatabaseConnection.save()
    return updated
  }

  static delete(table: keyof SimpleDatabase, id: number): boolean {
    const db = SimpleDatabaseConnection.getInstance()
    const index = db[table].findIndex((item: any) => item.id === id)
    
    if (index === -1) {
      return false
    }

    db[table].splice(index, 1)
    SimpleDatabaseConnection.save()
    return true
  }

  static search(table: keyof SimpleDatabase, searchTerm: string, fields: string[]): any[] {
    const db = SimpleDatabaseConnection.getInstance()
    const term = searchTerm.toLowerCase()
    
    return db[table].filter((item: any) => {
      return fields.some(field => {
        const value = item[field]
        return value && value.toString().toLowerCase().includes(term)
      })
    })
  }
}

export default SimpleDatabaseConnection