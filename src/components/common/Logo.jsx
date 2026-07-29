import React from 'react';
import './common.css';

const Logo = ({ className = '', style = {}, textStyle = {}, showText: showTextProp, variant = 'full', size = 'medium', inverted = false }) => {
  const logoUrl = "/img/logo-iea.png";
  
  const showText = showTextProp !== undefined ? showTextProp : (variant === 'full' && size !== 'small');
  
  return (
    <div className={`logo-container ${className}`} style={style}>
      <img 
        src={logoUrl} 
        alt="Portal IEA"
        className={`logo-img-${size} ${inverted ? 'logo-white' : 'logo-black'}`}
      />
      {showText && (
        <div className="logo-text-container" style={textStyle}>
          <span className="logo-title-main">PORTAL IEA</span>
          <span className="logo-subtitle-main">PLATAFORMA ADMINISTRATIVA</span>
        </div>
      )}
    </div>
  );
};

export default Logo;
