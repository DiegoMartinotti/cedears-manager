import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { useCommissions } from '../../hooks/useCommissions'
import { CommissionConfig as CommissionConfigType, CommissionConfigFormData } from '../../types/commissions'

interface CommissionConfigProps {
  onSave?: (config: CommissionConfigType) => void
  initialConfig?: CommissionConfigType
  isEditing?: boolean
}

export const CommissionConfig: React.FC<CommissionConfigProps> = ({
  onSave,
  initialConfig,
  isEditing = false
}) => {
  const { configs, activeConfig, loading, error, saveConfig, setActiveConfig, clearError } = useCommissions()
  
  const [formData, setFormData] = useState<CommissionConfigFormData>({
    name: '',
    broker: '',
    buyPercentage: '0.5',
    buyMinimum: '150',
    buyIva: '21',
    sellPercentage: '0.5',
    sellMinimum: '150',
    sellIva: '21',
    custodyExemptAmount: '1000000',
    custodyMonthlyPercentage: '0.25',
    custodyMonthlyMinimum: '500',
    custodyIva: '21'
  })

  const [selectedBroker, setSelectedBroker] = useState<string>('')
  const [isFormValid, setIsFormValid] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Inicializar formulario con configuración existente
  useEffect(() => {
    if (initialConfig) {
      setFormData({
        name: initialConfig.name,
        broker: initialConfig.broker,
        buyPercentage: (initialConfig.buy.percentage * 100).toString(),
        buyMinimum: initialConfig.buy.minimum.toString(),
        buyIva: (initialConfig.buy.iva * 100).toString(),
        sellPercentage: (initialConfig.sell.percentage * 100).toString(),
        sellMinimum: initialConfig.sell.minimum.toString(),
        sellIva: (initialConfig.sell.iva * 100).toString(),
        custodyExemptAmount: initialConfig.custody.exemptAmount.toString(),
        custodyMonthlyPercentage: (initialConfig.custody.monthlyPercentage * 100).toString(),
        custodyMonthlyMinimum: initialConfig.custody.monthlyMinimum.toString(),
        custodyIva: (initialConfig.custody.iva * 100).toString()
      })
    }
  }, [initialConfig])

  // Validar formulario
  useEffect(() => {
    const isValid = formData.name.trim() !== '' && 
                   formData.broker.trim() !== '' &&
                   parseFloat(formData.buyPercentage) >= 0 &&
                   parseFloat(formData.buyMinimum) >= 0 &&
                   parseFloat(formData.sellPercentage) >= 0 &&
                   parseFloat(formData.sellMinimum) >= 0
    
    setIsFormValid(isValid)
  }, [formData])

  const handleInputChange = (field: keyof CommissionConfigFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    clearError()
  }

  const handleSave = async () => {
    if (!isFormValid) return

    setIsSaving(true)
    
    try {
      const config: CommissionConfigType = {
        id: initialConfig?.id,
        name: formData.name.trim(),
        broker: formData.broker.trim().toLowerCase(),
        isActive: false, // Por defecto no activa hasta que se seleccione
        buy: {
          percentage: parseFloat(formData.buyPercentage) / 100,
          minimum: parseFloat(formData.buyMinimum),
          iva: parseFloat(formData.buyIva) / 100
        },
        sell: {
          percentage: parseFloat(formData.sellPercentage) / 100,
          minimum: parseFloat(formData.sellMinimum),
          iva: parseFloat(formData.sellIva) / 100
        },
        custody: {
          exemptAmount: parseFloat(formData.custodyExemptAmount),
          monthlyPercentage: parseFloat(formData.custodyMonthlyPercentage) / 100,
          monthlyMinimum: parseFloat(formData.custodyMonthlyMinimum),
          iva: parseFloat(formData.custodyIva) / 100
        }
      }

      const success = await saveConfig(config)
      
      if (success) {
        onSave?.(config)
        
        if (!isEditing) {
          // Limpiar formulario después de guardar nueva configuración
          setFormData({
            name: '',
            broker: '',
            buyPercentage: '0.5',
            buyMinimum: '150',
            buyIva: '21',
            sellPercentage: '0.5',
            sellMinimum: '150',
            sellIva: '21',
            custodyExemptAmount: '1000000',
            custodyMonthlyPercentage: '0.25',
            custodyMonthlyMinimum: '500',
            custodyIva: '21'
          })
        }
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleSetActive = async (broker: string) => {
    const success = await setActiveConfig(broker)
    if (success) {
      setSelectedBroker('')
    }
  }

  if (loading && !isSaving) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <LoadingSpinner />
          <span className="ml-2">Cargando configuraciones...</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Configuración Activa */}
      {!isEditing && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Configuración Activa</h3>
          
          {activeConfig ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-green-800">{activeConfig.name}</h4>
                  <p className="text-sm text-green-600">
                    Compra: {(activeConfig.buy.percentage * 100).toFixed(2)}% 
                    (mín. ${activeConfig.buy.minimum.toLocaleString()})
                  </p>
                  <p className="text-sm text-green-600">
                    Venta: {(activeConfig.sell.percentage * 100).toFixed(2)}% 
                    (mín. ${activeConfig.sell.minimum.toLocaleString()})
                  </p>
                </div>
                <div className="text-right text-sm text-green-600">
                  <p>Custodia: {(activeConfig.custody.monthlyPercentage * 100).toFixed(2)}% mensual</p>
                  <p>Exento hasta: ${activeConfig.custody.exemptAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No hay configuración activa seleccionada</p>
          )}

          {/* Selector de configuración activa */}
          {configs.length > 0 && (
            <div className="mt-4">
              <div className="flex gap-2">
                <Select
                  value={selectedBroker}
                  onChange={(e) => setSelectedBroker(e.target.value)}
                  className="flex-1"
                >
                  {configs.map(config => (
                    <option key={config.broker} value={config.broker}>
                      {config.name}
                    </option>
                  ))}
                </Select>
                <Button
                  onClick={() => handleSetActive(selectedBroker)}
                  disabled={!selectedBroker || loading}
                  variant="default"
                  size="sm"
                >
                  Activar
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Formulario de Configuración */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {isEditing ? 'Editar Configuración' : 'Nueva Configuración de Comisiones'}
        </h3>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Información Básica */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">Información Básica</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la configuración
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ej: Banco Galicia Personalizado"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código del broker
              </label>
              <Input
                value={formData.broker}
                onChange={(e) => handleInputChange('broker', e.target.value)}
                placeholder="Ej: galicia-custom"
                required
              />
            </div>
          </div>

          {/* Comisiones de Compra */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">Comisiones de Compra</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porcentaje (%)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.buyPercentage}
                onChange={(e) => handleInputChange('buyPercentage', e.target.value)}
                placeholder="0.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mínimo (ARS)
              </label>
              <Input
                type="number"
                min="0"
                value={formData.buyMinimum}
                onChange={(e) => handleInputChange('buyMinimum', e.target.value)}
                placeholder="150"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IVA (%)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.buyIva}
                onChange={(e) => handleInputChange('buyIva', e.target.value)}
                placeholder="21"
              />
            </div>
          </div>

          {/* Comisiones de Venta */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">Comisiones de Venta</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porcentaje (%)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.sellPercentage}
                onChange={(e) => handleInputChange('sellPercentage', e.target.value)}
                placeholder="0.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mínimo (ARS)
              </label>
              <Input
                type="number"
                min="0"
                value={formData.sellMinimum}
                onChange={(e) => handleInputChange('sellMinimum', e.target.value)}
                placeholder="150"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IVA (%)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.sellIva}
                onChange={(e) => handleInputChange('sellIva', e.target.value)}
                placeholder="21"
              />
            </div>
          </div>

          {/* Comisiones de Custodia */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">Comisiones de Custodia</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto exento (ARS)
              </label>
              <Input
                type="number"
                min="0"
                value={formData.custodyExemptAmount}
                onChange={(e) => handleInputChange('custodyExemptAmount', e.target.value)}
                placeholder="1000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porcentaje mensual (%)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.custodyMonthlyPercentage}
                onChange={(e) => handleInputChange('custodyMonthlyPercentage', e.target.value)}
                placeholder="0.25"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mínimo mensual (ARS)
              </label>
              <Input
                type="number"
                min="0"
                value={formData.custodyMonthlyMinimum}
                onChange={(e) => handleInputChange('custodyMonthlyMinimum', e.target.value)}
                placeholder="500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IVA (%)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.custodyIva}
                onChange={(e) => handleInputChange('custodyIva', e.target.value)}
                placeholder="21"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!isFormValid || isSaving}
            variant="default"
          >
            {isSaving ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Guardando...</span>
              </>
            ) : (
              isEditing ? 'Actualizar' : 'Guardar Configuración'
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}