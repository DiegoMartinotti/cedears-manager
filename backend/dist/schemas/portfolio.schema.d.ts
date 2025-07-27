import { z } from 'zod';
export declare const PortfolioPositionCreateSchema: z.ZodObject<{
    instrument_id: z.ZodNumber;
    quantity: z.ZodNumber;
    average_cost: z.ZodNumber;
    total_cost: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    instrument_id: number;
    quantity: number;
    average_cost: number;
    total_cost: number;
}, {
    instrument_id: number;
    quantity: number;
    average_cost: number;
    total_cost: number;
}>;
export declare const PortfolioPositionUpdateSchema: z.ZodObject<{
    instrument_id: z.ZodOptional<z.ZodNumber>;
    quantity: z.ZodOptional<z.ZodNumber>;
    average_cost: z.ZodOptional<z.ZodNumber>;
    total_cost: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    instrument_id?: number | undefined;
    quantity?: number | undefined;
    average_cost?: number | undefined;
    total_cost?: number | undefined;
}, {
    instrument_id?: number | undefined;
    quantity?: number | undefined;
    average_cost?: number | undefined;
    total_cost?: number | undefined;
}>;
export declare const PortfolioPositionParamsSchema: z.ZodObject<{
    id: z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: number;
}, {
    id: string;
}>;
export declare const PortfolioPositionInstrumentParamsSchema: z.ZodObject<{
    instrumentId: z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    instrumentId: number;
}, {
    instrumentId: string;
}>;
export type PortfolioPositionCreateInput = z.infer<typeof PortfolioPositionCreateSchema>;
export type PortfolioPositionUpdateInput = z.infer<typeof PortfolioPositionUpdateSchema>;
export type PortfolioPositionParamsInput = z.infer<typeof PortfolioPositionParamsSchema>;
export type PortfolioPositionInstrumentParamsInput = z.infer<typeof PortfolioPositionInstrumentParamsSchema>;
