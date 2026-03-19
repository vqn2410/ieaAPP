import React, { useState } from 'react';
import Card from './Card';
import Button from './Button';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <Card title={title} className="modal-content" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
        <div className="d-flex justify-end mt-4 pt-4 border-top" style={{ borderTop: '1px solid var(--color-border)' }}>
          <Button variant="outline" onClick={onClose} style={{ marginRight: '0.5rem' }}>Cerrar</Button>
        </div>
      </Card>
    </div>
  );
};

export default Modal;
