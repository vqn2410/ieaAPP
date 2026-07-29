import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import { Search, MessageSquare, Check, Trash2, Filter, User } from 'lucide-react';
import { getAllFollowUps, updateFollowUp, deleteFollowUp } from '../services/followUpService';
import { getMembers } from '../services/memberService';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { normalizeString } from '../utils/helpers';
import { useDebounce } from '../utils/useDebounce';
import EmptyState from '../components/common/EmptyState';
import { SkeletonTable } from '../components/common/Skeleton';
import './FollowUps.css';

const timeAgo = (date) => {
  if (!date) return '';
  const d = date?.toDate ? date.toDate() : new Date(date);
  const secs = Math.floor((Date.now() - d) / 1000);
  if (secs < 60) return 'ahora';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 2592000) return `${Math.floor(secs / 86400)}d`;
  return d.toLocaleDateString();
};

const FollowUps = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { settings } = useSettings();
  const [followUps, setFollowUps] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [fups, mems] = await Promise.all([getAllFollowUps(), getMembers()]);
      if (!mounted) return;
      setFollowUps(fups);
      setMembers(mems);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const memberMap = {};
  members.forEach(m => { memberMap[m.id] = m; });

  const filtered = followUps.filter(f => {
    if (filterStatus !== 'all' && f.status !== filterStatus) return false;
    if (filterAssignee === 'mine' && f.createdBy !== userData?.email) return false;
    if (debouncedSearch) {
      const q = normalizeString(debouncedSearch).toLowerCase();
      const content = normalizeString(f.content || '').toLowerCase();
      const member = memberMap[f.memberId];
      const name = member ? normalizeString(`${member.firstName} ${member.lastName}`).toLowerCase() : '';
      if (!content.includes(q) && !name.includes(q)) return false;
    }
    return true;
  });

  const refresh = async () => {
    const [fups, mems] = await Promise.all([getAllFollowUps(), getMembers()]);
    setFollowUps(fups);
    setMembers(mems);
  };

  const handleComplete = async (f) => {
    await updateFollowUp(f.id, { status: 'completed' });
    refresh();
  };

  const handleDelete = async (f) => {
    await deleteFollowUp(f.id);
    refresh();
  };

  return (
    <div className="fups-page">
      <div className="fups-header">
        <h1>Seguimientos</h1>
      </div>

      <div className="fups-filters">
        <div className="fups-search-wrap">
          <span className="fups-search-icon"><Search size={16} /></span>
          <input
            className="form-input fups-search-input"
            placeholder="Buscar por miembro o contenido..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="fups-filter-select">
          <span className="fups-filter-icon"><Filter size={14} /></span>
          <select
            className="form-input"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="completed">Completados</option>
          </select>
        </div>
        <div className="fups-filter-select">
          <span className="fups-filter-icon"><User size={14} /></span>
          <select
            className="form-input"
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="mine">Mis seguimientos</option>
          </select>
        </div>
      </div>

      <Card>
        {loading ? (
          <SkeletonTable rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Sin seguimientos" message="No se encontraron seguimientos con los filtros actuales." />
        ) : (
          <div className="fups-table-wrap">
            <table className="fups-table">
              <thead>
                <tr>
                  <th>Miembro</th>
                  <th>Contenido</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => {
                  const member = memberMap[f.memberId];
                  return (
                    <tr key={f.id} className="fups-row" onClick={() => navigate(`/dashboard/miembros/${f.memberId}`)}>
                      <td data-label="Miembro">
                        <div className="fups-member">
                          <div className="fups-avatar">
                            {member ? `${(member.firstName || '?')[0]}${(member.lastName || '?')[0]}` : '??'}
                          </div>
                          <div>
                            <span>{member ? `${member.firstName} ${member.lastName}` : 'Miembro eliminado'}</span>
                            <div className="fups-type-label">{(settings.followUpTypes || []).find(t => t.id === f.type)?.label || f.type}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Contenido" className="fups-content-cell">
                        <span className="fups-content">{f.content}</span>
                      </td>
                      <td data-label="Estado">
                        <Badge variant={f.status === 'completed' ? 'secondary' : 'primary'}>
                          {f.status === 'completed' ? 'Completado' : 'Pendiente'}
                        </Badge>
                      </td>
                      <td data-label="Fecha" className="fups-date-cell">{timeAgo(f.createdAt)}</td>
                      <td data-label="Acciones">
                        <div className="fups-actions" onClick={e => e.stopPropagation()}>
                          {f.status === 'pending' && (
                            <button className="fups-action-btn" onClick={() => handleComplete(f)} title="Completar">
                              <Check size={14} />
                            </button>
                          )}
                          <button className="fups-action-btn fups-action-delete" onClick={() => handleDelete(f)} title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default FollowUps;
