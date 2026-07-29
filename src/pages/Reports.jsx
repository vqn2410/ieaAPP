import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { FileText, Download, Users, BookOpen, Activity, TrendingUp } from 'lucide-react';
import { getMembers } from '../services/memberService';
import { isBaptised } from '../utils/helpers';
import { getGroups } from '../services/groupService';
import { getVisitors } from '../services/visitorService';
import { getAllFollowUps } from '../services/followUpService';
import * as XLSX from 'xlsx';
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

  const exportCensus = () => {
    setExporting('censo');
    const data = members.map(m => ({
      Apellido: m.lastName || '',
      Nombre: m.firstName || '',
      Email: m.email || '',
      Teléfono: m.phone || '',
      Grupo: m.group || '',
      Bautizado: m.extraData?.baptism || '',
      'Caminos de crecimiento': m.growthPath ? Object.keys(m.growthPath).join(', ') : ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Censo');
    XLSX.writeFile(wb, `Censo_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setExporting(null);
  };

  const exportGrowthPaths = () => {
    setExporting('crecimiento');
    const rows = [];
    members.forEach(m => {
      if (m.growthPath) {
        Object.entries(m.growthPath).forEach(([path, data]) => {
          rows.push({
            Apellido: m.lastName || '',
            Nombre: m.firstName || '',
            Camino: path,
            Estado: data.status || '',
            Año: data.year || '',
            Modalidad: data.modality || '',
            Detalle: data.detail || ''
          });
        });
      }
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Crecimiento');
    XLSX.writeFile(wb, `Crecimiento_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setExporting(null);
  };

  const exportGroups = () => {
    setExporting('grupos');
    const rows = groups.map(g => ({
      Grupo: g.name,
      Tipo: g.type || '',
      Día: g.scheduleDay || '',
      Horario: g.scheduleTime || '',
      Miembros: members.filter(m => m.group === g.name).length,
      Facilitadores: Array.isArray(g.facilitators) ? g.facilitators.join(', ') : (g.facilitators || ''),
      'Co-facilitadores': Array.isArray(g.coFacilitators) ? g.coFacilitators.join(', ') : (g.coFacilitators || '')
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Grupos');
    XLSX.writeFile(wb, `Grupos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setExporting(null);
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
              {exporting === 'censo' ? 'Exportando...' : 'Exportar XLSX'}
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
              {exporting === 'crecimiento' ? 'Exportando...' : 'Exportar XLSX'}
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
              {exporting === 'grupos' ? 'Exportando...' : 'Exportar XLSX'}
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
