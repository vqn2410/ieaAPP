import React, { useLayoutEffect, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Card from './Card';
import Button from './Button';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const getFocusable = (container) =>
  Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
  );

const Modal = ({ isOpen, onClose, title, children, size = 'md', className = '' }) => {
  const overlayRef = useRef(null);
  const previousFocusRef = useRef(null);

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const overlay = overlayRef.current;
    overlay?.scrollTo?.(0, 0);
    overlay?.querySelector('.modal-content')?.scrollTo?.(0, 0);
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Focus management: move focus in, restore on close
  useEffect(() => {
    if (!isOpen) return undefined;
    previousFocusRef.current = document.activeElement;
    const content = overlayRef.current?.querySelector('.modal-content');
    const first = content ? getFocusable(content)[0] : null;
    (first || content)?.focus?.({ preventScroll: true });
    return () => {
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === 'function') {
        prev.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const content = overlayRef.current?.querySelector('.modal-content');
      if (!content) return;
      const items = getFocusable(content);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = content.contains(active);

      if (event.shiftKey) {
        if (!inside || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'min(100%, 400px)',
    md: 'min(100%, 540px)',
    lg: 'min(100%, 940px)',
    xl: 'min(100%, 1120px)',
  };

  const handleOverlayMouseDown = (event) => {
    if (!onClose) return;
    if (event.target === event.currentTarget) onClose();
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="modal-overlay"
      onMouseDown={handleOverlayMouseDown}
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Diálogo'}
        tabIndex={-1}
        title={title}
        className={`modal-content modal-size-${size} ${className}`}
        style={{
          width: '100%',
          minWidth: 0,
          maxWidth: sizeStyles[size] || sizeStyles.md,
          overflowY: 'auto',
          overflowX: 'hidden',
          margin: 'auto',
        }}
      >
        {children}
        {onClose && (
          <div className="d-flex justify-end mt-4 pt-4 modal-actions" style={{ borderTop: '1px solid var(--color-border)' }}>
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </div>
        )}
      </Card>
    </div>,
    document.body
  );
};

export default Modal;
