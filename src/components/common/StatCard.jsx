import React from 'react';
import Card from './Card';
import './common.css';

const StatCard = ({
  title,
  value,
  icon: Icon,
  iconColor = 'var(--color-primary)',
  loading = false,
  hint,
  className = '',
}) => {
  return (
    <Card className={`stat-card ${className}`}>
      <div className="stat-card-row">
        <div
          className="stat-card-icon-container"
          style={{
            color: iconColor,
            backgroundColor: `color-mix(in srgb, ${iconColor} 12%, transparent)`,
          }}
        >
          {Icon && <Icon size={22} strokeWidth={1.75} />}
        </div>
        <div className="stat-card-content">
          {loading ? (
            <div className="skeleton" style={{ width: '40px', height: '28px', marginBottom: '4px' }}></div>
          ) : (
            <div className="stat-card-value">{value}</div>
          )}
          <span className="stat-card-label">{title}</span>
          {hint && <span className="stat-card-hint">{hint}</span>}
        </div>
      </div>
    </Card>
  );
};

export default StatCard;
