import React from 'react';
import { createPortal } from 'react-dom';
import Card from './Card';
import Button from './Button';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', boxSizing: 'border-box'
    }}>
      <Card title={title} className="modal-content" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', margin: 0 }}>
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
