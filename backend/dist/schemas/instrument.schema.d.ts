import { z } from 'zod';
export declare const InstrumentCreateSchema: z.ZodObject<{
    symbol: z.ZodString;
    company_name: z.ZodString;
    sector: z.ZodOptional<z.ZodString>;
    industry: z.ZodOptional<z.ZodString>;
    market_cap: z.ZodOptional<z.ZodNumber>;
    is_esg_compliant: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    is_vegan_friendly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    underlying_symbol: z.ZodOptional<z.ZodString>;
    underlying_currency: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    ratio: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    is_active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    company_name: string;
    is_esg_compliant: boolean;
    is_vegan_friendly: boolean;
    underlying_currency: string;
    ratio: number;
    is_active: boolean;
    sector?: string | undefined;
    industry?: string | undefined;
    market_cap?: number | undefined;
    underlying_symbol?: string | undefined;
}, {
    symbol: string;
    company_name: string;
    sector?: string | undefined;
    industry?: string | undefined;
    market_cap?: number | undefined;
    is_esg_compliant?: boolean | undefined;
    is_vegan_friendly?: boolean | undefined;
    underlying_symbol?: string | undefined;
    underlying_currency?: string | undefined;
    ratio?: number | undefined;
    is_active?: boolean | undefined;
}>;
export declare const InstrumentUpdateSchema: z.ZodObject<{
    symbol: z.ZodOptional<z.ZodString>;
    company_name: z.ZodOptional<z.ZodString>;
    sector: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    industry: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    market_cap: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    is_esg_compliant: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    is_vegan_friendly: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    underlying_symbol: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    underlying_currency: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    ratio: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodNumber>>>;
    is_active: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
}, "strip", z.ZodTypeAny, {
    symbol?: string | undefined;
    company_name?: string | undefined;
    sector?: string | undefined;
    industry?: string | undefined;
    market_cap?: number | undefined;
    is_esg_compliant?: boolean | undefined;
    is_vegan_friendly?: boolean | undefined;
    underlying_symbol?: string | undefined;
    underlying_currency?: string | undefined;
    ratio?: number | undefined;
    is_active?: boolean | undefined;
}, {
    symbol?: string | undefined;
    company_name?: string | undefined;
    sector?: string | undefined;
    industry?: string | undefined;
    market_cap?: number | undefined;
    is_esg_compliant?: boolean | undefined;
    is_vegan_friendly?: boolean | undefined;
    underlying_symbol?: string | undefined;
    underlying_currency?: string | undefined;
    ratio?: number | undefined;
    is_active?: boolean | undefined;
}>;
export declare const InstrumentQuerySchema: z.ZodObject<{
    isActive: z.ZodOptional<z.ZodEffects<z.ZodString, boolean, string>>;
    isESG: z.ZodOptional<z.ZodEffects<z.ZodString, boolean, string>>;
    isVegan: z.ZodOptional<z.ZodEffects<z.ZodString, boolean, string>>;
    sector: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    search?: string | undefined;
    sector?: string | undefined;
    isActive?: boolean | undefined;
    isESG?: boolean | undefined;
    isVegan?: boolean | undefined;
}, {
    search?: string | undefined;
    sector?: string | undefined;
    isActive?: string | undefined;
    isESG?: string | undefined;
    isVegan?: string | undefined;
}>;
export declare const InstrumentParamsSchema: z.ZodObject<{
    id: z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: number;
}, {
    id: string;
}>;
export type InstrumentCreateInput = z.infer<typeof InstrumentCreateSchema>;
export type InstrumentUpdateInput = z.infer<typeof InstrumentUpdateSchema>;
export type InstrumentQueryInput = z.infer<typeof InstrumentQuerySchema>;
export type InstrumentParamsInput = z.infer<typeof InstrumentParamsSchema>;
