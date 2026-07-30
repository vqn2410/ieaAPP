import React from 'react';
import Card from '../components/common/Card';
import { CalendarDays, HeartHandshake, Sparkles, Users } from 'lucide-react';
import './News.css';

const announcements = [
  {
    title: 'Reunión de oración',
    category: 'Oración',
    image: '/anuncios/ORACI%C3%93N.jpg',
    detail: 'Un espacio para buscar a Dios juntos, compartir pedidos y fortalecer nuestra fe como iglesia.',
    schedule: 'Martes, 19:00 hs',
    icon: Sparkles,
  },
  {
    title: 'Merendero',
    category: 'Servicio',
    image: '/anuncios/MERENDERO.jpg',
    detail: 'Sumate al equipo que acompaña y sirve a nuestra comunidad con amor y esperanza.',
    schedule: 'Miércoles, 17:00 hs',
    icon: HeartHandshake,
  },
  {
    title: 'La Tribu',
    category: 'Adolescentes',
    image: '/anuncios/LA-TRIBU.jpg',
    detail: 'Un encuentro pensado para adolescentes: amistad, fe, conversaciones reales y comunidad.',
    schedule: 'Viernes, 19:00 hs',
    icon: Users,
  },
  {
    title: 'I.E.T.E.',
    category: 'Formación',
    image: '/anuncios/iete.jpg',
    detail: 'Estudiá teología con nosotros y seguí profundizando tu camino de aprendizaje y servicio.',
    schedule: 'Lunes, 20:00 hs',
    icon: Sparkles,
  },
  {
    title: 'Grupos de Amistad',
    category: 'Comunidad',
    image: '/anuncios/GRUPOS-DE-AMISTAD.jpg',
    detail: 'Conocé un grupo cercano para compartir, crecer en la fe y transitar la vida acompañado.',
    schedule: 'Consultá tu grupo más cercano',
    icon: Users,
  },
  {
    title: 'Colaboración Cena Navideña',
    category: 'Solidaridad',
    image: '/anuncios/DONACIONES-CENA-NAVIDE%C3%91A.jpg',
    detail: 'Estamos reuniendo golosinas, pollo y ensaladas para preparar una cena especial. Tu ayuda hace la diferencia.',
    schedule: 'Colaboraciones hasta el 13 de diciembre',
    icon: HeartHandshake,
  },
];

const News = () => (
  <div className="news-page animate-fade-in">
    <div className="news-header">
      <h1>Noticias y Anuncios</h1>
      <p>Enterate de las próximas actividades y oportunidades para participar.</p>
    </div>
    <div className="news-grid">
      {announcements.map(announcement => {
        const Icon = announcement.icon;
        return (
          <Card key={announcement.title} className="news-card">
            <img className="news-image" src={announcement.image} alt={announcement.title} />
            <div className="news-body">
              <span className="news-category"><Icon size={13} /> {announcement.category}</span>
              <h2>{announcement.title}</h2>
              <p>{announcement.detail}</p>
              <div className="news-schedule"><CalendarDays size={14} /> {announcement.schedule}</div>
            </div>
          </Card>
        );
      })}
    </div>
  </div>
);

export default News;
