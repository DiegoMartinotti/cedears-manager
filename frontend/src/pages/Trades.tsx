import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useInstruments } from '../hooks/useInstruments';
import { useCommissions } from '../hooks/useCommissions';
import { TrendingUp, TrendingDown, Calculator, AlertTriangle, History, DollarSign } from 'lucide-react';
import { apiService } from '../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Trade {
  id: number;
  instrumentId: number;
  type: 'BUY' | 'SELL';
  quantity: number;
  priceArs: number;
  priceUsd: number;
  commission: number;
  taxes: number;
  netAmount: number;
  uvaValue: number;
  tradeDate: string;
  instrument: {
    ticker: string;
    name: string;
  };
}

interface TradeFormData {
  instrumentId: number;
  type: 'BUY' | 'SELL';
  quantity: number;
  priceArs: number;
}

interface CommissionPreview {
  baseCommission: number;
  ivaAmount: number;
  totalCommission: number;
  netAmount: number;
  breakdown: {
    commissionPercentage: number;
    minimumCommission: number;
    appliedCommission: number;
  };
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export function Trades() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<TradeFormData>({
    instrumentId: 0,
    type: 'BUY',
    quantity: 0,
    priceArs: 0
  });
  const [commissionPreview, setCommissionPreview] = useState<CommissionPreview | null>(null);

  // Hooks
  const { data: instruments } = useInstruments();
  const { activeConfig } = useCommissions();
  
  // Fetch trades history
  const { data: trades, isLoading: isLoadingTrades } = useQuery({
    queryKey: ['trades'],
    queryFn: async () => {
      const response = await apiService.get<Trade[]>('/trades');
      return response.data;
    }
  });

  // Calculate commission preview
  const calculateCommission = useMutation({
    mutationFn: async (data: TradeFormData) => {
      const response = await apiService.post<CommissionPreview>('/trades/calculate-commission', {
        operationType: data.type,
        amount: data.priceArs * data.quantity,
        broker: activeConfig?.broker || 'galicia'
      });
      return response.data;
    },
    onSuccess: (data) => {
      setCommissionPreview(data);
    }
  });

