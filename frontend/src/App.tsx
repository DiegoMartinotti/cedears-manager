import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Watchlist from './pages/Watchlist'
import Portfolio from './pages/Portfolio'
import Goals from './pages/Goals'
import Settings from './pages/Settings'
import { Commissions } from './pages/Commissions'
import { Trades } from './pages/Trades'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/trades" element={<Trades />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/commissions" element={<Commissions />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App