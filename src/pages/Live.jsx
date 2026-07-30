import React, { useEffect, useState } from 'react';
import Card from '../components/common/Card';
import { CalendarDays, Clock, MonitorPlay, Radio, Youtube } from 'lucide-react';
import './Live.css';

const getNextTransmission = (now) => {
  const next = new Date(now);
  const daysUntilSunday = (7 - now.getDay()) % 7;
  next.setDate(now.getDate() + daysUntilSunday);
  next.setHours(17, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 7);
  return next;
};

const getCountdown = (target, now) => {
  const totalSeconds = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
};

const weekendVideos = [
  {
    id: 'aRQz0oKHHXc',
    title: 'Formando el carácter',
    date: '26 de julio de 2026',
    reflection: 'Un mensaje para crecer con convicción, madurez y una vida transformada.',
  },
  {
    id: 'EUPJ14EeL-I',
    title: 'La mano de Dios',
    date: '19 de julio de 2026',
    reflection: 'Una invitación a reconocer la guía y la obra de Dios en cada etapa.',
  },
  {
    id: 'DRSiNqmtnW0',
    title: 'Como viendo al invisible',
    date: '12 de julio de 2026',
    reflection: 'Una reflexión sobre depender de Dios y caminar por fe aun sin ver todo el camino.',
  },
  {
    id: 'RIlsWXOw8p0',
    title: 'Proyecto Misionero Apolos',
    date: '5 de julio de 2026',
    reflection: 'Una mirada al llamado misionero y al servicio que lleva esperanza a otros.',
  },
];

const Live = () => {
  const [now, setNow] = useState(() => new Date());
  const nextTransmission = getNextTransmission(now);
  const countdown = getCountdown(nextTransmission, now);
  const latestVideo = weekendVideos[0];

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="live-page animate-fade-in">
      <div className="live-header">
        <h1>Transmisiones en Vivo</h1>
        <p>Conectate cada domingo para compartir juntos.</p>
      </div>

      <Card className="live-next-card">
        <div className="live-next-heading">
          <div className="live-icon"><Radio size={20} /></div>
          <div>
            <span>Próxima transmisión</span>
            <h2>Domingo a las 17:00 hs</h2>
          </div>
        </div>
        <div className="live-next-date">
          <CalendarDays size={16} />
          {nextTransmission.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          <Clock size={16} /> 17:00 hs
        </div>
        <div className="live-countdown" aria-label="Cuenta regresiva para la próxima transmisión">
          {Object.entries(countdown).map(([unit, value]) => (
            <div key={unit} className="live-countdown-unit">
              <strong>{String(value).padStart(2, '0')}</strong>
              <span>{{ days: 'Días', hours: 'Horas', minutes: 'Min', seconds: 'Seg' }[unit]}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="live-video-card">
        <div className="live-video-heading">
          <Youtube size={18} />
          <div>
            <span>Fin de semana anterior</span>
            <h2>{latestVideo.title}</h2>
            <p className="live-featured-reflection">{latestVideo.reflection}</p>
          </div>
        </div>
        <div className="live-video-frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${latestVideo.id}`}
            title={latestVideo.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </Card>

      <section className="live-weekends">
        <div className="live-weekends-heading">
          <h2>Últimos cuatro fines de semana</h2>
          <p>El más reciente está destacado arriba; estos son los tres anteriores.</p>
        </div>
        <div className="live-weekends-grid">
          {weekendVideos.slice(1).map(video => (
            <a key={video.id} className="live-weekend-card" href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">
              <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt={video.title} />
              <div>
                <span>{video.date}</span>
                <h3>{video.title}</h3>
                <p>{video.reflection}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <div className="live-offline">
        <MonitorPlay size={18} />
        La transmisión se habilitará aquí los domingos a las 17:00 hs.
      </div>
    </div>
  );
};

export default Live;
