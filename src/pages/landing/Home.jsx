import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HeartHandshake, Home as HomeIcon, Sparkles, Instagram, Facebook, Youtube, ArrowUpRight, Cross, Megaphone, Smile, Gift, Heart, MessageCircle, ChevronDown, Calendar, Users, Compass } from 'lucide-react';
import PrivacyConsentNotice from '../../components/common/PrivacyConsentNotice';
import SeoHead from '../../components/common/SeoHead';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const goPortal = () => navigate(currentUser ? '/dashboard' : '/login');
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const heroMediaRef = useRef(null);

  const handleCardMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;

    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const doc = document.documentElement;
        const total = Math.max(1, doc.scrollHeight - window.innerHeight);
        setProgress(Math.min(1, y / total));

        if (!reduceMotion) {
          if (heroMediaRef.current) {
            heroMediaRef.current.style.transform = `translate3d(0, ${y * 0.28}px, 0)`;
          }
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

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
      <SeoHead
        title="Iglesia Extremo Amor | Remedios de Escalada, Lanús"
        description="Iglesia cristiana en Remedios de Escalada, Lanús. Actividades para toda la familia, grupos de amistad y una comunidad para crecer juntos en la fe. Reunión general: sábados 19:30 hs."
        canonicalUrl="/home"
        ogImage="/img/slider-hero.jpg"
      />

      {/* Capas cinematográficas globales */}
      <div className="iea-grain" aria-hidden="true" />
      <div className="iea-vignette" aria-hidden="true" />
      <div className="iea-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>

      <header className={`iea-nav ${scrolled ? 'iea-nav-scrolled' : ''}`}>
        <div className="iea-nav-brand" onClick={() => scrollTo('top')} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && scrollTo('top')} role="button" tabIndex={0}>
          <img src="/img/icon-500x500.png" alt="Iglesia Extremo Amor" className="iea-nav-logo" />
          <span className="iea-nav-brand-name">IGLESIA <strong>EXTREMO AMOR</strong></span>
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

      {/* HERO · plano de apertura */}
      <section className="iea-hero" id="top">
        <div className="iea-hero-media" ref={heroMediaRef} aria-hidden="true">
          <div className="iea-hero-media-bg" aria-hidden="true" />
        </div>
        <div className="iea-hero-scrim" aria-hidden="true" />
        <div className="iea-hero-light" aria-hidden="true" />
        <div className="iea-hero-logo" aria-hidden="true">
          <img src="/img/icon-500x500.png" alt="" />
        </div>

        <div className="iea-letterbox iea-letterbox-top" aria-hidden="true" />
        <div className="iea-letterbox iea-letterbox-bottom" aria-hidden="true" />

        <p className="iea-hero-eyebrow">REMEDIOS DE ESCALADA · BUENOS AIRES · SÁBADOS 19:30</p>

        <h1 className="iea-hero-title">
          <span className="iea-word iea-word-left iea-word-light">IGLESIA</span>
          <span className="iea-title-line">
            <span className="iea-word iea-word-right">EXTREMO</span>
            <span className="iea-word iea-word-left">AMOR</span>
          </span>
        </h1>

        <p className="iea-hero-sub">
          Un lugar de <em>encuentro</em>, de <em>familia</em> y de <em>amor</em>.
        </p>

        <div className="iea-hero-bottom">
          <button className="iea-round-btn" onClick={() => scrollTo('visitanos')}>
            <span>CONOCÉ IEA</span>
            <span className="iea-round-btn-arrow" aria-hidden="true">
              <ArrowUpRight size={18} />
            </span>
          </button>
        </div>

        <button className="iea-scroll-cue" onClick={() => scrollTo('somos')} aria-label="Continuar hacia abajo">
          <span>DESCUBRÍ MÁS</span>
          <ChevronDown size={18} />
        </button>
      </section>

      <div className="iea-strip" aria-label="Información de reuniones">
        <div className="iea-strip-track">
          <div className="iea-strip-set">
            <p><span>NOS ENCONTRAMOS</span><strong>Sábados · 19:30</strong></p>
            <p><span>ESTAMOS EN</span><strong>Av. Cnel. Rosales 883 · Escalada</strong></p>
            <p><span>GRUPOS DE AMISTAD</span><strong>Durante la semana</strong></p>
            <p><span>UN LUGAR</span><strong>Para vos</strong></p>
          </div>
          <div className="iea-strip-set" aria-hidden="true">
            <p><span>NOS ENCONTRAMOS</span><strong>Sábados · 19:30</strong></p>
            <p><span>ESTAMOS EN</span><strong>Av. Cnel. Rosales 883 · Escalada</strong></p>
            <p><span>GRUPOS DE AMISTAD</span><strong>Durante la semana</strong></p>
            <p><span>UN LUGAR</span><strong>Para vos</strong></p>
          </div>
        </div>
      </div>

      <section className="iea-slogan-section" aria-label="Nuestro slogan">
        <p className="iea-chapter-eyebrow iea-reveal">PRÓLOGO</p>
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
          <h2 className="iea-display iea-reveal">CREEMOS EN UN DIOS QUE TRANSFORMA VIDAS.</h2>
          <div className="iea-body iea-reveal">
            <p>En Iglesia Extremo Amor, somos una familia que camina unida en fe, amor y esperanza.</p>
            <div className="iea-schedule">
              <span>TODOS LOS SÁBADOS</span>
              <strong>19:30 HS</strong>
              <span>Remedios de Escalada, Buenos Aires.</span>
            </div>
            <button className="iea-inline-link" onClick={() => scrollTo('comunidad')}>Conocé nuestra comunidad <ArrowUpRight size={16} /></button>
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

      {/* Propósito · ¿Por qué existimos como iglesia? */}
      <section className="iea-purpose-section" aria-label="Por qué existimos como iglesia">
        <div className="iea-purpose-container">
          <div className="iea-purpose-lead-wrap iea-reveal">
            <span className="iea-purpose-badge">
              <span>NUESTRO PROPÓSITO</span>
            </span>
            <p className="iea-purpose-lead">
              Guiarte a tener un <em>encuentro</em> con Jesús.
            </p>
          </div>

          <div className="iea-purpose-divider iea-reveal" aria-hidden="true" />

          <h2 className="iea-purpose-title iea-reveal">
            ¿Por qué existimos <em>como iglesia</em>?
          </h2>
          <div className="iea-purpose-grid">
            <article className="iea-purpose-card iea-reveal" onMouseMove={handleCardMouseMove}>
              <div className="iea-purpose-card-head">
                <span className="iea-purpose-num">01</span>
                <span className="iea-purpose-icon iea-anim-heart">
                  <span className="iea-icon-halo" aria-hidden="true" />
                  <Heart size={24} />
                </span>
              </div>
              <h3>Para <strong>amar y adorar</strong> a Dios.</h3>
            </article>

            <article className="iea-purpose-card iea-reveal" onMouseMove={handleCardMouseMove}>
              <div className="iea-purpose-card-head">
                <span className="iea-purpose-num">02</span>
                <span className="iea-purpose-icon iea-anim-handshake">
                  <span className="iea-icon-halo" aria-hidden="true" />
                  <HeartHandshake size={24} />
                </span>
              </div>
              <h3>Para <strong>servir</strong> a las personas y a nuestra ciudad.</h3>
            </article>

            <article className="iea-purpose-card iea-reveal" onMouseMove={handleCardMouseMove}>
              <div className="iea-purpose-card-head">
                <span className="iea-purpose-num">03</span>
                <span className="iea-purpose-icon iea-anim-compass">
                  <span className="iea-icon-halo" aria-hidden="true" />
                  <Compass size={24} />
                </span>
              </div>
              <h3>Para <strong>inspirar</strong> a las personas y a nuestra ciudad a encontrar su propósito.</h3>
            </article>
          </div>
        </div>
      </section>

      <section className="iea-section iea-light" id="valores" aria-label="Nuestros valores">
        <p className="iea-values-eyebrow iea-reveal">
          <span className="iea-brand-book">IGLESIA</span>{' '}
          <span className="iea-brand-wide">EXTREMO AMOR</span>
        </p>
        <h2 className="iea-values-title iea-reveal">Nuestros <em>valores</em>.</h2>
        <div className="iea-values-grid">
          {[
            { n: '01', t: 'Fe', full: 'La Fe, Nuestro Estilo de Vida', Icon: Cross, anim: 'iea-anim-cross' },
            { n: '02', t: 'Amistad', full: 'La amistad, nuestra elección...', Icon: HeartHandshake, anim: 'iea-anim-handshake' },
            { n: '03', t: 'Jesús', full: 'Jesús, nuestro mejor mensaje', Icon: Megaphone, anim: 'iea-anim-megaphone' },
            { n: '04', t: 'Buen ánimo', full: 'El Buen Ánimo, Nuestro Lenguaje', Icon: Smile, anim: 'iea-anim-smile' },
            { n: '05', t: 'Amor', full: 'El Amor, Nuestra Respuesta', Icon: Heart, anim: 'iea-anim-heart' },
            { n: '06', t: 'Generosidad', full: 'La Generosidad, Nuestra Riqueza', Icon: Gift, anim: 'iea-anim-gift' },
          ].map(({ n, t, full, Icon, anim }, i) => (
            <div
              className="iea-value iea-reveal"
              key={n}
              style={{ '--d': `${i * 0.1}s` }}
              onMouseMove={handleCardMouseMove}
            >
              <div className="iea-value-top">
                <span className="iea-value-index">{n}</span>
                <span className={`iea-value-icon ${anim}`}>
                  <span className="iea-icon-halo" aria-hidden="true" />
                  <Icon size={22} />
                </span>
              </div>
              <div className="iea-value-body">
                <h3>{t}</h3>
                <p className="iea-value-tagline">{full}</p>
              </div>
              <span className="iea-value-spark" aria-hidden="true" />
            </div>
          ))}
        </div>
      </section>

      <section className="iea-section iea-dark" id="comunidad">
        <div className="iea-section-label iea-reveal"><span>02</span>VIDA EN COMUNIDAD</div>
        <div className="iea-split">
          <h2 className="iea-display iea-reveal">NOS ENCONTRAMOS PARA CRECER JUNTOS.</h2>
          <div className="iea-body iea-reveal">
            <p>
              No somos iglesia solo cuando nos juntamos a cantar o escuchar la palabra de Dios. La iglesia no pasa solo entre cuatro paredes ni en un horario fijo. Es acompañarnos cuando la vida pesa y en descubrir juntos cómo vivir como Jesús.
            </p>
          </div>
        </div>
        <div className="iea-cards">
          <article className="iea-reveal" onMouseMove={handleCardMouseMove}>
            <div className="iea-card-head">
              <span className="iea-card-eyebrow">CADA SÁBADO</span>
              <span className="iea-card-icon iea-anim-calendar">
                <span className="iea-icon-halo" aria-hidden="true" />
                <Calendar size={20} />
              </span>
            </div>
            <h3>Reunión general</h3>
            <p>Adoración, Palabra y un espacio para encontrarnos con Dios y con las personas.</p>
            <div className="iea-card-footer">
              <strong>19:30</strong>
              <span className="iea-card-action"><ArrowUpRight size={18} /></span>
            </div>
          </article>
          <article className="iea-reveal" onMouseMove={handleCardMouseMove}>
            <div className="iea-card-head">
              <span className="iea-card-eyebrow">DURANTE LA SEMANA</span>
              <span className="iea-card-icon iea-anim-users">
                <span className="iea-icon-halo" aria-hidden="true" />
                <Users size={20} />
              </span>
            </div>
            <h3>Grupos de amistad</h3>
            <p>Encuentros cercanos para conversar, orar, hacer preguntas y caminar acompañados.</p>
            <div className="iea-card-footer">
              <strong>JUNTOS</strong>
              <span className="iea-card-action"><ArrowUpRight size={18} /></span>
            </div>
          </article>
          <article className="iea-reveal" onMouseMove={handleCardMouseMove}>
            <div className="iea-card-head">
              <span className="iea-card-eyebrow">PARA CADA ETAPA</span>
              <span className="iea-card-icon iea-anim-home">
                <span className="iea-icon-halo" aria-hidden="true" />
                <HomeIcon size={20} />
              </span>
            </div>
            <h3>Un espacio de encuentro</h3>
            <p>Espacios para niños, adolescentes, jóvenes, matrimonios y familias.</p>
            <div className="iea-card-footer">
              <strong>TODOS</strong>
              <span className="iea-card-action"><ArrowUpRight size={18} /></span>
            </div>
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
            <div><span>DÓNDE</span><strong>Av. Cnel. Rosales 879-883, Remedios de Escalada, Lanús</strong></div>
            <div className="iea-visit-actions">
              <a className="iea-instagram" href="https://instagram.com/iea_escalada" target="_blank" rel="noopener noreferrer">
                <Instagram size={17} /> <span>ESCRIBINOS POR INSTAGRAM</span> <ArrowUpRight size={17} />
              </a>
              <a className="iea-whatsapp-btn" href="https://wa.me/5491135659725?text=Hola!%20Quería%20hacer%20una%20consulta%20sobre%20las%20reuniones" target="_blank" rel="noopener noreferrer">
                <MessageCircle size={17} /> <span>CONTACTO WHATSAPP</span> <ArrowUpRight size={17} />
              </a>
            </div>
          </div>
        </div>

        <div className="iea-map-wrap iea-reveal">
          <div className="iea-map">
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
          </div>
          <div className="iea-map-card">
            <div className="iea-map-card-head">
              <img src="/img/icon-500x500.png" alt="Portal IEA" />
              <div>
                <strong>
                  <span className="iea-brand-book">IGLESIA</span>{' '}
                  <span className="iea-brand-wide">EXTREMO AMOR</span>
                </strong>
                <span>Av. Cnel. Rosales 883, Escalada</span>
                <span>Sábados · 19:30 hs</span>
              </div>
            </div>
            <a className="iea-map-link" href="https://maps.google.com/?q=Av.+Coronel+Leonardo+Rosales+883,+Remedios+de+Escalada" target="_blank" rel="noopener noreferrer">CÓMO LLEGAR <ArrowUpRight size={16} /></a>
          </div>
        </div>
      </section>

      <footer className="iea-footer">
        <div className="iea-footer-top">
          <div className="iea-footer-brand">
            <div className="iea-footer-brand-head">
              <img src="/img/icon-500x500.png" alt="Iglesia Extremo Amor" />
              <span>
                <span className="iea-brand-book">IGLESIA</span>{' '}
                <span className="iea-brand-wide">EXTREMO AMOR</span>
              </span>
            </div>
            <div className="iea-footer-contact">
              <span>Av. Cnel. Rosales 879-883, Remedios de Escalada</span>
              <span>+54 9 11 3565-9725 / 11 6725-4066</span>
              <span>iglesiaextremoamor@gmail.com</span>
            </div>
          </div>
          <div className="iea-footer-uad">
            <a href="https://www.uad.org.ar/v02/" target="_blank" rel="noopener noreferrer" aria-label="Unión de las Asambleas de Dios, Región 8">
              <img src="https://www.uad.org.ar/v02/wp-content/uploads/2018/01/cropped-uad-1.png" alt="UAD" />
            </a>
            <strong>Unión de las Asambleas de Dios</strong>
            <span>Región 8</span>
            <span>Fichero de reunión general Nº 14</span>
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
              <button className="iea-footer-portal" onClick={goPortal}>Acceso a portal <ArrowUpRight size={16} /></button>
            </div>
          </div>
        </div>
        <div className="iea-footer-bottom">
          <span>© 2026 Iglesia Extremo Amor. Todos los derechos reservados.</span>
          <div className="iea-footer-slogan">
            <span>Un lugar de <strong>ENCUENTRO</strong>.</span>
            <span>Un lugar para la <strong>FAMILIA</strong>.</span>
            <span>Un lugar para <strong>VOS</strong>.</span>
          </div>
        </div>
      </footer>
      <PrivacyConsentNotice />
    </div>
  );
};

export default Home;
