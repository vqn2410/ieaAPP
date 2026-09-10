import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartHandshake, Home as HomeIcon, Sparkles, Instagram, Facebook, Youtube } from 'lucide-react';
import FloatingAssistant from '../components/common/FloatingAssistant';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const goPortal = () => navigate(currentUser ? '/dashboard' : '/login');

  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.iea-reveal'));
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="iea-home">
      <header className="iea-nav">
        <div className="iea-nav-brand" onClick={() => scrollTo('top')} role="button" tabIndex={0}>
          <img src="/img/icon-500x500.png" alt="IEA" className="iea-nav-logo" />
          <span>IGLESIA EXTREMO AMOR</span>
        </div>
        <nav className="iea-nav-links">
          <button onClick={() => scrollTo('somos')}>Somos</button>
          <button onClick={() => scrollTo('comunidad')}>Comunidad</button>
          <button onClick={() => scrollTo('visitanos')}>Visitanos</button>
          <button onClick={() => navigate('/extensiones')}>Iglesias en Extensión</button>
          <button className="iea-nav-cta" onClick={goPortal}>
            {currentUser ? 'IR AL PANEL' : 'INICIAR SESIÓN'}
          </button>
        </nav>
      </header>

      <section className="iea-hero" id="top">
        <div className="iea-hero-media" aria-hidden="true" />
        <div className="iea-hero-ellipse" aria-hidden="true" />
        <h1 className="iea-hero-title">
          <span className="iea-word iea-word-left">IGLESIA</span>
          <span className="iea-word iea-word-right">EXTREMO</span>
          <span className="iea-word iea-word-left">AMOR</span>
        </h1>
        <div className="iea-hero-bottom">
          <button className="iea-round-btn" onClick={() => scrollTo('visitanos')}>CONOCÉ IEA <span>↗</span></button>
        </div>
      </section>

      <div className="iea-strip">
        <p><span>NOS ENCONTRAMOS</span><strong>Sábados · 19:30</strong></p>
        <p><span>ESTAMOS EN</span><strong>Remedios de Escalada · Lanús</strong></p>
      </div>

      <section className="iea-slogan-section" aria-label="Nuestro slogan">
        <div className="iea-slogan-timeline">
          <div className="iea-slogan-step iea-reveal">
            <span className="iea-slogan-node"><svg className="iea-slogan-ring" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="34" /></svg><HeartHandshake size={28} /></span>
            <div className="iea-slogan-content">
              <span className="iea-slogan-index">01</span>
              <p className="iea-slogan-text">Un lugar de <strong>ENCUENTRO</strong>.</p>
            </div>
          </div>
          <div className="iea-slogan-step iea-reveal">
            <span className="iea-slogan-node"><svg className="iea-slogan-ring" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="34" /></svg><HomeIcon size={28} /></span>
            <div className="iea-slogan-content">
              <span className="iea-slogan-index">02</span>
              <p className="iea-slogan-text">Un lugar para la <strong>FAMILIA</strong>.</p>
            </div>
          </div>
          <div className="iea-slogan-step iea-reveal">
            <span className="iea-slogan-node"><svg className="iea-slogan-ring" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="34" /></svg><Sparkles size={28} /></span>
            <div className="iea-slogan-content">
              <span className="iea-slogan-index">03</span>
              <p className="iea-slogan-text">Un lugar para <strong>VOS</strong>.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="iea-section iea-light" id="somos">
        <div className="iea-section-label iea-reveal"><span>01</span>QUIÉNES SOMOS</div>
        <div className="iea-split">
          <h2 className="iea-display iea-reveal">CREEMOS EN UN DIOS REAL QUE TRANSFORMA VIDAS.</h2>
          <div className="iea-body iea-reveal">
            <p>En Iglesia Extremo Amor, somos una familia que camina unida en fe, amor y esperanza.</p>
            <div className="iea-schedule">
              <span>TODOS LOS SÁBADOS</span>
              <strong>19:30 HS</strong>
              <span>Remedios de Escalada, Buenos Aires.</span>
            </div>
            <button className="iea-inline-link" onClick={() => scrollTo('comunidad')}>Conocé nuestra comunidad <span>↗</span></button>
          </div>
        </div>

        <figure className="iea-meet-figure iea-reveal">
          <img src="/img/img-home.jpg" alt="Comunidad de Iglesia Extremo Amor" className="iea-meet-image" />
          <figcaption className="iea-meet-badge">
            <span>VIVÍ IEA</span>
            <strong>Vení a conocernos</strong>
          </figcaption>
        </figure>

        <div className="iea-values">
          <article className="iea-reveal"><span>01</span><h3>Jesús en el centro</h3><p>Todo lo que somos nace de Su amor y gira alrededor de Él.</p></article>
          <article className="iea-reveal"><span>02</span><h3>Vínculos reales</h3><p>Nadie fue hecho para caminar solo: crecemos en familia.</p></article>
          <article className="iea-reveal"><span>03</span><h3>Amor en acción</h3><p>Servimos con lo que tenemos para bendecir a otros.</p></article>
        </div>
      </section>

      <section className="iea-section iea-dark" id="comunidad">
        <div className="iea-section-label iea-reveal"><span>02</span>VIDA EN COMUNIDAD</div>
        <div className="iea-split">
          <h2 className="iea-display iea-reveal">NOS ENCONTRAMOS PARA CRECER JUNTOS.</h2>
          <div className="iea-body iea-reveal"><p>La iglesia no ocurre solamente durante una reunión. Se construye cuando compartimos la vida, nos cuidamos y aprendemos a seguir a Jesús con otros.</p></div>
        </div>
        <div className="iea-cards">
          <article className="iea-reveal">
            <span className="iea-card-eyebrow">CADA SÁBADO</span>
            <h3>Reunión general</h3>
            <p>Adoración, Palabra y un espacio para encontrarnos con Dios y con las personas.</p>
            <strong>19:30</strong>
          </article>
          <article className="iea-reveal">
            <span className="iea-card-eyebrow">DURANTE LA SEMANA</span>
            <h3>Grupos de amistad</h3>
            <p>Encuentros cercanos para conversar, orar, hacer preguntas y caminar acompañados.</p>
            <strong>JUNTOS</strong>
          </article>
          <article className="iea-reveal">
            <span className="iea-card-eyebrow">PARA CADA ETAPA</span>
            <h3>Nuevas generaciones y familias</h3>
            <p>Espacios para niños, adolescentes, jóvenes, matrimonios y familias.</p>
            <strong>TODOS</strong>
          </article>
        </div>
        <h2 className="iea-statement iea-reveal">NADIE FUE LLAMADO A CAMINAR SOLO.</h2>
      </section>

      <section className="iea-section iea-light" id="visitanos">
        <div className="iea-section-label iea-reveal"><span>03</span>TU PRIMERA VISITA</div>
        <div className="iea-split">
          <h2 className="iea-display iea-reveal">ESTE SÁBADO, HAY UN LUGAR PARA VOS.</h2>
          <div className="iea-visit-info iea-reveal">
            <div><span>CUÁNDO</span><strong>Sábados · 19:30</strong></div>
            <div><span>DÓNDE</span><strong>Remedios de Escalada, Lanús</strong></div>
            <a className="iea-instagram" href="https://instagram.com/iea_escalada" target="_blank" rel="noopener noreferrer">ESCRIBINOS POR INSTAGRAM<span>↗</span></a>
          </div>
        </div>

        <div className="iea-map iea-reveal">
          <iframe
            title="Ubicación Iglesia Extremo Amor"
            src="https://maps.google.com/maps?q=Av.+Coronel+Leonardo+Rosales+883,+Remedios+de+Escalada,+Buenos+Aires&z=16&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <div className="iea-map-pin" aria-hidden="true">
            <span className="iea-map-pin-ring" />
            <img src="/img/icon-500x500.png" alt="Iglesia Extremo Amor" />
          </div>
          <div className="iea-map-card">
            <div className="iea-map-card-head">
              <img src="/img/icon-500x500.png" alt="Portal IEA" />
              <div>
                <strong>IGLESIA EXTREMO AMOR</strong>
                <span>Av. Cnel. Rosales 883, Escalada</span>
                <span>Sábados · 19:30 hs</span>
              </div>
            </div>
            <a className="iea-map-link" href="https://maps.google.com/?q=Av.+Coronel+Leonardo+Rosales+883,+Remedios+de+Escalada" target="_blank" rel="noopener noreferrer">CÓMO LLEGAR <span>↗</span></a>
          </div>
        </div>
      </section>

      <footer className="iea-footer">
        <div className="iea-footer-top">
          <div className="iea-footer-brand">
            <img src="/img/icon-500x500.png" alt="IEA" />
            <span>IEA · IGLESIA EXTREMO AMOR</span>
            <p>Un lugar de <strong>ENCUENTRO</strong>. Un lugar para la <strong>FAMILIA</strong>. Un lugar para <strong>VOS</strong>.</p>
          </div>
          <div className="iea-footer-cols">
            <div className="iea-footer-col">
              <span>REDES</span>
              <div className="iea-footer-social">
                <a href="https://instagram.com/iea_escalada" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={18} /></a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={18} /></a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Youtube size={18} /></a>
              </div>
            </div>
            <div className="iea-footer-col">
              <span>IGLESIA</span>
              <button onClick={() => scrollTo('somos')}>Somos</button>
              <button onClick={() => scrollTo('comunidad')}>Comunidad</button>
              <button onClick={() => scrollTo('visitanos')}>Visitanos</button>
              <button onClick={() => navigate('/extensiones')}>Iglesias en Extensión</button>
            </div>
            <div className="iea-footer-col">
              <span>PORTAL</span>
              <button className="iea-footer-portal" onClick={goPortal}>Acceso a portal <b>↗</b></button>
            </div>
          </div>
        </div>
        <div className="iea-footer-bottom">
          <span>© 2026 Iglesia Extremo Amor. Todos los derechos reservados.</span>
          <a href="https://instagram.com/iea_escalada" target="_blank" rel="noopener noreferrer">@iea_escalada ↗</a>
        </div>
      </footer>
      <FloatingAssistant />
    </div>
  );
};

export default Home;
