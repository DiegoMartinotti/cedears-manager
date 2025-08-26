import React from 'react'
import { 
  Lightbulb, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Zap,
  Shield,
  Settings
} from 'lucide-react'
import type { BreakEvenOptimization } from '../../services/breakEvenService'

interface BreakEvenOptimizerProps {
  optimizations: BreakEvenOptimization[]
  analysis: {
    break_even_price: number
    total_costs: number
    days_to_break_even: number
  }
  className?: string
}

interface OptimizationCardProps {
  optimization: BreakEvenOptimization
  onImplement?: (id: number) => void
}

const OptimizationCard: React.FC<OptimizationCardProps> = ({ optimization, onImplement }) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'LOW': return <CheckCircle className="w-4 h-4" />
      case 'MEDIUM': return <Clock className="w-4 h-4" />
      case 'HIGH': return <AlertTriangle className="w-4 h-4" />
      default: return <Settings className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'border-l-red-500 bg-red-50'
    if (priority === 2) return 'border-l-orange-500 bg-orange-50'
    if (priority === 3) return 'border-l-yellow-500 bg-yellow-50'
    return 'border-l-gray-500 bg-gray-50'
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'COMMISSION_OPTIMIZATION': return <DollarSign className="w-5 h-5 text-blue-600" />
      case 'CUSTODY_OPTIMIZATION': return <Shield className="w-5 h-5 text-purple-600" />
      case 'TIMING_OPTIMIZATION': return <Clock className="w-5 h-5 text-green-600" />
      case 'INFLATION_HEDGE': return <TrendingUp className="w-5 h-5 text-orange-600" />
      default: return <Zap className="w-5 h-5 text-gray-600" />
    }
  }

  return (
    <div className={`border-l-4 rounded-lg p-4 ${getPriorityColor(optimization.priority)} border border-gray-200`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getSuggestionIcon(optimization.suggestion_type)}
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">
              {optimization.suggestion_title}
            </h4>
            
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${getDifficultyColor(optimization.implementation_difficulty)}`}>
              {getDifficultyIcon(optimization.implementation_difficulty)}
              <span className="capitalize">{optimization.implementation_difficulty.toLowerCase()}</span>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">
            {optimization.suggestion_description}
          </p>
          
          <div className="flex items-center gap-4 mb-3">
            {optimization.potential_savings && optimization.potential_savings > 0 && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <DollarSign className="w-4 h-4" />
                <span>Ahorro: ${optimization.potential_savings.toFixed(2)}</span>
              </div>
            )}
            
            {optimization.potential_time_reduction && optimization.potential_time_reduction > 0 && (
              <div className="flex items-center gap-1 text-sm text-blue-600">
                <Clock className="w-4 h-4" />
                <span>Reduce: {optimization.potential_time_reduction} días</span>
              </div>
            )}
          </div>
          
          {optimization.is_automated ? (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800 font-medium">Optimización Automática</span>
            </div>
          ) : (
            <button
              onClick={() => onImplement?.(optimization.id!)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            >
              <Settings className="w-4 h-4" />
              Implementar Sugerencia
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BreakEvenOptimizer({ optimizations, analysis, className = '' }: BreakEvenOptimizerProps) {
  const handleImplementOptimization = (id: number) => {
    console.log(`Implementing optimization ${id}`)
    // Aquí se implementaría la lógica para aplicar la optimización
  }

  // Calcular estadísticas de optimizaciones
  const totalSavings = optimizations.reduce((sum, opt) => 
    sum + (opt.potential_savings || 0), 0
  )
  
  const totalTimeReduction = optimizations.reduce((sum, opt) => 
    sum + (opt.potential_time_reduction || 0), 0
  )
  
  const automatedOptimizations = optimizations.filter(opt => opt.is_automated).length
  const manualOptimizations = optimizations.filter(opt => !opt.is_automated).length

  // Agrupar por prioridad
  const highPriorityOptimizations = optimizations.filter(opt => opt.priority <= 2)
  const mediumPriorityOptimizations = optimizations.filter(opt => opt.priority === 3)
  const lowPriorityOptimizations = optimizations.filter(opt => opt.priority > 3)

  if (optimizations.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Optimizaciones</h3>
          </div>
          
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <CheckCircle className="w-8 h-8 mb-2 text-green-500" />
            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-900 mb-1">Todo Optimizado</h4>
              <p className="text-sm">No se encontraron optimizaciones adicionales para esta posición.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Lightbulb className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">Optimizaciones Sugeridas</h3>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {optimizations.length} sugerencias
          </span>
        </div>

        {/* Resumen de impacto */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-700">Ahorro Potencial</span>
            </div>
            <div className="text-lg font-bold text-green-900">
              ${totalSavings.toFixed(2)}
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-700">Reducción Tiempo</span>
            </div>
            <div className="text-lg font-bold text-blue-900">
              {totalTimeReduction} días
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-purple-700">Automáticas</span>
            </div>
            <div className="text-lg font-bold text-purple-900">
              {automatedOptimizations}
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-4 h-4 text-orange-600" />
              <span className="text-xs text-orange-700">Manuales</span>
            </div>
            <div className="text-lg font-bold text-orange-900">
              {manualOptimizations}
            </div>
          </div>
        </div>

        {/* Optimizaciones de alta prioridad */}
        {highPriorityOptimizations.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h4 className="text-sm font-medium text-red-800">Prioridad Alta</h4>
            </div>
            <div className="space-y-3">
              {highPriorityOptimizations.map(opt => (
                <OptimizationCard 
                  key={opt.id} 
                  optimization={opt} 
                  onImplement={handleImplementOptimization}
                />
              ))}
            </div>
          </div>
        )}

        {/* Optimizaciones de prioridad media */}
        {mediumPriorityOptimizations.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-yellow-600" />
              <h4 className="text-sm font-medium text-yellow-800">Prioridad Media</h4>
            </div>
            <div className="space-y-3">
              {mediumPriorityOptimizations.map(opt => (
                <OptimizationCard 
                  key={opt.id} 
                  optimization={opt} 
                  onImplement={handleImplementOptimization}
                />
              ))}
            </div>
          </div>
        )}

        {/* Optimizaciones de baja prioridad */}
        {lowPriorityOptimizations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <h4 className="text-sm font-medium text-green-800">Mejoras Adicionales</h4>
            </div>
            <div className="space-y-3">
              {lowPriorityOptimizations.map(opt => (
                <OptimizationCard 
                  key={opt.id} 
                  optimization={opt} 
                  onImplement={handleImplementOptimization}
                />
              ))}
            </div>
          </div>
        )}

        {/* Nota informativa */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">Sobre las Optimizaciones</div>
              <p>
                Las sugerencias están ordenadas por prioridad e impacto potencial. Las optimizaciones automáticas 
                se aplican cuando es posible, mientras que las manuales requieren tu acción.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}