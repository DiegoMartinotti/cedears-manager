import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { InstrumentUI } from '@cedears-manager/shared/types'
import { useCreateInstrument, useUpdateInstrument } from '../hooks/useInstruments'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Switch } from './ui/Switch'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/Card'
import { Badge } from './ui/Badge'
import { 
  Save, 
  X, 
  AlertCircle, 
  Loader2,
  Building,
  DollarSign,
  Shield,
  Leaf,
  TrendingUp
} from 'lucide-react'
import { cn } from '../utils/cn'

// Validation schema
const instrumentSchema = z.object({
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol must be 10 characters or less')
    .regex(/^[A-Z0-9]+$/, 'Symbol must contain only uppercase letters and numbers')
    .transform(str => str.toUpperCase()),
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(200, 'Company name must be 200 characters or less'),
  sector: z
    .string()
    .max(100, 'Sector must be 100 characters or less')
    .optional(),
  industry: z
    .string()
    .max(100, 'Industry must be 100 characters or less')
    .optional(),
  marketCap: z
    .number()
    .positive('Market cap must be positive')
    .optional(),
  isESGCompliant: z.boolean().default(false),
  isVeganFriendly: z.boolean().default(false),
  underlyingSymbol: z
    .string()
    .max(10, 'Underlying symbol must be 10 characters or less')
    .optional(),
  underlyingCurrency: z
    .string()
    .max(3, 'Currency must be 3 characters or less')
    .default('USD'),
  ratio: z
    .number()
    .positive('Ratio must be positive')
    .default(1.0),
  isActive: z.boolean().default(true),
})

type InstrumentFormData = z.infer<typeof instrumentSchema>

interface InstrumentFormProps {
  instrument?: InstrumentUI | null // null for create, InstrumentUI for edit
  onSuccess?: (instrument: InstrumentUI) => void
  onCancel?: () => void
  className?: string
}

// Predefined options
const SECTORS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer Discretionary',
  'Consumer Staples',
  'Energy',
  'Materials',
  'Industrials',
  'Utilities',
  'Real Estate',
  'Telecommunications',
  'Transportation',
]

const CURRENCIES = ['USD', 'ARS', 'EUR', 'GBP', 'JPY']

