import { z } from 'zod';
export const InstrumentCreateSchema = z.object({
    symbol: z.string().min(1, 'Symbol is required').max(10, 'Symbol must be 10 characters or less').toUpperCase(),
    company_name: z.string().min(1, 'Company name is required').max(255, 'Company name must be 255 characters or less'),
    sector: z.string().max(100, 'Sector must be 100 characters or less').optional(),
    industry: z.string().max(100, 'Industry must be 100 characters or less').optional(),
    market_cap: z.number().positive('Market cap must be positive').optional(),
    is_esg_compliant: z.boolean().optional().default(false),
    is_vegan_friendly: z.boolean().optional().default(false),
    underlying_symbol: z.string().max(10, 'Underlying symbol must be 10 characters or less').optional(),
    underlying_currency: z.string().length(3, 'Currency must be 3 characters').optional().default('USD'),
    ratio: z.number().positive('Ratio must be positive').optional().default(1.0),
    is_active: z.boolean().optional().default(true)
});
export const InstrumentUpdateSchema = InstrumentCreateSchema.partial();
export const InstrumentQuerySchema = z.object({
    isActive: z.string().transform(val => val === 'true').optional(),
    isESG: z.string().transform(val => val === 'true').optional(),
    isVegan: z.string().transform(val => val === 'true').optional(),
    sector: z.string().optional(),
    search: z.string().optional()
});
export const InstrumentParamsSchema = z.object({
    id: z.string().transform(Number).pipe(z.number().int().positive('ID must be a positive integer'))
});
//# sourceMappingURL=instrument.schema.js.map