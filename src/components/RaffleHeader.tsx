import type { Raffle } from '../types'

interface Props {
  raffle: Raffle
  soldCount: number
  reservedCount: number
}

function formatCurrency(n: number, currency = 'PEN') {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

const PRIZES = [
  {
    place: '1.er premio',
    label: 'iPhone 15',
    sublabel: 'Última generación',
    icon: '📲',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'rgba(139,92,246,0.45)',
    glow: 'rgba(99,102,241,0.25)',
    badge: '#a78bfa',
  },
  {
    place: '2.do premio',
    label: 'S/ 600',
    sublabel: 'Transferencia inmediata',
    icon: '💵',
    gradient: 'linear-gradient(135deg, #f5a623 0%, #f97316 100%)',
    border: 'rgba(245,166,35,0.4)',
    glow: 'rgba(245,166,35,0.2)',
    badge: '#fbbf24',
  },
  {
    place: '3.er premio',
    label: 'S/ 300',
    sublabel: 'Transferencia inmediata',
    icon: '💵',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'rgba(16,185,129,0.35)',
    glow: 'rgba(16,185,129,0.15)',
    badge: '#34d399',
  },
  {
    place: '4.to premio',
    label: 'Premio Sorpresa',
    sublabel: '¡No te lo puedes perder!',
    icon: '🎁',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
    border: 'rgba(236,72,153,0.35)',
    glow: 'rgba(236,72,153,0.15)',
    badge: '#f472b6',
  },
]

export default function RaffleHeader({ raffle, soldCount, reservedCount }: Props) {
  const availableCount = raffle.total_tickets - soldCount - reservedCount
  const progressPct = Math.round(((soldCount + reservedCount) / raffle.total_tickets) * 100)

  return (
    <div
      style={{
        background: 'linear-gradient(160deg, #13102e 0%, #1a1640 60%, #0f0c28 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Hero image with overlay */}
      <div className="relative overflow-hidden" style={{ maxHeight: 260 }}>
        <img
          src={raffle.image_url}
          alt={raffle.title}
          className="w-full object-cover"
          style={{ maxHeight: 260, opacity: 0.4 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(19,16,46,0.2) 0%, rgba(9,7,26,0.98) 100%)',
          }}
        />
        {/* Status badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span
            className="text-xs font-600 px-3 py-1 rounded-full"
            style={{
              background: 'rgba(34,197,94,0.18)',
              color: '#4ade80',
              border: '1px solid rgba(34,197,94,0.4)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ● ACTIVA
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="px-4 pb-6" style={{ marginTop: -56, position: 'relative' }}>
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="mb-5">
            <h1
              className="text-3xl font-900 leading-tight mb-1"
              style={{ fontFamily: 'var(--font-display)', color: '#f0eeff' }}
            >
              {raffle.title}
            </h1>
            <p className="text-sm" style={{ color: 'rgba(224,220,255,0.5)' }}>
              {raffle.description}
            </p>
          </div>

          {/* 4 Prizes grid */}
          <div className="grid grid-cols-2 gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {PRIZES.map((prize) => (
              <div
                key={prize.place}
                className="relative rounded-2xl p-4 overflow-hidden"
                style={{
                  border: `1px solid ${prize.border}`,
                  background: `rgba(13,10,36,0.7)`,
                  boxShadow: `0 4px 24px ${prize.glow}`,
                }}
              >
                {/* Gradient top accent bar */}
                <div
                  className="absolute top-0 left-0 right-0"
                  style={{ height: 3, background: prize.gradient }}
                />
                <div className="flex items-start gap-2 mt-1">
                  <span style={{ fontSize: 26, lineHeight: 1 }}>{prize.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs font-600 mb-0.5"
                      style={{
                        color: prize.badge,
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {prize.place}
                    </div>
                    <div
                      className="text-lg font-900 leading-tight"
                      style={{ fontFamily: 'var(--font-display)', color: '#f0eeff' }}
                    >
                      {prize.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(224,220,255,0.45)' }}>
                      {prize.sublabel}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery note */}
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-5 text-sm"
            style={{
              background: 'rgba(245,166,35,0.07)',
              border: '1px solid rgba(245,166,35,0.2)',
              color: 'rgba(251,191,36,0.8)',
            }}
          >
            <span>🚛🏍️</span>
            <span>
              Transferencia inmediata a ganadores · iPhone enviado a{' '}
              <strong style={{ color: '#fbbf24' }}>cualquier parte del país</strong>
            </span>
          </div>

          {/* Stats row */}
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
            <StatCard label="Precio por número" value={formatCurrency(raffle.ticket_price, 'PEN')} accent="#f5a623" icon="💵" />
            <StatCard label="Disponibles" value={String(availableCount)} accent="#22c55e" icon="🟢" />
            <StatCard label="Vendidos" value={String(soldCount)} accent="#f87171" icon="🔴" />
            <StatCard label="Apartados" value={String(reservedCount)} accent="#fb923c" icon="🟡" />
            <StatCard label="Fecha del sorteo" value={formatDate(raffle.draw_date)} accent="#818cf8" icon="📅" small />
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div
              className="flex justify-between text-xs mb-1"
              style={{ color: 'rgba(224,220,255,0.4)', fontFamily: 'var(--font-mono)' }}
            >
              <span>{progressPct}% completado</span>
              <span>{availableCount} / {raffle.total_tickets} disponibles</span>
            </div>
            <div
              className="rounded-full overflow-hidden"
              style={{ height: 6, background: 'rgba(255,255,255,0.07)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #f5a623, #f97316)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
  icon,
  small,
}: {
  label: string
  value: string
  accent: string
  icon: string
  small?: boolean
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="text-base mb-1">{icon}</div>
      <div
        className={`font-700 leading-tight mb-0.5 ${small ? 'text-xs' : 'text-base'}`}
        style={{ color: accent, fontFamily: small ? 'var(--font-mono)' : 'var(--font-display)' }}
      >
        {value}
      </div>
      <div className="text-xs" style={{ color: 'rgba(224,220,255,0.4)' }}>
        {label}
      </div>
    </div>
  )
}
