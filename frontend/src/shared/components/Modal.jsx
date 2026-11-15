import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, wide = false }) {
  const container = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    const element = container.current;
    element?.focus();

    const onKey = (event) => {
      if (
        document.querySelectorAll('[role="dialog"]').length > 1 &&
        Array.from(document.querySelectorAll('[role="dialog"]')).at(-1) !== element
      ) {
        return;
      }
      if (event.key === 'Escape') {
        event.stopPropagation();
        close.current();
      }
      if (event.key === 'Tab') {
        const items = element.querySelectorAll(
          'button:not(:disabled),a[href],input:not(:disabled),select,textarea,[tabindex="0"]',
        );
        const first = items[0];
        const last = items[items.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === element)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop">
      <section
        className={'modal ' + (wide ? 'wide' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={container}
      >
        <div className="modal-heading">
          <span>{title}</span>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
