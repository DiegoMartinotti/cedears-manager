import { z } from 'zod'

export const PortfolioPositionCreateSchema = z.object({
  instrument_id: z.number().int().positive('Instrument ID must be a positive integer'),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  average_cost: z.number().min(0, 'Average cost cannot be negative'),
  total_cost: z.number().min(0, 'Total cost cannot be negative')
})

export const PortfolioPositionUpdateSchema = PortfolioPositionCreateSchema.partial()

export const PortfolioPositionParamsSchema = z.object({
  id: z.string().transform(Number).pipe(z.number().int().positive('ID must be a positive integer'))
})

export const PortfolioPositionInstrumentParamsSchema = z.object({
  instrumentId: z.string().transform(Number).pipe(z.number().int().positive('Instrument ID must be a positive integer'))
})

export type PortfolioPositionCreateInput = z.infer<typeof PortfolioPositionCreateSchema>
export type PortfolioPositionUpdateInput = z.infer<typeof PortfolioPositionUpdateSchema>
export type PortfolioPositionParamsInput = z.infer<typeof PortfolioPositionParamsSchema>
export type PortfolioPositionInstrumentParamsInput = z.infer<typeof PortfolioPositionInstrumentParamsSchema>