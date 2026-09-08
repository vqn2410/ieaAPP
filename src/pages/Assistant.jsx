import React, { useState, useRef, useEffect } from 'react';
import Card from '../components/common/Card';
import { useAuth } from '../context/AuthContext';
import { iaUrl } from '../services/iaClient';
import { renderRich } from '../services/renderRich';
import { Send, Bot, User, Sparkles, LoaderCircle, GraduationCap, Check, MessageSquarePlus } from 'lucide-react';
import './Assistant.css';

const suggestions = [
  '¿Cuántos miembros tiene la iglesia?',
  '¿Cuáles son los próximos eventos?',
  '¿Cuántos seguimientos están pendientes?',
  'Resumí las novedades recientes',
  '¿Cuántos bautizados hay?',
];

const TRAINING = [
  { topic: 'Misión y visión', q: '¿Cuál es la misión y la visión de IEA? Contáme con tus palabras.' },
  { topic: 'Historia y origen', q: '¿Cuándo y cómo comenzó IEA? Contáme la historia de la iglesia.' },
  { topic: 'Valores', q: '¿Cuáles son los valores que definen a IEA y a su comunidad?' },
  { topic: 'Cultos y reuniones', q: '¿Cuáles son los días, horarios y lugares de los cultos y reuniones?' },
  { topic: 'Ministerios', q: '¿Qué ministerios o áreas de servicio tiene la iglesia y a quién van dirigidos?' },
  { topic: 'Contacto y sedes', q: '¿Cuál es la información de contacto, sedes o direcciones de la iglesia?' },
  { topic: 'Protocolos del portal', q: 'Contáme cómo se maneja en el día a día la asistencia y los seguimientos.' },
];

