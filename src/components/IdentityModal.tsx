import { useState } from "react"
import type { ParticipantProfile } from "../store/useRaffleStore"

interface Props {
  onAnswer: (answer: "new" | "existing") => void
  onLinkWhatsapp: (whatsapp: string) => Promise<ParticipantProfile | null>
  checking: boolean
}

export default function IdentityModal({
  onAnswer,
  onLinkWhatsapp,
  checking,
}: Props) {
  const [existing, setExisting] = useState(false)
  const [whatsapp, setWhatsapp] = useState("")
  const [error, setError] = useState("")
  const [linking, setLinking] = useState(false)

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\+\d{7,15}$/.test(whatsapp.trim())) {
      setError("Ingresa el WhatsApp con código de país (ej: +51987654321).")
      return
    }
    setLinking(true)
    setError("")
    const result = await onLinkWhatsapp(whatsapp.trim())
    setLinking(false)
    if (!result || !result.participant.id) {
      setError(
        "No encontramos participaciones con ese número. ¿Es tu primera vez?",
      )
      setExisting(false)
      return
    }
    // vinculado OK — el store cambia a identity 'recognized'
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          background: "#13102e",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.65)",
        }}
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">👋</div>
          <h2
            className="text-xl font-700 mb-1"
            style={{ fontFamily: "var(--font-display)", color: "#f0eeff" }}
          >
            ¡Bienvenido a Rifas Pro Salud!
          </h2>
          <p className="text-sm" style={{ color: "rgba(224,220,255,0.5)" }}>
            Para continuar, cuéntanos si es tu primera vez aquí.
          </p>
        </div>

        {checking || linking ? (
          <p
            className="text-center text-sm"
            style={{ color: "rgba(224,220,255,0.5)" }}
          >
            ⏳ Buscando tu historial...
          </p>
        ) : !existing ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onAnswer("new")}
              className="rounded-xl py-3.5 text-sm font-700"
              style={{
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              🆕 Es mi primera vez
            </button>
            <button
              onClick={() => setExisting(true)}
              className="rounded-xl py-3 text-sm font-600"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "rgba(224,220,255,0.7)",
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
              }}
            >
              ↪️ Ya ingresé antes
            </button>
          </div>
        ) : (
          <form onSubmit={handleLink} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span
                className="text-xs font-500"
                style={{ color: "rgba(224,220,255,0.55)" }}
              >
                Tu número de WhatsApp (con código de país)
              </span>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+51987654321"
                className="rounded-xl px-4 py-3 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#e8e4ff",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </label>
            {error && (
              <p className="text-xs" style={{ color: "#fca5a5" }}>
                ⚠️ {error}
              </p>
            )}
            <button
              type="submit"
              className="rounded-xl py-3 text-sm font-700"
              style={{
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              Buscar mis números →
            </button>
            <button
              type="button"
              onClick={() => {
                setExisting(false)
                setError("")
              }}
              className="rounded-xl py-2 text-xs"
              style={{
                background: "transparent",
                color: "rgba(224,220,255,0.4)",
                border: "none",
                cursor: "pointer",
              }}
            >
              ← Volver
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
