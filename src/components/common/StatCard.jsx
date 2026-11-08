import React from 'react';
import { motion as Motion } from 'framer-motion';
import Card from './Card';
import './common.css';

const StatCard = ({
  title,
  value,
  icon: Icon,
  iconColor = 'var(--v15-accent, var(--color-primary))',
  loading = false,
  hint,
  className = '',
}) => {
  return (
    <Motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      style={{ height: '100%' }}
    >
      <Card className={`stat-card v15-bento-stat ${className}`}>
        <div className="stat-card-row">
          <div
            className="stat-card-icon-container"
            style={{
              color: iconColor,
              backgroundColor: `color-mix(in srgb, ${iconColor} 12%, transparent)`,
            }}
          >
            {Icon && <Icon size={21} strokeWidth={1.75} />}
          </div>
          <div className="stat-card-content">
            {loading ? (
              <div className="skeleton" style={{ width: '48px', height: '28px', marginBottom: '4px', borderRadius: '8px' }}></div>
            ) : (
              <div className="stat-card-value">{value}</div>
            )}
            <span className="stat-card-label">{title}</span>
            {hint && <span className="stat-card-hint">{hint}</span>}
          </div>
        </div>
      </Card>
    </Motion.div>
  );
};

export default StatCard;