const Assistant = () => {
  const { currentUser, userData, hasRole } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy el asistente de IEA. Puedo ayudarte con datos de la congregación: miembros, grupos, eventos, seguimientos y novedades. ¿Qué querés saber?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const [training, setTraining] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [done, setDone] = useState([]);
  const [savingTrain, setSavingTrain] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const isAdmin = hasRole(['Admin']);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const pushMsg = (role, content) => setMessages(prev => [...prev, { role, content }]);

const send = async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;
    setInput('');
    pushMsg('user', question);
    setLoading(true);

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(iaUrl('/api/assistant'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ question, adminLearn: chatMode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Error del servidor');
      }
      pushMsg('assistant', data.answer);
    } catch (e) {
      pushMsg('assistant', `No pude responder: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const askTopic = (topic) => {
    const t = TRAINING.find(x => x.topic === topic);
    if (!t) return;
    setSelectedTopic(topic);
    pushMsg('assistant', `📚 **Entrenando a IEA** · Tema: **${t.topic}**\n\n${t.q}\n\nEscribí tu respuesta abajo y tocá **Guardar**.`);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startTraining = () => {
    setTraining(true);
    setDone([]);
    setSelectedTopic(null);
    pushMsg('assistant', 'Modo entrenamiento activado ✅ Soy IEA y quiero conocerte (a tu iglesia). **Elegí un tema de la lista de arriba** para empezar; respondé con tus palabras, como le contarías a un amigo. Todo lo que me enseñes queda guardado en mi base de conocimiento.');
  };

  const submitTraining = async () => {
    const a = input.trim();
    const t = TRAINING.find(x => x.topic === selectedTopic);
    if (!a || !t || savingTrain) return;
    setInput('');
    pushMsg('user', a);
    setSavingTrain(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(iaUrl('/api/knowledge'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ topic: t.topic, q: t.q, a }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      setDone(prev => [...prev, t.topic]);
      setSelectedTopic(null);
      pushMsg('assistant', `¡Guardado! 👍 **${t.topic}** quedó en mi memoria (${data.chunks} fragmentos de conocimiento activos).\n\n**Elegí otro tema de la lista** o tocá "Terminar entrenamiento".`);
    } catch (e) {
      pushMsg('assistant', `No pude guardar: ${e.message}`);
    } finally {
      setSavingTrain(false);
    }
  };

  const toggleTraining = () => {
    if (training) {
      setTraining(false);
      pushMsg('assistant', 'Modo entrenamiento finalizado. Seguí haciéndome preguntas cuando quieras.');
    } else {
      startTraining();
    }
  };

  const toggleChatMode = () => {
    setChatMode(m => !m);
    if (training) setTraining(false);
    pushMsg('assistant', chatMode
      ? 'Volviste al modo consulta. Seguí haciendo preguntas sobre la congregación.'
      : '💬 Modo conversar encendido. Como admin, me podés contar cosas sobre IEA (horarios, personas, cargos, eventos...) y las voy anotando en mi memoria. ¿Qué me contás?');
  };

  if (!hasRole(['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator'])) {
    return (
      <Card>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Tu rol no tiene acceso al asistente de la congregación.
        </div>
      </Card>
    );
  }

  return (
    <div className="assistant-page">
      <div className="assistant-header">
        <h1>Asistente IA</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Consultá datos de la congregación, resumí novedades y prepará tus reuniones. Hola, {userData?.name?.split(' ')[0]}!
        </p>
      </div>

      {isAdmin && (
        <div className="assistant-toolbar">
          <button
            className={`assistant-train-btn ${chatMode ? 'active' : ''}`}
            onClick={toggleChatMode}
            title={chatMode ? 'Volver al modo consulta' : 'Contarle datos a IEA sobre la iglesia de forma natural'}
          >
            <MessageSquarePlus size={16} /> {chatMode ? 'Volver a consultas' : 'Conversar con IEA'}
          </button>
          <button
            className={`assistant-train-btn ${training && !chatMode ? 'active' : ''}`}
            onClick={toggleTraining}
            title={training ? 'Terminar modo entrenamiento' : 'Enseñarle a IEA sobre la iglesia por temas'}
            disabled={chatMode}
          >
            <GraduationCap size={16} /> {training ? 'Terminar entrenamiento' : 'Entrenar a IEA'}
          </button>
          {training && !chatMode && (
            <div className="assistant-train-progress">
              {TRAINING.map(t => (
                <button
                  key={t.topic}
                  className={`assistant-topic ${done.includes(t.topic) ? 'done' : ''} ${selectedTopic === t.topic ? 'current' : ''}`}
                  onClick={() => askTopic(t.topic)}
                  title={done.includes(t.topic) ? 'Rehacer este tema' : 'Elegir este tema'}
                >
                  {done.includes(t.topic) ? <Check size={11} /> : `${TRAINING.indexOf(t) + 1}.`} {t.topic}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Card className="assistant-card">
        <div className="assistant-chat">
          {messages.map((msg, i) => (
            <div key={i} className={`assistant-msg ${msg.role}`}>
              <div className="assistant-avatar">
                {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
              </div>
              <div className="assistant-bubble" dangerouslySetInnerHTML={{ __html: renderRich(msg.content) }} />
            </div>
          ))}
          {loading && (
            <div className="assistant-msg assistant">
              <div className="assistant-avatar"><Bot size={15} /></div>
              <div className="assistant-bubble assistant-typing">
                <LoaderCircle size={14} className="spin" /> Pensando...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {!training && !chatMode && (
          <div className="assistant-suggestions">
            {suggestions.map(s => (
              <button key={s} className="assistant-suggestion" onClick={() => send(s)} title={s}>
                <Sparkles size={12} /> {s}
              </button>
            ))}
          </div>
        )}

        {chatMode && (
          <div className="assistant-chatmode-banner">
            💬 Estás en <strong>modo conversar</strong>: contale a IEA cosas de la iglesia y las va a recordar.
          </div>
        )}

        <form
          className="assistant-input-row"
          onSubmit={e => { e.preventDefault(); training ? submitTraining() : send(); }}
        >
          <input
            className="form-input"
            placeholder={chatMode
              ? 'Contáme algo sobre IEA, por ejemplo: "los cultos de mujeres son los miércoles a las 15"...'
              : training ? (selectedTopic ? 'Respondé la pregunta y toca Guardar...' : 'Elegí un tema de la lista de arriba...') : 'Escribí tu pregunta, por ejemplo: "¿cómo está la asistencia este mes?"'}
            value={input}
            onChange={e => setInput(e.target.value)}
            maxLength={1500}
          />
          <button
            type="submit"
            className="assistant-send"
            disabled={loading || savingTrain || (training ? !selectedTopic : !input.trim())}
            aria-label={training ? 'Guardar respuesta' : 'Enviar'}
            title={training ? 'Guardar respuesta en el conocimiento de IEA' : 'Enviar'}
          >
            {savingTrain ? <LoaderCircle size={18} className="spin" /> : training ? <GraduationCap size={18} /> : <Send size={18} />}
          </button>
        </form>
      </Card>
    </div>
  );
};

export default Assistant;