import { useState } from 'react'
import { Plus, Search, Filter, TrendingUp, TrendingDown } from 'lucide-react'
import { useAppStore } from '../store'
import AddCEDEARForm from '../components/AddCEDEARForm'

export default function Watchlist() {
  const { watchlist, removeFromWatchlist } = useAppStore()
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredInstruments = watchlist.instruments.filter(instrument =>
    instrument.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    instrument.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Watchlist</h2>
          <p className="text-muted-foreground">
            {watchlist.instruments.length} CEDEARs en seguimiento
          </p>
        </div>
        <button
          onClick={() => setIsAddFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar CEDEAR
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por símbolo o nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors">
          <Filter className="w-4 h-4" />
          Filtros
        </button>
      </div>

      {/* Watchlist Content */}
      {filteredInstruments.length === 0 ? (
        <div className="bg-card p-8 rounded-lg border border-border text-center">
          {watchlist.instruments.length === 0 ? (
            <>
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Watchlist vacía
              </h3>
              <p className="text-muted-foreground mb-4">
                No hay instrumentos en la watchlist. Agrega CEDEARs para comenzar el seguimiento.
              </p>
              <button
                onClick={() => setIsAddFormOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar primer CEDEAR
              </button>
            </>
          ) : (
            <p className="text-muted-foreground">
              No se encontraron CEDEARs que coincidan con la búsqueda.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredInstruments.map((instrument) => (
            <div
              key={instrument.id}
              className="bg-card p-4 rounded-lg border border-border hover:border-border/80 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {instrument.symbol}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        {instrument.exchange}
                      </span>
                      {instrument.isESG && (
                        <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full">
                          ESG
                        </span>
                      )}
                      {instrument.isVegan && (
                        <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded-full">
                          Vegano
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {instrument.name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>Subyacente: {instrument.underlyingSymbol}</span>
                      <span>Ratio: {instrument.ratio}</span>
                      <span>Sector: {instrument.sector}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Mock Price Data */}
                  <div className="text-right">
                    <div className="text-lg font-semibold text-foreground">
                      ${(Math.random() * 100 + 10).toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      {Math.random() > 0.5 ? (
                        <>
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-green-600">
                            +{(Math.random() * 5).toFixed(2)}%
                          </span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-4 h-4 text-red-600" />
                          <span className="text-red-600">
                            -{(Math.random() * 5).toFixed(2)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromWatchlist(instrument.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add CEDEAR Form Modal */}
      <AddCEDEARForm
        isOpen={isAddFormOpen}
        onClose={() => setIsAddFormOpen(false)}
      />
    </div>
  )
}