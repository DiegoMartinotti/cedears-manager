import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { CreateGoalRequest } from '../../services/goalService';

interface CreateGoalFormProps {
  onSubmit: (goalData: CreateGoalRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function CreateGoalForm({ onSubmit, onCancel, loading = false }: CreateGoalFormProps) {
  const [formData, setFormData] = useState<CreateGoalRequest>({
    name: '',
    type: 'CAPITAL',
    target_amount: 0,
    target_date: '',
    monthly_contribution: 0,
    expected_return_rate: 8.0,
    description: '',
    currency: 'USD'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.expected_return_rate || formData.expected_return_rate <= 0) {
      newErrors.expected_return_rate = 'La tasa de retorno esperada debe ser mayor a 0';
    }

    if (formData.expected_return_rate > 50) {
      newErrors.expected_return_rate = 'La tasa de retorno parece muy optimista (>50%)';
    }

    if ((formData.type === 'CAPITAL' || formData.type === 'MONTHLY_INCOME') && 
        (!formData.target_amount || formData.target_amount <= 0)) {
      newErrors.target_amount = 'El monto objetivo es requerido para este tipo de meta';
    }

    if (formData.target_amount && formData.target_amount < 100) {
      newErrors.target_amount = 'El monto objetivo debe ser al menos $100';
    }

    if (formData.monthly_contribution && formData.monthly_contribution < 0) {
      newErrors.monthly_contribution = 'El aporte mensual no puede ser negativo';
    }

    if (formData.target_date) {
      const targetDate = new Date(formData.target_date);
      const today = new Date();
      if (targetDate <= today) {
        newErrors.target_date = 'La fecha objetivo debe ser futura';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      // Error será manejado por el componente padre
    }
  };

  const handleInputChange = (field: keyof CreateGoalRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const goalTypes = [
    { value: 'CAPITAL', label: 'Meta de Capital - Acumular un monto específico' },
    { value: 'MONTHLY_INCOME', label: 'Renta Mensual - Generar ingresos periódicos' },
    { value: 'RETURN_RATE', label: 'Tasa de Retorno - Alcanzar una rentabilidad específica' }
  ];

  const currencies = [
    { value: 'USD', label: 'Dólares (USD)' },
    { value: 'ARS', label: 'Pesos Argentinos (ARS)' }
  ];

  const getMinDateForInput = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Card className="p-6 bg-white">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Crear Nuevo Objetivo Financiero</h3>
        <p className="text-gray-600 mt-1">
          Define tu meta financiera y comienza a hacer seguimiento de tu progreso
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Objetivo *
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="ej: Casa propia, Fondo de emergencia"
              className={errors.name ? 'border-red-300' : ''}
            />
            {errors.name && (
              <p className="text-red-600 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Objetivo *
            </label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleInputChange('type', value)}
            >
              {goalTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Monto objetivo y moneda */}
        {(formData.type === 'CAPITAL' || formData.type === 'MONTHLY_INCOME') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="target_amount" className="block text-sm font-medium text-gray-700 mb-2">
                {formData.type === 'CAPITAL' ? 'Monto Objetivo *' : 'Renta Mensual Objetivo *'}
              </label>
              <Input
                id="target_amount"
                type="number"
                value={formData.target_amount || ''}
                onChange={(e) => handleInputChange('target_amount', parseFloat(e.target.value) || 0)}
                placeholder={formData.type === 'CAPITAL' ? '50000' : '1000'}
                className={errors.target_amount ? 'border-red-300' : ''}
              />
              {errors.target_amount && (
                <p className="text-red-600 text-sm mt-1">{errors.target_amount}</p>
              )}
            </div>

            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                Moneda
              </label>
              <Select
                value={formData.currency}
                onValueChange={(value) => handleInputChange('currency', value)}
              >
                {currencies.map((currency) => (
                  <option key={currency.value} value={currency.value}>
                    {currency.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

        {/* Parámetros de inversión */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="monthly_contribution" className="block text-sm font-medium text-gray-700 mb-2">
              Aporte Mensual
            </label>
            <Input
              id="monthly_contribution"
              type="number"
              value={formData.monthly_contribution || ''}
              onChange={(e) => handleInputChange('monthly_contribution', parseFloat(e.target.value) || 0)}
              placeholder="500"
              className={errors.monthly_contribution ? 'border-red-300' : ''}
            />
            {errors.monthly_contribution && (
              <p className="text-red-600 text-sm mt-1">{errors.monthly_contribution}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Cantidad que planeas invertir cada mes
            </p>
          </div>

          <div>
            <label htmlFor="expected_return_rate" className="block text-sm font-medium text-gray-700 mb-2">
              Retorno Anual Esperado (%) *
            </label>
            <Input
              id="expected_return_rate"
              type="number"
              step="0.1"
              value={formData.expected_return_rate || ''}
              onChange={(e) => handleInputChange('expected_return_rate', parseFloat(e.target.value) || 0)}
              placeholder="8.0"
              className={errors.expected_return_rate ? 'border-red-300' : ''}
            />
            {errors.expected_return_rate && (
              <p className="text-red-600 text-sm mt-1">{errors.expected_return_rate}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Rentabilidad anual estimada de tu cartera
            </p>
          </div>

          <div>
            <label htmlFor="target_date" className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Objetivo (Opcional)
            </label>
            <Input
              id="target_date"
              type="date"
              value={formData.target_date || ''}
              onChange={(e) => handleInputChange('target_date', e.target.value)}
              min={getMinDateForInput()}
              className={errors.target_date ? 'border-red-300' : ''}
            />
            {errors.target_date && (
              <p className="text-red-600 text-sm mt-1">{errors.target_date}</p>
            )}
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Descripción (Opcional)
          </label>
          <textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe tu objetivo financiero..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="text-gray-500 text-xs mt-1">
            Información adicional sobre tu objetivo
          </p>
        </div>

        {/* Ejemplo de cálculo */}
        {formData.target_amount && formData.expected_return_rate && formData.monthly_contribution && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">📊 Estimación Preliminar</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Capital objetivo: {formData.currency === 'USD' ? '$' : '$'}{formData.target_amount?.toLocaleString()}</p>
              <p>• Aporte mensual: {formData.currency === 'USD' ? '$' : '$'}{formData.monthly_contribution?.toLocaleString()}</p>
              <p>• Retorno esperado: {formData.expected_return_rate}% anual</p>
              <p className="text-blue-600 font-medium">
                ⏱️ Tiempo estimado: Se calculará después de crear el objetivo
              </p>
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creando...
              </>
            ) : (
              '🎯 Crear Objetivo'
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}