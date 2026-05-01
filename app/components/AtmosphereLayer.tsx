"use client";

/**
 * Full-viewport decorative SVG — sunrise, birds, contours, dots.
 * pointer-events: none; sits behind content (sibling should use relative z-10).
 * Variants: landing (full), orientation (taller view for long scroll), session (minimal + half opacity).
 * Landing/orientation: boosted visibility; session: unchanged (subtle).
 */

type AtmosphereVariant = "landing" | "orientation" | "session";

const VB_LANDING = "0 0 1200 1000";
const VB_ORIENTATION = "0 0 1200 2600";
const VB_SESSION = "0 0 1200 1000";

/* Warm palette — golden hour only */
const A = {
  gold1: "#D4A054",
  gold2: "#E8C8A0",
  gold3: "#EABC82",
  gold4: "#8B6914",
  terracotta: "#C4775A",
  rust: "#B5703B",
  brown: "#3D2E1F",
  brownMuted: "#6B5A48",
};

export function AtmosphereLayer({ variant }: { variant: AtmosphereVariant }) {
  const isSession = variant === "session";
  const isOrientation = variant === "orientation";
  const viewBox = isOrientation ? VB_ORIENTATION : isSession ? VB_SESSION : VB_LANDING;
  const sessionDim = isSession ? 0.5 : 1;
  const vivid = !isSession;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 min-h-0 min-w-0 overflow-hidden">
      <svg
        className="h-full w-full max-w-full min-w-0"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
      <defs>
        <linearGradient id="atmo-sun-core" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop
            offset="0%"
            stopColor={A.gold3}
            stopOpacity={vivid ? 0.18 : 0.14 * sessionDim}
          />
          <stop
            offset="100%"
            stopColor={A.gold1}
            stopOpacity={vivid ? 0.1 : 0.06 * sessionDim}
          />
        </linearGradient>
      </defs>

      {/* —— Sunrise glow (top-right) —— */}
      <g opacity={sessionDim} transform="translate(1050, 130)">
        <circle
          r="220"
          fill={A.gold2}
          fillOpacity={vivid ? 0.13 : 0.045}
        />
        <circle
          r="168"
          fill={A.gold3}
          fillOpacity={vivid ? 0.15 : 0.055}
        />
        <circle
          r="118"
          fill={A.gold1}
          fillOpacity={vivid ? 0.18 : 0.065}
        />
        <circle
          r="72"
          fill={A.terracotta}
          fillOpacity={vivid ? 0.16 : 0.06}
        />
        <circle r="38" fill="url(#atmo-sun-core)" />
        {[0, 42, 84, 126, 168, 210, 252, 300].map((deg) => (
          <line
            key={deg}
            x1="0"
            y1="0"
            x2={Math.cos((deg * Math.PI) / 180) * 240}
            y2={Math.sin((deg * Math.PI) / 180) * 240}
            stroke={A.gold1}
            strokeWidth={0.55}
            strokeOpacity={vivid ? 0.18 : 0.08 * sessionDim}
          />
        ))}
      </g>

      {!isSession && (
        <>
          {/* —— Flowing lines — larger flock from left —— */}
          <g
            opacity={0.23}
            fill="none"
            stroke={A.brownMuted}
            strokeWidth={0.65}
            strokeLinecap="round"
          >
            <path d="M -20 280 Q 180 200 340 160 T 620 140" />
            <path
              d="M 40 320 Q 220 240 400 200 T 700 175"
              strokeOpacity={0.85}
              strokeWidth={0.5}
            />
            <path
              d="M 10 360 Q 200 300 380 255 T 640 230"
              strokeWidth={0.55}
              strokeOpacity={0.7}
            />
          </g>
          <g
            opacity={0.22}
            fill="none"
            stroke={A.gold4}
            strokeWidth={0.55}
            strokeLinecap="round"
          >
            <path d="M 720 200 Q 820 150 920 120 T 1080 95" />
            <path
              d="M 760 235 Q 860 190 940 165 T 1100 145"
              strokeOpacity={0.75}
              strokeWidth={0.45}
            />
          </g>

          {/* —— Gestural V-marks (upper sky) —— */}
          <g
            fill="none"
            stroke={A.brownMuted}
            strokeWidth={0.45}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M 280 120 Q 285 128 290 120" opacity={0.11} />
            <path d="M 420 95 Q 426 105 432 95" opacity={0.1} />
            <path d="M 560 150 Q 566 160 572 150" opacity={0.11} />
            <path d="M 380 200 Q 386 210 392 200" opacity={0.1} />
            <path d="M 640 180 Q 646 188 652 180" opacity={0.105} />
            <path d="M 480 88 Q 486 96 492 88" opacity={0.1} />
            <path d="M 320 175 Q 326 184 332 175" opacity={0.1} />
          </g>
        </>
      )}

      {/* —— Topographic contours (lower half; extended on orientation) —— */}
      <g
        opacity={isSession ? 0.06 * sessionDim : 0.17}
        fill="none"
        stroke={A.terracotta}
        strokeWidth={0.55}
        strokeLinecap="round"
      >
        <path d="M -40 520 Q 200 500 400 515 T 900 505 T 1240 525" strokeOpacity={0.55} />
        <path d="M -40 565 Q 220 545 450 568 T 940 552 T 1240 575" strokeOpacity={0.75} />
        <path d="M -40 615 Q 180 598 420 620 T 880 605 T 1240 630" strokeOpacity={0.5} />
        {!isSession && (
          <>
            <path d="M -40 668 Q 260 648 480 675 T 960 655 T 1240 685" strokeOpacity={0.65} />
            <path d="M -40 720 Q 200 705 440 728 T 920 710 T 1240 735" strokeOpacity={0.45} />
          </>
        )}
      </g>
      <g
        opacity={isSession ? 0.055 * sessionDim : 0.16}
        fill="none"
        stroke={A.rust}
        strokeWidth={0.5}
        strokeLinecap="round"
      >
        <path d="M -40 545 Q 240 530 460 548 T 920 538 T 1240 555" strokeOpacity={0.6} />
        <path d="M -40 595 Q 210 578 430 600 T 860 588 T 1240 612" strokeOpacity={0.8} />
        {!isSession && (
          <path d="M -40 695 Q 280 675 500 702 T 980 682 T 1240 715" strokeOpacity={0.55} />
        )}
      </g>

      {isOrientation && (
        <>
          <g
            opacity={0.17}
            fill="none"
            stroke={A.terracotta}
            strokeWidth={0.5}
            strokeLinecap="round"
          >
            <path d="M -40 980 Q 220 955 480 990 T 960 965 T 1240 1005" strokeOpacity={0.5} />
            <path d="M -40 1080 Q 260 1055 500 1090 T 980 1065 T 1240 1105" strokeOpacity={0.65} />
            <path d="M -40 1200 Q 200 1175 440 1210 T 900 1185 T 1240 1230" strokeOpacity={0.45} />
            <path d="M -40 1380 Q 280 1345 520 1395 T 1000 1365 T 1240 1420" strokeOpacity={0.55} />
            <path d="M -40 1580 Q 240 1550 460 1595 T 940 1565 T 1240 1620" strokeOpacity={0.5} />
            <path d="M -40 1820 Q 300 1785 540 1835 T 1020 1800 T 1240 1860" strokeOpacity={0.6} />
            <path d="M -40 2080 Q 220 2050 480 2095 T 960 2065 T 1240 2120" strokeOpacity={0.45} />
            <path d="M -40 2320 Q 260 2290 500 2335 T 980 2305 T 1240 2360" strokeOpacity={0.5} />
          </g>
          <g
            opacity={0.15}
            fill="none"
            stroke={A.gold4}
            strokeWidth={0.48}
            strokeLinecap="round"
          >
            <path d="M -40 1040 Q 240 1015 460 1055 T 940 1025 T 1240 1070" strokeOpacity={0.7} />
            <path d="M -40 1280 Q 200 1255 420 1290 T 880 1265 T 1240 1310" strokeOpacity={0.55} />
            <path d="M -40 1480 Q 280 1450 500 1495 T 980 1465 T 1240 1520" strokeOpacity={0.6} />
            <path d="M -40 1720 Q 220 1690 450 1735 T 920 1705 T 1240 1760" strokeOpacity={0.5} />
            <path d="M -40 1980 Q 300 1945 520 1995 T 1000 1965 T 1240 2020" strokeOpacity={0.55} />
            <path d="M -40 2200 Q 240 2170 480 2215 T 960 2185 T 1240 2240" strokeOpacity={0.5} />
          </g>
        </>
      )}

      {!isSession && (
        <>
          {/* —— Scattered dots —— */}
          <g fill={A.gold3} opacity={0.17}>
            <circle cx="120" cy="620" r="1.6" />
            <circle cx="220" cy="710" r="2.2" />
            <circle cx="340" cy="655" r="1.4" />
            <circle cx="480" cy="780" r="2.6" />
            <circle cx="620" cy="690" r="1.5" />
            <circle cx="780" cy="740" r="2" />
            <circle cx="900" cy="670" r="1.7" />
            <circle cx="1050" cy="760" r="2.4" />
            <circle cx="150" cy="820" r="1.3" />
            <circle cx="540" cy="850" r="1.8" />
            <circle cx="720" cy="880" r="1.4" />
          </g>
          <g fill={A.terracotta} opacity={0.15}>
            <circle cx="260" cy="750" r="1.5" />
            <circle cx="410" cy="820" r="2" />
            <circle cx="950" cy="800" r="1.6" />
            <circle cx="1120" cy="720" r="1.2" />
          </g>

          {isOrientation && (
            <g fill={A.gold2} opacity={0.16}>
              <circle cx="180" cy="1020" r="1.5" />
              <circle cx="320" cy="1150" r="2.1" />
              <circle cx="500" cy="1100" r="1.4" />
              <circle cx="680" cy="1240" r="2.3" />
              <circle cx="840" cy="1180" r="1.6" />
              <circle cx="1000" cy="1320" r="1.8" />
              <circle cx="220" cy="1400" r="1.3" />
              <circle cx="450" cy="1520" r="2" />
              <circle cx="720" cy="1480" r="1.5" />
              <circle cx="980" cy="1580" r="2.2" />
              <circle cx="140" cy="1680" r="1.4" />
              <circle cx="560" cy="1750" r="1.7" />
              <circle cx="880" cy="1820" r="1.5" />
              <circle cx="340" cy="1950" r="2.4" />
              <circle cx="760" cy="2020" r="1.3" />
              <circle cx="1060" cy="2100" r="1.9" />
              <circle cx="280" cy="2250" r="1.6" />
              <circle cx="640" cy="2320" r="2" />
              <circle cx="920" cy="2400" r="1.4" />
            </g>
          )}

          {/* —— Dotted arc near bottom —— */}
          <path
            d="M 200 920 Q 600 860 1000 915"
            fill="none"
            stroke={A.brownMuted}
            strokeWidth={0.55}
            strokeDasharray="3 7"
            strokeOpacity={0.18}
          />
        </>
      )}
      </svg>
    </div>
  );
}
