export default function Watchlist() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Watchlist</h2>
      <div className="bg-card p-6 rounded-lg border border-border">
        <p className="text-muted-foreground text-center py-8">
          No hay instrumentos en la watchlist. Agrega CEDEARs para comenzar el seguimiento.
        </p>
      </div>
    </div>
  )
}