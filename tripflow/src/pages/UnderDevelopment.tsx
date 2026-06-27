// pages/UnderDevelopment.tsx
// A standalone "under development" page — no auth/login required.
// Route this directly in AppRouter.tsx as your temporary landing/catch-all
// while the real system is being built.

export default function UnderDevelopment() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-violet-50 to-violet-100 px-6 overflow-hidden">
      <div className="max-w-lg w-full text-center">
        {/* Animated illustration */}
        <div className="mx-auto mb-4 w-full flex items-center justify-center">
          <svg
            viewBox="0 0 360 220"
            className="w-full max-w-sm h-auto"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* ground */}
            <rect x="0" y="190" width="360" height="6" rx="3" fill="#ddd6fe" />

            {/* floating bricks pile */}
            <g>
              <rect x="20" y="170" width="26" height="18" rx="2" fill="#a78bfa" />
              <rect x="48" y="170" width="26" height="18" rx="2" fill="#c4b5fd" />
              <rect x="34" y="152" width="26" height="18" rx="2" fill="#8b5cf6" />
            </g>

            {/* gear, rotating */}
            <g transform="translate(300,60)">
              <g>
                <circle r="22" fill="#ede9fe" stroke="#a78bfa" strokeWidth="3" />
                <circle r="7" fill="#7c3aed" />
                <g stroke="#a78bfa" strokeWidth="5" strokeLinecap="round">
                  <line x1="0" y1="-28" x2="0" y2="-22" />
                  <line x1="0" y1="28" x2="0" y2="22" />
                  <line x1="-28" y1="0" x2="-22" y2="0" />
                  <line x1="28" y1="0" x2="22" y2="0" />
                  <line x1="-20" y1="-20" x2="-16" y2="-16" />
                  <line x1="20" y1="20" x2="16" y2="16" />
                  <line x1="-20" y1="20" x2="-16" y2="16" />
                  <line x1="20" y1="-20" x2="16" y2="-16" />
                </g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0"
                  to="360"
                  dur="6s"
                  repeatCount="indefinite"
                />
              </g>
            </g>

            {/* crane arm with swinging hook */}
            <g transform="translate(255,40)">
              <rect x="-4" y="0" width="8" height="110" fill="#c4b5fd" />
              <rect x="-50" y="0" width="100" height="8" fill="#8b5cf6" />
              <g>
                <line x1="40" y1="8" x2="40" y2="35" stroke="#7c3aed" strokeWidth="2" />
                <g transform="translate(40,35)">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    values="0 40 -20; 8 40 -20; 0 40 -20; -8 40 -20; 0 40 -20"
                    dur="3s"
                    repeatCount="indefinite"
                    additive="sum"
                  />
                  <rect x="-8" y="0" width="16" height="14" rx="2" fill="#7c3aed" />
                </g>
              </g>
            </g>

            {/* Cartoon worker 1 - hammering, on the left */}
            <g transform="translate(120,150)">
              {/* body bob */}
              <g>
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0 0; 0 -3; 0 0"
                  dur="0.6s"
                  repeatCount="indefinite"
                />
                {/* legs */}
                <rect x="-10" y="20" width="6" height="18" rx="2" fill="#5b21b6" />
                <rect x="6" y="20" width="6" height="18" rx="2" fill="#5b21b6" />
                {/* body */}
                <rect x="-13" y="-10" width="28" height="32" rx="8" fill="#7c3aed" />
                {/* head */}
                <circle cx="1" cy="-22" r="11" fill="#fcd9b8" />
                {/* hard hat */}
                <path d="M -10 -25 a 11 11 0 0 1 22 0 z" fill="#facc15" />
                <rect x="-12" y="-26" width="24" height="4" rx="2" fill="#facc15" />
                {/* static arm */}
                <rect x="-18" y="-4" width="8" height="6" rx="3" fill="#fcd9b8" />

                {/* swinging arm + hammer */}
                <g transform="translate(13,-2)">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    values="-10 0 0; 45 0 0; -10 0 0"
                    dur="0.8s"
                    repeatCount="indefinite"
                    additive="sum"
                  />
                  <rect x="0" y="-4" width="22" height="7" rx="3" fill="#fcd9b8" />
                  <g transform="translate(22,-1)">
                    <rect x="0" y="-3" width="14" height="6" rx="2" fill="#92400e" />
                    <rect x="10" y="-10" width="9" height="14" rx="2" fill="#6b7280" />
                  </g>
                </g>
              </g>
            </g>

            {/* Cartoon worker 2 - carrying brick, walking */}
            <g transform="translate(190,158)">
              <g>
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0 0; 4 0; 0 0; -4 0; 0 0"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
                {/* legs alternating */}
                <g>
                  <rect x="-9" y="18" width="6" height="16" rx="2" fill="#4c1d95">
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      values="10 -6 18; -10 -6 18; 10 -6 18"
                      dur="0.5s"
                      repeatCount="indefinite"
                    />
                  </rect>
                  <rect x="4" y="18" width="6" height="16" rx="2" fill="#4c1d95">
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      values="-10 7 18; 10 7 18; -10 7 18"
                      dur="0.5s"
                      repeatCount="indefinite"
                    />
                  </rect>
                </g>
                {/* body */}
                <rect x="-12" y="-8" width="26" height="28" rx="8" fill="#a855f7" />
                {/* head */}
                <circle cx="1" cy="-19" r="10" fill="#fcd9b8" />
                {/* hard hat */}
                <path d="M -9 -22 a 10 10 0 0 1 20 0 z" fill="#facc15" />
                <rect x="-11" y="-23" width="22" height="4" rx="2" fill="#facc15" />
                {/* arms holding brick out front */}
                <rect x="10" y="-6" width="16" height="8" rx="3" fill="#fcd9b8" />
                <rect x="22" y="-10" width="14" height="12" rx="2" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="1.5" />
              </g>
            </g>

            {/* dust/spark puffs near hammer impact */}
            <g transform="translate(150,148)">
              <circle r="3" fill="#ddd6fe">
                <animate attributeName="opacity" values="0;1;0" dur="0.8s" repeatCount="indefinite" />
                <animate attributeName="r" values="2;6;2" dur="0.8s" repeatCount="indefinite" />
              </circle>
            </g>
          </svg>
        </div>

        <h1 className="text-3xl font-semibold text-violet-900 mb-3">
          We're building something
        </h1>
        <p className="text-violet-500/80 text-base leading-relaxed mb-8">
          This part of the app is still under development. Check back soon —
          we're working hard to get it ready for you.
        </p>

        {/* Progress dots, purely decorative */}
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-violet-300 animate-pulse [animation-delay:300ms]" />
        </div>

        <p className="mt-10 text-xs text-violet-400">
          Matutong maghintay please boss.
        </p>
      </div>
    </div>
  );
}