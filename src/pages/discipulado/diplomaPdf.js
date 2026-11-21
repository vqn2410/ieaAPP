import { jsPDF } from 'jspdf';

const loadImageAsDataUrl = async (url) => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result || null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const formatDiplomaDate = (value) => {
  if (!value) return '-';
  const date = typeof value?.toDate === 'function'
    ? value.toDate()
    : typeof value?.seconds === 'number'
      ? new Date(value.seconds * 1000)
      : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const getDiplomaValidationUrl = (code) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.iglesiaextremoamor.com.ar';
  return `${origin}/discipulado/validar/${encodeURIComponent(code)}`;
};

export const getDiplomaQrUrl = (code) => {
  const validationUrl = getDiplomaValidationUrl(code);
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=6&data=${encodeURIComponent(validationUrl)}`;
};

export const downloadDiplomaPdf = async (certificate) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth(); // 297
  const height = doc.internal.pageSize.getHeight(); // 210

  // Fondo elegante oscuro editorial
  doc.setFillColor(12, 14, 18);
  doc.rect(0, 0, width, height, 'F');

  // Marcos dobles dorados / ámbar
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(1.1);
  doc.rect(10, 10, width - 20, height - 20);

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.25);
  doc.rect(14, 14, width - 28, height - 28);

  // Logo de la iglesia
  const logoDataUrl = await loadImageAsDataUrl('/img/icon-500x500.png');
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', width / 2 - 11, 20, 22, 22);
  }

  // Encabezado institucional
  doc.setTextColor(249, 115, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('IGLESIA EXTREMO AMOR  ·  RUTA DE CRECIMIENTO', width / 2, 49, { align: 'center' });

  doc.setTextColor(245, 245, 247);
  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.text('DIPLOMA DIGITAL', width / 2, 64, { align: 'center' });

  doc.setTextColor(160, 164, 176);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Se certifica que', width / 2, 77, { align: 'center' });

  // Nombre de la persona
  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.text(String(certificate.memberName || 'Miembro IEA'), width / 2, 92, { align: 'center' });

  // Línea decorativa bajo el nombre
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(0.6);
  doc.line(width / 2 - 58, 97, width / 2 + 58, 97);

  // Descripción del módulo completado
  doc.setTextColor(180, 184, 196);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11.5);
  doc.text(
    `ha completado satisfactoriamente el Módulo ${certificate.moduleNumber} del curso de Discipulado ${certificate.courseName || 'CRECER 1'}:`,
    width / 2,
    109,
    { align: 'center' }
  );

  doc.setTextColor(253, 186, 116);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(String(certificate.moduleTitle || ''), width / 2, 120, { align: 'center' });

  // Fecha de finalización
  const dateLabel = formatDiplomaDate(certificate.completedAt || certificate.issuedAt);
  doc.setTextColor(215, 218, 226);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(`Fecha de finalización: ${dateLabel}`, width / 2, 134, { align: 'center' });

  // Firma institucional (izquierda)
  doc.setDrawColor(120, 125, 138);
  doc.setLineWidth(0.35);
  doc.line(34, 168, 108, 168);
  doc.setTextColor(240, 240, 245);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Equipo Pastoral', 71, 174, { align: 'center' });
  doc.setTextColor(150, 155, 168);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Iglesia Extremo Amor · Remedios de Escalada', 71, 179.5, { align: 'center' });

  // Bloque QR de validación (derecha)
  const qrDataUrl = await loadImageAsDataUrl(getDiplomaQrUrl(certificate.code));
  if (qrDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(width - 66, 142, 34, 34, 2, 2, 'F');
    doc.addImage(qrDataUrl, 'PNG', width - 64, 144, 30, 30);
  }

  doc.setTextColor(200, 204, 214);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('QR DE VALIDACIÓN', width - 49, 181, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(249, 115, 22);
  doc.text(`Código: ${certificate.code}`, width - 49, 186, { align: 'center' });

  const safeName = String(certificate.memberName || 'miembro')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_');

  doc.save(`Diploma_${certificate.courseName || 'CRECER1'}_Modulo${certificate.moduleNumber}_${safeName}.pdf`);
};
