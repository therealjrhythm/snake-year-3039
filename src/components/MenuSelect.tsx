import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

export interface MenuSelectOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  description?: string;
}

/** A controller-readable selector whose options remain inside the game's menu. */
export function MenuSelect<T extends string>({ label, value, options, onChange, className = '' }: {
  label: string;
  value: T;
  options: readonly MenuSelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const firstOption = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [popupLayout, setPopupLayout] = useState({ above: false, maxHeight: 330 });
  const selected = options.find(option => option.value === value);
  const initialOption = options.find(option => option.value === value && !option.disabled)
    ?? options.find(option => !option.disabled);

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  };

  useLayoutEffect(() => {
    if (!open) return;
    const button = trigger.current;
    if (button && popup.current) {
      const bounds = button.getBoundingClientRect();
      const container = button.closest('.dialog, .briefing')?.getBoundingClientRect();
      const below = Math.min(window.innerHeight - 14, container ? container.bottom - 10 : Infinity) - bounds.bottom - 6;
      const above = bounds.top - Math.max(14, container ? container.top + 10 : 0) - 6;
      const desired = Math.min(330, popup.current.scrollHeight);
      const placeAbove = below < desired && above > below;
      setPopupLayout({ above: placeAbove, maxHeight: Math.max(100, Math.min(330, placeAbove ? above : below)) });
    }
    firstOption.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapper.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener('pointerdown', outside);
    return () => window.removeEventListener('pointerdown', outside);
  }, [open]);

  useEffect(() => {
    const element = trigger.current;
    if (!element || open) return;
    const adjust = (event: Event) => {
      const direction = (event as CustomEvent<{ direction?: number }>).detail?.direction;
      if (direction !== -1 && direction !== 1) return;
      const available = options.filter(option => !option.disabled);
      const index = available.findIndex(option => option.value === value);
      const next = available[Math.max(0, Math.min(available.length - 1, index + direction))];
      if (next && next.value !== value) onChange(next.value);
    };
    element.addEventListener('menu-adjust', adjust);
    return () => element.removeEventListener('menu-adjust', adjust);
  }, [open, options, onChange, value]);

  const typeahead = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (open || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1 || event.key === ' ') return;
    const available = options.filter(option => !option.disabled);
    const current = available.findIndex(option => option.value === value);
    const letter = event.key.toLocaleLowerCase();
    for (let offset = 1; offset <= available.length; offset++) {
      const next = available[(current + offset + available.length) % available.length];
      if (next?.label.toLocaleLowerCase().startsWith(letter)) {
        event.preventDefault();
        onChange(next.value);
        break;
      }
    }
  };

  const trapTab = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    if (!controls.length) return;
    event.preventDefault();
    const current = controls.findIndex(control => control === document.activeElement);
    const next = current < 0 ? (event.shiftKey ? controls.length - 1 : 0)
      : (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
    controls[next]?.focus({ preventScroll: true });
  };

  return <div className={`menu-select ${className}`} ref={wrapper}>
    <button className="menu-select-trigger" type="button" role="combobox" aria-label={label}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-listbox`} ref={trigger}
      onClick={() => open ? close() : setOpen(true)} onKeyDown={typeahead}>
      <span className="menu-select-value">{selected?.label ?? value}</span>
      <span className="menu-select-chevron" aria-hidden="true">⌄</span>
    </button>
    {open ? <div className="menu-select-popup" data-menu-popup onKeyDown={trapTab} ref={popup}
      style={{ maxHeight: popupLayout.maxHeight, ...(popupLayout.above ? { top: 'auto', bottom: 'calc(100% + 6px)' } : {}) }}>
      <div id={`${id}-listbox`} role="listbox" aria-label={label}>
        {options.map(option => <button type="button" className="menu-select-option" role="option"
          aria-selected={option.value === value} disabled={option.disabled} key={option.value}
          ref={option === initialOption ? firstOption : undefined}
          data-autofocus={option === initialOption || undefined}
          onClick={() => { onChange(option.value); close(); }}>
          <span>{option.label}</span>{option.description ? <small>{option.description}</small> : null}
        </button>)}
      </div>
      <button type="button" className="menu-select-cancel" data-menu-back onClick={() => close()}>Cancel</button>
    </div> : null}
  </div>;
}
