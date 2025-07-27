import { Request, Response } from 'express'
import { SimpleInstrumentService } from '../services/SimpleInstrumentService.js'
import { createLogger } from '../utils/logger.js'
import {
  InstrumentCreateSchema,
  InstrumentUpdateSchema,
  InstrumentQuerySchema,
  InstrumentParamsSchema
} from '../schemas/instrument.schema.js'

const logger = createLogger('InstrumentController')

export class InstrumentController {
  private instrumentService = new SimpleInstrumentService()

  async createInstrument(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Creating new instrument')
      
      const validatedData = InstrumentCreateSchema.parse(req.body)
      const instrument = await this.instrumentService.createInstrument(validatedData)

      res.status(201).json({
        success: true,
        data: instrument,
        message: 'Instrument created successfully'
      })
    } catch (error) {
      logger.error('Error creating instrument:', error)
      
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: error.message,
          message: 'Failed to create instrument'
        })
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: 'Failed to create instrument'
        })
      }
    }
  }

  async getInstrument(req: Request, res: Response): Promise<void> {
    try {
      logger.info(`Getting instrument: ${req.params.id}`)
      
      const { id } = InstrumentParamsSchema.parse(req.params)
      const instrument = await this.instrumentService.getInstrumentById(id)

      res.json({
        success: true,
        data: instrument
      })
    } catch (error) {
      logger.error('Error getting instrument:', error)
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Instrument not found'
        })
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: 'Failed to get instrument'
        })
      }
    }
  }

  async getAllInstruments(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Getting all instruments')
      
      const filters = InstrumentQuerySchema.parse(req.query)
      const instruments = await this.instrumentService.getAllInstruments(filters)

      res.json({
        success: true,
        data: instruments,
        meta: {
          total: instruments.length,
          filters: filters
        }
      })
    } catch (error) {
      logger.error('Error getting instruments:', error)
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get instruments'
      })
    }
  }

  async updateInstrument(req: Request, res: Response): Promise<void> {
    try {
      logger.info(`Updating instrument: ${req.params.id}`)
      
      const { id } = InstrumentParamsSchema.parse(req.params)
      const validatedData = InstrumentUpdateSchema.parse(req.body)
      
      const instrument = await this.instrumentService.updateInstrument(id, validatedData)

      res.json({
        success: true,
        data: instrument,
        message: 'Instrument updated successfully'
      })
    } catch (error) {
      logger.error('Error updating instrument:', error)
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Instrument not found'
        })
      } else if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: error.message,
          message: 'Failed to update instrument'
        })
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: 'Failed to update instrument'
        })
      }
    }
  }

  async deleteInstrument(req: Request, res: Response): Promise<void> {
    try {
      logger.info(`Deleting instrument: ${req.params.id}`)
      
      const { id } = InstrumentParamsSchema.parse(req.params)
      await this.instrumentService.deleteInstrument(id)

      res.json({
        success: true,
        message: 'Instrument deleted successfully'
      })
    } catch (error) {
      logger.error('Error deleting instrument:', error)
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Instrument not found'
        })
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: 'Failed to delete instrument'
        })
      }
    }
  }

  async getESGInstruments(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Getting ESG compliant instruments')
      
      const instruments = await this.instrumentService.getESGInstruments()

      res.json({
        success: true,
        data: instruments,
        meta: {
          total: instruments.length,
          filter: 'ESG compliant'
        }
      })
    } catch (error) {
      logger.error('Error getting ESG instruments:', error)
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get ESG instruments'
      })
    }
  }

  async getVeganInstruments(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Getting vegan-friendly instruments')
      
      const instruments = await this.instrumentService.getVeganInstruments()

      res.json({
        success: true,
        data: instruments,
        meta: {
          total: instruments.length,
          filter: 'Vegan friendly'
        }
      })
    } catch (error) {
      logger.error('Error getting vegan instruments:', error)
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get vegan instruments'
      })
    }
  }

  async searchInstruments(req: Request, res: Response): Promise<void> {
    try {
      const searchTerm = req.query.q as string
      
      if (!searchTerm) {
        res.status(400).json({
          success: false,
          error: 'Search term is required',
          message: 'Please provide a search term using the "q" parameter'
        })
        return
      }

      logger.info(`Searching instruments: ${searchTerm}`)
      
      const instruments = await this.instrumentService.searchInstruments(searchTerm)

      res.json({
        success: true,
        data: instruments,
        meta: {
          total: instruments.length,
          search_term: searchTerm
        }
      })
    } catch (error) {
      logger.error('Error searching instruments:', error)
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to search instruments'
      })
    }
  }

  async toggleESGCompliance(req: Request, res: Response): Promise<void> {
    try {
      logger.info(`Toggling ESG compliance: ${req.params.id}`)
      
      const { id } = InstrumentParamsSchema.parse(req.params)
      const instrument = await this.instrumentService.toggleESGCompliance(id)

      res.json({
        success: true,
        data: instrument,
        message: `ESG compliance ${instrument.is_esg_compliant ? 'enabled' : 'disabled'} successfully`
      })
    } catch (error) {
      logger.error('Error toggling ESG compliance:', error)
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Instrument not found'
        })
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: 'Failed to toggle ESG compliance'
        })
      }
    }
  }

  async toggleVeganFriendly(req: Request, res: Response): Promise<void> {
    try {
      logger.info(`Toggling vegan-friendly status: ${req.params.id}`)
      
      const { id } = InstrumentParamsSchema.parse(req.params)
      const instrument = await this.instrumentService.toggleVeganFriendly(id)

      res.json({
        success: true,
        data: instrument,
        message: `Vegan-friendly status ${instrument.is_vegan_friendly ? 'enabled' : 'disabled'} successfully`
      })
    } catch (error) {
      logger.error('Error toggling vegan-friendly status:', error)
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Instrument not found'
        })
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: 'Failed to toggle vegan-friendly status'
        })
      }
    }
  }

  async bulkCreateInstruments(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Bulk creating instruments')
      
      const instruments = req.body
      if (!Array.isArray(instruments)) {
        res.status(400).json({
          success: false,
          error: 'Request body must be an array of instruments',
          message: 'Invalid request format'
        })
        return
      }

      // Validate each instrument
      const validatedInstruments = instruments.map(instrument => 
        InstrumentCreateSchema.parse(instrument)
      )

      const results = await this.instrumentService.bulkCreateInstruments(validatedInstruments)

      res.status(201).json({
        success: true,
        data: results,
        meta: {
          total_created: results.length,
          total_requested: instruments.length
        },
        message: `Successfully created ${results.length} of ${instruments.length} instruments`
      })
    } catch (error) {
      logger.error('Error bulk creating instruments:', error)
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Validation error',
        message: 'Failed to bulk create instruments'
      })
    }
  }
}