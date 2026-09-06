import type { GameInput } from './types';

const emptyInput = (): GameInput => ({ x: 0, y: 0, boost: false, use: false, swap: false });
const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);
const actionKeys = new Set([...movementKeys, 'ShiftLeft', 'ShiftRight', 'Space', 'KeyE']);

function typingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.closest('[contenteditable="true"]')) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && !['range', 'checkbox', 'radio', 'button', 'submit', 'reset'].includes(target.type);
}

function visible(element: HTMLElement): boolean {
  if (!element.getClientRects().length || element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
  const style = getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

/** Owns physical state separately from suppressed state so a held button cannot leak across menus. */
export class GameInputController {
  device: 'keyboard' | 'gamepad' = 'keyboard';
  deadZone = 0.18;
  private gameplay = false;
  private disposed = false;
  private readonly keys = new Set<string>();
  private readonly suppressedKeys = new Set<string>();
  private readonly suppressedButtons = new Set<number>();
  private previousButtons: boolean[] = [];
  private axesSuppressed = false;
  private triggerActive = false;
  private useQueued = false;
  private swapQueued = false;
  private padIndex: number | null = null;
  private menuDirection = '';
  private nextMenuMove = 0;
  private readonly onPause: (reason: string) => void;

  constructor(onPause: (reason: string) => void) {
    this.onPause = onPause;
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.blur);
    document.addEventListener('visibilitychange', this.visibility);
    window.addEventListener('gamepaddisconnected', this.disconnect);
  }

  setGameplay(active: boolean): void {
    if (active === this.gameplay) return;
    this.clear();
    this.gameplay = active;
  }

  clear(): void {
    for (const key of this.keys) this.suppressedKeys.add(key);
    this.useQueued = false;
    this.swapQueued = false;
    this.triggerActive = false;
    this.menuDirection = '';
    this.nextMenuMove = 0;
    const pad = this.getPad();
    if (pad) {
      pad.buttons.forEach((button, index) => {
        if (button.pressed || button.value > 0.15) this.suppressedButtons.add(index);
      });
      this.previousButtons = pad.buttons.map(button => button.pressed || button.value > 0.5);
      this.axesSuppressed = Math.hypot(pad.axes[0] ?? 0, pad.axes[1] ?? 0) > this.deadZone;
    }
  }

  poll(): GameInput {
    if (this.disposed) return emptyInput();
    const wasGameplay = this.gameplay;
    const pad = this.getPad();
    let padX = 0;
    let padY = 0;
    let padUse = false;
    let padSwap = false;
    if (pad) {
      const raw = pad.buttons.map(button => button.pressed || button.value > 0.5);
      for (const index of this.suppressedButtons) {
        if ((pad.buttons[index]?.value ?? 0) <= 0.15 && !pad.buttons[index]?.pressed) this.suppressedButtons.delete(index);
      }
      const down = (index: number): boolean => !this.suppressedButtons.has(index) && (raw[index] ?? false);
      const edge = (index: number): boolean => down(index) && !this.previousButtons[index];
      const stickX = pad.axes[0] ?? 0;
      const stickY = pad.axes[1] ?? 0;
      const magnitude = Math.hypot(stickX, stickY);
      if (magnitude <= this.deadZone) this.axesSuppressed = false;
      if (!this.axesSuppressed && magnitude > this.deadZone) {
        const strength = Math.min(1, (magnitude - this.deadZone) / (1 - this.deadZone));
        padX = (stickX / magnitude) * strength;
        padY = (stickY / magnitude) * strength;
      }
      const dpadX = Number(down(15)) - Number(down(14));
      const dpadY = Number(down(13)) - Number(down(12));
      if (dpadX || dpadY) { padX = dpadX; padY = dpadY; }
      if (padX || padY || raw.some((pressed, index) => pressed && !this.previousButtons[index])) this.device = 'gamepad';
      const trigger = this.suppressedButtons.has(7) ? 0 : (pad.buttons[7]?.value ?? 0);
      this.triggerActive = this.triggerActive ? trigger > 0.15 : trigger >= 0.25;
      if (this.triggerActive) this.device = 'gamepad';
      if (edge(9) || (!this.gameplay && edge(1))) {
        this.previousButtons = raw;
        this.pause(this.gameplay ? 'pause' : 'back');
        return emptyInput();
      }
      if (this.gameplay) {
        padUse = edge(2);
        padSwap = edge(3);
      } else {
        this.pollMenu(padX, padY);
        if (edge(0)) this.activateMenuControl();
        if (edge(4)) this.switchTab(-1);
        if (edge(5)) this.switchTab(1);
      }
      this.previousButtons = raw;
    } else {
      this.triggerActive = false;
      this.previousButtons = [];
      this.suppressedButtons.clear();
      this.axesSuppressed = false;
      this.menuDirection = '';
    }
    if (!wasGameplay || !this.gameplay) {
      this.useQueued = false;
      this.swapQueued = false;
      return emptyInput();
    }
    const held = (key: string): boolean => this.keys.has(key) && !this.suppressedKeys.has(key);
    let x = Number(held('KeyD') || held('ArrowRight')) - Number(held('KeyA') || held('ArrowLeft'));
    let y = Number(held('KeyS') || held('ArrowDown')) - Number(held('KeyW') || held('ArrowUp'));
    if (padX || padY) { x = padX; y = padY; }
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) { x /= magnitude; y /= magnitude; }
    const frame: GameInput = {
      x, y,
      boost: held('ShiftLeft') || held('ShiftRight') || this.triggerActive,
      use: this.useQueued || padUse,
      swap: this.swapQueued || padSwap,
    };
    this.useQueued = false;
    this.swapQueued = false;
    return frame;
  }

  dispose(): void {
    this.disposed = true;
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.blur);
    document.removeEventListener('visibilitychange', this.visibility);
    window.removeEventListener('gamepaddisconnected', this.disconnect);
    this.keys.clear();
    this.suppressedKeys.clear();
  }

  private getPad(): Gamepad | null {
    try {
      const pads = navigator.getGamepads?.() ?? [];
      const current = this.padIndex === null ? null : pads[this.padIndex];
      const pad = current?.connected ? current : Array.from(pads).find(candidate => candidate?.connected && candidate.mapping === 'standard');
      this.padIndex = pad?.index ?? null;
      return pad ?? null;
    } catch { return null; }
  }

  private pause(reason: string): void {
    this.clear();
    this.onPause(reason);
  }

  private keyDown = (event: KeyboardEvent): void => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (typingTarget(event.target)) { this.device = 'keyboard'; return; }
    // After blur, a fresh keydown proves a new press even if its prior keyup happened elsewhere.
    if (!event.repeat && !this.keys.has(event.code)) this.suppressedKeys.delete(event.code);
    this.keys.add(event.code);
    this.device = 'keyboard';
    if (event.code === 'Escape') {
      event.preventDefault();
      if (!event.repeat && !this.suppressedKeys.has(event.code)) this.pause(this.gameplay ? 'pause' : 'back');
      return;
    }
    if (this.suppressedKeys.has(event.code)) { if (actionKeys.has(event.code)) event.preventDefault(); return; }
    if (this.gameplay) {
      if (actionKeys.has(event.code)) event.preventDefault();
      if (event.code === 'Space' && !event.repeat) this.useQueued = true;
      if (event.code === 'KeyE' && !event.repeat) this.swapQueued = true;
    } else {
      const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const direction = directions[event.code];
      if (direction && this.menuRoot()) { event.preventDefault(); this.moveMenu(...direction); }
      if (event.code === 'Enter' && this.menuRoot()) { event.preventDefault(); if (!event.repeat) this.activateMenuControl(); }
    }
  };

  private keyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
    this.suppressedKeys.delete(event.code);
  };

  private blur = (): void => {
    const active = this.gameplay;
    this.clear();
    // Key-up events may happen outside this window. Physical state must not remain stuck.
    this.keys.clear();
    if (active) this.onPause('focus-lost');
  };

  private visibility = (): void => { if (document.hidden) this.blur(); };
  private disconnect = (event: GamepadEvent): void => {
    if (event.gamepad.index !== this.padIndex) return;
    this.padIndex = null;
    this.previousButtons = [];
    if (this.gameplay) this.pause('controller-disconnected');
    else this.clear();
  };

  private menuRoot(): HTMLElement | null {
    const roots = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], [data-menu]')).filter(visible);
    const dialogs = roots.filter(root => root.getAttribute('role') === 'dialog');
    return (dialogs.length ? dialogs : roots).at(-1) ?? null;
  }

  private menuControls(): HTMLElement[] {
    const root = this.menuRoot();
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>('button, input:not([type="hidden"]), select, a[href], [role="tab"], [role="button"]'))
      .filter(element => visible(element) && !element.matches(':disabled') && element.getAttribute('aria-disabled') !== 'true');
  }

  private moveMenu(x: number, y: number): void {
    const controls = this.menuControls();
    if (!controls.length) return;
    const active = document.activeElement instanceof HTMLElement && controls.includes(document.activeElement) ? document.activeElement : null;
    if (!active) { controls[0]?.focus(); return; }
    if (x && active instanceof HTMLInputElement && (active.type === 'range' || active.type === 'number')) {
      try {
        const step = Number(active.step) > 0 ? Number(active.step) : 1;
        const min = active.min ? Number(active.min) : active.type === 'range' ? 0 : -Infinity;
        const max = active.max ? Number(active.max) : active.type === 'range' ? 100 : Infinity;
        const next = Number(Math.min(max, Math.max(min, (active.valueAsNumber || 0) + Math.sign(x) * step)).toPrecision(12));
        // Use the native setter so React's value tracker observes the following input event.
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(active, String(next));
        active.dispatchEvent(new Event('input', { bubbles: true }));
        active.dispatchEvent(new Event('change', { bubbles: true }));
      } catch { /* A custom nonnumeric step is allowed to decline adjustment. */ }
      return;
    }
    if (x && active instanceof HTMLSelectElement) {
      const direction = Math.sign(x);
      for (let index = active.selectedIndex + direction; index >= 0 && index < active.options.length; index += direction) {
        const option = active.options[index];
        if (!option || option.disabled || option.hidden || option.parentElement instanceof HTMLOptGroupElement && option.parentElement.disabled) continue;
        active.selectedIndex = index;
        active.dispatchEvent(new Event('change', { bubbles: true }));
        break;
      }
      return;
    }
    const from = active.getBoundingClientRect();
    const centerX = from.x + from.width / 2;
    const centerY = from.y + from.height / 2;
    const candidates = controls.filter(control => control !== active).map(control => {
      const rect = control.getBoundingClientRect();
      const dx = rect.x + rect.width / 2 - centerX;
      const dy = rect.y + rect.height / 2 - centerY;
      const along = dx * x + dy * y;
      const across = Math.abs(dx * y - dy * x);
      return { control, along, score: along + across * 2.5 };
    }).filter(candidate => candidate.along > 4).sort((a, b) => a.score - b.score);
    const next = candidates[0]?.control;
    if (next) { next.focus(); next.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }

  private activateMenuControl(): void {
    const controls = this.menuControls();
    const active = document.activeElement;
    const control = active instanceof HTMLElement && controls.includes(active) ? active : controls[0];
    control?.focus();
    control?.click();
  }

  private pollMenu(x: number, y: number): void {
    const direction = Math.abs(x) > Math.abs(y) ? (x > 0.45 ? 'right' : x < -0.45 ? 'left' : '') : (y > 0.45 ? 'down' : y < -0.45 ? 'up' : '');
    if (!direction) { this.menuDirection = ''; this.nextMenuMove = 0; return; }
    const now = performance.now();
    if (direction !== this.menuDirection || now >= this.nextMenuMove) {
      const first = direction !== this.menuDirection;
      this.moveMenu(direction === 'right' ? 1 : direction === 'left' ? -1 : 0, direction === 'down' ? 1 : direction === 'up' ? -1 : 0);
      this.nextMenuMove = now + (first ? 300 : 100);
      this.menuDirection = direction;
    }
  }

  private switchTab(direction: number): void {
    const root = this.menuRoot();
    const tabs = root ? Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]')).filter(tab => visible(tab) && !tab.matches(':disabled') && tab.getAttribute('aria-disabled') !== 'true') : [];
    if (!tabs.length) return;
    const current = Math.max(0, tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true'));
    const target = tabs[(current + direction + tabs.length) % tabs.length];
    target?.focus();
    target?.click();
  }
}
