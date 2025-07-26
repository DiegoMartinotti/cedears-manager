import { z } from 'zod'

// CEDEAR form validation schema
export const cedearSchema = z.object({
  symbol: z
    .string()
    .min(1, 'El símbolo es requerido')
    .max(10, 'El símbolo no puede tener más de 10 caracteres')
    .regex(/^[A-Z0-9.]+$/, 'El símbolo debe contener solo letras mayúsculas, números y puntos'),
  
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede tener más de 100 caracteres'),
  
  underlyingSymbol: z
    .string()
    .min(1, 'El símbolo subyacente es requerido')
    .max(10, 'El símbolo subyacente no puede tener más de 10 caracteres')
    .regex(/^[A-Z0-9.]+$/, 'El símbolo subyacente debe contener solo letras mayúsculas, números y puntos'),
  
  ratio: z
    .number()
    .positive('El ratio debe ser un número positivo')
    .min(0.001, 'El ratio mínimo es 0.001')
    .max(1000, 'El ratio máximo es 1000'),
  
  currency: z.enum(['USD', 'ARS'], {
    errorMap: () => ({ message: 'La moneda debe ser USD o ARS' }),
  }),
  
  isESG: z.boolean().default(false),
  
  isVegan: z.boolean().default(false),
  
  sector: z
    .string()
    .min(1, 'El sector es requerido')
    .max(50, 'El sector no puede tener más de 50 caracteres'),
  
  exchange: z.enum(['BYMA', 'NYSE', 'NASDAQ'], {
    errorMap: () => ({ message: 'El exchange debe ser BYMA, NYSE o NASDAQ' }),
  }),
})

export type CEDEARFormData = z.infer<typeof cedearSchema> & {
  isESG: boolean
  isVegan: boolean
}

// Trade form validation schema
export const tradeSchema = z.object({
  cedearId: z.string().min(1, 'Debe seleccionar un CEDEAR'),
  
  type: z.enum(['BUY', 'SELL'], {
    errorMap: () => ({ message: 'El tipo debe ser Compra o Venta' }),
  }),
  
  quantity: z
    .number()
    .positive('La cantidad debe ser un número positivo')
    .min(1, 'La cantidad mínima es 1')
    .max(1000000, 'La cantidad máxima es 1,000,000'),
  
  price: z
    .number()
    .positive('El precio debe ser un número positivo')
    .min(0.01, 'El precio mínimo es 0.01')
    .max(100000, 'El precio máximo es 100,000'),
  
  commission: z
    .number()
    .min(0, 'La comisión no puede ser negativa')
    .max(10000, 'La comisión máxima es 10,000')
    .default(0),
  
  date: z
    .date()
    .max(new Date(), 'La fecha no puede ser futura'),
  
  notes: z
    .string()
    .max(500, 'Las notas no pueden tener más de 500 caracteres')
    .optional(),
})

export type TradeFormData = z.infer<typeof tradeSchema>

// Financial goal form validation schema
export const financialGoalSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre del objetivo es requerido')
    .max(100, 'El nombre no puede tener más de 100 caracteres'),
  
  targetAmount: z
    .number()
    .positive('El monto objetivo debe ser positivo')
    .min(1000, 'El monto mínimo es $1,000')
    .max(10000000, 'El monto máximo es $10,000,000'),
  
  currentAmount: z
    .number()
    .min(0, 'El monto actual no puede ser negativo')
    .max(10000000, 'El monto actual máximo es $10,000,000')
    .default(0),
  
  deadline: z
    .date()
    .min(new Date(), 'La fecha límite debe ser futura'),
  
  category: z.enum(['retirement', 'education', 'house', 'vacation', 'emergency', 'other'], {
    errorMap: () => ({ message: 'Debe seleccionar una categoría válida' }),
  }),
  
  priority: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'Debe seleccionar una prioridad válida' }),
  }),
})

export type FinancialGoalFormData = z.infer<typeof financialGoalSchema>

// Settings form validation schema
export const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  
  language: z.enum(['es', 'en']),
  
  currency: z.enum(['ARS', 'USD']),
  
  notifications: z.object({
    priceAlerts: z.boolean(),
    goalProgress: z.boolean(),
    technicalSignals: z.boolean(),
  }),
  
  refreshInterval: z
    .number()
    .min(60, 'El intervalo mínimo es 60 segundos')
    .max(3600, 'El intervalo máximo es 3600 segundos (1 hora)'),
  
  autoAnalysis: z.boolean(),
})

export type SettingsFormData = z.infer<typeof settingsSchema>

// Commission configuration validation schema
export const commissionConfigSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre de la configuración es requerido')
    .max(50, 'El nombre no puede tener más de 50 caracteres'),
  
  type: z.enum(['percentage', 'fixed', 'tiered'], {
    errorMap: () => ({ message: 'El tipo debe ser porcentaje, fijo o por tramos' }),
  }),
  
  value: z
    .number()
    .min(0, 'El valor no puede ser negativo')
    .max(100, 'El valor máximo es 100'),
  
  minAmount: z
    .number()
    .min(0, 'El monto mínimo no puede ser negativo')
    .optional(),
  
  maxAmount: z
    .number()
    .min(0, 'El monto máximo no puede ser negativo')
    .optional(),
})
.refine((data) => {
  if (data.minAmount && data.maxAmount) {
    return data.minAmount <= data.maxAmount
  }
  return true
}, {
  message: 'El monto mínimo debe ser menor o igual al monto máximo',
  path: ['maxAmount'],
})

export type CommissionConfigFormData = z.infer<typeof commissionConfigSchema>

// Search/filter validation schemas
export const searchSchema = z.object({
  query: z.string().max(100, 'La búsqueda no puede tener más de 100 caracteres'),
  
  filters: z.object({
    isESG: z.boolean().optional(),
    isVegan: z.boolean().optional(),
    sectors: z.array(z.string()).optional(),
    exchanges: z.array(z.string()).optional(),
    currency: z.enum(['USD', 'ARS', 'ALL']).optional(),
  }).optional(),
})

export type SearchFormData = z.infer<typeof searchSchema>