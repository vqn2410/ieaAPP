import React from 'react';
import './common.css';

const Logo = ({ className = '', style = {}, textStyle = {}, showText: showTextProp, variant = 'full', size = 'medium', inverted = false }) => {
  const logoUrl = "https://i.postimg.cc/0jscK4Jr/LOGO_IEA_SIN_FONDO_B_W_2.png";
  
  // Conditionally show text based on variant and size if not explicitly provided
  const showText = showTextProp !== undefined ? showTextProp : (variant === 'full' && size !== 'small');
  
  return (
    <div className={`logo-container ${className}`} style={style}>
      <img 
        src={logoUrl} 
        alt="IEA Logo" 
        className={`logo-img-${size} ${inverted ? 'logo-white' : 'logo-black'}`}
      />
      {showText && (
        <div className="logo-text-container" style={textStyle}>
          <span className="logo-title-main">IEA APP</span>
          <span className="logo-subtitle-main">PLATAFORMA ADMINISTRATIVA</span>
        </div>
      )}
    </div>
  );
};

export default Logo;
