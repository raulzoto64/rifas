import { useCallback, useEffect, useState } from 'react'
import type {
  Raffle,
  Ticket,
  Participant,
  Payment,
  Helper,
  ReservePayload,
  ConfirmPaymentPayload,
} from '../types'
import { supabase } from '../lib/supabase'

const RAFFLE_SLUG = 'rifa-pro-salud'
const STORAGE_KEY = 'rifas_pro_salud_whatsapp'
const CLIENT_CODE_KEY = 'rifas_pro_salud_client_code'
const REF_KEY = 'rifas_pro_salud_referrer'
const LAST_PAYMENT_CODE_KEY = 'rifas_pro_salud_last_payment_code'

type Result = { success: boolean; error?: string }

// Estado de identidad del visitante
export type IdentityState = 'checking' | 'unknown' | 'new' | 'recognized'

// Perfil del participante identificado
export interface ParticipantProfile {
  participant: Participant
  // Todos sus datos en la rifa actual
  reservedNumbers: number[] // apartados pendientes de pago (sin código)
  pendingNumbers: number[] // apartados con pago pendiente (con código, sin verificar)
  paidNumbers: number[] // pagados/confirmados
  // Todas sus participaciones en rifas (historial)
  raffleHistory: Array<{
    raffleId: string
    title: string
    status: string
    paidNumbers: number[]
    pendingNumbers: number[]
  }>
}

// ── Generar código de pago único y legible (ej: RPS-4F7K2) ───
async function generateUniqueCode(client: ReturnType<typeof supabase>, raffleId?: string): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = 'RPS-'
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    let exists = false
    if (raffleId) {
      const { data } = await client
        .from('payments')
        .select('id')
        .eq('payment_code', code)
        // .eq('raffle_id', raffleId)
        .maybeSingle()
      if (data) exists = true
    }
    if (!exists) return code
  }
  throw new Error('No se pudo generar un código de pago único.')
}

