import { z } from 'zod';
export declare const TradeCreateSchema: z.ZodObject<{
    instrument_id: z.ZodNumber;
    type: z.ZodEnum<["BUY", "SELL"]>;
    quantity: z.ZodNumber;
    price: z.ZodNumber;
    total_amount: z.ZodNumber;
    commission: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    taxes: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    net_amount: z.ZodNumber;
    trade_date: z.ZodString;
    settlement_date: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "BUY" | "SELL";
    instrument_id: number;
    quantity: number;
    price: number;
    total_amount: number;
    commission: number;
    taxes: number;
    net_amount: number;
    trade_date: string;
    settlement_date?: string | undefined;
    notes?: string | undefined;
}, {
    type: "BUY" | "SELL";
    instrument_id: number;
    quantity: number;
    price: number;
    total_amount: number;
    net_amount: number;
    trade_date: string;
    commission?: number | undefined;
    taxes?: number | undefined;
    settlement_date?: string | undefined;
    notes?: string | undefined;
}>;
export declare const TradeUpdateSchema: z.ZodObject<{
    instrument_id: z.ZodOptional<z.ZodNumber>;
    type: z.ZodOptional<z.ZodEnum<["BUY", "SELL"]>>;
    quantity: z.ZodOptional<z.ZodNumber>;
    price: z.ZodOptional<z.ZodNumber>;
    total_amount: z.ZodOptional<z.ZodNumber>;
    commission: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodNumber>>>;
    taxes: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodNumber>>>;
    net_amount: z.ZodOptional<z.ZodNumber>;
    trade_date: z.ZodOptional<z.ZodString>;
    settlement_date: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type?: "BUY" | "SELL" | undefined;
    instrument_id?: number | undefined;
    quantity?: number | undefined;
    price?: number | undefined;
    total_amount?: number | undefined;
    commission?: number | undefined;
    taxes?: number | undefined;
    net_amount?: number | undefined;
    trade_date?: string | undefined;
    settlement_date?: string | undefined;
    notes?: string | undefined;
}, {
    type?: "BUY" | "SELL" | undefined;
    instrument_id?: number | undefined;
    quantity?: number | undefined;
    price?: number | undefined;
    total_amount?: number | undefined;
    commission?: number | undefined;
    taxes?: number | undefined;
    net_amount?: number | undefined;
    trade_date?: string | undefined;
    settlement_date?: string | undefined;
    notes?: string | undefined;
}>;
export declare const TradeQuerySchema: z.ZodObject<{
    instrumentId: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    type: z.ZodOptional<z.ZodEnum<["BUY", "SELL"]>>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>>;
    offset: z.ZodDefault<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    type?: "BUY" | "SELL" | undefined;
    instrumentId?: number | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}, {
    type?: "BUY" | "SELL" | undefined;
    instrumentId?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
    limit?: string | undefined;
    offset?: string | undefined;
}>;
export declare const TradeParamsSchema: z.ZodObject<{
    id: z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: number;
}, {
    id: string;
}>;
export declare const TradeSummaryQuerySchema: z.ZodObject<{
    instrumentId: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    year: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    instrumentId?: number | undefined;
    year?: number | undefined;
}, {
    instrumentId?: string | undefined;
    year?: string | undefined;
}>;
export type TradeCreateInput = z.infer<typeof TradeCreateSchema>;
export type TradeUpdateInput = z.infer<typeof TradeUpdateSchema>;
export type TradeQueryInput = z.infer<typeof TradeQuerySchema>;
export type TradeParamsInput = z.infer<typeof TradeParamsSchema>;
export type TradeSummaryQueryInput = z.infer<typeof TradeSummaryQuerySchema>;
