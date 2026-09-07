export function WardenInstructions({ fire, legacy = false }: { fire: string; legacy?: boolean }) {
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
