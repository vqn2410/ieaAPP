import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, CalendarDays, Clock3, HeartHandshake, Home as HomeIcon, Sparkles, Instagram, Facebook, Youtube, ArrowUpRight, Cross, Megaphone, Smile, Gift, Heart, MapPin, Users } from 'lucide-react';
import FloatingAssistant from '../../components/common/FloatingAssistant';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const goPortal = () => navigate(currentUser ? '/dashboard' : '/login');
  const [activeAnnouncementIndex, setActiveAnnouncementIndex] = useState(0);

  const nextSecondSaturday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const secondSaturday = (year, month) => {
      const first = new Date(year, month, 1);
      return new Date(year, month, 1 + ((6 - first.getDay() + 7) % 7) + 7);
    };
    let candidate = secondSaturday(today.getFullYear(), today.getMonth());
    if (candidate < today) candidate = secondSaturday(today.getFullYear(), today.getMonth() + 1);
    return candidate;
  };
  const santaCenaDate = nextSecondSaturday();
  const santaCenaIso = santaCenaDate.toISOString().slice(0, 10);
  const santaCenaLabel = santaCenaDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Editá estos datos para actualizar la agenda pública de la iglesia.
  // Los anuncios con fecha desaparecen automáticamente al pasar ese día.
  const announcements = [
    { day: 'Lunes', title: 'I.E.T.E. — Estudia Teología con nosotros', time: '20:00 hs', icon: BookOpen, image: '/anuncios/iete.jpg', description: 'Formación bíblica para crecer en la Palabra.' },
    { day: 'Martes', title: 'Reunión de Oración', time: '19:00 hs', icon: HeartHandshake, image: '/anuncios/reu_oracion.jepg.jpg', description: 'Un espacio para buscar a Dios juntos.' },
    { day: 'Viernes', title: 'La Tribu — Adolescentes', time: '19:00 hs', icon: Users, image: '/anuncios/LA-TRIBU.jpg', description: 'Una comunidad para crecer, compartir y encontrarse.' },
    { day: 'Sábado', title: 'Reunión General', time: '19:30 hs', icon: Heart, image: '/anuncios/reu_general.jpg', description: 'Adoración, Palabra y una comunidad que te recibe con los brazos abiertos.' },
    { date: '2026-09-17', day: 'Jueves 17 de septiembre', title: 'Reunión de Voluntarios', time: '19:30 hs', icon: Users, image: '/anuncios/reu_de_voluntarios.jpg', description: 'Nos reunimos para servir mejor y caminar juntos.' },
    { date: '2026-09-19', day: 'Sábado 19 de septiembre', title: 'Presentación de Niños', time: '19:30 hs', icon: Sparkles, image: '/anuncios/presentacion_de_ninos.PNG', description: 'Una celebración especial para nuestra familia.' },
    { date: santaCenaIso, day: santaCenaLabel, title: 'Santa Cena', time: '19:30 hs', icon: Heart, image: '/anuncios/santacena.jpg', description: 'Un momento especial para recordar juntos el amor de Jesús.' },
  ];
  const visibleAnnouncements = announcements.filter(item => {
    if (!item.date) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(`${item.date}T00:00:00`);
    return date >= today;
  });

  useEffect(() => {
    if (visibleAnnouncements.length < 2) return undefined;
    const timer = setInterval(() => setActiveAnnouncementIndex(index => (index + 1) % visibleAnnouncements.length), 6500);
    return () => clearInterval(timer);
  }, [visibleAnnouncements.length]);

  const featuredAnnouncement = visibleAnnouncements[activeAnnouncementIndex % Math.max(visibleAnnouncements.length, 1)] || visibleAnnouncements[0];

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

      <section className="iea-hero" id="top">
        <div className="iea-hero-media" aria-hidden="true" />
        <div className="iea-hero-ellipse" aria-hidden="true" />
        <div className="iea-hero-logo" aria-hidden="true">
          <img src="/img/icon-500x500.png" alt="" />
        </div>
        <h1 className="iea-hero-title">
          <span className="iea-word iea-word-left">IGLESIA</span>
          <span className="iea-title-line">
            <span className="iea-word iea-word-right">EXTREMO</span>
            <span className="iea-word iea-word-left">AMOR</span>
          </span>
        </h1>
        <div className="iea-hero-bottom">
          <button className="iea-round-btn" onClick={() => scrollTo('visitanos')}>CONOCÉ IEA <ArrowUpRight size={22} /></button>
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

      <section className="iea-section iea-light" id="valores" aria-label="Nuestros valores">
        <p className="iea-values-eyebrow iea-reveal">IGLESIA EXTREMO AMOR</p>
        <h2 className="iea-values-title iea-reveal">Nuestros <em>valores</em>.</h2>
        <div className="iea-values-grid">
          {[
            { n: '01', t: 'Fe', Icon: Cross },
            { n: '02', t: 'Amistad', Icon: HeartHandshake },
            { n: '03', t: 'Jesús es nuestro mensaje', Icon: Megaphone },
            { n: '04', t: 'Buen ánimo', Icon: Smile },
            { n: '05', t: 'Amor', Icon: Heart },
            { n: '06', t: 'Generosidad', Icon: Gift },
          ].map(({ n, t, Icon }, i) => (
            <div className="iea-value iea-reveal" key={n} style={{ '--d': `${i * 0.12}s` }}>
              <span className="iea-value-index">{n}</span>
              <span className="iea-value-icon"><Icon size={22} /></span>
              <h3>{t}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="iea-news-section iea-dark" id="anuncios" aria-label="Anuncios IEA">
        <div className="iea-section-label iea-reveal"><span>02</span>LO QUE ESTÁ PASANDO</div>
        <div className="iea-news-heading">
          <h2 className="iea-display iea-reveal">Anuncios que<br /><em>nos encuentran.</em></h2>
          <p className="iea-news-intro iea-reveal">No son solo fechas. Son momentos para volver a encontrarnos.</p>
        </div>
        <div className="iea-news-board">
          <article className="iea-news-feature iea-reveal">
            <img className="iea-news-feature-image" src={featuredAnnouncement?.image} alt="" aria-hidden="true" />
            <span className="iea-news-signal"><span />Ahora en IEA</span>
            <div className="iea-news-feature-date"><strong>{featuredAnnouncement?.time || '19:30 hs'}</strong><span>{featuredAnnouncement?.day || 'Todos los sábados'}</span></div>
            <div className="iea-news-feature-content">
              <span>{featuredAnnouncement?.date ? 'FECHA ESPECIAL' : 'AGENDA IEA'}</span>
              <h3>{featuredAnnouncement?.title || 'Un lugar para volver a casa.'}</h3>
              <p>{featuredAnnouncement?.description || 'Adoración, Palabra y una comunidad que te recibe con los brazos abiertos.'}</p>
              <button onClick={() => scrollTo('visitanos')}>Conocé más <ArrowUpRight size={16} /></button>
            </div>
            <div className="iea-news-orbit" aria-hidden="true" />
          </article>
          <div className="iea-news-stack">
            <article className="iea-news-card iea-reveal">
              <div className="iea-news-card-icon"><Users size={20} /></div>
              <div><span>EN LA SEMANA</span><h3>Grupos de Amistad</h3><p>Pequeños encuentros. Vínculos reales. Una fe que se comparte.</p></div>
              <ArrowUpRight className="iea-news-card-arrow" size={18} />
            </article>
            <article className="iea-news-card iea-reveal">
              <div className="iea-news-card-icon"><CalendarDays size={20} /></div>
              <div><span>PRÓXIMAMENTE</span><h3>Primeros Pasos</h3><p>Conocé quiénes somos, por qué existimos y cómo caminar con nosotros.</p></div>
              <ArrowUpRight className="iea-news-card-arrow" size={18} />
            </article>
            <article className="iea-news-card iea-reveal">
              <div className="iea-news-card-icon"><MapPin size={20} /></div>
              <div><span>VENÍ A CONOCERNOS</span><h3>Remedios de Escalada</h3><p>Av. Cnel. Rosales 879-883 · Buenos Aires.</p></div>
              <ArrowUpRight className="iea-news-card-arrow" size={18} />
            </article>
          </div>
        </div>
        <div className="iea-announcement-schedule iea-reveal">
          <div className="iea-announcement-schedule-head">
            <span>AGENDA ABIERTA</span>
            <strong>Esta semana en IEA</strong>
          </div>
          <div className="iea-announcement-list">
            {visibleAnnouncements.map(({ day, title, time, icon: Icon, image }) => (
              <article className="iea-announcement-row" key={`${day}-${title}`}>
                <span className="iea-announcement-day">{day}</span>
                <span className="iea-announcement-icon"><Icon size={18} /></span>
                <strong>{title}</strong>
                <span className="iea-announcement-time"><Clock3 size={15} />{time}</span>
                <img src={image} alt="" aria-hidden="true" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="iea-section iea-dark" id="comunidad">
        <div className="iea-section-label iea-reveal"><span>03</span>VIDA EN COMUNIDAD</div>
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
            <h3>Un espacio de encuentro</h3>
            <p>Espacios para niños, adolescentes, jóvenes, matrimonios y familias.</p>
            <strong>TODOS</strong>
          </article>
        </div>
        <h2 className="iea-statement iea-reveal">NADIE FUE LLAMADO A CAMINAR SOLO.</h2>
      </section>

      <section className="iea-section iea-light" id="visitanos">
        <div className="iea-section-label iea-reveal"><span>04</span>TU PRIMERA VISITA</div>
        <div className="iea-split">
          <h2 className="iea-display iea-reveal">ESTE SÁBADO, HAY UN LUGAR PARA VOS.</h2>
          <div className="iea-visit-info iea-reveal">
            <div><span>CUÁNDO</span><strong>Sábados · 19:30</strong></div>
            <div><span>DÓNDE</span><strong>Av. Cnel. Rosales 879-883, Remedios de Escalada, Lanús</strong></div>
            <a className="iea-instagram" href="https://instagram.com/iea_escalada" target="_blank" rel="noopener noreferrer">ESCRIBINOS POR INSTAGRAM<ArrowUpRight size={18} /></a>
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
                <strong>IGLESIA EXTREMO AMOR</strong>
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
              <span>IGLESIA EXTREMO AMOR</span>
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
            <span>Fichero de culto Nº 14</span>
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
      <FloatingAssistant />
    </div>
  );
};

export default Home;
