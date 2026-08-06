import { useState } from 'react'
import type { Payment, Ticket, Participant, Helper } from '../types'

interface Props {
  tickets: Ticket[]
  payments: Payment[]
  participants: Participant[]
  helpers: Helper[]
  onUpdatePayment: (id: string, status: 'approved' | 'rejected') => void
  onDeleteTicket: (id: string) => Promise<{ success: boolean; error?: string }>
  onDeleteParticipant: (id: string) => Promise<{ success: boolean; error?: string }>
  onAddHelper: (data: { first_name: string; last_name: string; whatsapp: string; password: string }) => Promise<{ success: boolean; error?: string }>
  onDeleteHelper: (id: string) => Promise<{ success: boolean; error?: string }>
  onClose: () => void
}

// Admin general: número + contraseña maestra
const GENERAL_ADMIN_NUMBER = '+51993790515'
const GENERAL_ADMIN_PASSWORD = 'denis123019@'

type Role = 'admin' | 'helper' | null

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

type AdminTab = 'payments' | 'tickets' | 'participants' | 'helpers'

export default function AdminPanel({ tickets, payments, participants, helpers, onUpdatePayment, onDeleteTicket, onDeleteParticipant, onAddHelper, onDeleteHelper, onClose }: Props) {
  const [authed, setAuthed] = useState(false)
  const [role, setRole] = useState<Role>(null)
  const [helperId, setHelperId] = useState<string | null>(null)
  const [number, setNumber] = useState('')
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState(false)
  const [tab, setTab] = useState<AdminTab>('payments')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const num = number.trim()

    // Admin general (número maestro)
    if (num === GENERAL_ADMIN_NUMBER && pw === GENERAL_ADMIN_PASSWORD) {
      setRole('admin')
      setHelperId(null)
      setAuthed(true)
      setPwError(false)
      return
    }

    // Familiar/amigo: número + contraseña asignada
    const helper = helpers.find(h => h.whatsapp.trim() === num && h.password === pw)
    if (helper) {
      setRole('helper')
      setHelperId(helper.id)
      setAuthed(true)
      setPwError(false)
      return
    }

    setPwError(true)
  }

  if (!authed) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
        <div className="w-full max-w-sm rounded-2xl p-8" style={{ background: '#13102e', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🔐</div>
            <h2 className="text-xl font-700" style={{ fontFamily: 'var(--font-display)', color: '#f0eeff' }}>
              Panel de Administración
            </h2>
            <p className="text-xs mt-1" style={{ color: 'rgba(224,220,255,0.45)' }}>Ingresa tu número y contraseña.</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="tel"
              value={number}
              onChange={e => setNumber(e.target.value)}
              placeholder="Número (ej: +51993790515)"
              className="rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${pwError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, color: '#e8e4ff', fontFamily: 'var(--font-mono)' }}
            />
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="Contraseña"
              className="rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${pwError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, color: '#e8e4ff', fontFamily: 'var(--font-mono)' }}
            />
            {pwError && <p className="text-xs" style={{ color: '#fca5a5' }}>Número o contraseña incorrectos</p>}
            <button type="submit" className="rounded-xl py-3 font-600 text-sm" style={{ background: 'linear-gradient(135deg,#f5a623,#f97316)', color: '#1a0a00', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Ingresar
            </button>
            <button type="button" onClick={onClose} className="rounded-xl py-2 text-xs" style={{ background: 'transparent', color: 'rgba(224,220,255,0.4)', border: 'none', cursor: 'pointer' }}>
              Cancelar
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Vista de familiar: SOLO sus propios compradores/prospectos ──
  if (role === 'helper' && helperId) {
    const helper = helpers.find(h => h.id === helperId)
    return (
      <HelperPanel
        helper={helper}
        tickets={tickets}
        payments={payments}
        participants={participants}
        onUpdatePayment={onUpdatePayment}
        onDeleteParticipant={onDeleteParticipant}
        onClose={onClose}
      />
    )
  }

  const filteredPayments = payments.filter(p => filter === 'all' || p.status === filter)
  const totalRevenue = payments.filter(p => p.status === 'approved').reduce((s, p) => s + p.amount_paid, 0)
  const pendingCount = payments.filter(p => p.status === 'pending').length
  const soldCount = tickets.filter(t => t.status === 'paid').length
  const reservedCount = tickets.filter(t => t.status === 'reserved').length

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#09071a' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0f0c28' }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">⚙️</span>
          <div>
            <h1 className="text-base font-700" style={{ fontFamily: 'var(--font-display)', color: '#f0eeff' }}>Panel Admin</h1>
            <p className="text-xs" style={{ color: 'rgba(224,220,255,0.4)' }}>Gran Rifa Navideña 2024</p>
          </div>
        </div>
        <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(224,220,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          ← Volver a la rifa
        </button>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 px-6 py-4 overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {[
          { label: 'Ingresos confirmados', value: formatCurrency(totalRevenue), color: '#4ade80', icon: '💰' },
          { label: 'Pagos pendientes', value: String(pendingCount), color: '#fb923c', icon: '⏳' },
          { label: 'Números vendidos', value: String(soldCount), color: '#f87171', icon: '🔴' },
          { label: 'Apartados', value: String(reservedCount), color: '#fbbf24', icon: '🟡' },
          { label: 'Participantes', value: String(participants.length), color: '#818cf8', icon: '👥' },
        ].map(s => (
          <div key={s.label} className="flex-shrink-0 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', minWidth: 140 }}>
            <div className="text-sm mb-0.5">{s.icon}</div>
            <div className="font-700 text-base" style={{ color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
            <div className="text-xs" style={{ color: 'rgba(224,220,255,0.4)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {([['payments', '💳 Pagos'], ['tickets', '🎟️ Tickets'], ['participants', '👥 Participantes'], ['helpers', '🤝 Familiares']] as [AdminTab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className="px-3 py-2 rounded-lg text-xs font-500 transition-all" style={{ background: tab === t ? 'rgba(99,102,241,0.2)' : 'transparent', color: tab === t ? '#a5b4fc' : 'rgba(224,220,255,0.4)', border: tab === t ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {tab === 'payments' && (
          <PaymentsTab payments={filteredPayments} filter={filter} onFilter={setFilter} onUpdate={onUpdatePayment} />
        )}
        {tab === 'tickets' && (
          <TicketsTab tickets={tickets} participants={participants} helpers={helpers} onDelete={onDeleteTicket} />
        )}
        {tab === 'participants' && (
          <ParticipantsTab participants={participants} tickets={tickets} onDelete={onDeleteParticipant} />
        )}
        {tab === 'helpers' && (
          <HelpersTab helpers={helpers} tickets={tickets} onAdd={onAddHelper} onDelete={onDeleteHelper} />
        )}
      </div>
    </div>
  )
}

// ── Panel del familiar: SOLO sus propios compradores/prospectos ──
function HelperPanel({ helper, tickets, payments, participants, onUpdatePayment, onDeleteParticipant, onClose }: {
  helper?: Helper
  tickets: Ticket[]
  payments: Payment[]
  participants: Participant[]
  onUpdatePayment: (id: string, status: 'approved' | 'rejected') => void
  onDeleteParticipant: (id: string) => Promise<{ success: boolean; error?: string }>
  onClose: () => void
}) {
  if (!helper) return null

  // Tickets vendidos por este familiar (referred_by = su id)
  const myTicketIds = new Set(tickets.filter(t => t.referred_by === helper.id).map(t => t.id))
  // Los números que vendió, por participante
  const byParticipant = new Map<string, Ticket[]>()
  for (const t of tickets) {
    if (!t.referred_by || t.referred_by !== helper.id) continue
    if (!t.participant_id) continue
    const arr = byParticipant.get(t.participant_id) ?? []
    arr.push(t)
    byParticipant.set(t.participant_id, arr)
  }

  const myPayments = payments.filter(p => p.ticket_ids.some(id => myTicketIds.has(id)))
  const paidCount = Array.from(byParticipant.values()).flat().filter(t => t.status === 'paid').length
  const reservedCount = Array.from(byParticipant.values()).flat().filter(t => t.status === 'reserved').length

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#09071a' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0f0c28' }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">🤝</span>
          <div>
            <h1 className="text-base font-700" style={{ fontFamily: 'var(--font-display)', color: '#f0eeff' }}>
              {helper.first_name} {helper.last_name}
            </h1>
            <p className="text-xs" style={{ color: 'rgba(224,220,255,0.4)' }}>Mis compradores — Rifas Pro Salud</p>
          </div>
        </div>
        <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(224,220,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          ← Volver a la rifa
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 px-6 py-4 overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {[
          { label: 'Mis vendidos', value: String(paidCount), color: '#4ade80', icon: '🟢' },
          { label: 'Apartados', value: String(reservedCount), color: '#fbbf24', icon: '🟡' },
          { label: 'Mis compradores', value: String(byParticipant.size), color: '#818cf8', icon: '👥' },
        ].map(s => (
          <div key={s.label} className="flex-shrink-0 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', minWidth: 130 }}>
            <div className="text-sm mb-0.5">{s.icon}</div>
            <div className="font-700 text-base" style={{ color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
            <div className="text-xs" style={{ color: 'rgba(224,220,255,0.4)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Lista de compradores */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {byParticipant.size === 0 && (
          <div className="text-center py-12 text-xs" style={{ color: 'rgba(224,220,255,0.3)' }}>
            Aún no tienes compradores. Comparte tu enlace para empezar a vender.
          </div>
        )}

        <div className="flex flex-col gap-3">
          {Array.from(byParticipant.entries()).map(([pid, tks]) => {
            const participant = participants.find(p => p.id === pid)
            const payment = myPayments.find(p => p.participant_id === pid)
            const paid = tks.every(t => t.status === 'paid')
            const reserved = tks.some(t => t.status === 'reserved')
            const rejected = payment?.status === 'rejected'

            return (
              <div key={pid} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-600 text-sm" style={{ color: '#e8e4ff', fontFamily: 'var(--font-body)' }}>
                        {participant?.first_name} {participant?.last_name}
                      </span>
                      {paid ? <StatusBadge status="paid" /> : rejected ? <StatusBadge status="rejected" /> : reserved ? <StatusBadge status="reserved" /> : <StatusBadge status="pending" />}
                    </div>
                    <div className="text-xs mb-2" style={{ color: 'rgba(224,220,255,0.4)', fontFamily: 'var(--font-body)' }}>
                      📱 {participant?.whatsapp} · {formatDate(participant?.created_at ?? '')}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {tks.map(t => (
                        <span key={t.id} className="rounded px-1.5 py-0.5 text-xs font-700" style={{ background: t.status === 'paid' ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.12)', color: t.status === 'paid' ? '#4ade80' : '#fbbf24', fontFamily: 'var(--font-mono)', border: t.status === 'paid' ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(251,191,36,0.2)' }}>
                          {String(t.ticket_number).padStart(3, '0')}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs" style={{ color: 'rgba(224,220,255,0.55)' }}>
                      💳 Código de pago del comprador:{' '}
                      <strong style={{ color: '#f5a623', fontFamily: 'var(--font-mono)' }}>{payment?.payment_code || '—'}</strong>
                    </div>
                    <p className="text-[11px] mt-1.5" style={{ color: 'rgba(224,220,255,0.35)' }}>
                      Comparte este código SOLO cuando el comprador te envíe la captura del pago por WhatsApp.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {payment && payment.status === 'pending' && (
                      <>
                        <button onClick={() => onUpdatePayment(payment.id, 'approved')} className="px-3 py-1.5 rounded-lg text-xs font-600" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                          ✓ Marcar pagado
                        </button>
                        <button onClick={() => onUpdatePayment(payment.id, 'rejected')} className="px-3 py-1.5 rounded-lg text-xs font-600" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                          ✗ Liberar
                        </button>
                      </>
                    )}
                    <DeleteButton onDelete={() => onDeleteParticipant(pid)} label="comprador" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PaymentsTab({ payments, filter, onFilter, onUpdate }: { payments: Payment[], filter: string, onFilter: (f: any) => void, onUpdate: (id: string, s: 'approved' | 'rejected') => void }) {
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => onFilter(f)} className="px-3 py-1.5 rounded-lg text-xs capitalize" style={{ background: filter === f ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', color: filter === f ? '#a5b4fc' : 'rgba(224,220,255,0.5)', border: filter === f ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobados' : 'Rechazados'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {payments.length === 0 && (
          <div className="text-center py-12" style={{ color: 'rgba(224,220,255,0.3)', fontFamily: 'var(--font-body)' }}>
            No hay pagos para mostrar
          </div>
        )}
        {payments.map(p => (
          <div key={p.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-600 text-sm" style={{ color: '#e8e4ff', fontFamily: 'var(--font-body)' }}>
                    {p.participant?.first_name} {p.participant?.last_name}
                  </span>
                  <StatusBadge status={p.status} />
                </div>
                <div className="text-xs mb-2" style={{ color: 'rgba(224,220,255,0.4)', fontFamily: 'var(--font-body)' }}>
                  📱 {p.participant?.whatsapp} · {formatDate(p.created_at)}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(p.ticket_numbers || []).map(n => (
                    <span key={n} className="rounded px-1.5 py-0.5 text-xs font-700" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontFamily: 'var(--font-mono)', border: '1px solid rgba(99,102,241,0.2)' }}>
                      {String(n).padStart(3, '0')}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(224,220,255,0.5)' }}>
                  <span>Total: <strong style={{ color: '#4ade80' }}>{formatCurrency(p.amount_paid)}</strong></span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px]" style={{ color: 'rgba(224,220,255,0.45)' }}>Código de confirmación:</span>
                  <code className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(245,166,35,0.12)', color: '#f5a623', fontFamily: 'var(--font-mono)', border: '1px solid rgba(245,166,35,0.25)' }}>{p.payment_code}</code>
                  <button onClick={() => { navigator.clipboard.writeText(p.payment_code || ''); alert('✓ Código copiado al portapapeles') }} className="px-2 py-1 rounded text-[11px] flex-shrink-0" style={{ background: 'rgba(245,166,35,0.15)', color: '#fbbf24', border: '1px solid rgba(245,166,35,0.3)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    📋 Copiar
                  </button>
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'rgba(224,220,255,0.3)' }}>
                  Compartilo SOLO cuando el comprador envíe la captura del pago por WhatsApp.
                </p>
              </div>
              {p.status === 'pending' && (
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => onUpdate(p.id, 'approved')} className="px-3 py-1.5 rounded-lg text-xs font-600" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    ✓ Aprobar
                  </button>
                  <button onClick={() => onUpdate(p.id, 'rejected')} className="px-3 py-1.5 rounded-lg text-xs font-600" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    ✗ Rechazar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TicketsTab({ tickets, participants, helpers, onDelete }: { tickets: Ticket[], participants: Participant[], helpers: Helper[], onDelete: (id: string) => Promise<{ success: boolean; error?: string }> }) {
  const [search, setSearch] = useState('')
  const filtered = tickets.filter(t => {
    if (!search) return true
    const p = participants.find(p => p.id === t.participant_id)
    const h = helpers.find(h => h.id === t.referred_by)
    const query = search.toLowerCase()
    return (
      String(t.ticket_number).padStart(3, '0').includes(query) ||
      p?.first_name.toLowerCase().includes(query) ||
      p?.last_name.toLowerCase().includes(query) ||
      p?.whatsapp.includes(query) ||
      h?.first_name.toLowerCase().includes(query) ||
      t.payment_code?.toLowerCase().includes(query)
    )
  })

  return (
    <div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por número, nombre, WhatsApp, familiar o código..."
        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none mb-4"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e4ff', fontFamily: 'var(--font-body)' }}
      />
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              {['#', 'Estado', 'Participante', 'WhatsApp', 'Familiar', 'Código', 'Fecha', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-600" style={{ color: 'rgba(224,220,255,0.5)', fontFamily: 'var(--font-body)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => {
              const p = participants.find(pt => pt.id === t.participant_id)
              const h = helpers.find(hl => hl.id === t.referred_by)
              return (
                <tr key={t.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td className="px-4 py-3 font-700" style={{ color: '#e8e4ff', fontFamily: 'var(--font-mono)' }}>
                    {String(t.ticket_number).padStart(3, '0')}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-xs" style={{ color: p ? '#e8e4ff' : 'rgba(224,220,255,0.3)' }}>
                    {p ? `${p.first_name} ${p.last_name}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'rgba(224,220,255,0.5)', fontFamily: 'var(--font-mono)' }}>
                    {p?.whatsapp || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: h ? '#4ade80' : 'rgba(224,220,255,0.3)' }}>
                    {h ? `🤝 ${h.first_name} ${h.last_name}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#f5a623', fontFamily: 'var(--font-mono)' }}>
                    {t.payment_code || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'rgba(224,220,255,0.4)' }}>
                    {t.status !== 'available' ? formatDate(t.created_at) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <DeleteButton onDelete={() => onDelete(t.id)} label="Ticket" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    available: { color: '#4ade80', bg: 'rgba(34,197,94,0.1)', label: 'Disponible' },
    reserved:  { color: '#fb923c', bg: 'rgba(249,115,22,0.1)', label: 'Apartado' },
    paid:      { color: '#f87171', bg: 'rgba(239,68,68,0.1)', label: 'Vendido' },
    pending:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', label: 'Pendiente' },
    approved:  { color: '#4ade80', bg: 'rgba(34,197,94,0.1)', label: 'Aprobado' },
    rejected:  { color: '#f87171', bg: 'rgba(239,68,68,0.1)', label: 'Rechazado' },
  }
  const s = map[status] || map.available
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-500" style={{ color: s.color, background: s.bg, fontFamily: 'var(--font-body)' }}>
      {s.label}
    </span>
  )
}

function DeleteButton({ onDelete, label }: { onDelete: () => Promise<{ success: boolean; error?: string } | void>, label: string }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const run = async () => {
    setBusy(true)
    setMsg('')
    const res = await onDelete()
    if (res && !res.success) setMsg(res.error || 'Error')
    else setConfirming(false)
    setBusy(false)
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="px-2.5 py-1.5 rounded-lg text-xs font-600"
        style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        title={`Eliminar ${label}`}
      >
        🗑️
      </button>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={run}
        disabled={busy}
        className="px-2.5 py-1.5 rounded-lg text-xs font-700"
        style={{ background: '#ef4444', color: '#fff', border: 'none', cursor: busy ? 'wait' : 'pointer', fontFamily: 'var(--font-body)' }}
      >
        {busy ? '...' : 'Confirmar'}
      </button>
      <button
        onClick={() => { setConfirming(false); setMsg('') }}
        className="px-2 py-1.5 rounded-lg text-xs"
        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(224,220,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
      >
        Cancelar
      </button>
      {msg && <span className="text-xs" style={{ color: '#fca5a5' }}>{msg}</span>}
    </div>
  )
}

function ParticipantsTab({ participants, tickets, onDelete }: { participants: Participant[], tickets: Ticket[], onDelete: (id: string) => Promise<{ success: boolean; error?: string }> }) {
  return (
    <div>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              {['Nombre', 'WhatsApp', 'Números', 'Vendidos', 'Fecha', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-600" style={{ color: 'rgba(224,220,255,0.5)', fontFamily: 'var(--font-body)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {participants.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs" style={{ color: 'rgba(224,220,255,0.3)' }}>Aún no hay participantes</td></tr>
            )}
            {participants.map((p, i) => {
              const own = tickets.filter(t => t.participant_id === p.id)
              const paidCount = own.filter(t => t.status === 'paid').length
              return (
                <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td className="px-4 py-3 text-sm" style={{ color: '#e8e4ff' }}>
                    {p.first_name} {p.last_name}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'rgba(224,220,255,0.5)', fontFamily: 'var(--font-mono)' }}>{p.whatsapp}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'rgba(224,220,255,0.6)', fontFamily: 'var(--font-mono)' }}>
                    {own.map(t => String(t.ticket_number).padStart(3, '0')).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-600" style={{ color: paidCount > 0 ? '#4ade80' : '#fbbf24' }}>{own.length > 0 ? `${paidCount}/${own.length}` : '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'rgba(224,220,255,0.4)' }}>{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3"><DeleteButton onDelete={() => onDelete(p.id)} label="participante" /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HelpersTab({ helpers, tickets, onAdd, onDelete }: { helpers: Helper[], tickets: Ticket[], onAdd: (d: { first_name: string; last_name: string; whatsapp: string; password: string }) => Promise<{ success: boolean; error?: string }>, onDelete: (id: string) => Promise<{ success: boolean; error?: string }> }) {
  const [first_name, setFirstName] = useState('')
  const [last_name, setLastName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!first_name.trim() || !last_name.trim() || !whatsapp.trim()) {
      setMsg('Completa nombre, apellido y celular.')
      return
    }
    if (!password.trim()) {
      setMsg('Asigna una contraseña para que pueda ingresar.')
      return
    }
    setBusy(true)
    setMsg('')
    const res = await onAdd({ first_name: first_name.trim(), last_name: last_name.trim(), whatsapp: whatsapp.trim(), password: password.trim() })
    setBusy(false)
    if (!res.success) setMsg(res.error || 'Error al guardar')
    else {
      setFirstName(''); setLastName(''); setWhatsapp(''); setPassword('')
      setMsg('✅ Familiar/amigo creado. Compartile su enlace y su contraseña.')
    }
  }

  const baseUrl = `${window.location.origin}${window.location.pathname}`

  return (
    <div className="flex flex-col gap-6">
      {/* Formulario */}
      <form onSubmit={handleAdd} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h3 className="text-sm font-700 mb-3" style={{ fontFamily: 'var(--font-display)', color: '#f0eeff' }}>
          🤝 Nuevo familiar / amigo
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            value={first_name} onChange={e => setFirstName(e.target.value)} placeholder="Nombre"
            className="rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e4ff', fontFamily: 'var(--font-body)' }}
          />
          <input
            value={last_name} onChange={e => setLastName(e.target.value)} placeholder="Apellido"
            className="rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e4ff', fontFamily: 'var(--font-body)' }}
          />
        </div>
        <input
          value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Celular / WhatsApp (ej: +51987654321)"
          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none mb-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e4ff', fontFamily: 'var(--font-mono)' }}
        />
        <input
          type="password"
          value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña de acceso (se la das al familiar)"
          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none mb-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e4ff', fontFamily: 'var(--font-mono)' }}
        />
        {msg && <p className="text-xs mb-3" style={{ color: msg.startsWith('✅') ? '#4ade80' : '#fca5a5' }}>{msg}</p>}
        <button type="submit" disabled={busy} className="rounded-xl py-2.5 text-sm font-600" style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)', color: '#062b10', border: 'none', cursor: busy ? 'wait' : 'pointer', fontFamily: 'var(--font-body)' }}>
          {busy ? 'Guardando...' : 'Crear y generar su enlace'}
        </button>
      </form>

      {/* Lista */}
      <div className="flex flex-col gap-3">
        {helpers.length === 0 && (
          <div className="text-center py-8 text-xs" style={{ color: 'rgba(224,220,255,0.3)' }}>Aún no hay familiares/amigos registrados</div>
        )}
        {helpers.map(h => {
          const soldCount = tickets.filter(t => t.referred_by === h.id && t.status === 'paid').length
          const reservedCount = tickets.filter(t => t.referred_by === h.id && t.status === 'reserved').length
          const link = `${baseUrl}?ref=${h.link_token}`
          return (
            <div key={h.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-600 text-sm" style={{ color: '#e8e4ff', fontFamily: 'var(--font-body)' }}>🤝 {h.first_name} {h.last_name}</span>
                    <span className="text-xs" style={{ color: 'rgba(224,220,255,0.4)', fontFamily: 'var(--font-mono)' }}>{h.whatsapp}</span>
                  </div>
                  <div className="flex gap-3 text-xs mb-2" style={{ color: 'rgba(224,220,255,0.5)' }}>
                    <span>🟢 Vendidos: <strong style={{ color: '#4ade80' }}>{soldCount}</strong></span>
                    <span>🟡 Apartados: <strong style={{ color: '#fbbf24' }}>{reservedCount}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code style={{ color: '#a5b4fc', fontFamily: 'var(--font-mono)', fontSize: 11, wordBreak: 'break-all' }}>{link}</code>
                    <button onClick={() => { navigator.clipboard.writeText(link); alert('✓ Enlace copiado al portapapeles') }} className="px-2 py-1 rounded text-xs flex-shrink-0" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                      📋 Copiar
                    </button>
                  </div>
                </div>
                <DeleteButton onDelete={() => onDelete(h.id)} label="familiar" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
