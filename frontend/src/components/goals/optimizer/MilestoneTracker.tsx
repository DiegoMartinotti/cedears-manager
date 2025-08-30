/**
 * Seguimiento de Hitos Intermedios - Optimizador de Objetivos
 * Paso 28.3: Identificación de hitos intermedios
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { LoadingSpinner } from '../../ui/LoadingSpinner';

interface Milestone {
  id: number;
  goal_id: number;
  milestone_name: string;
  milestone_type: 'PERCENTAGE' | 'AMOUNT' | 'TIME_BASED' | 'PERFORMANCE';
  milestone_order: number;
  target_amount?: number;
  target_percentage?: number;
  target_date?: string;
  current_progress: number;
  progress_percentage: number;
  is_achieved: boolean;
  achieved_date?: string;
  celebration_tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  difficulty_level: 'EASY' | 'MODERATE' | 'CHALLENGING' | 'AMBITIOUS';
  motivation_message?: string;
  estimated_completion_date?: string;
}

interface MilestoneTrackerProps {
  goalId: number;
  currentCapital: number;
  targetCapital: number;
  onMilestoneUpdate?: (milestone: Milestone) => void;
}

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({
  goalId,
  currentCapital,
  targetCapital,
  onMilestoneUpdate
}) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  const loadMilestones = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Simular datos de hitos
      const mockMilestones: Milestone[] = [
        {
          id: 1,
          goal_id: goalId,
          milestone_name: '10% del Objetivo',
          milestone_type: 'PERCENTAGE',
          milestone_order: 1,
          target_amount: targetCapital * 0.1,
          target_percentage: 10,
          current_progress: currentCapital >= (targetCapital * 0.1) ? targetCapital * 0.1 : currentCapital,
          progress_percentage: Math.min(100, (currentCapital / (targetCapital * 0.1)) * 100),
          is_achieved: currentCapital >= (targetCapital * 0.1),
          achieved_date: currentCapital >= (targetCapital * 0.1) ? '2024-01-15' : undefined,
          celebration_tier: 'BRONZE',
          difficulty_level: 'EASY',
          motivation_message: '¡Excelente inicio! Ya tienes el 10% de tu objetivo',
          estimated_completion_date: '2024-03-15'
        },
        {
          id: 2,
          goal_id: goalId,
          milestone_name: '25% del Objetivo',
          milestone_type: 'PERCENTAGE',
          milestone_order: 2,
          target_amount: targetCapital * 0.25,
          target_percentage: 25,
          current_progress: Math.min(currentCapital, targetCapital * 0.25),
          progress_percentage: Math.min(100, (currentCapital / (targetCapital * 0.25)) * 100),
          is_achieved: currentCapital >= (targetCapital * 0.25),
          achieved_date: currentCapital >= (targetCapital * 0.25) ? '2024-03-20' : undefined,
          celebration_tier: 'SILVER',
          difficulty_level: 'MODERATE',
          motivation_message: '¡Un cuarto del camino recorrido! Sigues por buen camino',
          estimated_completion_date: '2024-06-15'
        },
        {
          id: 3,
          goal_id: goalId,
          milestone_name: '50% del Objetivo',
          milestone_type: 'PERCENTAGE',
          milestone_order: 3,
          target_amount: targetCapital * 0.5,
          target_percentage: 50,
          current_progress: Math.min(currentCapital, targetCapital * 0.5),
          progress_percentage: Math.min(100, (currentCapital / (targetCapital * 0.5)) * 100),
          is_achieved: currentCapital >= (targetCapital * 0.5),
          celebration_tier: 'SILVER',
          difficulty_level: 'MODERATE',
          motivation_message: '¡A mitad del camino! La meta está cada vez más cerca',
          estimated_completion_date: '2024-12-15'
        },
        {
          id: 4,
          goal_id: goalId,
          milestone_name: '75% del Objetivo',
          milestone_type: 'PERCENTAGE',
          milestone_order: 4,
          target_amount: targetCapital * 0.75,
          target_percentage: 75,
          current_progress: Math.min(currentCapital, targetCapital * 0.75),
          progress_percentage: Math.min(100, (currentCapital / (targetCapital * 0.75)) * 100),
          is_achieved: currentCapital >= (targetCapital * 0.75),
          celebration_tier: 'GOLD',
          difficulty_level: 'CHALLENGING',
          motivation_message: '¡Tres cuartas partes completadas! Ya puedes ver la línea de llegada',
          estimated_completion_date: '2025-06-15'
        },
        {
          id: 5,
          goal_id: goalId,
          milestone_name: '90% del Objetivo',
          milestone_type: 'PERCENTAGE',
          milestone_order: 5,
          target_amount: targetCapital * 0.9,
          target_percentage: 90,
          current_progress: Math.min(currentCapital, targetCapital * 0.9),
          progress_percentage: Math.min(100, (currentCapital / (targetCapital * 0.9)) * 100),
          is_achieved: currentCapital >= (targetCapital * 0.9),
          celebration_tier: 'PLATINUM',
          difficulty_level: 'AMBITIOUS',
          motivation_message: '¡Casi llegando! Solo falta un último empujón',
          estimated_completion_date: '2025-12-15'
        },
        {
          id: 6,
          goal_id: goalId,
          milestone_name: 'Año 1',
          milestone_type: 'TIME_BASED',
          milestone_order: 6,
          target_date: '2024-12-31',
          current_progress: new Date() > new Date('2024-12-31') ? 100 : 
            Math.min(100, ((new Date().getTime() - new Date('2024-01-01').getTime()) / 
            (new Date('2024-12-31').getTime() - new Date('2024-01-01').getTime())) * 100),
          progress_percentage: new Date() > new Date('2024-12-31') ? 100 : 
            Math.min(100, ((new Date().getTime() - new Date('2024-01-01').getTime()) / 
            (new Date('2024-12-31').getTime() - new Date('2024-01-01').getTime())) * 100),
          is_achieved: new Date() > new Date('2024-12-31'),
          celebration_tier: 'SILVER',
          difficulty_level: 'MODERATE',
          motivation_message: '¡Mantén el rumbo hacia tu objetivo!'
        }
      ];
      
      setMilestones(mockMilestones);
    } catch (error) {
      console.error('Error loading milestones:', error);
    } finally {
      setIsLoading(false);
    }
  }, [goalId, currentCapital, targetCapital]);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  const generateNewMilestones = async () => {
    setIsGenerating(true);
    
    try {
      // Simular generación
      await new Promise(resolve => setTimeout(resolve, 1500));
      await loadMilestones();
    } catch (error) {
      console.error('Error generating milestones:', error);
    } finally {
      setIsGenerating(false);
    }
  };


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'BRONZE': return '🥉';
      case 'SILVER': return '🥈';
      case 'GOLD': return '🥇';
      case 'PLATINUM': return '💎';
      default: return '🎯';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'BRONZE': return 'bg-amber-100 text-amber-800';
      case 'SILVER': return 'bg-gray-100 text-gray-800';
      case 'GOLD': return 'bg-yellow-100 text-yellow-800';
      case 'PLATINUM': return 'bg-purple-100 text-purple-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'EASY': return 'text-green-600';
      case 'MODERATE': return 'text-blue-600';
      case 'CHALLENGING': return 'text-orange-600';
      case 'AMBITIOUS': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getDifficultyText = (level: string) => {
    switch (level) {
      case 'EASY': return 'Fácil';
      case 'MODERATE': return 'Moderado';
      case 'CHALLENGING': return 'Desafiante';
      case 'AMBITIOUS': return 'Ambicioso';
      default: return level;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-2">
          <LoadingSpinner size="small" />
          <span>Cargando hitos intermedios...</span>
        </div>
      </Card>
    );
  }

  const achievedMilestones = milestones.filter(m => m.is_achieved);
  const nextMilestone = milestones.find(m => !m.is_achieved);
  const overallProgress = milestones.length > 0 ? (achievedMilestones.length / milestones.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Seguimiento de Hitos
            </h3>
            <p className="text-sm text-gray-500">
              {achievedMilestones.length} de {milestones.length} hitos completados
            </p>
          </div>
          <Button
            onClick={generateNewMilestones}
            disabled={isGenerating}
            variant="outline"
            className="flex items-center space-x-2"
          >
            {isGenerating && <LoadingSpinner size="small" />}
            <span>{isGenerating ? 'Generando...' : 'Regenerar Hitos'}</span>
          </Button>
        </div>

        {/* Progreso general */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progreso General</span>
            <span className="text-sm text-gray-500">{overallProgress.toFixed(1)}% completado</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{achievedMilestones.length} hitos</span>
            <span>{milestones.length} hitos totales</span>
          </div>
        </div>

        {/* Siguiente hito */}
        {nextMilestone && (
          <Card className="p-4 mb-6 border-blue-200 bg-blue-50">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">{getTierIcon(nextMilestone.celebration_tier)}</span>
              <div>
                <h4 className="font-medium text-blue-900">Próximo Hito</h4>
                <p className="text-sm text-blue-700">{nextMilestone.milestone_name}</p>
              </div>
              <div className="ml-auto">
                <Badge className={getTierColor(nextMilestone.celebration_tier)}>
                  {nextMilestone.celebration_tier}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Progreso</span>
                <span className="text-sm font-medium text-blue-900">
                  {nextMilestone.progress_percentage.toFixed(1)}%
                </span>
              </div>
              
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${nextMilestone.progress_percentage}%` }}
                />
              </div>
              
              {nextMilestone.target_amount && (
                <div className="flex justify-between text-xs text-blue-600">
                  <span>{formatCurrency(nextMilestone.current_progress)}</span>
                  <span>{formatCurrency(nextMilestone.target_amount)}</span>
                </div>
              )}
              
              {nextMilestone.motivation_message && (
                <div className="text-sm text-blue-800 italic">
                  "{nextMilestone.motivation_message}"
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Lista de todos los hitos */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Todos los Hitos</h4>
          
          <div className="space-y-3">
            {milestones.map((milestone, index) => (
              <Card
                key={milestone.id}
                className={`p-4 transition-all duration-200 hover:shadow-md cursor-pointer ${
                  milestone.is_achieved ? 'border-green-200 bg-green-50' : 
                  selectedMilestone?.id === milestone.id ? 'border-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => setSelectedMilestone(selectedMilestone?.id === milestone.id ? null : milestone)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {/* Indicator */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      milestone.is_achieved ? 'bg-green-500 text-white' :
                      index === 0 ? 'bg-blue-500 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {milestone.is_achieved ? '✓' : milestone.milestone_order}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h5 className={`font-medium ${
                          milestone.is_achieved ? 'text-green-900' : 'text-gray-900'
                        }`}>
                          {milestone.milestone_name}
                        </h5>
                        <Badge className={getTierColor(milestone.celebration_tier)}>
                          {getTierIcon(milestone.celebration_tier)} {milestone.celebration_tier}
                        </Badge>
                        <span className={`text-xs font-medium ${getDifficultyColor(milestone.difficulty_level)}`}>
                          {getDifficultyText(milestone.difficulty_level)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>
                          {milestone.milestone_type === 'PERCENTAGE' && milestone.target_percentage && 
                            `${milestone.target_percentage}% del objetivo`
                          }
                          {milestone.milestone_type === 'AMOUNT' && milestone.target_amount && 
                            formatCurrency(milestone.target_amount)
                          }
                          {milestone.milestone_type === 'TIME_BASED' && milestone.target_date && 
                            `Fecha: ${new Date(milestone.target_date).toLocaleDateString('es-AR')}`
                          }
                        </span>
                        
                        {milestone.is_achieved && milestone.achieved_date && (
                          <span className="text-green-600">
                            ✓ Completado el {new Date(milestone.achieved_date).toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </div>
                      
                      {!milestone.is_achieved && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${milestone.progress_percentage}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {milestone.progress_percentage.toFixed(1)}% completado
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {milestone.estimated_completion_date && !milestone.is_achieved && (
                      <div className="text-xs text-gray-500">
                        Est: {new Date(milestone.estimated_completion_date).toLocaleDateString('es-AR')}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Detalles expandidos */}
                {selectedMilestone?.id === milestone.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    {milestone.motivation_message && (
                      <div className="text-sm text-gray-700 italic">
                        💬 "{milestone.motivation_message}"
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500">Tipo:</span>
                        <div className="font-medium">{milestone.milestone_type.replace('_', ' ')}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Orden:</span>
                        <div className="font-medium">#{milestone.milestone_order}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Dificultad:</span>
                        <div className={`font-medium ${getDifficultyColor(milestone.difficulty_level)}`}>
                          {getDifficultyText(milestone.difficulty_level)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Tier:</span>
                        <div className="font-medium">{milestone.celebration_tier}</div>
                      </div>
                    </div>
                    
                    {!milestone.is_achieved && milestone.target_amount && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Progreso:</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(milestone.current_progress)} / {formatCurrency(milestone.target_amount)}
                        </span>
                        <span className="text-sm text-gray-500">
                          (faltan {formatCurrency(milestone.target_amount - milestone.current_progress)})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Estadísticas de logros */}
        {achievedMilestones.length > 0 && (
          <Card className="p-4 mt-6 bg-green-50 border-green-200">
            <h5 className="font-medium text-green-900 mb-3">🏆 Logros Desbloqueados</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-green-600">Total Hitos:</div>
                <div className="font-bold text-green-900">{achievedMilestones.length}</div>
              </div>
              <div>
                <div className="text-green-600">Bronce:</div>
                <div className="font-bold text-green-900">
                  {achievedMilestones.filter(m => m.celebration_tier === 'BRONZE').length}
                </div>
              </div>
              <div>
                <div className="text-green-600">Plata:</div>
                <div className="font-bold text-green-900">
                  {achievedMilestones.filter(m => m.celebration_tier === 'SILVER').length}
                </div>
              </div>
              <div>
                <div className="text-green-600">Oro:</div>
                <div className="font-bold text-green-900">
                  {achievedMilestones.filter(m => m.celebration_tier === 'GOLD').length}
                </div>
              </div>
            </div>
          </Card>
        )}
      </Card>
    </div>
  );
};