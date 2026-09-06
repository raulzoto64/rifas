import { useState } from "react"
import type { ParticipantProfile } from "../store/useRaffleStore"

interface Props {
  profile: ParticipantProfile
  onClose: () => void
  onLogout: () => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(n)

const STATUS_COLORS: Record<string, {
  text: string
  bg: string
  border: string
}> = {
  paid: {
    text: "#4ade80",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.3)",
  },
  pending: {
    text: "#fb923c",
    bg: "rgba(249,115,22,0.1)",
    border: "rgba(249,115,22,0.3)",
  },
  reserved: {
    text: "#f97316",
    bg: "rgba(249,115,22,0.1)",
    border: "rgba(249,115,22,0.25)",
  },
}

function NumberChip({
  n,
  status,
}: {
  n: number
  status: keyof typeof STATUS_COLORS
}) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.reserved
  return (
    <span
      className="rounded-lg px-2 py-1 text-sm font-700"
      style={{
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        fontFamily: "var(--font-mono)",
      }}
    >
      {String(n).padStart(3, "0")}
    </span>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h4
        className="text-xs font-600 uppercase mb-2"
        style={{
          color: "rgba(224,220,255,0.4)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </h4>
      {children}
    </div>
  )
}

export default function MyNumbers({ profile, onClose, onLogout }: Props) {
  const { participant } = profile

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
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🎟️</span>
            <div>
              <h2
                className="text-lg font-700 leading-tight"
                style={{ fontFamily: "var(--font-display)", color: "#f0eeff" }}
              >
                Mis números
              </h2>
              <p
                className="text-xs mt-0.5"
                style={{ color: "rgba(224,220,255,0.4)" }}
              >
                {participant.first_name} {participant.last_name} ·{" "}
                <span style={{ fontFamily: "var(--font-mono)" }}>
                  {participant.whatsapp}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full flex items-center justify-center text-lg leading-none"
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
        </div>

        <div className="px-6 py-5 flex flex-col gap-6">
          {/* Resumen en la rifa actual */}
          <Section title="En esta rifa">
            <div className="grid grid-cols-2 gap-3">
              <StatBox
                label="Pagados"
                value={String(profile.paidNumbers.length)}
                accent="#4ade80"
                icon="✅"
              />
              <StatBox
                label="Por pagar"
                value={String(
                  profile.pendingNumbers.length +
                    profile.reservedNumbers.length,
                )}
                accent="#fb923c"
                icon="⏳"
              />
            </div>

            {profile.paidNumbers.length > 0 && (
              <div className="mt-3">
                <p
                  className="text-xs mb-1.5"
                  style={{ color: "rgba(134,239,172,0.6)" }}
                >
                  Números pagados ({profile.paidNumbers.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.paidNumbers.map((n) => (
                    <NumberChip key={n} n={n} status="paid" />
                  ))}
                </div>
              </div>
            )}
            {profile.pendingNumbers.length > 0 && (
              <div className="mt-3">
                <p
                  className="text-xs mb-1.5"
                  style={{ color: "rgba(251,191,36,0.7)" }}
                >
                  Apartados con pago pendiente de verificación (
                  {profile.pendingNumbers.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.pendingNumbers.map((n) => (
                    <NumberChip key={n} n={n} status="pending" />
                  ))}
                </div>
              </div>
            )}
            {profile.paidNumbers.length === 0 &&
              profile.pendingNumbers.length === 0 &&
              profile.reservedNumbers.length === 0 && (
                <p
                  className="text-sm mt-2"
                  style={{ color: "rgba(224,220,255,0.4)" }}
                >
                  Todavía no tienes números en esta rifa.
                </p>
              )}
          </Section>

          {/* Historial en otras rifas */}
          {profile.raffleHistory.length > 0 && (
            <Section title="Tu historial de rifas">
              <div className="flex flex-col gap-3">
                {profile.raffleHistory.map((r) => (
                  <div
                    key={r.raffleId}
                    className="rounded-xl p-3"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-sm font-600"
                        style={{ color: "#e8e4ff" }}
                      >
                        {r.title}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(99,102,241,0.15)",
                          color: "#a5b4fc",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {r.status === "active" ? "Activa" : "Terminada"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.paidNumbers.map((n) => (
                        <NumberChip
                          key={`${r.raffleId}-${n}`}
                          n={n}
                          status="paid"
                        />
                      ))}
                      {r.pendingNumbers.map((n) => (
                        <NumberChip
                          key={`${r.raffleId}-${n}`}
                          n={n}
                          status="pending"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Cerrar sesión */}
          <button
            onClick={onLogout}
            className="w-full rounded-xl py-2.5 text-xs font-500"
            style={{
              background: "transparent",
              color: "rgba(224,220,255,0.35)",
              border: "1px solid rgba(255,255,255,0.07)",
              cursor: "pointer",
            }}
          >
            Cambiar de número (cerrar sesión)
          </button>
        </div>
      </div>
    </div>
  )
}

function StatBox({
  label,
  value,
  accent,
  icon,
}: {
  label: string
  value: string
  accent: string
  icon: string
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="text-base mb-1">{icon}</div>
      <div
        className="font-700 text-base leading-tight mb-0.5"
        style={{ color: accent, fontFamily: "var(--font-display)" }}
      >
        {value}
      </div>
      <div className="text-xs" style={{ color: "rgba(224,220,255,0.4)" }}>
        {label}
      </div>
    </div>
  )
}
