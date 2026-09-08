import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import {
  getNotes, createNote, updateNote, deleteNote,
  DEFAULT_CATEGORIES, NOTE_COLORS
} from '../services/noteService';
import { normalizeString } from '../utils/helpers';
import { Pin, Plus, Search, StickyNote, Pencil, Trash2, Globe, Lock } from 'lucide-react';
import './Notes.css';

const formatDate = (ts) => {
  if (!ts) return '';
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
};

const Notes = () => {
  const { currentUser, userData, hasRole } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'Personal', color: NOTE_COLORS[0], visibility: 'private' });

  const canShare = hasRole(['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator']);

  const load = async () => {
    setLoading(true);
    const data = await getNotes(currentUser?.uid, userData?.role);
    setNotes(data);
    setLoading(false);
  };

  useEffect(() => { if (currentUser) load(); }, [currentUser, userData?.role]);

  const categories = ['Todas', ...new Set([...DEFAULT_CATEGORIES, ...notes.map(n => n.category).filter(Boolean)])];

  const filtered = notes.filter(n => {
    const q = normalizeString(search).toLowerCase();
    const matchesSearch = !q || normalizeString(`${n.title} ${n.content} ${n.category}`).toLowerCase().includes(q);
    const matchesCat = activeCategory === 'Todas' || n.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', content: '', category: 'Personal', color: NOTE_COLORS[0], visibility: 'private' });
    setShowModal(true);
  };

  const openEdit = (note) => {
    setEditing(note);
    setForm({
      title: note.title || '',
      content: note.content || '',
      category: note.category || 'Personal',
      color: note.color || NOTE_COLORS[0],
      visibility: note.visibility || 'private'
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() && !form.content.trim()) return;
    try {
      if (editing) {
        await updateNote(editing.id, { title: form.title.trim() || 'Sin título', content: form.content, category: form.category, color: form.color, visibility: form.visibility });
      } else {
        await createNote({
          title: form.title.trim() || 'Sin título',
          content: form.content,
          category: form.category,
          color: form.color,
          visibility: form.visibility,
          authorId: currentUser?.uid,
          authorName: userData?.name || currentUser?.email || '',
        });
      }
      setShowModal(false);
      load();
    } catch (e) {
      alert('Error al guardar la nota.');
    }
  };

  const handleDelete = async (note) => {
    if (!window.confirm('¿Eliminar esta nota?')) return;
    try {
      await deleteNote(note.id);
      setNotes(current => current.filter(n => n.id !== note.id));
    } catch {
      alert('Error al eliminar la nota.');
    }
  };

  const handlePin = async (note) => {
    try {
      await updateNote(note.id, { pinned: !note.pinned });
      load();
    } catch { /* ignore */ }
  };

  const canEdit = (note) => {
    if (!currentUser) return false;
    if (note.authorId === currentUser.uid) return true;
    return hasRole(['Admin', 'Pastor']);
  };

  return (
    <div className="notes-page">
      <div className="notes-header">
        <div>
          <h1>Anotaciones</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Tomá nota y organizá por categorías para tener todo a mano.</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openCreate}>Nueva nota</Button>
      </div>

      <div className="notes-toolbar">
        <div className="notes-search-wrap">
          <span className="notes-search-icon"><Search size={16} /></span>
          <input
            className="form-input notes-search-input"
            placeholder="Buscar notas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="notes-chips">
          {categories.map(cat => (
            <button
              key={cat}
              className={`notes-chip ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="notes-grid">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="notes-card">
              <div className="skeleton" style={{ width: '60%', height: '16px', marginBottom: '10px' }}></div>
              <div className="skeleton" style={{ width: '90%', height: '40px' }}></div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={StickyNote} title="Sin anotaciones" message="Creá tu primera nota para empezar a organizar tus ideas." /></Card>
      ) : (
        <div className="notes-grid">
          {filtered.map(note => (
            <Card key={note.id} className="notes-card" style={{ borderTop: `4px solid ${note.color || '#2563eb'}` }}>
              <div className="notes-card-hd">
                <span className="notes-category" style={{ background: `${note.color}1a`, color: note.color }}>{note.category || 'Sin categoría'}</span>
                <div className="notes-card-actions">
                  {note.visibility === 'public' && <span title="Visible para líderes"><Globe size={13} /></span>}
                  {note.visibility === 'private' && <span title="Privada"><Lock size={13} /></span>}
                  {canEdit(note) && (
                    <>
                      <button
                        className={`notes-action ${note.pinned ? 'pinned' : ''}`}
                        title={note.pinned ? 'Desfijar' : 'Fijar'}
                        onClick={() => handlePin(note)}
                      >
                        <Pin size={14} />
                      </button>
                      <button className="notes-action" title="Editar" onClick={() => openEdit(note)}>
                        <Pencil size={14} />
                      </button>
                      <button className="notes-action" title="Eliminar" onClick={() => handleDelete(note)}>
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <h3 className="notes-card-title">{note.title}</h3>
              <p className="notes-card-body">{note.content}</p>
              <div className="notes-card-ft">
                {note.pinned && <span className="notes-pinned-label"><Pin size={11} /> Fijada</span>}
                <span>{note.authorName || '—'}</span>
                <span>{formatDate(note.updatedAt)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar nota' : 'Nueva nota'}>
        <div className="notes-form">
          <div className="form-group">
            <label className="form-label">Título</label>
            <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título de la nota" />
          </div>
          <div className="form-group">
            <label className="form-label">Contenido</label>
            <textarea className="form-input" rows={5} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Escribí tu nota..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '1rem' }}>
            <div className="form-group m-0">
              <label className="form-label">Categoría</label>
              <input
                className="form-input"
                list="notes-categories"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                placeholder="Devocional, Reuniones..."
              />
              <datalist id="notes-categories">
                {DEFAULT_CATEGORIES.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="form-group m-0">
              <label className="form-label">Color</label>
              <div className="d-flex gap-1 flex-wrap">
                {NOTE_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer', border: '2px solid',
                      borderColor: form.color === c ? 'var(--color-text)' : 'transparent'
                    }}
                    onClick={() => setForm({ ...form, color: c })}
                  />
                ))}
              </div>
            </div>
          </div>
          {canShare && (
            <div className="form-group mt-2">
              <label className="form-label">Visibilidad</label>
              <select className="form-input" value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })}>
                <option value="private">Privada (solo yo)</option>
                <option value="public">Compartida (la ve todo el equipo)</option>
              </select>
            </div>
          )}
          <div className="d-flex gap-2 mt-3">
            <Button onClick={handleSave} disabled={!form.title.trim() && !form.content.trim()}>
              {editing ? 'Guardar cambios' : 'Guardar nota'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Notes;