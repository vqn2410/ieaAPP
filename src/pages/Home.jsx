import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  Calendar, 
  Newspaper, 
  Heart, 
  Info,
  ArrowRight,
  Radio
} from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

const Home = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const slides = [
    {
      image: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=2073',
      title: (
        <>
          IGLESIA<br/>
          <span 
            className="highlight-text animate-glow" 
            style={{ fontWeight: 900, color: '#ffffff', fontSize: '1.15em' }}
          >
            EXTREMO AMOR
          </span>
        </>
      ),
      subtitle: (
        <>
          Un lugar de <strong style={{ color: '#ffffff' }}>ENCUENTRO</strong>.<br/>
          Un lugar para la <strong style={{ color: '#ffffff' }}>FAMILIA</strong>, un lugar para <strong style={{ color: '#ffffff' }}>VOS</strong>.
        </>
      ),
      cta: 'CONTACTARNOS',
      meta: 'SÁBADOS 19:30HS - R. DE ESCALADA'
    }
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div style={{ 
      background: 'var(--public-bg)', 
      color: 'var(--public-text)', 
      minHeight: '100vh', 
      fontFamily: "'Outfit', sans-serif",
      '--color-text': 'var(--public-text)'
    }}>
      {/* Navbar Minimalist */}
      <nav style={{ 
        padding: '1.5rem 5%', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        position: 'absolute',
        top: 0, width: '100%', zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="https://i.postimg.cc/0jscK4Jr/LOGO_IEA_SIN_FONDO_B_W_2.png" alt="IEA Logo" style={{ height: '40px', filter: 'brightness(0) invert(1)' }} />
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <span className="d-none lg-d-block" style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '2px', cursor: 'pointer' }}>CONTACTO</span>
          {currentUser ? (
             <Button variant="primary" style={{ background: '#ffffff', color: '#000000', borderRadius: '4px', fontWeight: 700 }} onClick={() => navigate('/dashboard')}>IR AL PANEL</Button>
          ) : (
             <Button variant="primary" style={{ background: '#ffffff', color: '#000000', borderRadius: '4px', fontWeight: 700 }} onClick={() => navigate('/login')}>INICIAR SESIÓN</Button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ position: 'relative', height: '100vh', width: '100%', overflow: 'hidden' }}>
        {slides.map((slide, index) => (
          <div 
            key={index}
            style={{ 
              position: 'absolute', 
              inset: 0, 
              opacity: currentSlide === index ? 1 : 0, 
              transition: 'opacity 1.5s ease-in-out',
              backgroundImage: `url(${slide.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              padding: '0 10%'
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.2) 100%)' }} />
            
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px' }} className="animate-fade-in">
              <span style={{ display: 'block', color: 'var(--public-muted)', letterSpacing: '4px', fontWeight: 600, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {slide.meta}
              </span>
              <h1 style={{ 
                fontSize: 'clamp(3rem, 10vw, 6rem)', 
                lineHeight: 0.9, 
                fontWeight: 400, 
                marginBottom: '2rem',
                textTransform: 'uppercase',
                whiteSpace: 'pre-line' 
              }}>
                {slide.title}
              </h1>
              <p style={{ 
                fontSize: '1.25rem', 
                color: 'var(--public-muted)', 
                marginBottom: '3rem', 
                maxWidth: '600px',
                whiteSpace: 'pre-line',
                lineHeight: 1.6
              }}>
                {slide.subtitle}
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button size="lg" style={{ background: '#ffffff', color: '#000000', borderRadius: '4px', padding: '1.25rem 2.5rem' }}>
                  {slide.cta}
                </Button>
                <Button size="lg" variant="outline" style={{ borderColor: '#ffffff', color: '#ffffff', borderRadius: '4px', padding: '1.25rem 2.5rem' }}>
                   UBICACIÓN
                </Button>
              </div>
            </div>
          </div>
        ))}
        
        {/* Indicators */}
        <div style={{ position: 'absolute', bottom: '3rem', left: '10%', display: 'flex', gap: '1.5rem', zIndex: 10 }}>
          {slides.map((_, i) => (
            <div 
              key={i} 
              onClick={() => setCurrentSlide(i)}
              style={{ 
                width: '60px', 
                height: '3px', 
                background: currentSlide === i ? '#ffffff' : 'rgba(255,255,255,0.2)', 
                cursor: 'pointer',
                transition: 'all 0.4s'
              }} 
            />
          ))}
        </div>
      </section>

      {/* Meet Section */}
      <section style={{ padding: 'var(--public-section-pad) 10%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
        <div className="animate-fade-in">
          <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '2rem', lineHeight: 1.1 }}>CREEMOS EN UN DIOS REAL QUE TRANSFORMA VIDAS.</h2>
          <p style={{ fontSize: '1.25rem', color: 'var(--public-muted)', lineHeight: 1.8 }}>
            En Iglesia Extremo Amor, somos una familia que camina unida en fe, amor y esperanza. <br/><br/>
            Un lugar de <strong style={{ color: '#ffffff' }}>ENCUENTRO</strong>. <br/>
            Un lugar para la <strong style={{ color: '#ffffff' }}>FAMILIA</strong>. <br/>
            Un lugar para <strong style={{ color: '#ffffff' }}>VOS</strong>.
          </p>
          <div style={{ marginTop: '3rem', padding: '2rem', borderLeft: '4px solid #ffffff', background: 'var(--public-surface)' }}>
             <h4 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>TODOS LOS SÁBADOS</h4>
             <p style={{ fontSize: '2rem', fontWeight: 800 }}>19:30 HS</p>
             <p style={{ color: 'var(--public-muted)' }}>Remedios de Escalada, Buenos Aires.</p>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <img 
            src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=2070" 
            alt="Reunión" 
            style={{ width: '100%', borderRadius: '8px', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }} 
          />
          <div style={{ 
            position: 'absolute', bottom: '-20px', left: '-20px', 
            background: '#ffffff', color: '#000000', padding: '2rem', borderRadius: '4px' 
          }}>
            <p style={{ fontWeight: 800, fontSize: '1.2rem' }}>SOMOS IEA</p>
            <p style={{ fontSize: '0.9rem' }}>Vení a conocernos</p>
          </div>
        </div>
      </section>

      {/* Footer Minimalist */}
      <footer style={{ padding: '4rem 10%', borderTop: '1px solid rgba(255,255,255,0.1)', background: '#080808' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '2rem' }}>
          <div>
            <h2 style={{ fontWeight: 400, fontSize: '2rem', marginBottom: '1rem', color: 'var(--public-muted)' }}>
              IGLESIA <strong style={{ color: '#ffffff', fontWeight: 900 }}>EXTREMO AMOR</strong>
            </h2>
            <p style={{ color: 'var(--public-muted)', maxWidth: '400px' }}>
              © 2026 Todos los derechos reservados a Iglesia Extremo Amor.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '3rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.8rem', letterSpacing: '2px', color: 'var(--public-muted)' }}>REDES</span>
              <span style={{ fontWeight: 600 }}>INSTAGRAM</span>
              <span style={{ fontWeight: 600 }}>FACEBOOK</span>
              <span style={{ fontWeight: 600 }}>YOUTUBE</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.8rem', letterSpacing: '2px', color: 'var(--public-muted)' }}>LEGAL</span>
              <span style={{ fontWeight: 600 }}>PRIVACIDAD</span>
              <span style={{ fontWeight: 600 }}>TÉRMINOS</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