  // Create new trade
  const createTrade = useMutation({
    mutationFn: async (data: TradeFormData) => {
      const response = await apiService.post<Trade>('/trades', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      setFormData({
        instrumentId: 0,
        type: 'BUY',
        quantity: 0,
        priceArs: 0
      });
      setCommissionPreview(null);
      alert('Operación registrada exitosamente');
    }
  });

  // Handle form changes and calculate commission
  const handleFormChange = (field: keyof TradeFormData, value: any) => {
    const updatedForm = { ...formData, [field]: value };
    setFormData(updatedForm);

    // Calculate commission if all fields are filled
    if (updatedForm.instrumentId && updatedForm.quantity > 0 && updatedForm.priceArs > 0) {
      calculateCommission.mutate(updatedForm);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.instrumentId || formData.quantity <= 0 || formData.priceArs <= 0) {
      alert('Por favor complete todos los campos');
      return;
    }
    createTrade.mutate(formData);
  };

  const totalAmount = formData.priceArs * formData.quantity;
  const netAmount = commissionPreview ? commissionPreview.netAmount : totalAmount;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Operaciones</h1>
        <p className="text-gray-600">Registra y visualiza tus operaciones de compra y venta</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'new'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Calculator className="h-4 w-4" />
            <span>Nueva Operación</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>Historial</span>
          </div>
        </button>
      </div>

      {/* New Trade Form */}
      {activeTab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Registrar Operación</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Operación
                </label>
                <Select
                  value={formData.type}
                  onChange={(e) => handleFormChange('type', e.target.value)}
                >
                  <option value="BUY">Compra</option>
                  <option value="SELL">Venta</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instrumento
                </label>
                <Select
                  value={formData.instrumentId}
                  onChange={(e) => handleFormChange('instrumentId', Number(e.target.value))}
                >
                  <option value={0}>Seleccione un instrumento</option>
                  {instruments?.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.ticker} - {inst.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad
                </label>
                <Input
                  type="number"
                  value={formData.quantity || ''}
                  onChange={(e) => handleFormChange('quantity', Number(e.target.value))}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio (ARS)
                </label>
                <Input
                  type="number"
                  value={formData.priceArs || ''}
                  onChange={(e) => handleFormChange('priceArs', Number(e.target.value))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Monto Bruto:</span>
                  <span className="font-medium">${totalAmount.toFixed(2)}</span>
                </div>
                
                {commissionPreview && (
                  <>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Comisión ({activeConfig?.broker || 'Galicia'}):</span>
                      <span className="text-red-600">-${commissionPreview.totalCommission.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold border-t pt-2">
                      <span>Monto Neto:</span>
                      <span className={formData.type === 'BUY' ? 'text-red-600' : 'text-green-600'}>
                        ${netAmount.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createTrade.isPending || !formData.instrumentId || formData.quantity <= 0 || formData.priceArs <= 0}
              >
                {createTrade.isPending ? 'Registrando...' : 'Registrar Operación'}
              </Button>
            </form>
          </Card>

          {/* Commission Details */}
          {commissionPreview && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Detalle de Comisiones
              </h2>

              <div className="space-y-4">
                <Alert
                  variant={commissionPreview.totalCommission / totalAmount > 0.01 ? 'warning' : 'info'}
                  icon={AlertTriangle}
                >
                  {commissionPreview.totalCommission / totalAmount > 0.01
                    ? 'Las comisiones representan más del 1% del monto total'
                    : 'Comisiones dentro del rango esperado'}
                </Alert>

                {/* Alerta cuando comisiones superan ganancia potencial */}
                {formData.type === 'SELL' && formData.instrumentId > 0 && (() => {
                  const position = trades?.find((t: any) => 
                    t.instrumentId === formData.instrumentId && 
                    t.type === 'BUY'
                  );
                  if (position) {
                    const potentialGain = (formData.priceArs - position.priceArs) * formData.quantity;
                    const commissionRatio = commissionPreview.totalCommission / Math.abs(potentialGain);
                    
                    if (potentialGain > 0 && commissionRatio > 0.5) {
                      return (
                        <Alert
                          variant="destructive"
                          icon={AlertTriangle}
                        >
                          <div>
                            <p className="font-semibold">⚠️ Alerta: Alto impacto de comisiones</p>
                            <p className="text-sm mt-1">
                              Las comisiones ({formatCurrency(commissionPreview.totalCommission)}) 
                              representan el {(commissionRatio * 100).toFixed(1)}% de tu ganancia potencial 
                              ({formatCurrency(potentialGain)}).
                            </p>
                            <p className="text-sm mt-1 font-medium">
                              Considera esperar a tener una ganancia mayor antes de vender.
                            </p>
                          </div>
                        </Alert>
                      );
                    }
                  }
                  return null;
                })()}

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Comisión Base:</span>
                    <span>${commissionPreview.baseCommission.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IVA (21%):</span>
                    <span>${commissionPreview.ivaAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t pt-2">
                    <span>Comisión Total:</span>
                    <span className="text-red-600">${commissionPreview.totalCommission.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <p>Configuración: {activeConfig?.name || 'Banco Galicia'}</p>
                  <p>
                    {formData.type === 'BUY' ? 'Compra' : 'Venta'}: {
                      commissionPreview.breakdown.commissionPercentage * 100
                    }% (mínimo ${commissionPreview.breakdown.minimumCommission})
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Trade History */}
      {activeTab === 'history' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Historial de Operaciones</h2>
          
          {isLoadingTrades ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : trades && trades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 text-sm font-medium text-gray-700">Fecha</th>
                    <th className="pb-2 text-sm font-medium text-gray-700">Tipo</th>
                    <th className="pb-2 text-sm font-medium text-gray-700">Instrumento</th>
                    <th className="pb-2 text-sm font-medium text-gray-700">Cantidad</th>
                    <th className="pb-2 text-sm font-medium text-gray-700">Precio</th>
                    <th className="pb-2 text-sm font-medium text-gray-700">Comisión</th>
                    <th className="pb-2 text-sm font-medium text-gray-700">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 text-sm">
                        {new Date(trade.tradeDate).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <Badge variant={trade.type === 'BUY' ? 'secondary' : 'success'}>
                          <div className="flex items-center">
                            {trade.type === 'BUY' ? (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            )}
                            {trade.type === 'BUY' ? 'Compra' : 'Venta'}
                          </div>
                        </Badge>
                      </td>
                      <td className="py-3 text-sm">
                        <div>
                          <div className="font-medium">{trade.instrument.ticker}</div>
                          <div className="text-xs text-gray-500">{trade.instrument.name}</div>
                        </div>
                      </td>
                      <td className="py-3 text-sm">{trade.quantity}</td>
                      <td className="py-3 text-sm">${trade.priceArs.toFixed(2)}</td>
                      <td className="py-3 text-sm text-red-600">
                        -${(trade.commission + trade.taxes).toFixed(2)}
                      </td>
                      <td className="py-3 text-sm font-medium">
                        ${trade.netAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No hay operaciones registradas
            </div>
          )}
        </Card>
      )}
    </div>
  );
}