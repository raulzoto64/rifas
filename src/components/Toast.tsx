import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"

interface Toast {
  id: number
  msg: string
  type?: "success" | "info"
}
interface ToastCtx {
  toast: (msg: string, type?: "success" | "error") => void
}
const Ctx = createContext<ToastCtx>({ toast: () => {} })

export function useToast() {
  return useContext(Ctx)
}

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])

  const toast = useCallback(
    (msg: string, type: "success" | "error" = "success") => {
      const id = ++counter
      setItems((prev) => [...prev, { id, msg, type }])
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id))
      }, 2600)
    },
    [],
  )

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-24 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-600 shadow-lg"
            style={{
              background:
                t.type === "error"
                  ? "rgba(239,68,68,0.16)"
                  : "rgba(34,197,94,0.16)",
              border: `1px solid ${
                t.type === "error"
                  ? "rgba(239,68,68,0.4)"
                  : "rgba(34,197,94,0.4)"
              }`,
              color: "#f0eeff",
              fontFamily: "var(--font-body)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            }}
          >
            <span style={{ color: t.type === "error" ? "#f87171" : "#4ade80" }}>
              {t.type === "error" ? "⚠️" : "✓"}
            </span>
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
