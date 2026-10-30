"use client";

export type Mood = "idle" | "talking" | "happy" | "wrong" | "surprised" | "alarm" | "thinking" | "partial";

const AURA: Record<Mood, string> = {
  idle: "#22e4ff",
  talking: "#22e4ff",
  thinking: "#a78bfa",
  happy: "#b6ff3b",
  partial: "#facc15",
  wrong: "#ff4fd8",
  surprised: "#facc15",
  alarm: "#ff2e4d",
};

/** EL JEFE DE GUARDIA — personaje original en SVG con expresiones por estado. */
export default function Jefe({ mood = "idle", speaking = false, size = 220 }: { mood?: Mood; speaking?: boolean; size?: number }) {
  const talking = speaking || mood === "talking";
  const anim =
    mood === "happy" ? "jefe-jump" : mood === "alarm" ? "jefe-shake" : mood === "wrong" ? "jefe-tilt" : mood === "surprised" ? "jefe-pop" : "jefe-bob";
  const aura = AURA[mood];

  return (
    <div className="relative select-none" style={{ width: size, height: size }} aria-label={`El Jefe de Guardia (${mood})`} role="img">
      <div
        className={`absolute inset-[8%] rounded-full blur-2xl transition-colors duration-500 ${mood === "alarm" ? "animate-pulse" : ""}`}
        style={{ background: aura, opacity: 0.35 }}
      />
      <svg viewBox="0 0 200 220" className={`relative h-full w-full ${anim}`}>
        {/* Sirena en alerta */}
        {mood === "alarm" && (
          <g className="jefe-siren">
            <rect x="86" y="8" width="28" height="18" rx="6" fill="#ff2e4d" />
            <rect x="80" y="24" width="40" height="6" rx="2" fill="#c4122f" />
          </g>
        )}

        {/* Cuerpo: ambo azul noche con vivo rojo */}
        <path d="M24 220 Q30 162 100 154 Q170 162 176 220 Z" fill="#16275c" />
        <path d="M24 220 Q30 162 100 154 Q170 162 176 220" fill="none" stroke="#ff2e4d" strokeWidth="3" opacity=".8" />
        <path d="M78 158 L100 186 L122 158" fill="none" stroke="#0a1330" strokeWidth="5" strokeLinejoin="round" />
        {/* Credencial */}
        <rect x="122" y="182" width="36" height="22" rx="3" fill="#fff" />
        <rect x="122" y="182" width="36" height="7" rx="2" fill="#ff2e4d" />
        <text x="140" y="198" fontSize="5.5" textAnchor="middle" fontWeight="700" fill="#0a1330">JEFE</text>
        <text x="140" y="203" fontSize="4" textAnchor="middle" fill="#0a1330">DE GUARDIA</text>
        {/* Estetoscopio neón */}
        <path d="M70 160 Q62 196 92 204 M130 160 Q140 186 128 196" fill="none" stroke="#22e4ff" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="96" cy="205" r="6" fill="#0a1330" stroke="#22e4ff" strokeWidth="3" />

        {/* Cuello y cabeza */}
        <rect x="88" y="132" width="24" height="28" rx="8" fill="#e0a982" />
        <circle cx="52" cy="100" r="9" fill="#e9b892" />
        <circle cx="148" cy="100" r="9" fill="#e9b892" />
        <ellipse cx="100" cy="95" rx="48" ry="54" fill="#f1c7a3" />
        {/* Pelo canoso */}
        <path d="M52 92 Q46 40 100 36 Q154 40 148 92 Q144 62 118 58 Q100 66 82 58 Q58 62 52 92 Z" fill="#9ca3af" />
        <path d="M60 60 Q80 44 104 46" fill="none" stroke="#d1d5db" strokeWidth="3" strokeLinecap="round" />

        {/* Cejas */}
        <g className="transition-transform duration-300">
          {mood === "happy" || mood === "surprised" ? (
            <>
              <path d="M64 74 Q77 66 90 72" stroke="#4b5563" strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M110 72 Q123 66 136 74" stroke="#4b5563" strokeWidth="5" fill="none" strokeLinecap="round" />
            </>
          ) : mood === "alarm" || mood === "wrong" ? (
            <>
              <path d="M64 72 L90 80" stroke="#4b5563" strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M110 80 L136 72" stroke="#4b5563" strokeWidth="5" fill="none" strokeLinecap="round" />
            </>
          ) : mood === "thinking" || mood === "partial" ? (
            <>
              <path d="M64 76 L90 77" stroke="#4b5563" strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M110 72 Q123 66 136 72" stroke="#4b5563" strokeWidth="5" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d="M64 76 Q77 72 90 76" stroke="#4b5563" strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M110 76 Q123 72 136 76" stroke="#4b5563" strokeWidth="5" fill="none" strokeLinecap="round" />
            </>
          )}
        </g>

        {/* Ojos */}
        <g className={mood === "happy" ? "" : "jefe-blink"} style={{ transformOrigin: "100px 93px" }}>
          {mood === "happy" ? (
            <>
              <path d="M70 95 Q77 88 84 95" stroke="#0a1330" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M116 95 Q123 88 130 95" stroke="#0a1330" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="77" cy="93" r={mood === "surprised" || mood === "alarm" ? 6 : 4.5} fill="#0a1330" />
              <circle cx="123" cy="93" r={mood === "surprised" || mood === "alarm" ? 6 : 4.5} fill="#0a1330" />
              <circle cx="78.5" cy="91.5" r="1.4" fill="#fff" />
              <circle cx="124.5" cy="91.5" r="1.4" fill="#fff" />
            </>
          )}
        </g>
        {/* Anteojos */}
        <rect x="61" y="82" width="32" height="23" rx="8" fill="rgba(34,228,255,.12)" stroke="#0a1330" strokeWidth="3" />
        <rect x="107" y="82" width="32" height="23" rx="8" fill="rgba(34,228,255,.12)" stroke="#0a1330" strokeWidth="3" />
        <path d="M93 92 Q100 88 107 92" stroke="#0a1330" strokeWidth="3" fill="none" />

        {/* Nariz y bigote */}
        <path d="M100 100 Q93 115 101 117" stroke="#c98d68" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M78 125 Q100 112 122 125 Q111 131 100 126 Q89 131 78 125 Z" fill="#6b7280" />

        {/* Boca */}
        {talking && mood !== "happy" && mood !== "alarm" ? (
          <ellipse cx="100" cy="137" rx="9" ry="5" fill="#5b1a1a" className="jefe-talk" style={{ transformOrigin: "100px 137px" }} />
        ) : mood === "happy" ? (
          <g>
            <path d="M84 132 Q100 152 116 132 Z" fill="#5b1a1a" />
            <path d="M92 142 Q100 148 108 142 Q100 139 92 142 Z" fill="#ff6b81" />
          </g>
        ) : mood === "surprised" ? (
          <ellipse cx="100" cy="138" rx="7" ry="9" fill="#5b1a1a" />
        ) : mood === "wrong" ? (
          <path d="M87 141 Q100 131 113 141" stroke="#5b1a1a" strokeWidth="4" fill="none" strokeLinecap="round" />
        ) : mood === "alarm" ? (
          <g>
            <rect x="86" y="132" width="28" height="11" rx="4" fill="#fff" stroke="#5b1a1a" strokeWidth="2.5" />
            <path d="M93 132 V143 M100 132 V143 M107 132 V143" stroke="#5b1a1a" strokeWidth="1.5" />
          </g>
        ) : mood === "thinking" || mood === "partial" ? (
          <path d="M90 137 Q100 135 112 132" stroke="#5b1a1a" strokeWidth="4" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M88 136 Q100 140 112 136" stroke="#5b1a1a" strokeWidth="4" fill="none" strokeLinecap="round" />
        )}

        {/* Mano en la frente (error) */}
        {mood === "wrong" && (
          <g className="jefe-facepalm">
            <path d="M8 220 Q20 150 58 108" stroke="#16275c" strokeWidth="22" fill="none" strokeLinecap="round" />
            <ellipse cx="80" cy="72" rx="30" ry="17" fill="#f1c7a3" stroke="#c98d68" strokeWidth="2" transform="rotate(-12 80 72)" />
            <path d="M62 64 Q80 58 104 62 M60 72 Q82 68 106 70 M62 80 Q82 78 102 78" stroke="#c98d68" strokeWidth="2" fill="none" />
            <path d="M136 58 Q142 70 136 76 Q130 70 136 58 Z" fill="#7dd3fc" />
          </g>
        )}

        {/* Pensando */}
        {mood === "thinking" && (
          <g className="jefe-dots">
            <circle cx="160" cy="50" r="5" fill="#a78bfa" />
            <circle cx="174" cy="36" r="7" fill="#a78bfa" />
            <circle cx="188" cy="18" r="9" fill="#a78bfa" />
          </g>
        )}

        {/* Festejo */}
        {mood === "happy" && (
          <g className="jefe-sparkles" fill="#b6ff3b">
            <path d="M24 60 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z" />
            <path d="M172 48 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" />
            <path d="M178 120 l3 6 l6 3 l-6 3 l-3 6 l-3 -6 l-6 -3 l6 -3 z" fill="#22e4ff" />
          </g>
        )}
      </svg>
    </div>
  );
}
