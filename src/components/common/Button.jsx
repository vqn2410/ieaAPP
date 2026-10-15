import React from 'react';
import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  type,
  ...props
}) => {
  const isDisabled = disabled || loading;
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth ? 'btn-block' : '',
    loading ? 'is-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {!loading && icon && <span className="btn-icon">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
