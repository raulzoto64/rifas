import type { Ticket } from '../types'

interface Props {
  tickets: Ticket[]
  selectedNumbers: number[]
  onToggle: (num: number) => void
  totalTickets: number
}

type TicketState = 'available' | 'reserved' | 'paid' | 'selected'

function getTicketState(ticket: Ticket, selected: number[]): TicketState {
  if (selected.includes(ticket.ticket_number)) return 'selected'
  return ticket.status
}

const STATE_STYLES: Record<TicketState, { bg: string; text: string; border: string; cursor: string }> = {
  available: {
    bg: 'rgba(34,197,94,0.08)',
    text: '#4ade80',
    border: 'rgba(34,197,94,0.25)',
    cursor: 'pointer',
  },
  reserved: {
    bg: 'rgba(249,115,22,0.1)',
    text: '#fb923c',
    border: 'rgba(249,115,22,0.25)',
    cursor: 'not-allowed',
  },
  paid: {
    bg: 'rgba(239,68,68,0.1)',
    text: '#f87171',
    border: 'rgba(239,68,68,0.25)',
    cursor: 'not-allowed',
  },
  selected: {
    bg: 'rgba(99,102,241,0.22)',
    text: '#a5b4fc',
    border: 'rgba(99,102,241,0.7)',
    cursor: 'pointer',
  },
}

function TicketCell({
  ticket,
  state,
  onToggle,
}: {
  ticket: Ticket
  state: TicketState
  onToggle: (n: number) => void
}) {
  const styles = STATE_STYLES[state]
  const label = String(ticket.ticket_number).padStart(3, '0')
  const isInteractive = state === 'available' || state === 'selected'

  return (
    <button
      onClick={() => isInteractive && onToggle(ticket.ticket_number)}
      disabled={!isInteractive}
      title={
        state === 'paid'
          ? 'Número vendido'
          : state === 'reserved'
          ? 'Número apartado'
          : state === 'selected'
          ? 'Clic para deseleccionar'
          : 'Clic para seleccionar'
      }
      style={{
        background: styles.bg,
        color: styles.text,
        border: `1px solid ${styles.border}`,
        cursor: styles.cursor,
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        fontSize: 13,
        borderRadius: 8,
        padding: '8px 4px',
        lineHeight: 1,
        transition: 'all 0.12s ease',
        outline: 'none',
        boxShadow: state === 'selected' ? '0 0 10px rgba(99,102,241,0.4)' : 'none',
        transform: state === 'selected' ? 'scale(1.05)' : 'scale(1)',
        width: '100%',
        aspectRatio: '1 / 1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={(e) => {
        if (!isInteractive) return
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
          state === 'selected'
            ? '0 0 14px rgba(99,102,241,0.6)'
            : '0 0 8px rgba(34,197,94,0.35)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.transform =
          state === 'selected' ? 'scale(1.05)' : 'scale(1)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
          state === 'selected' ? '0 0 10px rgba(99,102,241,0.4)' : 'none'
      }}
    >
      {label}
    </button>
  )
}

export default function NumberGrid({ tickets, selectedNumbers, onToggle }: Props) {
  const available = tickets.filter((t) => t.status === 'available').length
  const reserved = tickets.filter((t) => t.status === 'reserved').length
  const paid = tickets.filter((t) => t.status === 'paid').length

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-5 items-center justify-between">
        <h2
          className="text-xl font-700"
          style={{ fontFamily: 'var(--font-display)', color: '#f0eeff' }}
        >
          Selecciona tus números
        </h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: `Disponible (${available})`, color: '#4ade80', bg: 'rgba(34,197,94,0.1)' },
            { label: `Apartado (${reserved})`, color: '#fb923c', bg: 'rgba(249,115,22,0.1)' },
            { label: `Vendido (${paid})`, color: '#f87171', bg: 'rgba(239,68,68,0.1)' },
            { label: `Seleccionado (${selectedNumbers.length})`, color: '#a5b4fc', bg: 'rgba(99,102,241,0.15)' },
          ].map(({ label, color, bg }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full"
              style={{ background: bg, color, fontFamily: 'var(--font-body)', fontWeight: 500 }}
            >
              <span
                className="inline-block rounded-full"
                style={{ width: 7, height: 7, background: color }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 6,
          }}
          className="sm-grid-10"
        >
          {tickets.map((ticket) => (
            <TicketCell
              key={ticket.id}
              ticket={ticket}
              state={getTicketState(ticket, selectedNumbers)}
              onToggle={onToggle}
            />
          ))}
        </div>
      </div>

      {selectedNumbers.length > 0 && (
        <div
          className="mt-4 px-4 py-3 rounded-xl flex items-center gap-2 text-sm"
          style={{
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.35)',
            color: '#a5b4fc',
            fontFamily: 'var(--font-body)',
          }}
        >
          <span style={{ fontSize: 16 }}>🎯</span>
          <span>
            <strong style={{ color: '#c7d2fe' }}>{selectedNumbers.length}</strong> número
            {selectedNumbers.length !== 1 ? 's' : ''} seleccionado
            {selectedNumbers.length !== 1 ? 's' : ''}:{' '}
            <strong style={{ color: '#e0e7ff', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {selectedNumbers
                .slice()
                .sort((a, b) => a - b)
                .map((n) => String(n).padStart(3, '0'))
                .join(', ')}
            </strong>
          </span>
        </div>
      )}
    </div>
  )
}
