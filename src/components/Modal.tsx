import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, subtitle, onClose, children, className = '' }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = ref.current;
    element?.querySelector<HTMLElement>('button, input, select')?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(element?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select, [tabindex="0"]') ?? []).filter(el => el.offsetParent !== null);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    element?.addEventListener('keydown', trap);
    return () => { element?.removeEventListener('keydown', trap); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop"><div className={`dialog ${className}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
    <div className="dialog-heading"><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div><button className="icon-button" aria-label={`Close ${title}`} onClick={onClose}><X size={23} /></button></div>
    {children}
  </div></div>;
}
