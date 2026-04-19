import React from 'react';
import Card from './Card';
import './common.css';

const StatCard = ({ title, value, icon: Icon, iconColor = 'var(--color-primary)', loading = false, className = '' }) => {
  return (
    <Card className={`d-flex align-center gap-3 interactive-list-item ${className}`}>
      <div 
        className="stat-card-icon-container" 
        style={{ 
          backgroundColor: `rgba(${iconColor.includes('--') ? 'var(' + iconColor.replace('color-', 'color-') + '-rgb)' : 'var(--color-primary-rgb)'}, 0.1)`, 
          color: iconColor
        }}
      >
        <Icon size={24} />
      </div>
      <div>
        {loading ? (
          <div className="skeleton" style={{ width: '40px', height: '28px', marginBottom: '4px' }}></div>
        ) : (
          <h3 className="stat-card-value">{value}</h3>
        )}
        <span className="stat-card-label">{title}</span>
      </div>
    </Card>
  );
};

export default StatCard;
