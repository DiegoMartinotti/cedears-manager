// Simple test to verify Step 29 UI improvements
import React, { useState } from 'react'
import { ThemeToggle } from './components/ui/ThemeToggle'
import { Tooltip, InfoTooltip, MetricTooltip } from './components/ui/Tooltip'
import { AnimatedCard, MetricCard } from './components/ui/AnimatedCard'
import { InstrumentSkeletonCard, DashboardMetricSkeleton } from './components/ui/SkeletonCard'
import { SkeletonChart } from './components/ui/SkeletonChart'
import { CommandPalette } from './components/ui/CommandPalette'
import { KeyboardShortcuts } from './components/ui/KeyboardShortcuts'
import { Button } from './components/ui/Button'

const TestStep29: React.FC = () => {
  const [showCommand, setShowCommand] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="min-h-screen bg-background p-8 space-y-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Test Step 29 - UI Improvements
          </h1>
          <div className="flex items-center gap-4">
            <ThemeToggle variant="compact" />
            <Button onClick={() => setShowCommand(true)}>
              Command Palette
            </Button>
            <Button variant="outline" onClick={() => setShowShortcuts(true)}>
              Shortcuts
            </Button>
          </div>
        </div>

        {/* Dark Mode Test */}
        <AnimatedCard className="p-6" hover>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            🌙 Dark Mode Test
            <InfoTooltip content="Toggle entre temas claro, oscuro y sistema" />
          </h2>
          <p className="text-muted-foreground mb-4">
            Prueba cambiar entre los diferentes temas usando el toggle superior.
          </p>
          <div className="flex gap-4">
            <ThemeToggle variant="default" />
            <ThemeToggle variant="icon" />
          </div>
        </AnimatedCard>

        {/* Tooltips Test */}
        <AnimatedCard className="p-6" hover delay={0.1}>
          <h2 className="text-xl font-semibold mb-4">
            💬 Tooltips Test
          </h2>
          <div className="flex gap-4 items-center">
            <Tooltip content="Tooltip básico">
              <Button variant="outline">Hover básico</Button>
            </Tooltip>
            
            <MetricTooltip
              title="Rentabilidad Anual"
              description="Ganancia obtenida en el último año calendario"
              value="15.4%"
              formula="(Valor Final - Valor Inicial) / Valor Inicial * 100"
            >
              <Button>Métrica Tooltip</Button>
            </MetricTooltip>
            
            <InfoTooltip content="Este es un tooltip informativo con icono de ayuda" />
          </div>
        </AnimatedCard>

        {/* Animations Test */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Portfolio Value"
            value="$125,430"
            change="+12.3% este mes"
            changeType="positive"
            delay={0}
          />
          <MetricCard
            title="Rendimiento Anual"
            value="15.4%"
            change="+2.1% vs mes anterior"
            changeType="positive"
            delay={0.1}
          />
          <MetricCard
            title="Instrumentos Activos"
            value="23"
            change="2 nuevos esta semana"
            changeType="neutral"
            delay={0.2}
          />
        </div>

        {/* Loading States Test */}
        <AnimatedCard className="p-6" delay={0.3}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              📊 Loading States Test
            </h2>
            <Button onClick={() => setIsLoading(!isLoading)}>
              Toggle Loading
            </Button>
          </div>
          
          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DashboardMetricSkeleton />
                <DashboardMetricSkeleton />
              </div>
              <InstrumentSkeletonCard />
              <SkeletonChart height={200} showTitle showLegend />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Activa el loading para ver los skeleton states.
              </p>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-card border border-border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">$1,234</div>
                  <div className="text-sm text-muted-foreground">Ganancia Total</div>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg">
                  <div className="text-2xl font-bold text-primary">89.2%</div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                </div>
              </div>
            </div>
          )}
        </AnimatedCard>

        {/* Keyboard Shortcuts Info */}
        <AnimatedCard className="p-6" delay={0.4}>
          <h2 className="text-xl font-semibold mb-4">
            ⌨️ Keyboard Shortcuts
          </h2>
          <div className="text-sm text-muted-foreground space-y-2">
            <p><kbd className="px-2 py-1 bg-muted rounded">Ctrl+K</kbd> - Command Palette</p>
            <p><kbd className="px-2 py-1 bg-muted rounded">Ctrl+/</kbd> - Show Shortcuts</p>
            <p><kbd className="px-2 py-1 bg-muted rounded">Alt+T</kbd> - Toggle Theme</p>
            <p><kbd className="px-2 py-1 bg-muted rounded">Ctrl+B</kbd> - Toggle Sidebar</p>
          </div>
        </AnimatedCard>

      </div>

      {/* Global Components */}
      <CommandPalette
        isOpen={showCommand}
        onClose={() => setShowCommand(false)}
      />
      <KeyboardShortcuts
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  )
}

export default TestStep29