export const InstrumentForm: React.FC<InstrumentFormProps> = ({
  instrument,
  onSuccess,
  onCancel,
  className
}) => {
  const isEditing = !!instrument
  const createMutation = useCreateInstrument()
  const updateMutation = useUpdateInstrument()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid, isDirty },
  } = useForm<InstrumentFormData>({
    resolver: zodResolver(instrumentSchema),
    defaultValues: {
      symbol: '',
      companyName: '',
      sector: '',
      industry: '',
      marketCap: undefined,
      isESGCompliant: false,
      isVeganFriendly: false,
      underlyingSymbol: '',
      underlyingCurrency: 'USD',
      ratio: 1.0,
      isActive: true,
    },
  })

  // Watch form values for real-time updates
  const watchedValues = watch()

  // Populate form when editing
  useEffect(() => {
    if (instrument) {
      reset({
        symbol: instrument.symbol || '',
        companyName: instrument.companyName || '',
        sector: instrument.sector || '',
        industry: instrument.industry || '',
        marketCap: instrument.marketCap || undefined,
        isESGCompliant: instrument.isESGCompliant || false,
        isVeganFriendly: instrument.isVeganFriendly || false,
        underlyingSymbol: instrument.underlyingSymbol || '',
        underlyingCurrency: instrument.underlyingCurrency || 'USD',
        ratio: instrument.ratio || 1.0,
        isActive: instrument.isActive !== false,
      })
    }
  }, [instrument, reset])

  // Handle form submission
  const onSubmit = async (data: InstrumentFormData) => {
    try {
      // Clean up data
      const cleanData = {
        ...data,
        sector: data.sector || undefined,
        industry: data.industry || undefined,
        underlyingSymbol: data.underlyingSymbol || undefined,
        marketCap: isNaN(data.marketCap as number) ? undefined : data.marketCap,
      }

      if (isEditing && instrument) {
        // Update existing instrument
        updateMutation.mutate(
          { 
            id: instrument.id, 
            data: cleanData as Partial<InstrumentUI>
          },
          {
            onSuccess: (updatedInstrument) => {
              onSuccess?.(updatedInstrument)
            },
          }
        )
      } else {
        // Create new instrument
        createMutation.mutate(
          cleanData as Omit<InstrumentUI, 'id' | 'createdAt' | 'updatedAt'>,
          {
            onSuccess: (newInstrument) => {
              onSuccess?.(newInstrument)
              reset() // Clear form after successful creation
            },
          }
        )
      }
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending
  const error = createMutation.error || updateMutation.error

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>
              {isEditing ? `Edit ${instrument?.symbol}` : 'Add New Instrument'}
            </span>
          </CardTitle>
          {watchedValues.symbol && (
            <div className="flex space-x-2">
              {watchedValues.isESGCompliant && (
                <Badge variant="success" size="sm">
                  <Shield className="w-3 h-3 mr-1" />
                  ESG
                </Badge>
              )}
              {watchedValues.isVeganFriendly && (
                <Badge variant="secondary" size="sm">
                  <Leaf className="w-3 h-3 mr-1" />
                  Vegan
                </Badge>
              )}
              {!watchedValues.isActive && (
                <Badge variant="destructive" size="sm">
                  Inactive
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800 text-sm">
                  {error instanceof Error ? error.message : 'An error occurred'}
                </span>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Symbol *
              </label>
              <Input
                {...register('symbol')}
                placeholder="AAPL"
                className={cn(errors.symbol && "border-red-500")}
                disabled={isLoading}
              />
              {errors.symbol && (
                <p className="text-red-600 text-xs">{errors.symbol.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Company Name *
              </label>
              <Input
                {...register('companyName')}
                placeholder="Apple Inc."
                className={cn(errors.companyName && "border-red-500")}
                disabled={isLoading}
              />
              {errors.companyName && (
                <p className="text-red-600 text-xs">{errors.companyName.message}</p>
              )}
            </div>
          </div>

          {/* Sector and Industry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                <Building className="w-4 h-4 inline mr-1" />
                Sector
              </label>
              <Select
                {...register('sector')}
                className={cn(errors.sector && "border-red-500")}
                disabled={isLoading}
              >
                <option value="">Select Sector</option>
                {SECTORS.map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </Select>
              {errors.sector && (
                <p className="text-red-600 text-xs">{errors.sector.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Industry
              </label>
              <Input
                {...register('industry')}
                placeholder="Software & Services"
                className={cn(errors.industry && "border-red-500")}
                disabled={isLoading}
              />
              {errors.industry && (
                <p className="text-red-600 text-xs">{errors.industry.message}</p>
              )}
            </div>
          </div>

          {/* Financial Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Market Cap (USD)
              </label>
              <Input
                {...register('marketCap', { valueAsNumber: true })}
                type="number"
                step="1000000"
                placeholder="3000000000"
                className={cn(errors.marketCap && "border-red-500")}
                disabled={isLoading}
              />
              {errors.marketCap && (
                <p className="text-red-600 text-xs">{errors.marketCap.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Currency
              </label>
              <Select
                {...register('underlyingCurrency')}
                className={cn(errors.underlyingCurrency && "border-red-500")}
                disabled={isLoading}
              >
                {CURRENCIES.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Ratio
              </label>
              <Input
                {...register('ratio', { valueAsNumber: true })}
                type="number"
                step="0.1"
                min="0.1"
                placeholder="1.0"
                className={cn(errors.ratio && "border-red-500")}
                disabled={isLoading}
              />
              {errors.ratio && (
                <p className="text-red-600 text-xs">{errors.ratio.message}</p>
              )}
            </div>
          </div>

          {/* Underlying Symbol */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Underlying Symbol
            </label>
            <Input
              {...register('underlyingSymbol')}
              placeholder="AAPL (for US stocks)"
              className={cn(errors.underlyingSymbol && "border-red-500")}
              disabled={isLoading}
            />
            {errors.underlyingSymbol && (
              <p className="text-red-600 text-xs">{errors.underlyingSymbol.message}</p>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 border-b pb-2">
              Compliance & Status
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <Switch
                  checked={watchedValues.isESGCompliant}
                  onCheckedChange={(checked) => setValue('isESGCompliant', checked)}
                  disabled={isLoading}
                />
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Shield className="w-4 h-4 mr-1 text-green-600" />
                    ESG Compliant
                  </label>
                  <p className="text-xs text-gray-500">
                    Meets environmental, social, and governance criteria
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Switch
                  checked={watchedValues.isVeganFriendly}
                  onCheckedChange={(checked) => setValue('isVeganFriendly', checked)}
                  disabled={isLoading}
                />
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Leaf className="w-4 h-4 mr-1 text-blue-600" />
                    Vegan Friendly
                  </label>
                  <p className="text-xs text-gray-500">
                    Does not involve animal products or testing
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Switch
                  checked={watchedValues.isActive}
                  onCheckedChange={(checked) => setValue('isActive', checked)}
                  disabled={isLoading}
                />
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Active
                  </label>
                  <p className="text-xs text-gray-500">
                    Include in watchlist and analysis
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          <div className="flex items-center space-x-2">
            {isDirty && !isLoading && (
              <span className="text-xs text-amber-600 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                Unsaved changes
              </span>
            )}
            
            <Button
              type="submit"
              disabled={!isValid || isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}

export default InstrumentForm