import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from 'gsap';

const SURFACES = '[data-menu], .dialog, .menu-select-popup, [data-menu-motion]';
const CONTROLS = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), [role="button"]';

/** Menu motion is entirely presentational; it never delays or advances game actions. */
export function useMenuMotion(ref: RefObject<HTMLElement | null>, reducedMotion: boolean) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || reducedMotion) return;
    const media = gsap.matchMedia(root);
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const entered = new WeakSet<HTMLElement>();
      const entrances = new Map<HTMLElement, gsap.core.Tween>();
      const confirmations = new Map<HTMLElement, gsap.core.Tween>();
      const clearConfirmation = (control: HTMLElement) => {
        control.classList.remove('menu-confirming');
        control.style.removeProperty('--menu-confirm-strength');
        confirmations.delete(control);
      };
      const enter = (surface: HTMLElement) => {
        if (surface.closest('[inert]') || entered.has(surface)) return;
        entered.add(surface);
        // A newly mounted dialog already carries its descendants into view.
        // Later tab panels may enter independently without restarting the dialog.
        for (let parent = surface.parentElement; parent && parent !== root; parent = parent.parentElement) {
          if (entrances.has(parent)) return;
        }
        const tween = gsap.fromTo(surface, { opacity: 0.82, y: 10 }, {
          opacity: 1, y: 0, duration: 0.24, ease: 'power2.out', clearProps: 'opacity,transform',
          onComplete: () => { entrances.delete(surface); },
        });
        entrances.set(surface, tween);
      };
      root.querySelectorAll<HTMLElement>(SURFACES).forEach(enter);
      const observer = new MutationObserver(records => {
        for (const record of records) for (const added of record.addedNodes) {
          if (!(added instanceof HTMLElement)) continue;
          if (added.matches(SURFACES)) enter(added);
          else added.querySelectorAll<HTMLElement>(SURFACES).forEach(enter);
        }
        for (const [element, tween] of entrances) if (!element.isConnected) { tween.revert(); entrances.delete(element); }
        for (const [control, tween] of confirmations) {
          if (!control.isConnected || control.closest('[inert]')) { tween.kill(); clearConfirmation(control); }
        }
      });
      observer.observe(root, { childList: true, subtree: true });

      const confirm = (event: Event) => {
        if (!(event.target instanceof Element)) return;
        const control = event.target.closest<HTMLElement>(CONTROLS);
        if (!control || control.closest('[inert]') || (event.type === 'click' && control.matches('input[type="range"]'))) return;
        if (!control.getClientRects().length || confirmations.has(control)) return;
        for (const [previous, tween] of confirmations) { tween.kill(); clearConfirmation(previous); }
        // Start at full brightness in the activation event itself. The edge belongs
        // to this control, so it cannot remain over a replacement screen.
        control.style.setProperty('--menu-confirm-strength', '1');
        control.classList.add('menu-confirming');
        const pulse = gsap.to(control, {
          '--menu-confirm-strength': 0, duration: 0.2, ease: 'power2.out',
          onComplete: () => clearConfirmation(control),
        });
        confirmations.set(control, pulse);
      };
      root.addEventListener('click', confirm, true);
      root.addEventListener('input', confirm, true);
      root.addEventListener('menu-adjust', confirm, true);
      return () => {
        observer.disconnect();
        root.removeEventListener('click', confirm, true);
        root.removeEventListener('input', confirm, true);
        root.removeEventListener('menu-adjust', confirm, true);
        for (const tween of entrances.values()) tween.revert();
        for (const [control, pulse] of confirmations) { pulse.kill(); clearConfirmation(control); }
      };
    });
    return () => media.revert();
  }, [ref, reducedMotion]);
}
