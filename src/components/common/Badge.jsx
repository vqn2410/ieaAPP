import React from 'react';

const Badge = ({ children, variant = 'gray', className = '', style = {}, ...restProps }) => {
  // Map internal variant names to CSS classes in index.css
  const variantMap = {
    gray: 'badge-gray',
    primary: 'badge-primary',
    secondary: 'badge-secondary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    blue: 'badge-blue',
    gold: 'badge-gold',
    green: 'badge-green',
    // Special path badges
    encuentro: 'badge-path-encuentro',
    discipulado: 'badge-path-discipulado',
    bautizado: 'badge-path-bautizado',
    iete: 'badge-path-iete',
    // Status badges
    active: 'badge-status-active',
    inactive: 'badge-status-inactive',
    baja: 'badge-status-baja'
  };

  const badgeClass = variantMap[String(variant).toLowerCase()] || 'badge-gray';

  return (
    <span className={`badge ${badgeClass} ${className}`} style={style} {...restProps}>
      {children}
    </span>
  );
};

export default Badge;