export function useRaffleStore() {
  const [raffle, setRaffle] = useState<Raffle | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [helpers, setHelpers] = useState<Helper[]>([])
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null)
  const [profile, setProfile] = useState<ParticipantProfile | null>(null)
  const [checkingProfile, setCheckingProfile] = useState(false)
  const [identity, setIdentity] = useState<IdentityState>('checking')

  // Código interno persistente del dispositivo (se guarda en localStorage)
  function getOrCreateClientCode(): string {
    let code = localStorage.getItem(CLIENT_CODE_KEY)
    if (!code) {
      code = crypto.randomUUID()
      localStorage.setItem(CLIENT_CODE_KEY, code)
    }
    return code
  }

  // ── Carga inicial desde Supabase ───────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)

        const client = supabase()

        // 1. Rifa activa
        const { data: raffleData, error: raffleError } = await client
          .from('raffles')
          .select('*')
          .eq('slug', RAFFLE_SLUG)
          .maybeSingle()
        if (raffleError) throw raffleError
        if (!raffleData) throw new Error(`No se encontró la rifa '${RAFFLE_SLUG}'. Revisá el seed en database/schema.sql.`)
        if (cancelled) return

        // 2. Participantes
        const { data: participantsData, error: participantsError } = await client
          .from('participants')
          .select('*')
          .order('created_at')
        if (participantsError) throw participantsError

        // 3. Tickets
        const { data: ticketsData, error: ticketsError } = await client
          .from('tickets')
          .select('*')
          .eq('raffle_id', raffleData.id)
          .order('ticket_number')
        if (ticketsError) throw ticketsError

        // 4. Pagos
        const { data: paymentsData, error: paymentsError } = await client
          .from('payments')
          .select('*')
          .eq('raffle_id', raffleData.id)
          .order('created_at')
        if (paymentsError) throw paymentsError

        // 5. Familiares/amigos (colaboradores con enlace)
        const { data: helpersData, error: helpersError } = await client
          .from('helpers')
          .select('*')
          .order('created_at')
        if (helpersError) throw helpersError

        // Capturar enlace de referido (?ref=...) y recordar el colaborador
        const params = new URLSearchParams(window.location.search)
        const refToken = params.get('ref')
        if (refToken) {
          const matched = (helpersData ?? []).find((h) => h.link_token === refToken)
          if (matched) localStorage.setItem(REF_KEY, matched.id)
          else localStorage.removeItem(REF_KEY)
        }

        if (cancelled) return

        const parts = (participantsData ?? []) as Participant[]
        const tks = (ticketsData ?? []) as Ticket[]
        const pys = (paymentsData ?? []).map((p) => ({
          ...(p as Payment),
          participant: parts.find((pt) => pt.id === p.participant_id),
        }))

        setRaffle(raffleData as Raffle)
        setParticipants(parts)
        setTickets(tks)
        setPayments(pys)
        setHelpers((helpersData ?? []) as Helper[])
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Error al cargar los datos.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // ── Construir perfil a partir de un participante ────────────────
  const buildProfile = useCallback(
    async (participant: Participant): Promise<ParticipantProfile | null> => {
      const client = supabase()
      try {
        const { data: myTickets, error: tErr } = await client
          .from('tickets')
          .select('id, raffle_id, ticket_number, status, payment_code')
          .eq('participant_id', participant.id)
        if (tErr) throw tErr

        const all = (myTickets ?? []) as Array<{
          id: string
          raffle_id: string
          ticket_number: number
          status: string
          payment_code: string | null
        }>
        const currentRaffleTickets = all.filter((t) => t.raffle_id === raffle?.id)

        const reservedNumbers = currentRaffleTickets
          .filter((t) => t.status === 'reserved' && !t.payment_code)
          .map((t) => t.ticket_number)
        const pendingNumbers = currentRaffleTickets
          .filter((t) => t.status === 'reserved' && t.payment_code)
          .map((t) => t.ticket_number)
        const paidNumbers = currentRaffleTickets
          .filter((t) => t.status === 'paid')
          .map((t) => t.ticket_number)

        // Historial por rifa
        const byRaffle = new Map<
          string,
          { raffleId: string; title: string; status: string; paid: number[]; pending: number[] }
        >()
        for (const t of all) {
          const g = byRaffle.get(t.raffle_id) ?? {
            raffleId: t.raffle_id,
            title: 'Rifa',
            status: 'active',
            paid: [],
            pending: [],
          }
          if (t.status === 'paid') g.paid.push(t.ticket_number)
          else g.pending.push(t.ticket_number)
          byRaffle.set(t.raffle_id, g)
        }
        if (byRaffle.size > 0) {
          const { data: allRaffles, error: rErr } = await client
            .from('raffles')
            .select('id, title, status')
            .in('id', Array.from(byRaffle.keys()))
          if (rErr) throw rErr
          for (const g of byRaffle.values()) {
            const r = (allRaffles ?? []).find((x: { id: string }) => x.id === g.raffleId)
            if (r) {
              g.title = r.title
              g.status = r.status
            }
          }
        }

        return {
          participant,
          reservedNumbers,
          pendingNumbers,
          paidNumbers,
          raffleHistory: Array.from(byRaffle.values()).map((g) => ({
            raffleId: g.raffleId,
            title: g.title,
            status: g.status,
            paidNumbers: g.paid.sort((a, b) => a - b),
            pendingNumbers: g.pending.sort((a, b) => a - b),
          })),
        }
      } catch (err) {
        console.error(err)
        return null
      }
    },
    [raffle]
  )

  // ── Reconocimiento por código interno del dispositivo ───────────
  const recognizeByCode = useCallback(async (): Promise<boolean> => {
    const code = localStorage.getItem(CLIENT_CODE_KEY)
    if (!code) return false
    try {
      const client = supabase()
      const { data: participant, error } = await client
        .from('participants')
        .select('*')
        .eq('client_code', code)
        .maybeSingle()
      if (error || !participant) return false

      const prof = await buildProfile(participant as Participant)
      if (!prof) return false

      setCurrentParticipant(participant as Participant)
      setProfile(prof)
      setIdentity('recognized')
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }, [buildProfile])

  // ── Restaurar sesión por código interno (en cada carga) ───────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // 1º intentar reconocer por código
      const ok = await recognizeByCode()
      if (cancelled) return
      // 2ª también probar el whatsapp guardado (método antiguo/compat)
      if (!ok) {
        const savedWhatsapp = localStorage.getItem(STORAGE_KEY)
        if (savedWhatsapp) {
          const result = await identifyByWhatsapp(savedWhatsapp)
          if (cancelled) return
          if (result && result.participant.id) {
            setIdentity('recognized')
            return
          }
        }
        setIdentity('unknown')
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Identidad por WhatsApp (opción "ya ingresé antes") ─────────
  const identifyByWhatsapp = useCallback(
    async (whatsapp: string): Promise<ParticipantProfile | null> => {
      setCheckingProfile(true)
      try {
        const client = supabase()
        const { data: participant, error: pErr } = await client
          .from('participants')
          .select('*')
          .eq('whatsapp', whatsapp)
          .maybeSingle()
        if (pErr) throw pErr

        if (!participant) {
          // No existe → es primera vez (se guarda el WhatsApp para el próximo registro)
          localStorage.setItem(STORAGE_KEY, whatsapp)
          setProfile(null)
          return null
        }

        // Habitual: vincular este dispositivo al participante
        const code = getOrCreateClientCode()
        const { error: upErr } = await client
          .from('participants')
          .update({ client_code: code })
          .eq('id', participant.id)
        if (upErr) throw upErr

        const prof = await buildProfile(participant as Participant)
        if (prof) {
          setCurrentParticipant(participant as Participant)
          setProfile(prof)
          setIdentity('recognized')
          localStorage.setItem(STORAGE_KEY, whatsapp)
        }
        return prof
      } catch (err) {
        console.error(err)
        return null
      } finally {
        setCheckingProfile(false)
      }
    },
    [buildProfile]
  )

  // ── Respuesta del modal "¿nuevo o ya ingresaste?" ───────────────
  const setIdentityAnswer = useCallback(
    (answer: 'new' | 'existing') => {
      if (answer === 'new') {
        setIdentity('new')
        // Guardar el código interno ya asignado (es la primera visita)
        getOrCreateClientCode()
      }
      // 'existing' → se deja en 'unknown' hasta que vincule el WhatsApp
    },
    []
  )

  const clearIdentity = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setCurrentParticipant(null)
    setProfile(null)
    setIdentity('unknown')
  }, [])

  const toggleNumber = useCallback(
    (num: number) => {
      const ticket = tickets.find((t) => t.ticket_number === num)
      if (!ticket || ticket.status !== 'available') return
      setSelectedNumbers((prev) =>
        prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
      )
    },
    [tickets]
  )

  const clearSelection = useCallback(() => setSelectedNumbers([]), [])

  // ── STEP 1 — Reservar números (datos personales, sin código) ───
  const reserveNumbers = useCallback(
    async (payload: ReservePayload): Promise<Result> => {
      try {
        const client = supabase()

        // Validar disponibilidad
        const { data: liveTickets, error: liveError } = await client
          .from('tickets')
          .select('id, ticket_number, status')
          .eq('raffle_id', payload.raffle_id)
          .in('ticket_number', payload.ticket_numbers)
        if (liveError) throw liveError

        const unavailable = (liveTickets ?? []).filter((t) => t.status !== 'available')
        if (unavailable.length > 0) {
          return {
            success: false,
            error: `Los números ${unavailable.map((t) => t.ticket_number).join(', ')} ya no están disponibles.`,
          }
        }

        // Upsert participante por whatsapp
        let participantId: string
        const { data: existing, error: findError } = await client
          .from('participants')
          .select('id')
          .eq('whatsapp', payload.whatsapp)
          .maybeSingle()
        if (findError) throw findError

        if (existing) {
          participantId = existing.id
        } else {
          const { data: created, error: insertError } = await client
            .from('participants')
            .insert({
              first_name: payload.first_name,
              last_name: payload.last_name,
              whatsapp: payload.whatsapp,
              client_code: getOrCreateClientCode(),
            })
            .select('id')
            .single()
          if (insertError) throw insertError
          participantId = created.id
        }

        // -- Generar el código único de pago de esta venta -------------
        // Se crea en el momento del pedido y se le comparte al comprador
        // SOLO cuando ya envió la captura del pago por WhatsApp.
        const ticketIds = (liveTickets ?? []).map((t) => t.id)
        const code = await generateUniqueCode(client, raffle?.id)

        // Marcar tickets como reservados (vinculando al familiar/amigo referente)
        const referredBy = localStorage.getItem(REF_KEY) ?? undefined
        const { error: ticketError } = await client
          .from('tickets')
          .update({
            status: 'reserved',
            participant_id: participantId,
            payment_code: null,
            referred_by: referredBy,
          })
          .eq('raffle_id', payload.raffle_id)
          .in('ticket_number', payload.ticket_numbers)
        if (ticketError) throw ticketError

        // Crear el pago pendiente con su código de confirmación único
        const { data: payment, error: payError } = await client
          .from('payments')
          .insert({
            raffle_id: payload.raffle_id,
            ticket_ids: ticketIds,
            participant_id: participantId,
            payment_code: code,
            status: 'pending',
            amount_paid: payload.ticket_numbers.length * (raffle?.ticket_price ?? 0),
          })
          .select()
          .single()
        if (payError) throw payError

        // Refrescar estado local
        const participant = (await client
          .from('participants')
          .select('*')
          .eq('id', participantId)
          .single()) as unknown as Participant
        const newTickets = [...tickets]
        for (const n of payload.ticket_numbers) {
          const t = newTickets.find((tk) => tk.ticket_number === n)
          if (t) {
            t.status = 'reserved'
            t.participant_id = participantId
            t.payment_code = undefined
          }
        }
        setTickets(newTickets)
        setPayments((prev) => [
          ...prev,
          { ...(payment as Payment), participant },
        ])
        setSelectedNumbers([])

        // Guardar el código de la venta para mostrarlo al familiar/admin
        localStorage.setItem(LAST_PAYMENT_CODE_KEY, code)

        // Guardar identidad + refrescar perfil del participante
        localStorage.setItem(STORAGE_KEY, payload.whatsapp)
        setCurrentParticipant(participant)
        setIdentity('recognized')
        const updatedProfile = await buildProfile(participant)
        if (updatedProfile) setProfile(updatedProfile)

        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Error al reservar los números.',
        }
      }
    },
    [tickets, raffle, buildProfile]
  )

  // ── STEP 2 — Confirmar pago (el comprador ingresa el código único) ──
  const confirmPayment = useCallback(
    async (payload: ConfirmPaymentPayload): Promise<Result> => {
      try {
        const client = supabase()
        const ticketNumbers = payload.ticket_numbers
        const reservedTicketIds = tickets
          .filter((t) => ticketNumbers.includes(t.ticket_number))
          .map((t) => t.id)

        // Encontrar la reserva pendiente que cubra esos números
        const matchingPayment = payments.find(
          (p) =>
            p.status === 'pending' &&
            reservedTicketIds.length > 0 &&
            reservedTicketIds.every((id) => p.ticket_ids.includes(id))
        )
        if (!matchingPayment) {
          return { success: false, error: 'No se encontró la reserva correspondiente.' }
        }

        // El código es único por venta: debe coincidir exactamente.
        // El familiar/admin se lo comparte tras ver la captura del pago.
        if (payload.payment_code !== matchingPayment.payment_code) {
          return {
            success: false,
            error: 'El código no coincide con el de tu pedido. Verificalo con tu vendedor.',
          }
        }

        // Marcar pagos como pagados
        const { error: payError } = await client
          .from('payments')
          .update({ status: 'approved' })
          .eq('id', matchingPayment.id)
        if (payError) throw payError

        // Marcar tickets como pagados
        const { error: ticketError } = await client
          .from('tickets')
          .update({ status: 'paid', payment_code: matchingPayment.payment_code })
          .eq('raffle_id', raffle!.id)
          .in('ticket_number', ticketNumbers)
        if (ticketError) throw ticketError

        setPayments((prev) =>
          prev.map((p) =>
            p.id === matchingPayment.id ? { ...p, status: 'approved' } : p
          )
        )
        setTickets((prev) =>
          prev.map((t) =>
            ticketNumbers.includes(t.ticket_number)
              ? { ...t, status: 'paid', payment_code: matchingPayment.payment_code }
              : t
          )
        )
        localStorage.removeItem(LAST_PAYMENT_CODE_KEY)

        // Refrescar perfil si hay sesión activa
        if (currentParticipant) {
          const updatedProfile = await buildProfile(currentParticipant)
          if (updatedProfile) setProfile(updatedProfile)
        }

        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Error al confirmar el pago.',
        }
      }
    },
    [payments, tickets, raffle, currentParticipant, buildProfile]
  )

  const updatePaymentStatus = useCallback(
    async (paymentId: string, status: 'approved' | 'rejected') => {
      try {
        const client = supabase()
        const payment = payments.find((p) => p.id === paymentId)
        if (!payment) return

        const { error: payError } = await client
          .from('payments')
          .update({ status })
          .eq('id', paymentId)
        if (payError) throw payError

        const newTicketStatus = status === 'approved' ? 'paid' : 'available'
        const { error: ticketError } = await client
          .from('tickets')
          .update({
            status: newTicketStatus,
            participant_id: status === 'rejected' ? null : undefined,
            payment_code: status === 'rejected' ? null : undefined,
          })
          .in('id', payment.ticket_ids)
        if (ticketError) throw ticketError

        setPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? { ...p, status } : p))
        )
        setTickets((prev) =>
          prev.map((t) => {
            if (!payment.ticket_ids.includes(t.id)) return t
            return {
              ...t,
              status: newTicketStatus,
              participant_id: status === 'rejected' ? undefined : t.participant_id,
              payment_code: status === 'rejected' ? undefined : t.payment_code,
            }
          })
        )
      } catch (err) {
        console.error(err)
      }
    },
    [payments]
  )

  // ── Admin: agregar familiar/amigo con su enlace personal ──────
  const addHelper = useCallback(
    async (data: { first_name: string; last_name: string; whatsapp: string; password: string }): Promise<Result> => {
      try {
        const client = supabase()
        const linkToken = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
        const { data: created, error } = await client
          .from('helpers')
          .insert({ ...data, link_token: linkToken })
          .select()
          .single()
        if (error) throw error
        setHelpers((prev) => [...prev, created as Helper])
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Error al agregar el familiar/amigo.',
        }
      }
    },
    []
  )

  // ── Admin: eliminar un familiar/amigo (libera sus referidos) ──
  const deleteHelper = useCallback(
    async (helperId: string): Promise<Result> => {
      try {
        const client = supabase()
        const { error: ticketRefError } = await client
          .from('tickets')
          .update({ referred_by: null })
          .eq('referred_by', helperId)
        if (ticketRefError) throw ticketRefError
        const { error } = await client.from('helpers').delete().eq('id', helperId)
        if (error) throw error
        setHelpers((prev) => prev.filter((h) => h.id !== helperId))
        setTickets((prev) =>
          prev.map((t) => (t.referred_by === helperId ? { ...t, referred_by: undefined } : t))
        )
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Error al eliminar el familiar/amigo.',
        }
      }
    },
    []
  )

  // ── Admin: eliminar participante (libera sus números y eliminás pagos) ──
  const deleteParticipant = useCallback(
    async (participantId: string): Promise<Result> => {
      try {
        const client = supabase()
        // Poner sus números como disponibles
        const { error: ticketError } = await client
          .from('tickets')
          .update({ status: 'available', participant_id: null, payment_code: null })
          .eq('participant_id', participantId)
        if (ticketError) throw ticketError
        // Eliminar sus pagos
        const { error: payError } = await client
          .from('payments')
          .delete()
          .eq('participant_id', participantId)
        if (payError) throw payError
        // Eliminar participante
        const { error: delError } = await client
          .from('participants')
          .delete()
          .eq('id', participantId)
        if (delError) throw delError

        setParticipants((prev) => prev.filter((p) => p.id !== participantId))
        setTickets((prev) =>
          prev.map((t) =>
            t.participant_id === participantId
              ? { ...t, status: 'available', participant_id: undefined, payment_code: undefined }
              : t
          )
        )
        setPayments((prev) => prev.filter((p) => p.participant_id !== participantId))
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Error al eliminar el participante.',
        }
      }
    },
    []
  )

  // ── Admin: liberar un número ─────────────────────────────────
  // Los números de la rifa NUNCA se borran: al liberarlos quedan
  // de nuevo disponibles para que otro comprador los aparte.
  const deleteTicket = useCallback(
    async (ticketId: string): Promise<Result> => {
      try {
        const client = supabase()
        const { error } = await client
          .from('tickets')
          .update({ status: 'available', participant_id: null, payment_code: null, referred_by: null })
          .eq('id', ticketId)
        if (error) throw error
        // Limpiar el id del ticket que quede en los pagos agrupados
        const affected = payments.filter((p) => p.ticket_ids.includes(ticketId))
        for (const p of affected) {
          const remaining = p.ticket_ids.filter((id) => id !== ticketId)
          if (remaining.length === 0) {
            await client.from('payments').delete().eq('id', p.id)
            setPayments((prev) => prev.filter((x) => x.id !== p.id))
          } else {
            await client.from('payments').update({ ticket_ids: remaining }).eq('id', p.id)
            setPayments((prev) =>
              prev.map((x) => (x.id === p.id ? { ...x, ticket_ids: remaining } : x))
            )
          }
        }
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  status: 'available',
                  participant_id: undefined,
                  payment_code: undefined,
                  referred_by: undefined,
                }
              : t
          )
        )
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Error al liberar el número.',
        }
      }
    },
    [payments]
  )

  return {
    raffle,
    tickets,
    participants,
    payments,
    helpers,
    selectedNumbers,
    loading,
    error,
    currentParticipant,
    profile,
    checkingProfile,
    identity,
    toggleNumber,
    clearSelection,
    reserveNumbers,
    confirmPayment,
    updatePaymentStatus,
    identifyByWhatsapp,
    setIdentityAnswer,
    clearIdentity,
    addHelper,
    deleteHelper,
    deleteParticipant,
    deleteTicket,
  }
}