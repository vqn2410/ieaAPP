import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, LoaderCircle, GraduationCap, MessageSquarePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { iaUrl } from '../../services/iaClient';
import { renderRich } from '../../services/renderRich';
import './FloatingAssistant.css';

const greeting = '¡Hola! Soy IEA, el asistente de la Iglesia Extremo Amor. ¿En qué te puedo ayudar?';

const FloatingAssistant = () => {
  const { currentUser, hasRole } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: greeting }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [learnMode, setLearnMode] = useState(false);
  const bottomRef = useRef(null);

  const canUse = hasRole(['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator']);
  const isAdmin = hasRole(['Admin']);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  if (!canUse) return null;

  const send = async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(iaUrl('/api/assistant'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ question, adminLearn: learnMode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error del servidor');
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `No pude responder: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <div className={`fa-panel ${open ? 'open' : ''}`} role="dialog" aria-label="Asistente IA">
          <div className="fa-header">
            <div className="fa-avatar"><Bot size={18} /></div>
            <div className="fa-title">
              <strong>IEA · Asistente</strong>
              <span className="fa-status">En línea</span>
            </div>
            {isAdmin && (
              <>
                <button
                  className="fa-close"
                  onClick={() => { setLearnMode(m => !m); setOpen(true); }}
                  aria-label="Conversar con IEA"
                  title={learnMode ? 'Volver al modo consulta' : 'Contarle datos a IEA de forma natural'}
                >
                  <MessageSquarePlus size={16} />
                </button>
                <button
                  className="fa-close"
                  onClick={() => { setOpen(false); navigate('/dashboard/asistente'); }}
                  aria-label="Entrenar a IEA"
                  title="Entrenar a IEA (modo Admin)"
                >
                  <GraduationCap size={16} />
                </button>
              </>
            )}
            <button className="fa-close" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={18} /></button>
          </div>
          <div className="fa-chat">
            {learnMode && (
              <div className="fa-learnmode">
                💬 Modo conversar: contáme cosas de la iglesia y las voy a recordar.
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`fa-msg ${msg.role}`}>
                <div className="fa-chat-bubble" dangerouslySetInnerHTML={{ __html: renderRich(msg.content) }} />
              </div>
            ))}
            {loading && (
              <div className="fa-msg assistant">
                <div className="fa-chat-bubble fa-typing"><LoaderCircle size={13} className="fa-spin" /> Pensando...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <form className="fa-input-row" onSubmit={e => { e.preventDefault(); send(); }}>
            <input
              className="form-input"
              placeholder={learnMode ? 'Contáme algo sobre IEA...' : 'Escribí tu pregunta...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={1000}
            />
            <button type="submit" className="fa-send" disabled={loading || !input.trim()} aria-label="Enviar"><Send size={16} /></button>
          </form>
        </div>
      )}
      <button
        className={`fa-bubble ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'}
        title="Asistente IA"
      >
        {open ? <X size={22} /> : <Bot size={22} />}
      </button>
    </>
  );
};

export default FloatingAssistant;