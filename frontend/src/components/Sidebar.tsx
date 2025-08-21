import { 
  BarChart3, 
  Eye, 
  Briefcase, 
  Target, 
  Settings, 
  TrendingUp,
  DollarSign,
  Calculator,
  Zap
} from 'lucide-react'
import NavigationItem from './NavigationItem'

export default function Sidebar() {
  return (
    <aside className="w-64 bg-card border-r border-border h-full flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground">CEDEARs</h1>
            <p className="text-xs text-muted-foreground">Manager ESG</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        <div className="space-y-1">
          <NavigationItem
            to="/"
            icon={<BarChart3 />}
            label="Dashboard"
          />
          
          <NavigationItem
            to="/watchlist"
            icon={<Eye />}
            label="Watchlist"
          />

          <NavigationItem
            to="/opportunities"
            icon={<Zap />}
            label="Oportunidades"
          />
          
          <NavigationItem
            to="/trades"
            icon={<TrendingUp />}
            label="Operaciones"
          />
          
          <NavigationItem
            to="/portfolio"
            icon={<Briefcase />}
            label="Cartera"
          />
          
          <NavigationItem
            to="/goals"
            icon={<Target />}
            label="Objetivos"
          />
          
          <NavigationItem
            to="/commissions"
            icon={<Calculator />}
            label="Comisiones"
          />
        </div>

        {/* Separator */}
        <div className="border-t border-border my-4"></div>

        <div className="space-y-1">
          <NavigationItem
            to="/settings"
            icon={<Settings />}
            label="Configuración"
          />
        </div>
      </nav>

      {/* Performance Summary */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Performance Total</span>
            <span className="text-green-600 font-medium">+12.5%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">vs Inflación</span>
            <span className="text-green-600 font-medium">+8.2%</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <DollarSign className="w-3 h-3" />
            <span>Última actualización: Hoy</span>
          </div>
        </div>
      </div>
    </aside>
  )
}