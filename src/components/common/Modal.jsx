import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Card from './Card';
import Button from './Button';

const Modal = ({ isOpen, onClose, title, children, size = 'md', className = '' }) => {
  const overlayRef = useRef(null);

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

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'min(100%, 400px)',
    md: 'min(100%, 500px)',
    lg: 'min(100%, 860px)',
  };

  return createPortal(
    <div ref={overlayRef} className="modal-overlay">
       <Card title={title} className={`modal-content modal-size-${size} ${className}`} style={{ width: '100%', minWidth: 0, maxWidth: sizeStyles[size] || sizeStyles.md, overflowY: 'auto', overflowX: 'hidden', margin: 'auto' }}>
        {children}
        <div className="d-flex justify-end mt-4 pt-4 border-top" style={{ borderTop: '1px solid var(--color-border)' }}>
          <Button variant="outline" onClick={onClose} style={{ marginRight: '0.5rem' }}>Cerrar</Button>
        </div>
      </Card>
    </div>,
    document.body
  );
};

export default Modal;
