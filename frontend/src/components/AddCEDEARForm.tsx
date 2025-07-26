import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Save, X } from 'lucide-react'
import { cedearSchema, type CEDEARFormData } from '../utils/validations'
import { useCreateCEDEAR } from '../hooks/useCreateCEDEAR'

interface AddCEDEARFormProps {
  isOpen: boolean
  onClose: () => void
}

export default function AddCEDEARForm({ isOpen, onClose }: AddCEDEARFormProps) {
  const { createCEDEAR, loading } = useCreateCEDEAR()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(cedearSchema),
    defaultValues: {
      currency: 'USD' as const,
      isESG: false,
      isVegan: false,
      exchange: 'BYMA' as const,
      ratio: 1,
    },
  })

  const onSubmit = async (data: any) => {
    try {
      await createCEDEAR(data as CEDEARFormData)
      reset()
      onClose()
    } catch (error) {
      // Error handling is done in the hook
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Agregar CEDEAR
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Symbol */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Símbolo *
            </label>
            <input
              {...register('symbol')}
              type="text"
              placeholder="Ej: AAPL"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {errors.symbol && (
              <p className="mt-1 text-sm text-destructive">{errors.symbol.message}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Nombre *
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="Ej: Apple Inc."
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Underlying Symbol */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Símbolo Subyacente *
            </label>
            <input
              {...register('underlyingSymbol')}
              type="text"
              placeholder="Ej: AAPL"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {errors.underlyingSymbol && (
              <p className="mt-1 text-sm text-destructive">{errors.underlyingSymbol.message}</p>
            )}
          </div>

          {/* Ratio and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Ratio *
              </label>
              <input
                {...register('ratio', { valueAsNumber: true })}
                type="number"
                step="0.001"
                placeholder="1"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {errors.ratio && (
                <p className="mt-1 text-sm text-destructive">{errors.ratio.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Moneda *
              </label>
              <select
                {...register('currency')}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
              {errors.currency && (
                <p className="mt-1 text-sm text-destructive">{errors.currency.message}</p>
              )}
            </div>
          </div>

          {/* Sector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Sector *
            </label>
            <input
              {...register('sector')}
              type="text"
              placeholder="Ej: Technology"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {errors.sector && (
              <p className="mt-1 text-sm text-destructive">{errors.sector.message}</p>
            )}
          </div>

          {/* Exchange */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Exchange *
            </label>
            <select
              {...register('exchange')}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="BYMA">BYMA</option>
              <option value="NYSE">NYSE</option>
              <option value="NASDAQ">NASDAQ</option>
            </select>
            {errors.exchange && (
              <p className="mt-1 text-sm text-destructive">{errors.exchange.message}</p>
            )}
          </div>

          {/* ESG and Vegan checkboxes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                {...register('isESG')}
                type="checkbox"
                id="isESG"
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
              />
              <label htmlFor="isESG" className="text-sm text-foreground">
                ESG
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                {...register('isVegan')}
                type="checkbox"
                id="isVegan"
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
              />
              <label htmlFor="isVegan" className="text-sm text-foreground">
                Vegano
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-border rounded-md text-foreground hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}