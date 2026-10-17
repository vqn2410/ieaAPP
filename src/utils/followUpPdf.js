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

export const generateFollowUpPdf = async ({
  member,
  group,
  groupName,
  groupSchedule,
  facilitatorName,
  description,
  date = new Date()
}) => {
  const resolvedGroupName = groupName || group?.name || member?.group || 'Sin grupo asignado';
  const resolvedSchedule = groupSchedule || (group ? formatGroupSchedule(group) : 'No especificado');

  const [{ default: jsPDF }] = await Promise.all([import('jspdf')]);
  // compress: true comprime los streams de la imagen PNG a ~48KB preservando su transparencia
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const logoDataUrl = await loadLogoDataUrl();

  let currentY = 18;

  // 1. Logo centrado de la IEA (proporción 1280x332 = 3.85:1)
  if (logoDataUrl) {
    const logoWidth = 50;
    const logoHeight = 13;
    const logoX = (210 - logoWidth) / 2;
    try {
      pdf.addImage(logoDataUrl, 'PNG', logoX, currentY, logoWidth, logoHeight, undefined, 'FAST');
      currentY += logoHeight + 8;
    } catch {
      currentY += 4;
    }
  } else {
    currentY += 6;
  }

  // 2. Título centrado: "INFORME DE SEGUIMIENTO"
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(43, 48, 91); // Azul institucional #2b305b
  pdf.text('INFORME DE SEGUIMIENTO', 105, currentY, { align: 'center' });
  currentY += 4;

  // Línea divisoria elegante
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.4);
  pdf.line(25, currentY, 185, currentY);
  currentY += 6;

  // Fecha de emisión
  const dateStr = date instanceof Date ? date.toLocaleDateString('es-AR') : String(date || '');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Fecha de emisión: ${dateStr}`, 105, currentY, { align: 'center' });
  currentY += 8;

  // 3. Ficha de Datos
  const boxX = 25;
  const boxWidth = 160;
  const boxHeight = 30;
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(boxX, currentY, boxWidth, boxHeight, 3, 3, 'FD');

  const memberFullName = member
    ? `${member.lastName || ''}, ${member.firstName || ''}`.replace(/^,\s*|,\s*$/g, '').trim() || 'No especificado'
    : 'No especificado';

  // Fila 1: Apellido y Nombre
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  pdf.text('APELLIDO Y NOMBRE:', boxX + 6, currentY + 8);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(memberFullName, boxX + 48, currentY + 8);

  // Fila 2: Grupo
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  pdf.text('GRUPO:', boxX + 6, currentY + 16);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text(resolvedGroupName, boxX + 48, currentY + 16);

  // Fila 3: Día y Horario
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  pdf.text('DÍA Y HORARIO:', boxX + 6, currentY + 24);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text(resolvedSchedule, boxX + 48, currentY + 24);

  currentY += boxHeight + 12;

  // 4. Descripción
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(43, 48, 91);
  pdf.text('DESCRIPCIÓN', boxX, currentY);
  currentY += 2;

  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);
  pdf.line(boxX, currentY, boxX + boxWidth, currentY);
  currentY += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(30, 41, 59);
  const splitDesc = pdf.splitTextToSize(description || 'Sin observaciones registradas.', boxWidth);
  pdf.text(splitDesc, boxX, currentY, { lineHeightFactor: 1.4 });

  // 5. Firma debajo: "nombre y apellido" y "cargo: Facilitador"
  const linesCount = Array.isArray(splitDesc) ? splitDesc.length : 1;
  currentY += linesCount * 5.2 + 20;

  let signatureY = Math.max(currentY, 236);
  if (signatureY > 265) {
    pdf.addPage();
    signatureY = 60;
  }

  // Línea de firma
  pdf.setDrawColor(100, 116, 139);
  pdf.setLineWidth(0.4);
  pdf.line(75, signatureY, 135, signatureY);

  // Nombre y apellido
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(facilitatorName || 'Facilitador', 105, signatureY + 6, { align: 'center' });

  // Cargo: Facilitador
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Cargo: Facilitador', 105, signatureY + 11, { align: 'center' });

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
