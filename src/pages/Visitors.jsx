import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { Plus, Search, UserPlus, Trash2, Check, X, Users, ArrowRight } from 'lucide-react';
import { getVisitors, createVisitor, updateVisitor, deleteVisitor } from '../services/visitorService';
import { createMember } from '../services/memberService';
import { useNavigate } from 'react-router-dom';
import { normalizeString } from '../utils/helpers';
import { useDebounce } from '../utils/useDebounce';
import EmptyState from '../components/common/EmptyState';
import { SkeletonTable } from '../components/common/Skeleton';
import './Visitors.css';

const Visitors = () => {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [filterConverted, setFilterConverted] = useState('all');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await getVisitors();
      if (!mounted) return;
      setVisitors(data);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = visitors.filter(v => {
    if (filterConverted === 'converted' && !v.converted) return false;
    if (filterConverted === 'pending' && v.converted) return false;
    if (debouncedSearch) {
      const q = normalizeString(debouncedSearch).toLowerCase();
      const name = normalizeString(`${v.firstName} ${v.lastName}`).toLowerCase();
      const email = normalizeString(v.email || '').toLowerCase();
      if (!name.includes(q) && !email.includes(q)) return false;
    }
    return true;
  });

  const handleCreate = async () => {
    if (!formData.firstName.trim()) return;
    setSaving(true);
    await createVisitor({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      notes: formData.notes.trim(),
      visitDate: new Date()
    });
    setSaving(false);
    setShowForm(false);
    setFormData({ firstName: '', lastName: '', email: '', phone: '', notes: '' });
    refresh();
  };

  const refresh = async () => {
    const data = await getVisitors();
    setVisitors(data);
  };

  const handleConvert = async (v) => {
    if (!window.confirm(`¿Convertir a ${v.firstName} ${v.lastName} en miembro?`)) return;
    try {
      const member = await createMember({
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone,
        extraData: { convertedFromVisitor: v.id, notes: v.notes }
      });
      await updateVisitor(v.id, { converted: true, convertedToMemberId: member.id });
      refresh();
    } catch (e) {
      console.error('Error converting visitor', e);
    }
  };

  const handleDelete = async (v) => {
    if (!window.confirm(`¿Eliminar a ${v.firstName} ${v.lastName}?`)) return;
    await deleteVisitor(v.id);
    refresh();
  };

  const field = (key, placeholder, type = 'text') => (
    <input
      className="form-input"
      type={type}
      placeholder={placeholder}
      value={formData[key]}
      onChange={e => setFormData({ ...formData, [key]: e.target.value })}
    />
  );

  return (
    <div className="visitors-page">
      <div className="visitors-header">
        <h1>Visitantes</h1>
        <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>Registrar visita</Button>
      </div>

      <div className="visitors-filters">
        <div className="visitors-search-wrap">
          <span className="visitors-search-icon"><Search size={16} /></span>
          <input
            className="form-input visitors-search-input"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="form-input"
          style={{ flex: '0 0 160px' }}
          value={filterConverted}
          onChange={e => setFilterConverted(e.target.value)}
        >
          <option value="all">Todos</option>
          <option value="pending">Sin convertir</option>
          <option value="converted">Convertidos</option>
        </select>
      </div>

      <Card>
        {loading ? (
          <SkeletonTable rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="Sin visitantes" message="No se encontraron visitantes con los filtros actuales." />
        ) : (
          <div className="visitors-table-wrap">
            <table className="visitors-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Contacto</th>
                  <th>Notas</th>
                  <th>Visita</th>
                  <th>Estado</th>
                  <th style={{ width: 100 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} className={v.converted ? 'visitors-row-converted' : ''}>
                    <td data-label="Nombre">
                      <div className="visitors-name">
                        <div className="visitors-avatar">
                          {(v.firstName || '?')[0]}{(v.lastName || '?')[0]}
                        </div>
                        <span>{v.firstName} {v.lastName}</span>
                      </div>
                    </td>
                    <td data-label="Contacto">
                      <div className="visitors-contact">
                        {v.email && <span>{v.email}</span>}
                        {v.phone && <span className="visitors-phone">{v.phone}</span>}
                      </div>
                    </td>
                    <td data-label="Notas" className="visitors-notes-cell">
                      <span className="visitors-notes">{v.notes || '-'}</span>
                    </td>
                    <td data-label="Visita" className="visitors-date">
                      {v.visitDate?.toDate ? v.visitDate.toDate().toLocaleDateString() : v.createdAt?.toDate ? v.createdAt.toDate().toLocaleDateString() : '-'}
                    </td>
                    <td data-label="Estado">
                      {v.converted ? (
                        <span className="visitors-badge-converted">Convertido</span>
                      ) : (
                        <span className="visitors-badge-pending">Pendiente</span>
                      )}
                    </td>
                    <td data-label="Acciones">
                      <div className="visitors-actions">
                        {!v.converted && (
                          <button className="visitors-action-btn" onClick={() => handleConvert(v)} title="Convertir en miembro">
                            <UserPlus size={14} />
                          </button>
                        )}
                        {v.converted && v.convertedToMemberId && (
                          <button className="visitors-action-btn" onClick={() => navigate(`/dashboard/miembros/${v.convertedToMemberId}`)} title="Ver miembro">
                            <ArrowRight size={14} />
                          </button>
                        )}
                        <button className="visitors-action-btn visitors-action-delete" onClick={() => handleDelete(v)} title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Registrar visita">
        <div className="d-flex flex-column gap-3">
          <div className="grid grid-cols-2" style={{ gap: '0.75rem' }}>
            {field('firstName', 'Nombre *')}
            {field('lastName', 'Apellido')}
          </div>
          {field('email', 'Email', 'email')}
          {field('phone', 'Teléfono')}
          <textarea
            className="form-input"
            placeholder="Notas (opcional)"
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            style={{ resize: 'vertical' }}
          />
          <div className="d-flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !formData.firstName.trim()}>
              {saving ? 'Guardando...' : 'Registrar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Visitors;
