import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { FileText, Download, Users, BookOpen, Activity, TrendingUp } from 'lucide-react';
import { getMembers } from '../services/memberService';
import { isBaptised } from '../utils/helpers';
import { getGroups } from '../services/groupService';
import { getVisitors } from '../services/visitorService';
import { getAllFollowUps } from '../services/followUpService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Reports.css';

const Reports = () => {
  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [mems, grps, vis, fups] = await Promise.all([
        getMembers(), getGroups(), getVisitors(), getAllFollowUps()
      ]);
      if (!mounted) return;
      setMembers(mems);
      setGroups(grps);
      setVisitors(vis);
      setFollowUps(fups);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const baptised = members.filter(isBaptised).length;
  const withGrowthPaths = members.filter(m => m.growthPath && Object.keys(m.growthPath).length > 0).length;
  const pendingFups = followUps.filter(f => f.status === 'pending').length;
  const pendingVisitors = visitors.filter(v => !v.converted).length;

  const growthPathStats = {};
  members.forEach(m => {
    if (m.growthPath) {
      Object.entries(m.growthPath).forEach(([path, data]) => {
        if (!growthPathStats[path]) growthPathStats[path] = { total: 0, cursando: 0, completo: 0, pausado: 0, sinInfo: 0 };
        growthPathStats[path].total++;
        const status = (data.status || 'Sin información').toLowerCase();
        if (status === 'cursando') growthPathStats[path].cursando++;
        else if (status === 'completo') growthPathStats[path].completo++;
        else if (status === 'pausado') growthPathStats[path].pausado++;
        else growthPathStats[path].sinInfo++;
      });
    }
  });

  const membersByGroup = {};
  members.forEach(m => {
    const g = m.group || 'Sin grupo';
    if (!membersByGroup[g]) membersByGroup[g] = 0;
    membersByGroup[g]++;
  });

  const exportPdf = async (title, headers, rows, filename) => {
    const pdf = new jsPDF({ orientation: headers.length > 5 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
    try {
      const response = await fetch('/img/logo-iea.png');
      const blob = await response.blob();
      const logo = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      pdf.addImage(logo, 'PNG', 12, 8, 42, 12);
    } catch {
      // The report remains valid when the logo cannot be loaded.
    }

    pdf.setDrawColor(148, 163, 184);
    pdf.line(12, 25, pdf.internal.pageSize.getWidth() - 12, 25);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(title, 12, 33);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(`Emitido: ${new Date().toLocaleDateString('es-AR')}`, 12, 38);

    autoTable(pdf, {
      startY: 43,
      head: [headers],
      body: rows,
      margin: { left: 12, right: 12 },
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    });
    pdf.save(filename);
  };

  const exportCensus = async () => {
    setExporting('censo');
    try {
      await exportPdf('Censo general', ['Apellido', 'Nombre', 'Email', 'Teléfono', 'Grupo', 'Bautizado', 'Crecimiento'], members.map(m => [
        m.lastName || '', m.firstName || '', m.email || '', m.phone || '', m.group || '', isBaptised(m) ? 'Sí' : 'No', m.growthPath ? Object.keys(m.growthPath).join(', ') : ''
      ]), `Censo_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  const exportGrowthPaths = async () => {
    setExporting('crecimiento');
    const rows = [];
    members.forEach(m => {
      if (m.growthPath) {
        Object.entries(m.growthPath).forEach(([path, data]) => {
          rows.push([m.lastName || '', m.firstName || '', path, data.status || '', data.year || '', data.modality || '', data.detail || '']);
        });
      }
    });
    try {
      await exportPdf('Caminos de crecimiento', ['Apellido', 'Nombre', 'Camino', 'Estado', 'Año', 'Modalidad', 'Detalle'], rows, `Crecimiento_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  const exportGroups = async () => {
    setExporting('grupos');
    const rows = groups.map(g => [
      g.name, g.type || '', g.scheduleDay || '', g.scheduleTime || '', members.filter(m => m.group === g.name).length,
      Array.isArray(g.facilitators) ? g.facilitators.join(', ') : (g.facilitators || ''),
      Array.isArray(g.coFacilitators) ? g.coFacilitators.join(', ') : (g.coFacilitators || '')
    ]);
    try {
      await exportPdf('Grupos de amistad', ['Grupo', 'Tipo', 'Día', 'Horario', 'Miembros', 'Facilitadores', 'Co-facilitadores'], rows, `Grupos_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="reports-page">
        <div className="reports-header"><h1>Reportes</h1></div>
        <Card><div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Cargando...</div></Card>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h1>Reportes</h1>
      </div>

      <div className="reports-grid">
        <Card>
          <div className="reports-card-hd">
            <FileText size={16} />
            <span>Censo general</span>
          </div>
          <div className="reports-card-bd">
            <div className="reports-stat">
              <Users size={14} /> <span>{members.length} miembros</span>
            </div>
            <div className="reports-stat">
              <BookOpen size={14} /> <span>{baptised} bautizados</span>
            </div>
            <div className="reports-stat">
              <TrendingUp size={14} /> <span>{withGrowthPaths} con caminos de crecimiento</span>
            </div>
            <Button
              className="w-full mt-2"
              variant="outline"
              size="sm"
              onClick={exportCensus}
              disabled={exporting === 'censo'}
              icon={<Download size={14} />}
            >
              {exporting === 'censo' ? 'Exportando...' : 'Exportar PDF'}
            </Button>
          </div>
        </Card>

        <Card>
          <div className="reports-card-hd">
            <Activity size={16} />
            <span>Crecimiento</span>
          </div>
          <div className="reports-card-bd">
            {Object.entries(growthPathStats).map(([path, stats]) => (
              <div key={path} className="reports-path-row">
                <span className="reports-path-name">{path}</span>
                <span className="reports-path-count">{stats.total}</span>
              </div>
            ))}
            <Button
              className="w-full mt-2"
              variant="outline"
              size="sm"
              onClick={exportGrowthPaths}
              disabled={exporting === 'crecimiento'}
              icon={<Download size={14} />}
            >
              {exporting === 'crecimiento' ? 'Exportando...' : 'Exportar PDF'}
            </Button>
          </div>
        </Card>

        <Card>
          <div className="reports-card-hd">
            <Users size={16} />
            <span>Grupos</span>
          </div>
          <div className="reports-card-bd">
            {Object.entries(membersByGroup)
              .sort((a, b) => b[1] - a[1])
              .map(([group, count]) => (
                <div key={group} className="reports-path-row">
                  <span className="reports-path-name">{group}</span>
                  <span className="reports-path-count">{count}</span>
                </div>
              ))}
            <Button
              className="w-full mt-2"
              variant="outline"
              size="sm"
              onClick={exportGroups}
              disabled={exporting === 'grupos'}
              icon={<Download size={14} />}
            >
              {exporting === 'grupos' ? 'Exportando...' : 'Exportar PDF'}
            </Button>
          </div>
        </Card>

        <Card>
          <div className="reports-card-hd">
            <Activity size={16} />
            <span>Resumen rápido</span>
          </div>
          <div className="reports-card-bd">
            <div className="reports-stat"><Users size={14} /> <span>{groups.length} grupos</span></div>
            <div className="reports-stat"><Users size={14} /> <span>{pendingVisitors} visitantes pendientes</span></div>
            <div className="reports-stat"><Activity size={14} /> <span>{pendingFups} seguimientos pendientes</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
