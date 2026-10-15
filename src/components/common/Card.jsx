import React from 'react';

const Card = ({
  children,
  title,
  className = '',
  headerAction,
  footer,
  divided = false,
  ...rest
}) => {
  const hasHeader = Boolean(title || headerAction);
  return (
    <div className={`card ${className}`} {...rest}>
      {hasHeader && (
        <div className={`card-header d-flex justify-between align-center ${divided ? 'card-header--divided' : 'mb-4'}`}>
          {title && <h3 className="card-title" style={{ margin: 0 }}>{title}</h3>}
          {headerAction && <div className="card-action">{headerAction}</div>}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
};

export default Card;
