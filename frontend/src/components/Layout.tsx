import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import { ThemeToggle } from './ui/ThemeToggle'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar Navigation */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <header className="border-b border-border bg-card/50 backdrop-blur transition-all duration-300">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-foreground transition-colors">
                  Dashboard
                </h1>
                <p className="text-sm text-muted-foreground transition-colors">
                  Gestión inteligente de cartera ESG
                </p>
              </div>
              
              {/* Quick Stats & Theme Toggle */}
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <div className="text-foreground font-medium">12</div>
                  <div className="text-muted-foreground">CEDEARs</div>
                </div>
                <div className="text-center">
                  <div className="text-green-600 font-medium">+8.5%</div>
                  <div className="text-muted-foreground">Mes actual</div>
                </div>
                <div className="text-center">
                  <div className="text-foreground font-medium">$245.680</div>
                  <div className="text-muted-foreground">Valor cartera</div>
                </div>
                <div className="border-l border-border pl-4">
                  <ThemeToggle variant="icon" />
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}