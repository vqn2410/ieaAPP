export const PERFORMANCE_DIMENSIONS = [
  { key: 'communion', label: 'Comunión', description: 'Vínculos, integración y compañerismo en el grupo' },
  { key: 'commitment', label: 'Compromiso', description: 'Constancia, puntualidad y asistencia a los encuentros' },
  { key: 'spiritual', label: 'Crecimiento', description: 'Madurez espiritual, oración y vida de fe' },
  { key: 'service', label: 'Servicio', description: 'Disposición a ayudar, servir y colaborar activamente' },
  { key: 'character', label: 'Carácter', description: 'Actitud, mansedumbre, receptividad y testimonio' },
  { key: 'evangelism', label: 'Misión', description: 'Evangelismo, alcance e invitación hacia otros' },
];

export const loadLogoDataUrl = async () => {
  try {
    const response = await fetch('/img/logo-iea.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const formatGroupSchedule = (group) => {
  if (!group) return 'No especificado';
  const day = group.scheduleDay || '';
  const time = group.scheduleTime ? `${group.scheduleTime} hs` : '';
  if (day && time) return `${day} - ${time}`;
  if (day) return day;
  if (time) return time;
  return group.schedule || 'No especificado';
};

/**
 * Genera una imagen PNG nítida (600x600 px) del Radar Chart para incrustar en el PDF.
 */
export const generateRadarChartPng = (dimensions, values, size = 600) => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const center = size / 2;
  const radius = size * 0.34;
  const total = dimensions.length;

  const pointAt = (index, value) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const r = (value / 10) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Fondo blanco limpio
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Anillos concéntricos de referencia (niveles 2, 4, 6, 8, 10)
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  [2, 4, 6, 8, 10].forEach(level => {
    ctx.beginPath();
    for (let i = 0; i < total; i++) {
      const p = pointAt(i, level);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();
  });

  // Ejes radiales
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < total; i++) {
    const p = pointAt(i, 10);
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  // Polígono de desempeño
  ctx.beginPath();
  dimensions.forEach((d, i) => {
    const v = Math.max(0, Math.min(10, Number(values?.[d.key] ?? 5)));
    const p = pointAt(i, v);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(43, 48, 91, 0.22)'; // Tinte azul IEA
  ctx.fill();
  ctx.strokeStyle = '#2b305b'; // Borde azul institucional
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Vértices y etiquetas
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  dimensions.forEach((d, i) => {
    const v = Math.max(0, Math.min(10, Number(values?.[d.key] ?? 5)));
    const p = pointAt(i, v);

    // Punto azul
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = '#2b305b';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Etiqueta de texto externa
    const labelPos = pointAt(i, 12.2);
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = labelPos.x > center + 12 ? 'left' : labelPos.x < center - 12 ? 'right' : 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${d.label} (${v})`, labelPos.x, labelPos.y);
  });

  return canvas.toDataURL('image/png');
};

export const generateFollowUpPdf = async ({
  member,
  group,
  groupName,
  groupSchedule,
  facilitatorName,
  description,
  performanceValues,
  date = new Date()
}) => {
  const resolvedGroupName = groupName || group?.name || member?.group || 'Sin grupo asignado';
  const resolvedSchedule = groupSchedule || (group ? formatGroupSchedule(group) : 'No especificado');

  const [{ default: jsPDF }] = await Promise.all([import('jspdf')]);
  // compress: true comprime los streams de imágenes y texto
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const logoDataUrl = await loadLogoDataUrl();

  let currentY = 16;
  const boxX = 22;
  const boxWidth = 166;

  // 1. Logo centrado de la IEA (proporción 1280x332 = 3.85:1)
  if (logoDataUrl) {
    const logoWidth = 48;
    const logoHeight = 12.5;
    const logoX = (210 - logoWidth) / 2;
    try {
      pdf.addImage(logoDataUrl, 'PNG', logoX, currentY, logoWidth, logoHeight, undefined, 'FAST');
      currentY += logoHeight + 6;
    } catch {
      currentY += 4;
    }
  } else {
    currentY += 4;
  }

  // 2. Título centrado: "INFORME DE SEGUIMIENTO"
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(43, 48, 91); // Azul institucional #2b305b
  pdf.text('INFORME DE SEGUIMIENTO', 105, currentY, { align: 'center' });
  currentY += 3.5;

  // Línea divisoria elegante
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.4);
  pdf.line(boxX, currentY, boxX + boxWidth, currentY);
  currentY += 5;

  // Fecha de emisión
  const dateStr = date instanceof Date ? date.toLocaleDateString('es-AR') : String(date || '');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Fecha de emisión: ${dateStr}`, 105, currentY, { align: 'center' });
  currentY += 6;

  // 3. Ficha de Datos
  const dataBoxHeight = 26;
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(boxX, currentY, boxWidth, dataBoxHeight, 2.5, 2.5, 'FD');

  const memberFullName = member
    ? `${member.lastName || ''}, ${member.firstName || ''}`.replace(/^,\s*|,\s*$/g, '').trim() || 'No especificado'
    : 'No especificado';

  // Fila 1: Apellido y Nombre
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text('APELLIDO Y NOMBRE:', boxX + 6, currentY + 7);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text(memberFullName, boxX + 46, currentY + 7);

  // Fila 2: Grupo
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text('GRUPO:', boxX + 6, currentY + 14);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(resolvedGroupName, boxX + 46, currentY + 14);

  // Fila 3: Día y Horario
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text('DÍA Y HORARIO:', boxX + 6, currentY + 21);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(resolvedSchedule, boxX + 46, currentY + 21);

  currentY += dataBoxHeight + 8;

  // 4. Sección Rueda de Vida del Desempeño (si existen valores)
  if (performanceValues && Object.keys(performanceValues).length > 0) {
    const scores = PERFORMANCE_DIMENSIONS.map(d => Number(performanceValues[d.key] ?? 5));
    const avgScore = (scores.reduce((a, b) => a + b, 0) / (scores.length || 1)).toFixed(1);

    // Título de sección
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(43, 48, 91);
    pdf.text('EVALUACIÓN DE DESEMPEÑO (RUEDA DE VIDA)', boxX, currentY);

    // Badge promedio a la derecha
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(37, 99, 235);
    pdf.text(`Promedio general: ${avgScore} / 10`, boxX + boxWidth, currentY, { align: 'right' });
    currentY += 2;

    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(boxX, currentY, boxX + boxWidth, currentY);
    currentY += 4;

    const wheelBoxHeight = 64;
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(boxX, currentY, boxWidth, wheelBoxHeight, 2.5, 2.5, 'FD');

    // Gráfico Radar Chart a la izquierda
    const radarPng = generateRadarChartPng(PERFORMANCE_DIMENSIONS, performanceValues, 600);
    if (radarPng) {
      try {
        pdf.addImage(radarPng, 'PNG', boxX + 3, currentY + 3, 58, 58, undefined, 'FAST');
      } catch (err) {
        console.warn('No se pudo incrustar el radar en el PDF:', err);
      }
    }

    // Tabla de dimensiones a la derecha
    const tableX = boxX + 66;
    const tableWidth = boxWidth - 70;
    let rowY = currentY + 9;

    PERFORMANCE_DIMENSIONS.forEach((d) => {
      const score = Math.max(0, Math.min(10, Number(performanceValues[d.key] ?? 5)));

      // Nombre dimensión
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(51, 65, 85);
      pdf.text(d.label, tableX, rowY);

      // Score numérico
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(43, 48, 91);
      pdf.text(`${score}/10`, tableX + tableWidth, rowY, { align: 'right' });

      // Barra de progreso visual
      const barX = tableX + 32;
      const barWidth = tableWidth - 48;
      const barHeight = 2.4;
      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(barX, rowY - 2.2, barWidth, barHeight, 1, 1, 'F');

      const fillW = Math.max(0, (score / 10) * barWidth);
      if (fillW > 0) {
        pdf.setFillColor(43, 48, 91);
        pdf.roundedRect(barX, rowY - 2.2, fillW, barHeight, 1, 1, 'F');
      }

      rowY += 9;
    });

    currentY += wheelBoxHeight + 8;
  }

  // 5. Descripción y Observaciones Pastorales
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(43, 48, 91);
  pdf.text('DESCRIPCIÓN Y OBSERVACIONES PASTORALES', boxX, currentY);
  currentY += 2;

  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);
  pdf.line(boxX, currentY, boxX + boxWidth, currentY);
  currentY += 5;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(30, 41, 59);
  const splitDesc = pdf.splitTextToSize(description || 'Sin observaciones registradas.', boxWidth);
  pdf.text(splitDesc, boxX, currentY, { lineHeightFactor: 1.35 });

  // 6. Firma debajo: "nombre y apellido" y "cargo: Facilitador"
  const linesCount = Array.isArray(splitDesc) ? splitDesc.length : 1;
  currentY += linesCount * 4.8 + 18;

  let signatureY = Math.max(currentY, 246);
  if (signatureY > 268) {
    pdf.addPage();
    signatureY = 60;
  }

  // Línea de firma
  pdf.setDrawColor(100, 116, 139);
  pdf.setLineWidth(0.4);
  pdf.line(75, signatureY, 135, signatureY);

  // Nombre y apellido
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text(facilitatorName || 'Facilitador', 105, signatureY + 5.5, { align: 'center' });

  // Cargo: Facilitador
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Cargo: Facilitador', 105, signatureY + 10, { align: 'center' });

  const pdfDataUrl = pdf.output('datauristring');
  const safeLastName = member?.lastName ? String(member.lastName).trim().replace(/\s+/g, '_') : 'miembro';
  const safeFirstName = member?.firstName ? String(member.firstName).trim().replace(/\s+/g, '_') : '';
  const fileName = `informe-seguimiento-${safeLastName}-${safeFirstName}.pdf`.toLowerCase();

  return { pdf, pdfDataUrl, fileName };
};

export const downloadDataUrl = (dataUrl, fileName) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
