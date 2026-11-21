import React, { useState } from 'react';
import { Award, Check, Copy, Download, ExternalLink, QrCode, X } from 'lucide-react';
import {
  downloadDiplomaPdf,
  formatDiplomaDate,
  getDiplomaQrUrl,
  getDiplomaValidationUrl,
} from './diplomaPdf';

const DiplomaModal = ({ certificate, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!certificate) return null;

  const validationUrl = getDiplomaValidationUrl(certificate.code);
  const qrUrl = getDiplomaQrUrl(certificate.code);
  const dateLabel = formatDiplomaDate(certificate.completedAt || certificate.issuedAt);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadDiplomaPdf(certificate);
    } catch (err) {
      console.error('Error generando PDF del diploma:', err);
      alert('No se pudo descargar el PDF del diploma.');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(validationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('Copiá el enlace de validación:', validationUrl);
    }
  };

  return (
    <div className="lms-modal-backdrop" role="dialog" aria-modal="true" aria-label="Diploma digital">
      <div className="lms-diploma-modal">
        <div className="lms-diploma-modal-bar">
          <div className="lms-diploma-modal-title">
            <Award size={18} />
            <span>Diploma digital emitido · Módulo {certificate.moduleNumber}</span>
          </div>
          <button
            type="button"
            className="lms-icon-btn"
            onClick={onClose}
            aria-label="Cerrar diploma"
          >
            <X size={17} />
          </button>
        </div>

        {/* Diploma Visual */}
        <div className="lms-diploma-sheet">
          <div className="lms-diploma-frame">
            <div className="lms-diploma-top">
              <img
                src="/img/icon-500x500.png"
                alt="Iglesia Extremo Amor"
                className="lms-diploma-logo"
              />
              <span className="lms-diploma-org">
                IGLESIA EXTREMO AMOR · RUTA DE CRECIMIENTO
              </span>
              <h2 className="lms-diploma-heading">DIPLOMA DIGITAL</h2>
            </div>

            <div className="lms-diploma-center">
              <span className="lms-diploma-certifies">Se certifica que</span>
              <strong className="lms-diploma-recipient">{certificate.memberName}</strong>
              <div className="lms-diploma-divider" />
              <p className="lms-diploma-body">
                ha completado satisfactoriamente el{' '}
                <strong>Módulo {certificate.moduleNumber}</strong> del programa de Discipulado{' '}
                <strong>{certificate.courseName || 'CRECER 1'}</strong>:
              </p>
              <div className="lms-diploma-module-pill">{certificate.moduleTitle}</div>
              <p className="lms-diploma-date">
                Fecha de finalización: <strong>{dateLabel}</strong>
              </p>
            </div>

            <div className="lms-diploma-bottom">
              <div className="lms-diploma-signature">
                <div className="lms-diploma-sig-line" />
                <strong>Equipo Pastoral</strong>
                <span>Iglesia Extremo Amor · Remedios de Escalada</span>
              </div>

              <div className="lms-diploma-qr-box">
                <div className="lms-diploma-qr-img-wrap">
                  <img src={qrUrl} alt={`QR de validación ${certificate.code}`} />
                </div>
                <div className="lms-diploma-qr-meta">
                  <span>
                    <QrCode size={12} /> QR de validación
                  </span>
                  <strong>{certificate.code}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="lms-diploma-actions">
          <button
            type="button"
            className="lms-btn-primary"
            disabled={downloading}
            onClick={handleDownload}
          >
            <Download size={15} />
            <span>{downloading ? 'Generando PDF...' : 'Descargar Diploma PDF'}</span>
          </button>

          <button type="button" className="lms-btn-back" onClick={handleCopyLink}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{copied ? 'Enlace copiado' : 'Copiar link de validación'}</span>
          </button>

          <a
            href={validationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="lms-btn-back lms-btn-link"
          >
            <span>Verificar QR</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default DiplomaModal;
