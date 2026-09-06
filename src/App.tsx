import { useEffect, useState } from "react"
import { useRaffleStore } from "./store/useRaffleStore"
import RaffleHeader from "./components/RaffleHeader"
import NumberGrid from "./components/NumberGrid"
import CheckoutModal from "./components/CheckoutModal"
import AdminPanel from "./components/AdminPanel"
import IdentityModal from "./components/IdentityModal"
import MyNumbers from "./components/MyNumbers"

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(n)

export default function App() {
  const {
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
    addToReservation,
    updatePaymentStatus,
    identifyByWhatsapp,
    setIdentityAnswer,
    clearIdentity,
    addHelper,
    deleteHelper,
    deleteParticipant,
    deleteTicket,
  } = useRaffleStore()

  const [showCheckout, setShowCheckout] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showMyNumbers, setShowMyNumbers] = useState(false)

  const soldCount = tickets.filter((t) => t.status === "paid").length
  const reservedCount = tickets.filter((t) => t.status === "reserved").length
  const total = (raffle?.ticket_price ?? 0) * selectedNumbers.length

  const handleReserve: typeof reserveNumbers = async (payload) => {
    const result = await reserveNumbers(payload)
    return result
  }

  const handleAddToReservation = async (payload: {
    raffle_id: string
    ticket_numbers: number[]
  }) => {
    const result = await addToReservation(payload)
    return result
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(ellipse at top, #1a1640 0%, #09071a 60%)",
          fontFamily: "var(--font-body)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="text-center">
          <div className="text-4xl mb-3">🎟️</div>
          <p className="text-sm" style={{ color: "rgba(224,220,255,0.6)" }}>
            Cargando rifa...
          </p>
        </div>
      </div>
    )
  }

  if (error || !raffle) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(ellipse at top, #1a1640 0%, #09071a 60%)",
          fontFamily: "var(--font-body)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          className="max-w-md w-full rounded-2xl p-6"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          <p
            className="text-sm font-700 mb-2"
            style={{ color: "#fca5a5", fontFamily: "var(--font-display)" }}
          >
            No se pudo cargar la rifa
          </p>
          <p className="text-sm" style={{ color: "rgba(252,165,165,0.8)" }}>
            {error}
          </p>
          <p
            className="text-xs mt-3"
            style={{ color: "rgba(252,165,165,0.5)" }}
          >
            Verificá que las credenciales de{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>.env</code> sean
            correctas y que hayas ejecutado{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>
              database/schema.sql
            </code>{" "}
            en Supabase.
          </p>
        </div>
      </div>
    )
  }

  const handleCloseCheckout = () => {
    setShowCheckout(false)
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top, #1a1640 0%, #09071a 60%)",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Top-right buttons: Mis números + Admin */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        {currentParticipant && (
          <button
            onClick={() => setShowMyNumbers(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-500"
            style={{
              background: "rgba(99,102,241,0.15)",
              color: "#a5b4fc",
              border: "1px solid rgba(99,102,241,0.3)",
              cursor: "pointer",
              backdropFilter: "blur(8px)",
            }}
          >
            🎟️ Mis números
          </button>
        )}
        <button
          onClick={() => setShowAdmin(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-500"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "rgba(224,220,255,0.5)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
          }}
        >
          ⚙️ Admin
        </button>
      </div>

      <RaffleHeader
        raffle={raffle}
        soldCount={soldCount}
        reservedCount={reservedCount}
      />

      <NumberGrid
        tickets={tickets}
        selectedNumbers={selectedNumbers}
        onToggle={toggleNumber}
        totalTickets={raffle.total_tickets}
      />

      {/* Sticky bottom bar — shown when numbers are selected */}
      {selectedNumbers.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30"
          style={{
            background: "rgba(13,10,36,0.94)",
            borderTop: "1px solid rgba(99,102,241,0.3)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-600" style={{ color: "#e8e4ff" }}>
                ➕ {selectedNumbers.length} número
                {selectedNumbers.length !== 1 ? "s" : ""} nuevo
                {selectedNumbers.length !== 1 ? "s" : ""} seleccionado
                {selectedNumbers.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => clearSelection()}
                className="px-3 py-2 rounded-xl text-xs"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(224,220,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                }}
              >
                Limpiar
              </button>
              <button
                onClick={() => setShowCheckout(true)}
                className="px-5 py-2 rounded-xl text-sm font-600"
                style={{
                  background: "linear-gradient(135deg,#f5a623,#f97316)",
                  color: "#1a0a00",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                🎟️ Agregar nuevas →
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedNumbers.length > 0 && <div style={{ height: 96 }} />}

      {showCheckout && (
        <CheckoutModal
          selectedNumbers={selectedNumbers}
          ticketPrice={raffle.ticket_price}
          raffleId={raffle.id}
          profile={profile}
          onClose={handleCloseCheckout}
          onReserve={handleReserve}
          onAddToReservation={handleAddToReservation}
          onIdentifyWhatsapp={identifyByWhatsapp}
        />
      )}

      {/* Modal de identidad: ¿primera vez o ya ingresaste? */}
      {identity === "unknown" && !showCheckout && !showAdmin && (
        <IdentityModal
          onAnswer={setIdentityAnswer}
          onLinkWhatsapp={identifyByWhatsapp}
          checking={checkingProfile}
        />
      )}

      {showMyNumbers && profile && currentParticipant && (
        <MyNumbers
          profile={profile}
          onClose={() => setShowMyNumbers(false)}
          onLogout={() => {
            clearIdentity()
            setShowMyNumbers(false)
          }}
        />
      )}

      {showAdmin && (
        <AdminPanel
          tickets={tickets}
          payments={payments}
          participants={participants}
          helpers={helpers}
          onUpdatePayment={updatePaymentStatus}
          onDeleteTicket={deleteTicket}
          onDeleteParticipant={deleteParticipant}
          onAddHelper={addHelper}
          onDeleteHelper={deleteHelper}
          onClose={() => setShowAdmin(false)}
        />
      )}
    </div>
  )
}
