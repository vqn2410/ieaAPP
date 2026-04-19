import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
import Logo from '../components/common/Logo';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const slides = [
    {
      image: 'https://i.postimg.cc/L4C9BcxG/660111209-18356544013230022-8343781813054001461-n.jpg',
      title: (
        <>
          IGLESIA<br />
          <span className="highlight-text animate-glow home-title-accent">
            EXTREMO AMOR
          </span>
        </>
      ),
      subtitle: (
        <>
          Un lugar de <strong className="meet-highlight">ENCUENTRO</strong>.<br />
          Un lugar para la <strong className="meet-highlight">FAMILIA</strong>, un lugar para <strong className="meet-highlight">VOS</strong>.
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
    <div className="home-container">
      {/* Navbar Minimalist */}
      <nav className="home-nav">
        <div className="home-nav-logo">
          <Logo size="small" inverted />
        </div>
        <div className="home-nav-links">
          <span className="d-none lg-d-block home-contact-link">CONTACTO</span>
          {currentUser ? (
            <Button variant="primary" className="home-nav-btn" onClick={() => navigate('/dashboard')}>IR AL PANEL</Button>
          ) : (
            <Button variant="primary" className="home-nav-btn" onClick={() => navigate('/login')}>INICIAR SESIÓN</Button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-wrapper">
        {slides.map((slide, index) => (
          <div
            key={index}
            className="hero-slide"
            style={{
              opacity: currentSlide === index ? 1 : 0,
              backgroundImage: `url(${slide.image})`
            }}
          >
            <div className="hero-overlay" />

            <div className="hero-content animate-fade-in">
              <span className="hero-meta">
                {slide.meta}
              </span>
              <h1 className="hero-title">
                {slide.title}
              </h1>
              <p className="hero-subtitle">
                {slide.subtitle}
              </p>
              <div className="hero-btns">
                <Button size="lg" className="hero-btn-primary">
                  {slide.cta}
                </Button>
                <Button size="lg" variant="outline" className="hero-btn-outline">
                  UBICACIÓN
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Indicators */}
        <div className="hero-indicators">
          {slides.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrentSlide(i)}
              className="indicator-dot"
              style={{
                background: currentSlide === i ? '#ffffff' : 'rgba(255,255,255,0.2)'
              }}
            />
          ))}
        </div>
      </section>

      {/* Meet Section */}
      <section className="meet-section">
        <div className="animate-fade-in">
          <h2 className="meet-title">CREEMOS EN UN DIOS REAL QUE TRANSFORMA VIDAS.</h2>
          <p className="meet-text">
            En Iglesia Extremo Amor, somos una familia que camina unida en fe, amor y esperanza. <br /><br />
            Un lugar de <strong className="meet-highlight">ENCUENTRO</strong>. <br />
            Un lugar para la <strong className="meet-highlight">FAMILIA</strong>. <br />
            Un lugar para <strong className="meet-highlight">VOS</strong>.
          </p>
          <div className="meet-schedule">
            <h4 className="schedule-title">TODOS LOS SÁBADOS</h4>
            <p className="schedule-time">19:30 HS</p>
            <p className="meet-text">Remedios de Escalada, Buenos Aires.</p>
          </div>
        </div>
        <div className="meet-image-container">
          <img
            src="https://i.postimg.cc/28d3rb0t/img-home.jpg"
            alt="Reunión"
            className="meet-image"
          />
          <div className="meet-badge">
            <p className="meet-badge-title">#SOMOSIEA</p>
            <p className="meet-badge-subtitle">Vení a conocernos</p>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section className="location-section">
        <div className="map-container">
          <div className="map-wrapper">
             <iframe 
               src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3278.431057497184!2d-58.404221124235215!3d-34.71738737291244!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bccd4d7729215f%3A0xe781977755b46b6e!2sAv.%20Coronel%20Leonardo%20Rosales%20883%2C%20B1826%20Remedios%20de%20Escalada%2C%20Provincia%20de%20Buenos%20Aires!5e0!3m2!1ses-419!2sar!4v1714100000000!5m2!1ses-419!2sar" 
               width="100%" 
               height="100%" 
               style={{ border: 0, filter: 'grayscale(1) invert(0.9) contrast(1.2)', opacity: 0.7 }} 
               allowFullScreen="" 
               loading="lazy" 
               referrerPolicy="no-referrer-when-downgrade"
             ></iframe>
             <div className="map-marker-overlay">
                <div className="map-marker-point">
                   <img src="https://i.postimg.cc/cCc0M30b/500x500.png" alt="IEA Location" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                </div>
                <div className="map-tooltip">
                   <h3>IGLESIA EXTREMO AMOR</h3>
                   <p>📍 Av. Cnel. Rosales 883, Escalada</p>
                   <p>⏰ Sábados 19:30hs</p>
                   <div className="tooltip-arrow"></div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Footer Minimalist */}
      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h2>
              IGLESIA <strong style={{ fontWeight: 900, color: '#ffffff' }}>EXTREMO AMOR</strong>
            </h2>
            <p className="meet-text" style={{ maxWidth: '400px' }}>
              © 2026 Todos los derechos reservados a Iglesia Extremo Amor.
            </p>
          </div>
          <div className="footer-links">
            <div className="footer-link-col">
              <span>REDES</span>
              <span>INSTAGRAM</span>
              <span>FACEBOOK</span>
              <span>YOUTUBE</span>
            </div>
            <div className="footer-link-col">
              <span>LEGAL</span>
              <span>PRIVACIDAD</span>
              <span>TÉRMINOS</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
