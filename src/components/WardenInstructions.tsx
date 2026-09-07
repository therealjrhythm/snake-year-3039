import './warden-instructions.css';

export function WardenInstructions({ fire, legacy = false, hybrid = false }: { fire: string; legacy?: boolean; hybrid?: boolean }) {
  if (!legacy && !hybrid) return <div className="warden-instructions laser-instructions">
    <div className="warden-route">
      <figure className="lab-visual warden-combat-visual">
        <svg viewBox="0 0 320 320" role="img" aria-label="Collect spheres 1, 2 and 3, then fire your snake laser upward at Warden's glowing target">
          <defs><radialGradient id="target-glow"><stop stopColor="#ffcf5a" stopOpacity=".5" /><stop offset="1" stopColor="#ffcf5a" stopOpacity="0" /></radialGradient></defs>
          <path d="M50 69 81 38h158l31 31-25 41H75Z" fill="#122d46" stroke="#bc85ff" strokeWidth="3" />
          <path d="m93 61 28 13m106-13-28 13" stroke="#ff547a" strokeWidth="7" />
          <circle cx="160" cy="108" r="40" fill="url(#target-glow)" />
          <circle cx="160" cy="108" r="18" fill="#132732" stroke="#ffe18b" strokeWidth="3" />
          <path d="M160 97v22m-11-11h22" stroke="#ffe18b" strokeWidth="3" />
          <path d="M160 234v-94" stroke="#bf45ff" strokeWidth="13" opacity=".23" />
          <path d="M160 234v-94" stroke="#da78ff" strokeWidth="4" />
          <path d="m155 151 5-11 5 11" fill="none" stroke="#f6c7ff" strokeWidth="3" />
          <path d="m149 251 11-19 11 19v27h-22Z" fill="#1d2141" stroke="#da78ff" strokeWidth="3" />
          {[{ x: 61, y: 189, n: 1 }, { x: 259, y: 189, n: 2 }, { x: 259, y: 269, n: 3 }].map(({ x, y, n }) => <g key={n}><circle cx={x} cy={y} r="25" fill="#29dfff" opacity=".10" /><circle cx={x} cy={y} r="17" fill="#0d495b" stroke="#8af3ff" strokeWidth="2" /><text x={x} y={y + 6} textAnchor="middle" fill="#efffff" fontSize="20" fontFamily="sans-serif">{n}</text></g>)}
        </svg>
        <figcaption>Glowing ⊕ target<br /><strong>Top-center, below Warden</strong></figcaption>
      </figure>
      <ol>
        <li><strong>Collect spheres 1 → 2 → 3 in order.</strong> The next sphere shines brightest. All three charge your laser and open Warden’s armor.</li>
        <li><strong>Face the glowing ⊕ target below Warden and hold <kbd>{fire}</kbd>.</strong> Land three laser hits to break one armor piece. Your laser matches your snake’s glow and needs no ammo during this fight.</li>
        <li><strong>Dodge Warden’s return fire.</strong> Orange aiming lines show where red shots will travel. Keep moving away from those lines.</li>
        <li><strong>Repeat for three armor pieces, then leave through the top gate.</strong> Each broken piece needs a new set of three spheres.</li>
      </ol>
    </div>
    <p className="warden-shooting">Your charge stays ready until you break an armor piece. Collect, aim, fire—there is no floor pad to cross in this fight.</p>
  </div>;
  return <div className="warden-instructions">
    <div className="warden-route">
      <figure className="lab-visual warden-pad-visual">
        <img src="/images/powerups/warden-pad.png" width="320" height="320" alt="Warden's round floor pad glowing green, with a double-arrow symbol" />
        <figcaption>Bottom-center of the arena<br /><strong>Green = ready to cross</strong></figcaption>
      </figure>
      <ol>
        <li><strong>Collect the glowing numbers 1 → 2 → 3 in order.</strong> The next number glows brightest.</li>
        <li><strong>Find the round floor pad at the bottom-center of the arena.</strong> Avoid the lasers and wait until the pad turns green. Steer through it to break one piece of Warden’s armor.</li>
        <li><strong>Repeat for all three armor pieces.</strong> Collect a new set of numbers each time, then leave through the gate at the top-center.</li>
      </ol>
    </div>
    {!legacy ? <p className="warden-shooting"><strong>Prefer shooting?</strong> When the pad turns green, you can instead land three blaster shots on the yellow ⊕ target directly below Warden, at the top-center. Hold <kbd>{fire}</kbd> to fire. The pad always works without ammunition.</p> : null}
  </div>;
}
