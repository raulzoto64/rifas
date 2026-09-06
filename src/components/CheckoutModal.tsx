import { useState } from "react"
import type { ReservePayload } from "../types"
import type { ParticipantProfile } from "../store/useRaffleStore"

interface Props {
  selectedNumbers: number[]
  ticketPrice: number
  raffleId: string
  // When opened to continue a previous reservation
  pendingReservation?: number[]
  // Números de una reserva pendiente a los que se sumarán los nuevos seleccionados
  existingReservation?: number[]
  // Perfil del participante si ya está identificado (se restauró sesión)
  profile?: ParticipantProfile | null
  onClose: () => void
  onReserve: (
    payload: ReservePayload,
  ) => Promise<{ success: boolean error?: string }>
  onAddToReservation?: (payload: {
    raffle_id: string
    ticket_numbers: number[]
  }) => Promise<{ success: boolean error?: string }>
  onIdentifyWhatsapp?: (whatsapp: string) => Promise<ParticipantProfile | null>
}

type Step = "warning" | "data" | "done"

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(n)

export default function CheckoutModal({
  selectedNumbers,
  ticketPrice,
  raffleId,
  pendingReservation,
  existingReservation,
  profile,
  onClose,
  onReserve,
  onAddToReservation,
}: Props) {
  // Modo "sumar a reserva pendiente": el participante ya está identificado y
  // agrega números nuevos a su reserva existente (sin volver a pedir datos).
  const isAddToExisting = Boolean(
    existingReservation && existingReservation.length > 0,
  )

  const [step, setStep] = useState<Step>("warning")
  const [form, setForm] = useState({
    first_name: profile?.participant.first_name ?? "",
    last_name: profile?.participant.last_name ?? "",
    whatsapp: profile?.participant.whatsapp ?? "",
  })
  const [errorMsg, setErrorMsg] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // These are captured at reserve-time so they survive the selection being cleared
  const [reservedNumbers, setReservedNumbers] = useState<number[]>(
    pendingReservation ?? [],
  )
  const [reservedTotal, setReservedTotal] = useState(
    (pendingReservation ?? []).length * ticketPrice,
  )

  const sortedSelected = selectedNumbers.slice().sort((a, b) => a - b)
  const selectionTotal = selectedNumbers.length * ticketPrice

  const handleChange =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // En modo "sumar a reserva pendiente": no se vuelven a pedir datos.
  // Se agregan los números nuevos directamente a la reserva existente.
  const handleAddToExistingOrData = async () => {
    if (isAddToExisting) {
      if (!onAddToReservation) {
        setErrorMsg("No se pudo ampliar la reserva.")
        return
      }
      setSubmitting(true)
      setErrorMsg("")
      await new Promise((r) => setTimeout(r, 500))
      const result = await onAddToReservation({
        raffle_id: raffleId,
        ticket_numbers: sortedSelected,
      })
      setSubmitting(false)
      if (result.success) {
        const merged = Array.from(
          new Set([...(existingReservation ?? []), ...sortedSelected]),
        ).sort((a, b) => a - b)
        setReservedNumbers(merged)
        setReservedTotal(merged.length * ticketPrice)
        setStep("done")
      } else {
        setErrorMsg(result.error || "Error al agregar los números.")
      }
      return
    }
    setErrorMsg("")
    setStep("data")
  }

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !form.first_name.trim() ||
      !form.last_name.trim() ||
      !form.whatsapp.trim()
    ) {
      setErrorMsg("Por favor completa todos los campos.")
      return
    }
    if (!/^\+\d{7,15}$/.test(form.whatsapp.trim())) {
      setErrorMsg("Ingresa el WhatsApp con código de país (ej: +51987654321).")
      return
    }
    setSubmitting(true)
    setErrorMsg("")
    await new Promise((r) => setTimeout(r, 700))

    const result = await onReserve({
      raffle_id: raffleId,
      ticket_numbers: selectedNumbers,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      whatsapp: form.whatsapp.trim(),
    })

    setSubmitting(false)
    if (result.success) {
      // Capture numbers+total NOW before selection is cleared externally
      setReservedNumbers(sortedSelected)
      setReservedTotal(selectionTotal)
      setStep("done")
    } else {
      setErrorMsg(result.error || "Error al reservar.")
    }
  }

  // Steps in order for progress indicator
  const STEPS: Step[] = ["warning", "data", "done"]
  const stepIndex = STEPS.indexOf(step)

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: "#13102e",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.65)",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        {/* Progress bar */}
        {step !== "done" && (
          <div style={{ height: 3, background: "rgba(255,255,255,0.06)" }}>
            <div
              style={{
                height: "100%",
                width: `${((stepIndex + 1) / 3) * 100}%`,
                background: "linear-gradient(90deg,#6366f1,#f5a623)",
                transition: "width 0.4s ease",
              }}
            />
          </div>
        )}

        {step === "warning" && (
          <WarningStep
            numbers={sortedSelected}
            total={selectionTotal}
            pendingNumbers={isAddToExisting ? existingReservation : undefined}
            onAccept={handleAddToExistingOrData}
            onCancel={onClose}
          />
        )}

        {step === "data" && (
          <>
            <ModalHeader
              title="Tus datos de contacto"
              subtitle="Paso 2 de 2 — Para apartarte los números"
              onBack={() => {
                setErrorMsg("")
                setStep("warning")
              }}
              onClose={onClose}
            />
            <NumbersSummary
              numbers={sortedSelected}
              total={selectionTotal}
              ticketPrice={ticketPrice}
            />
            <form
              onSubmit={handleReserve}
              className="px-6 pb-6 flex flex-col gap-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Nombres"
                  value={form.first_name}
                  onChange={handleChange("first_name")}
                  placeholder="María"
                />
                <Field
                  label="Apellidos"
                  value={form.last_name}
                  onChange={handleChange("last_name")}
                  placeholder="Torres"
                />
              </div>
              <Field
                label="WhatsApp (con código de país)"
                value={form.whatsapp}
                onChange={handleChange("whatsapp")}
                placeholder="+51987654321"
                type="tel"
              />
              {errorMsg && <ErrorBanner msg={errorMsg} />}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl py-3.5 font-700 text-sm"
                style={{
                  background: submitting
                    ? "rgba(99,102,241,0.3)"
                    : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: "#fff",
                  border: "none",
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-body)",
                }}
              >
                {submitting
                  ? "⏳ Apartando..."
                  : `📌 Apartar ${selectedNumbers.length} número${
                      selectedNumbers.length !== 1 ? "s" : ""
                    }`}
              </button>
              <p
                className="text-xs text-center"
                style={{ color: "rgba(224,220,255,0.3)" }}
              >
                Tus números quedarán bloqueados para ti.
              </p>
            </form>
          </>
        )}

        {step === "done" && (
          <DoneStep
            numbers={reservedNumbers}
            total={reservedTotal}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────

function WarningStep({
  numbers,
  total,
  pendingNumbers,
  onAccept,
  onCancel,
}: {
  numbers: number[]
  total: number
  pendingNumbers?: number[]
  onAccept: () => void
  onCancel: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)
  const pricePer =
    pendingNumbers && pendingNumbers.length > 0 && numbers.length > 0
      ? total / numbers.length
      : null
  const combinedTotal =
    pendingNumbers && pricePer
      ? (pendingNumbers.length + numbers.length) * pricePer
      : total
  return (
    <div className="p-6 flex flex-col gap-5">
      {/* Back/close row */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-500"
          style={{
            color: "rgba(224,220,255,0.4)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Paso 1 de 2
        </span>
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{
            background: "rgba(255,255,255,0.05)",
            color: "rgba(224,220,255,0.4)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
          }}
        >
          ← Volver a elegir
        </button>
      </div>

      <div
        className="rounded-2xl p-5"
        style={{
          background: "rgba(239,68,68,0.08)",
          border: "2px solid rgba(239,68,68,0.35)",
        }}
      >
        <div className="flex items-start gap-3">
          <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>⚠️</span>
          <div>
            <h3
              className="font-700 text-base mb-2"
              style={{ fontFamily: "var(--font-display)", color: "#fca5a5" }}
            >
              Antes de continuar, lee esto
            </h3>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "rgba(252,165,165,0.85)" }}
            >
              Una vez que apartes tus números,{" "}
              <strong style={{ color: "#f87171" }}>
                no podrás cambiarlos ni cancelarlos.
              </strong>{" "}
              Los números quedarán bloqueados para ti de forma permanente.
            </p>
          </div>
        </div>
      </div>

      {pendingNumbers && pendingNumbers.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "rgba(249,115,22,0.08)",
            border: "1px solid rgba(249,115,22,0.3)",
          }}
        >
          <div
            className="text-xs mb-2"
            style={{ color: "rgba(251,146,60,0.75)" }}
          >
            Tus números pendientes por pagar
          </div>
          <div className="flex flex-wrap gap-1.5 mb-1">
            {pendingNumbers.map((n) => (
              <span
                key={n}
                className="rounded-lg px-2.5 py-1 text-sm font-700"
                style={{
                  background: "rgba(249,115,22,0.15)",
                  color: "#fdba74",
                  fontFamily: "var(--font-mono)",
                  border: "1px solid rgba(249,115,22,0.35)",
                }}
              >
                {String(n).padStart(3, "0")}
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        className="rounded-xl p-4"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div
          className="text-xs mb-2"
          style={{ color: "rgba(224,220,255,0.45)" }}
        >
          {pendingNumbers && pendingNumbers.length > 0
            ? "Números nuevos que agregas"
            : "Números que vas a apartar"}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {numbers.map((n) => (
            <span
              key={n}
              className="rounded-lg px-2.5 py-1 text-sm font-700"
              style={{
                background: "rgba(99,102,241,0.15)",
                color: "#c7d2fe",
                fontFamily: "var(--font-mono)",
                border: "1px solid rgba(99,102,241,0.3)",
              }}
            >
              {String(n).padStart(3, "0")}
            </span>
          ))}
        </div>
        <div className="text-xs" style={{ color: "rgba(224,220,255,0.4)" }}>
          {pendingNumbers && pendingNumbers.length > 0 ? (
            <>
              Total a pagar (pendientes + nuevos):{" "}
              <strong
                style={{
                  color: "#f5a623",
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                }}
              >
                {fmt(combinedTotal)}
              </strong>
            </>
          ) : (
            <>
              Total a pagar:{" "}
              <strong
                style={{
                  color: "#f5a623",
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                }}
              >
                {fmt(total)}
              </strong>
            </>
          )}
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <div
          onClick={() => setConfirmed((v) => !v)}
          className="flex-shrink-0 rounded-md flex items-center justify-center mt-0.5"
          style={{
            width: 20,
            height: 20,
            background: confirmed ? "#6366f1" : "rgba(255,255,255,0.08)",
            border: `2px solid ${
              confirmed ? "#6366f1" : "rgba(255,255,255,0.2)"
            }`,
            transition: "all 0.15s",
            cursor: "pointer",
          }}
        >
          {confirmed && (
            <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>
              ✓
            </span>
          )}
        </div>
        <span className="text-sm" style={{ color: "rgba(224,220,255,0.65)" }}>
          Entiendo que los números seleccionados son definitivos y no se pueden
          cambiar una vez apartados.
        </span>
      </label>

      <button
        onClick={onAccept}
        disabled={!confirmed}
        className="w-full rounded-xl py-3.5 text-sm font-700"
        style={{
          background: confirmed
            ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
            : "rgba(99,102,241,0.12)",
          color: confirmed ? "#fff" : "rgba(165,180,252,0.3)",
          border: "none",
          cursor: confirmed ? "pointer" : "not-allowed",
          fontFamily: "var(--font-body)",
          transition: "all 0.2s",
        }}
      >
        {pendingNumbers && pendingNumbers.length > 0
          ? "Sí, sumar a mis números pendientes →"
          : "Sí, confirmo mis números →"}
      </button>
    </div>
  )
}

function ModalHeader({
  title,
  subtitle,
  onBack,
  onClose,
}: {
  title: string
  subtitle: string
  onBack?: () => void
  onClose?: () => void
}) {
  return (
    <div
      className="flex items-center gap-3 px-6 py-4"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
    >
      {onBack && (
        <button
          onClick={onBack}
          className="flex-shrink-0 rounded-lg flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.5)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          ←
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h2
          className="text-lg font-700 leading-tight"
          style={{ fontFamily: "var(--font-display)", color: "#f0eeff" }}
        >
          {title}
        </h2>
        <p
          className="text-xs mt-0.5"
          style={{ color: "rgba(224,220,255,0.4)" }}
        >
          {subtitle}
        </p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-full flex items-center justify-center text-lg leading-none"
          style={{
            width: 32,
            height: 32,
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.35)",
            border: "none",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}

function NumbersSummary({
  numbers,
  total,
  ticketPrice,
}: {
  numbers: number[]
  total: number
  ticketPrice: number
}) {
  return (
    <div
      className="mx-6 my-4 rounded-xl p-3"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="flex flex-wrap gap-1 mb-2">
        {numbers.map((n) => (
          <span
            key={n}
            className="rounded px-1.5 py-0.5 text-xs font-700"
            style={{
              background: "rgba(99,102,241,0.15)",
              color: "#a5b4fc",
              fontFamily: "var(--font-mono)",
              border: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            {String(n).padStart(3, "0")}
          </span>
        ))}
      </div>
      <div
        className="flex justify-between text-xs"
        style={{ color: "rgba(224,220,255,0.45)" }}
      >
        <span>
          {numbers.length} número{numbers.length !== 1 ? "s" : ""} × S/
          {ticketPrice}
        </span>
        <strong
          style={{
            color: "#f5a623",
            fontFamily: "var(--font-display)",
            fontSize: 13,
          }}
        >
          {fmt(total)}
        </strong>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  mono,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
  mono?: boolean
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-xs font-500"
        style={{
          color: "rgba(224,220,255,0.55)",
          fontFamily: "var(--font-body)",
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#e8e4ff",
          fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
          letterSpacing: mono ? "0.06em" : undefined,
        }}
        onFocus={(e) => {
          e.currentTarget.style.border = "1px solid rgba(99,102,241,0.6)"
          e.currentTarget.style.background = "rgba(99,102,241,0.08)"
        }}
        onBlur={(e) => {
          e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"
          e.currentTarget.style.background = "rgba(255,255,255,0.05)"
        }}
      />
    </label>
  )
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div
      className="rounded-lg px-4 py-3 text-sm"
      style={{
        background: "rgba(239,68,68,0.1)",
        border: "1px solid rgba(239,68,68,0.3)",
        color: "#fca5a5",
      }}
    >
      ⚠️ {msg}
    </div>
  )
}

function DoneStep({
  numbers,
  total,
  onClose,
}: {
  numbers: number[]
  total: number
  onClose: () => void
}) {
  return (
    <div className="flex flex-col items-center text-center px-8 py-10 gap-5">
      <div
        className="rounded-full flex items-center justify-center text-4xl"
        style={{
          width: 88,
          height: 88,
          background: "rgba(34,197,94,0.12)",
          border: "2px solid rgba(34,197,94,0.35)",
        }}
      >
        🎉
      </div>
      <div>
        <h3
          className="text-2xl font-700 mb-2"
          style={{ fontFamily: "var(--font-display)", color: "#f0eeff" }}
        >
          ¡Números apartados!
        </h3>
        <p className="text-sm" style={{ color: "rgba(224,220,255,0.5)" }}>
          Envía tu captura del pago por WhatsApp para confirmar tu
          participación.
        </p>
      </div>
      <div
        className="w-full rounded-xl p-4"
        style={{
          background: "rgba(34,197,94,0.07)",
          border: "1px solid rgba(34,197,94,0.2)",
        }}
      >
        <div
          className="text-xs mb-2"
          style={{ color: "rgba(134,239,172,0.6)" }}
        >
          Tus números en el sorteo
        </div>
        <div className="flex flex-wrap gap-1.5 justify-center mb-3">
          {numbers.map((n) => (
            <span
              key={n}
              className="rounded-lg px-2.5 py-1 text-sm font-700"
              style={{
                background: "rgba(34,197,94,0.15)",
                color: "#4ade80",
                fontFamily: "var(--font-mono)",
                border: "1px solid rgba(34,197,94,0.3)",
              }}
            >
              {String(n).padStart(3, "0")}
            </span>
          ))}
        </div>
        <div
          className="text-sm font-700"
          style={{ color: "#4ade80", fontFamily: "var(--font-display)" }}
        >
          Total a pagar: {fmt(total)}
        </div>
      </div>
      <div
        className="w-full rounded-xl p-4"
        style={{
          background: "rgba(245,166,35,0.07)",
          border: "1px solid rgba(245,166,35,0.22)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span>💳</span>
          <span className="text-sm font-600" style={{ color: "#fbbf24" }}>
            Siguiente paso
          </span>
        </div>
        <ol
          className="text-xs flex flex-col gap-1.5 list-none"
          style={{ color: "rgba(251,191,36,0.7)", paddingLeft: 0 }}
        >
          <li>
            1. Haz tu pago de{" "}
            <strong style={{ color: "#fbbf24" }}>{fmt(total)}</strong> por Yape
            a:
          </li>
        </ol>
        <div
          className="mt-2 rounded-xl p-3 text-center"
          style={{
            background: "rgba(39,174,96,0.12)",
            border: "1px solid rgba(39,174,96,0.35)",
          }}
        >
          <div className="text-xs" style={{ color: "#6ee7b7" }}>
            📱 Yape · 993 790 515
          </div>
          <div
            className="text-xl font-900 mt-1"
            style={{ color: "#34d399", fontFamily: "var(--font-mono)" }}
          >
            993 790 515
          </div>
        </div>
        <ol
          className="text-xs flex flex-col gap-1.5 list-none mt-1.5"
          style={{ color: "rgba(251,191,36,0.7)", paddingLeft: 0 }}
        >
          <li>2. Envía tu captura del pago por WhatsApp al mismo número</li>
          <li>3. El administrador verificará y confirmará tu participación</li>
        </ol>
        <a
          href={`https://wa.me/51993790515?text=${encodeURIComponent(`Hola, ya pagué mi rifa (${fmt(total)}, captura adjunta).`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-700"
          style={{
            background: "#25D366",
            color: "#fff",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          💬 Enviar captura por WhatsApp
        </a>
      </div>
      <button
        onClick={onClose}
        className="w-full rounded-xl py-3 font-500 text-sm"
        style={{
          background: "rgba(255,255,255,0.05)",
          color: "rgba(224,220,255,0.55)",
          border: "1px solid rgba(255,255,255,0.08)",
          cursor: "pointer",
          fontFamily: "var(--font-body)",
        }}
      >
        Ver grilla de números
      </button>
    </div>
  )
}
