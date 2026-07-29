import React, { useEffect, useEffectEvent, useState } from 'react';
import { BookOpen, ExternalLink, FileText, Image as ImageIcon, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/toastContext';
import { createFriendshipClass, deleteFriendshipClass, getFriendshipClasses } from '../services/friendshipClassService';
import './FriendshipClasses.css';

const FriendshipClasses = () => {
  const { currentUser, hasRole } = useAuth();
  const toast = useToast();
  const canManage = hasRole(['Admin', 'Pastor']);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState(null);

  const loadClasses = useEffectEvent(async () => {
    try {
      setLoading(true);
      setClasses(await getFriendshipClasses());
    } catch (error) {
      console.error('Error loading friendship classes', error);
      toast('No se pudieron cargar las clases.', 'error');
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => { loadClasses(); }, []);

  const closeModal = () => {
    setShowModal(false);
    setTitle('');
    setDescription('');
    setFileUrl('');
    setCoverUrl('');
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!title.trim() || !fileUrl.trim()) return;

    try {
      setSaving(true);
      const newClass = await createFriendshipClass({
        title: title.trim(),
        description: description.trim(),
        fileUrl: fileUrl.trim(),
        coverUrl: coverUrl.trim(),
        uploadedBy: currentUser?.uid || '',
      });
      setClasses(current => [newClass, ...current]);
      closeModal();
      toast('Clase publicada correctamente.', 'success');
    } catch (error) {
      console.error('Error creating friendship class', error);
      toast('No se pudo agregar la clase.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (classItem) => {
    if (!window.confirm(`¿Eliminar "${classItem.title}"?`)) return;
    try {
      await deleteFriendshipClass(classItem);
      setClasses(current => current.filter(item => item.id !== classItem.id));
      toast('Clase eliminada.', 'success');
    } catch (error) {
      console.error('Error deleting friendship class', error);
      toast('No se pudo eliminar la clase.', 'error');
    }
  };

  return (
    <div className="friendship-classes-page">
      <div className="friendship-classes-header">
        <div>
          <h1>Clases de Grupos de Amistad</h1>
          <p>Materiales en PDF para acompañar cada encuentro.</p>
        </div>
        {canManage && <Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>Agregar clase</Button>}
      </div>

      {loading ? (
        <Card><div className="friendship-classes-loading"><LoaderCircle size={20} /> Cargando clases...</div></Card>
      ) : classes.length === 0 ? (
        <Card><EmptyState icon={BookOpen} title="Sin clases publicadas" message="Todavía no hay materiales disponibles." /></Card>
      ) : (
        <div className="friendship-classes-grid">
          {classes.map(classItem => (
            <Card key={classItem.id} className="friendship-class-card">
              <div className="friendship-class-cover">
                {classItem.coverUrl ? <img src={classItem.coverUrl} alt={`Portada de ${classItem.title}`} /> : <ImageIcon size={20} />}
              </div>
              <div className="friendship-class-body">
                <h2>{classItem.title}</h2>
                {classItem.description && (
                  <>
                    <p className={expandedClassId === classItem.id ? 'expanded' : ''}>{classItem.description}</p>
                    {classItem.description.length > 120 && (
                      <button className="friendship-class-more" onClick={() => setExpandedClassId(current => current === classItem.id ? null : classItem.id)}>
                        {expandedClassId === classItem.id ? 'Ver menos' : 'Ver más'}
                      </button>
                    )}
                  </>
                )}
                <span><FileText size={12} /> Material en PDF</span>
              </div>
              <div className="friendship-class-actions">
                <a className="btn btn-outline" href={classItem.fileUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} /> Abrir
                </a>
                {canManage && (
                  <button className="friendship-class-delete" onClick={() => handleDelete(classItem)} title="Eliminar clase">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={closeModal} title="Agregar clase">
        <form className="friendship-class-form" onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Título</label>
            <input className="form-input" value={title} onChange={event => setTitle(event.target.value)} placeholder="Ej. Clase 1: La comunidad" required />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción (opcional)</label>
            <textarea className="form-input" value={description} onChange={event => setDescription(event.target.value)} rows={3} placeholder="Breve descripción del material" />
          </div>
          <div className="form-group">
            <label className="form-label">Enlace al PDF</label>
            <input type="url" className="form-input" value={fileUrl} onChange={event => setFileUrl(event.target.value)} placeholder="https://..." required />
          </div>
          <div className="form-group">
            <label className="form-label">Enlace de portada (opcional)</label>
            <input type="url" className="form-input" value={coverUrl} onChange={event => setCoverUrl(event.target.value)} placeholder="https://..." />
            <small>Usá una imagen pública para la portada.</small>
          </div>
          <Button type="submit" disabled={saving || !title.trim() || !fileUrl.trim()}>
            {saving ? 'Guardando...' : 'Agregar clase'}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

export default FriendshipClasses;
