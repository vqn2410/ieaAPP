import React from 'react';

const Card = ({ children, title, className = '', headerAction }) => {
  return (
    <div className={`card ${className}`}>
      {(title || headerAction) && (
        <div className="card-header d-flex justify-between align-center mb-4">
          {title && <h3 className="card-title" style={{ margin: 0 }}>{title}</h3>}
          {headerAction && <div className="card-action">{headerAction}</div>}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
    </div>
  );
};

export default Card;
