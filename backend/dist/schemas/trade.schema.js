import { z } from 'zod';
export const TradeCreateSchema = z.object({
    instrument_id: z.number().int().positive('Instrument ID must be a positive integer'),
    type: z.enum(['BUY', 'SELL'], { errorMap: () => ({ message: 'Type must be BUY or SELL' }) }),
    quantity: z.number().positive('Quantity must be positive'),
    price: z.number().positive('Price must be positive'),
    total_amount: z.number().positive('Total amount must be positive'),
    commission: z.number().min(0, 'Commission cannot be negative').optional().default(0),
    taxes: z.number().min(0, 'Taxes cannot be negative').optional().default(0),
    net_amount: z.number().positive('Net amount must be positive'),
    trade_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Trade date must be in YYYY-MM-DD format'),
    settlement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Settlement date must be in YYYY-MM-DD format').optional(),
    notes: z.string().max(500, 'Notes must be 500 characters or less').optional()
});
export const TradeUpdateSchema = TradeCreateSchema.partial();
export const TradeQuerySchema = z.object({
    instrumentId: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
    type: z.enum(['BUY', 'SELL']).optional(),
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be in YYYY-MM-DD format').optional(),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be in YYYY-MM-DD format').optional(),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(1000)).optional().default(100),
    offset: z.string().transform(Number).pipe(z.number().int().min(0)).optional().default(0)
});
export const TradeParamsSchema = z.object({
    id: z.string().transform(Number).pipe(z.number().int().positive('ID must be a positive integer'))
});
export const TradeSummaryQuerySchema = z.object({
    instrumentId: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
    year: z.string().transform(Number).pipe(z.number().int().min(2000).max(2100)).optional()
});
//# sourceMappingURL=trade.schema.js.map