import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import path from 'path'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('claude-service')

export interface ClaudeAnalysisRequest {
  prompt: string
  instrumentCode?: string
  marketData?: any
  context?: string
}

export interface ClaudeAnalysisResponse {
  success: boolean
  analysis?: string
  confidence?: number
  recommendation?: 'BUY' | 'SELL' | 'HOLD'
  reasoning?: string
  error?: string
  executionTime?: number
}

export class ClaudeServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ClaudeServiceError'
  }
}

export class ClaudeService extends EventEmitter {
  private claudeCliPath: string
  private isInitialized: boolean = false
  private pendingRequests: Map<string, any> = new Map()

  constructor() {
    super()
    // Path relativo al claude-cli desde el backend
    this.claudeCliPath = path.resolve(process.cwd(), '..', 'claude-cli')
    logger.info('ClaudeService initialized', { claudeCliPath: this.claudeCliPath })
  }

  /**
   * Inicializa el servicio y verifica la conexión con Claude CLI
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Claude service...')
      
      // Verificar que claude-cli esté disponible
      await this.checkClaudeCliAvailability()
      
      this.isInitialized = true
      logger.info('Claude service initialized successfully')
      
      this.emit('initialized')
    } catch (error) {
      logger.error('Failed to initialize Claude service', { error })
      throw new ClaudeServiceError(
        'Failed to initialize Claude service',
        'INIT_ERROR',
        error
      )
    }
  }

  /**
   * Verifica que Claude CLI esté disponible
   */
  private async checkClaudeCliAvailability(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Usar 'claude' directamente si está en PATH, sino intentar desde node_modules
      const claudeProcess = spawn('claude', ['--version'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        timeout: 5000
      })

      let stdout = ''
      let stderr = ''

      claudeProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      claudeProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      claudeProcess.on('close', (code) => {
        if (code === 0) {
          logger.info('Claude CLI is available', { version: stdout.trim() })
          resolve()
        } else {
          const error = new Error(`Claude CLI not available. Code: ${code}, stderr: ${stderr}`)
          logger.error('Claude CLI check failed', { code, stderr, stdout })
          reject(error)
        }
      })

      claudeProcess.on('error', (error) => {
        logger.error('Error spawning Claude CLI process', { error })
        reject(error)
      })
    })
  }

  /**
   * Ejecuta un análisis técnico usando Claude CLI
   */
  async analyze(request: ClaudeAnalysisRequest): Promise<ClaudeAnalysisResponse> {
    const startTime = Date.now()
    
    if (!this.isInitialized) {
      throw new ClaudeServiceError(
        'Claude service not initialized',
        'NOT_INITIALIZED'
      )
    }

    try {
      logger.info('Starting Claude analysis', { 
        instrumentCode: request.instrumentCode,
        promptLength: request.prompt.length 
      })

      const result = await this.executeClaudeCommand(request)
      const executionTime = Date.now() - startTime

      logger.info('Claude analysis completed', { 
        instrumentCode: request.instrumentCode,
        executionTime,
        success: result.success
      })

      return {
        ...result,
        executionTime
      }

    } catch (error) {
      const executionTime = Date.now() - startTime
      logger.error('Claude analysis failed', { 
        instrumentCode: request.instrumentCode,
        executionTime,
        error 
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      }
    }
  }

  /**
   * Ejecuta el comando de Claude CLI con el prompt dado
   */
  private async executeClaudeCommand(request: ClaudeAnalysisRequest): Promise<ClaudeAnalysisResponse> {
    return new Promise((resolve, reject) => {
      // Construir el prompt completo
      const fullPrompt = this.buildAnalysisPrompt(request)
      
      // Spawn claude process
      const claudeProcess = spawn('claude', [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        timeout: 30000, // 30 segundos timeout
        cwd: this.claudeCliPath
      })

      let stdout = ''
      let stderr = ''

      // Enviar el prompt al stdin
      claudeProcess.stdin?.write(fullPrompt)
      claudeProcess.stdin?.end()

      claudeProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      claudeProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      claudeProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const response = this.parseClaudeResponse(stdout)
            resolve(response)
          } catch (parseError) {
            reject(new ClaudeServiceError(
              'Failed to parse Claude response',
              'PARSE_ERROR',
              { stdout, parseError }
            ))
          }
        } else {
          reject(new ClaudeServiceError(
            `Claude CLI exited with code ${code}`,
            'CLI_ERROR',
            { code, stderr, stdout }
          ))
        }
      })

      claudeProcess.on('error', (error) => {
        reject(new ClaudeServiceError(
          'Failed to execute Claude CLI',
          'EXECUTION_ERROR',
          error
        ))
      })
    })
  }

  /**
   * Construye el prompt completo para el análisis
   */
  private buildAnalysisPrompt(request: ClaudeAnalysisRequest): string {
    const context = request.context || 'Análisis técnico de CEDEAR'
    const instrumentInfo = request.instrumentCode ? `Instrumento: ${request.instrumentCode}` : ''
    const marketDataInfo = request.marketData ? `Datos de mercado: ${JSON.stringify(request.marketData, null, 2)}` : ''

    return `${context}

${instrumentInfo}
${marketDataInfo}

${request.prompt}

Por favor, proporciona tu análisis en formato JSON con la siguiente estructura:
{
  "analysis": "Análisis detallado aquí",
  "confidence": 85,
  "recommendation": "BUY|SELL|HOLD",
  "reasoning": "Razonamiento de la recomendación"
}
`
  }

  /**
   * Parsea la respuesta de Claude CLI
   */
  private parseClaudeResponse(stdout: string): ClaudeAnalysisResponse {
    try {
      // Buscar JSON en la respuesta
      const jsonMatch = stdout.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        // Si no hay JSON, devolver análisis como texto plano
        return {
          success: true,
          analysis: stdout.trim(),
          confidence: 50,
          recommendation: 'HOLD',
          reasoning: 'Análisis en formato texto'
        }
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      return {
        success: true,
        analysis: parsed.analysis || stdout.trim(),
        confidence: parsed.confidence || 50,
        recommendation: parsed.recommendation || 'HOLD',
        reasoning: parsed.reasoning || 'Sin razonamiento específico'
      }
    } catch (error) {
      logger.warn('Failed to parse JSON response, returning as text', { error })
      return {
        success: true,
        analysis: stdout.trim(),
        confidence: 50,
        recommendation: 'HOLD',
        reasoning: 'Respuesta en formato texto'
      }
    }
  }

  /**
   * Verifica el estado del servicio
   */
  getStatus(): { initialized: boolean; pendingRequests: number } {
    return {
      initialized: this.isInitialized,
      pendingRequests: this.pendingRequests.size
    }
  }

  /**
   * Cierra el servicio y limpia recursos
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Claude service...')
    
    this.isInitialized = false
    this.pendingRequests.clear()
    this.removeAllListeners()
    
    logger.info('Claude service shut down completed')
  }
}

// Singleton instance
export const claudeService = new ClaudeService()