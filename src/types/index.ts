export type TicketStatus = 'available' | 'reserved' | 'paid'
export type RaffleStatus = 'active' | 'ended'
export type PaymentStatus = 'pending' | 'approved' | 'rejected'

export interface Raffle {
  id: string
  title: string
  description: string
  image_url: string
  ticket_price: number
  total_tickets: number
  draw_date: string
  status: RaffleStatus
  prize: string
}

export interface Participant {
  id: string
  first_name: string
  last_name: string
  whatsapp: string
  created_at: string
}

export interface Ticket {
  id: string
  raffle_id: string
  ticket_number: number
  status: TicketStatus
  participant_id?: string
  participant?: Participant
  referred_by?: string
  payment_code?: string
  created_at: string
}

export interface Payment {
  id: string
  ticket_ids: string[]
  participant_id: string
  participant?: Participant
  payment_code?: string
  status: PaymentStatus
  amount_paid: number
  created_at: string
  ticket_numbers?: number[]
}

// Familiar/amigo que vende la rifa con su enlace personal (?ref=)
export interface Helper {
  id: string
  first_name: string
  last_name: string
  whatsapp: string
  link_token: string
  password: string
  created_at: string
}

// Step 1: reserve with personal data only (no payment code yet)
export interface ReservePayload {
  raffle_id: string
  ticket_numbers: number[]
  first_name: string
  last_name: string
  whatsapp: string
}

// Step 2: submit payment code after reservation
export interface ConfirmPaymentPayload {
  ticket_numbers: number[]
  payment_code: string
}
