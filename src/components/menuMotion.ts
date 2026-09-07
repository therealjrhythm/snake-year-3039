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
      const entrances = new Map<HTMLElement, gsap.core.Tween>();
      const confirmations = new Map<HTMLElement, gsap.core.Timeline>();
      let lastConfirmation = -Infinity;
      const enter = (surface: HTMLElement) => {
        if (surface.closest('[inert]') || entrances.has(surface)) return;
        // Small movement keeps the scene behind the menu stationary and text readable.
        const tween = gsap.fromTo(surface, { opacity: 0.6, y: 14 }, {
          opacity: 1, y: 0, duration: 0.32, ease: 'power2.out', clearProps: 'opacity,transform',
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
      });
      observer.observe(root, { childList: true, subtree: true });

      const confirm = (event: Event) => {
        if (!(event.target instanceof Element)) return;
        const control = event.target.closest<HTMLElement>(CONTROLS);
        if (!control || control.closest('[inert]') || (event.type === 'click' && control.matches('input[type="range"]'))) return;
        const now = performance.now();
        // A held slider or rapidly repeated input produces no repeated strobing.
        if (now - lastConfirmation < 650) return;
        lastConfirmation = now;
        const bounds = control.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const outline = document.createElement('div');
        outline.className = 'menu-confirmation';
        outline.setAttribute('aria-hidden', 'true');
        Object.assign(outline.style, { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px` });
        root.appendChild(outline);
        const pulse = gsap.timeline({ onComplete: () => { outline.remove(); confirmations.delete(outline); } });
        pulse.fromTo(outline, { opacity: 0 }, { opacity: 1, duration: 0.09, ease: 'power1.out' })
          .to(outline, { opacity: 0, duration: 0.36, ease: 'power2.out' });
        confirmations.set(outline, pulse);
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
        for (const [outline, pulse] of confirmations) { pulse.kill(); outline.remove(); }
      };
    });
    return () => media.revert();
  }, [ref, reducedMotion]);
}
