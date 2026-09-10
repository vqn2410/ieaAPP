import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import './Extensions.css';

const campuses = [
  {
    name: 'Las Heras',
    province: 'Santa Cruz',
    image: '/img/campus-las-heras.png',
    description: 'Una extensión de IEA en el sur del país, compartiendo la fe y sirviendo a su comunidad.',
  },
  {
    name: 'Apóstoles',
    province: 'Misiones',
    image: '/img/campus-apostoles.jpeg',
    description: 'Una extensión de IEA en el litoral, llevando el mensaje y acompañando a las familias.',
  },
];

export default function Extensions() {
  const navigate = useNavigate();

  return (
    <div className="ext-page">
      <header className="ext-nav">
        <button onClick={() => navigate('/')}><ArrowLeft size={18} /> Volver al inicio</button>
        <span>IEA · EXTENSIONES</span>
      </header>

      <section className="ext-hero">
        <span className="ext-eyebrow">EXTENSIONES</span>
        <h1>UNA IGLESIA QUE SE EXTIENDE.</h1>
        <p>Además de Remedios de Escalada, IEA está presente en distintos puntos del país. Conocé nuestros campus.</p>
      </section>

      <section className="ext-grid">
        {campuses.map((campus) => (
          <article className="ext-card" key={campus.name}>
            <img src={campus.image} alt={`Campus ${campus.name}, ${campus.province}`} />
            <div className="ext-card-info">
              <span className="ext-card-tag"><MapPin size={13} /> Campus</span>
              <h2>{campus.name}</h2>
              <p className="ext-card-province">{campus.province}</p>
              <p className="ext-card-desc">{campus.description}</p>
            </div>
          </article>
        ))}
      </section>

      <footer className="ext-footer">
        <button onClick={() => navigate('/')}><ArrowLeft size={16} /> Volver al inicio</button>
        <span>Un lugar de ENCUENTRO. Un lugar para la FAMILIA. Un lugar para VOS.</span>
      </footer>
    </div>
  );
}
