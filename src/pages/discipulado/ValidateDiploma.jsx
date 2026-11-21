import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, Calendar, CheckCircle2, ShieldAlert, ShieldCheck, User } from 'lucide-react';
import SeoHead from '../../components/common/SeoHead';
import { getCertificateByCode } from '../../services/discipleshipService';
import { formatDiplomaDate } from './diplomaPdf';
import './Discipleship.css';

const ValidateDiploma = () => {
  const { code } = useParams();
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getCertificateByCode(code);
        if (mounted) setCertificate(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [code]);

  return (
    <div className="lms-standalone">
      <SeoHead title="Validación de Diploma Digital | Iglesia Extremo Amor" noindex />

      <header className="lms-global-header">
        <Link to="/home" className="lms-brand-btn" style={{ textDecoration: 'none' }}>
          <img
            src="/img/icon-500x500.png"
            alt="Iglesia Extremo Amor"
            className="lms-brand-logo"
          />
          <div className="lms-brand-text">
            <span className="lms-brand-church">
              <span className="lms-brand-book">IGLESIA</span>{' '}
              <span className="lms-brand-wide">EXTREMO AMOR</span>
            </span>
            <strong>Validación oficial de Diplomas · Discipulado</strong>
          </div>
        </Link>

        <Link to="/home" className="lms-portal-link">
          Sitio principal
        </Link>
      </header>

      <main className="lms-validate-main">
        {loading ? (
          <div className="lms-validate-card">
            <p className="lms-validate-muted">Verificando autenticidad del diploma...</p>
          </div>
        ) : certificate && certificate.valid !== false ? (
          <div className="lms-validate-card is-valid">
            <div className="lms-validate-icon is-valid">
              <ShieldCheck size={36} />
            </div>
            <span className="lms-status-pill is-approved">
              <CheckCircle2 size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              DIPLOMA AUTÉNTICO Y VERIFICADO
            </span>
            <h1>Certificado válido de Discipulado</h1>
            <p className="lms-validate-muted">
              Este diploma digital fue emitido oficialmente por Iglesia Extremo Amor.
            </p>

            <div className="lms-validate-details">
              <div>
                <span><User size={14} /> Persona certificada</span>
                <strong>{certificate.memberName}</strong>
              </div>
              <div>
                <span><Award size={14} /> Curso y módulo</span>
                <strong>
                  {certificate.courseName || 'CRECER 1'} · Módulo {certificate.moduleNumber}:{' '}
                  {certificate.moduleTitle}
                </strong>
              </div>
              <div>
                <span><Calendar size={14} /> Fecha de finalización</span>
                <strong>{formatDiplomaDate(certificate.completedAt || certificate.issuedAt)}</strong>
              </div>
              <div>
                <span>Código de validación</span>
                <strong className="is-orange-txt">{certificate.code}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="lms-validate-card is-invalid">
            <div className="lms-validate-icon is-invalid">
              <ShieldAlert size={36} />
            </div>
            <span className="lms-status-pill is-pending">NO ENCONTRADO</span>
            <h1>Diploma no encontrado</h1>
            <p className="lms-validate-muted">
              No encontramos un diploma digital registrado con el código{' '}
              <strong>{code || '-'}</strong>. Verificá que el QR o enlace esté completo.
            </p>
          </div>
        )}
      </main>

      <footer className="lms-site-footer">
        <div className="lms-footer-bottom" style={{ marginTop: 0 }}>
          <span>© 2026 Iglesia Extremo Amor · Remedios de Escalada, Buenos Aires.</span>
          <div className="lms-footer-slogan">
            <span>Un lugar de <strong>ENCUENTRO</strong>.</span>
            <span>Un lugar para la <strong>FAMILIA</strong>.</span>
            <span>Un lugar para <strong>VOS</strong>.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ValidateDiploma;
