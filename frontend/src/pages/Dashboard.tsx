export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-lg border border-border">
          <h3 className="text-lg font-semibold mb-2">Cartera Total</h3>
          <p className="text-2xl font-bold text-success">$0.00</p>
          <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border">
          <h3 className="text-lg font-semibold mb-2">Rendimiento</h3>
          <p className="text-2xl font-bold text-muted-foreground">0.00%</p>
          <p className="text-sm text-muted-foreground">Últimos 30 días</p>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border">
          <h3 className="text-lg font-semibold mb-2">Watchlist</h3>
          <p className="text-2xl font-bold text-primary">0</p>
          <p className="text-sm text-muted-foreground">Instrumentos seguidos</p>
        </div>
      </div>
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4">Bienvenido a CEDEARs Manager</h3>
        <p className="text-muted-foreground">
          Esta es la aplicación de gestión inteligente de cartera de CEDEARs con criterios ESG/veganos.
          Comienza agregando instrumentos a tu watchlist para comenzar el análisis.
        </p>
      </div>
    </div>
  )
}