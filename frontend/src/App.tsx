import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Watchlist from './pages/Watchlist'
import Opportunities from './pages/Opportunities'
import Portfolio from './pages/Portfolio'
import Goals from './pages/Goals'
import Settings from './pages/Settings'
import { Commissions } from './pages/Commissions'
import { Trades } from './pages/Trades'
import CustodyPage from './pages/Custody'
import SellAnalysis from './pages/SellAnalysis'
import { ContextualAnalysis } from './pages/ContextualAnalysis'
import MonthlyReview from './pages/MonthlyReview'
import SectorBalance from './pages/SectorBalance'
import Scenarios from './pages/Scenarios'
import BreakEven from './pages/BreakEven'
import { GoalOptimizer } from './pages/GoalOptimizer'
import Notifications from './pages/Notifications'
import { PageTransition } from './components/ui/PageTransition'
import { CommandPalette } from './components/ui/CommandPalette'
import { KeyboardShortcuts } from './components/ui/KeyboardShortcuts'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useAppStore } from './store'

function AppContent() {
  const { ui, setActiveModal } = useAppStore()
  useKeyboardShortcuts() // Initialize keyboard shortcuts

  return (
    <Layout>
      <PageTransition>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="/trades" element={<Trades />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/commissions" element={<Commissions />} />
          <Route path="/custody" element={<CustodyPage />} />
          <Route path="/sell-analysis" element={<SellAnalysis />} />
          <Route path="/contextual" element={<ContextualAnalysis />} />
          <Route path="/monthly-review" element={<MonthlyReview />} />
          <Route path="/sector-balance" element={<SectorBalance />} />
          <Route path="/scenarios" element={<Scenarios />} />
          <Route path="/break-even" element={<BreakEven />} />
          <Route path="/goals/:goalId/optimizer" element={<GoalOptimizer />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </PageTransition>

      {/* Global UI Components */}
      <CommandPalette
        isOpen={ui.activeModal === 'command-palette'}
        onClose={() => setActiveModal(null)}
      />
      <KeyboardShortcuts
        isOpen={ui.activeModal === 'keyboard-shortcuts'}
        onClose={() => setActiveModal(null)}
      />
    </Layout>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App