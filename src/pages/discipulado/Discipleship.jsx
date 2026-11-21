import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  Facebook,
  FileCheck2,
  Flame,
  GraduationCap,
  Headphones,
  Home,
  Info,
  Instagram,
  Lock,
  PanelLeft,
  Play,
  Search,
  Shield,
  Sparkles,
  Square,
  Trophy,
  Users,
  Video,
  XCircle,
  Youtube,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import SeoHead from '../../components/common/SeoHead';
import { useAuth } from '../../context/AuthContext';
import { useCampus } from '../../context/CampusContext';
import {
  DISCIPLESHIP_ALL_ITEMS,
  DISCIPLESHIP_COURSES,
  DISCIPLESHIP_MODULES,
  DISCIPLESHIP_QUIZ_QUESTIONS,
  PASSING_PERCENTAGE,
} from './discipleshipData';
import {
  DEFAULT_DISCIPLESHIP_CONFIG,
  generateCertificateCode,
  getAllDiscipleshipSubmissions,
  getDiscipleshipConfig,
  getUserCertificates,
  issueModuleCertificate,
  submitDiscipleshipQuiz,
  updateDiscipleshipConfig,
} from '../../services/discipleshipService';
import { getMemberByEmail, getMembers } from '../../services/memberService';
import DiplomaModal from './DiplomaModal';
import './Discipleship.css';

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = typeof value?.toDate === 'function'
    ? value.toDate()
    : typeof value?.seconds === 'number'
      ? new Date(value.seconds * 1000)
      : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStorageKey = (uid) => `iea-discipulado-progress-v2:${uid || 'guest'}`;

const Discipleship = () => {
  const navigate = useNavigate();
  const { currentUser, userData, hasRole } = useAuth();
  const { activeCampusId, activeCampusSlug } = useCampus();
  const campusPrefix = `/${activeCampusSlug || 'sedecentral'}`;

  const isManager = hasRole(['Admin', 'Pastor']);
  const primaryCourse = DISCIPLESHIP_COURSES[0];

  const [config, setConfig] = useState(DEFAULT_DISCIPLESHIP_CONFIG);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Vistas de la plataforma independiente: 'welcome' | 'course' | 'admin'
  const [viewMode, setViewMode] = useState('welcome');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Filtros del aula LMS
  const [filterType, setFilterType] = useState('all'); // 'all' | 'content' | 'video' | 'quiz'
  const [openModules, setOpenModules] = useState(() =>
    Object.fromEntries(DISCIPLESHIP_MODULES.map((m) => [m.id, true]))
  );

  // Navegación del curso (1 pantalla por ítem / 1 pregunta por pantalla)
  const [activeItemId, setActiveItemId] = useState(DISCIPLESHIP_ALL_ITEMS[0]?.id || '');
  const [completedItemIds, setCompletedItemIds] = useState([]);
  const [answers, setAnswers] = useState({});
  const [showSummary, setShowSummary] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [videoPlayingId, setVideoPlayingId] = useState(null);

  // Datos de usuario, legajos y listados para Admin y Pastor
  const [ownMember, setOwnMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [searchRoster, setSearchRoster] = useState('');
  const [rosterFilter, setRosterFilter] = useState('all'); // 'all' | 'completed' | 'passed' | 'review' | 'pending'
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [selectedTargetMemberId, setSelectedTargetMemberId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [lastSubmitted, setLastSubmitted] = useState(null);

  // Diplomas digitales emitidos por módulo
  const [certificatesByModule, setCertificatesByModule] = useState({});
  const [activeDiploma, setActiveDiploma] = useState(null);
  const [issuingDiplomaModuleId, setIssuingDiplomaModuleId] = useState(null);

  const stageRef = useRef(null);

  // Cargar progreso local del usuario
  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      const raw = localStorage.getItem(getStorageKey(currentUser.uid));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.completedItemIds)) setCompletedItemIds(parsed.completedItemIds);
      if (parsed.answers && typeof parsed.answers === 'object') setAnswers(parsed.answers);
      if (parsed.activeItemId && DISCIPLESHIP_ALL_ITEMS.some((i) => i.id === parsed.activeItemId)) {
        setActiveItemId(parsed.activeItemId);
      }
    } catch {
      // ignorar
    }
  }, [currentUser?.uid]);

  // Guardar progreso local
  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      localStorage.setItem(
        getStorageKey(currentUser.uid),
        JSON.stringify({ completedItemIds, answers, activeItemId })
      );
    } catch {
      // ignorar
    }
  }, [currentUser?.uid, completedItemIds, answers, activeItemId]);

  // Cargar configuración, miembro propio y (si Admin/Pastor) legajos y miembros
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [cfg, me, userCerts] = await Promise.all([
          getDiscipleshipConfig(),
          currentUser?.email ? getMemberByEmail(currentUser.email) : Promise.resolve(null),
          currentUser?.uid ? getUserCertificates(currentUser.uid) : Promise.resolve([]),
        ]);
        if (!mounted) return;
        setConfig(cfg);
        setOwnMember(me);
        if (Array.isArray(userCerts) && userCerts.length > 0) {
          const certMap = {};
          userCerts.forEach((c) => {
            if (c.moduleId) certMap[c.moduleId] = c;
          });
          setCertificatesByModule(certMap);
        }

        if (isManager) {
          const [allSubs, allMembers] = await Promise.all([
            getAllDiscipleshipSubmissions(),
            getMembers(null, activeCampusId || null),
          ]);
          if (!mounted) return;
          setSubmissions(allSubs);
          setMembers(allMembers);
        }
      } catch (err) {
        console.error('Error inicializando Discipulado:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentUser?.email, currentUser?.uid, isManager, activeCampusId]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [activeItemId, viewMode]);

  const activeIndex = useMemo(
    () => Math.max(0, DISCIPLESHIP_ALL_ITEMS.findIndex((i) => i.id === activeItemId)),
    [activeItemId]
  );
  const activeItem = DISCIPLESHIP_ALL_ITEMS[activeIndex] || DISCIPLESHIP_ALL_ITEMS[0];

  const activeModule = useMemo(
    () => DISCIPLESHIP_MODULES.find((m) => m.id === activeItem?.moduleId) || DISCIPLESHIP_MODULES[0],
    [activeItem?.moduleId]
  );

  const activeModuleIndex = useMemo(
    () => DISCIPLESHIP_MODULES.findIndex((m) => m.id === activeModule.id),
    [activeModule.id]
  );

  const activeModuleItems = activeModule.items;
  const activeItemIndexInModule = Math.max(
    0,
    activeModuleItems.findIndex((i) => i.id === activeItem?.id)
  );
  const isLastItemInModule = activeItemIndexInModule === activeModuleItems.length - 1;
  const nextModule = DISCIPLESHIP_MODULES[activeModuleIndex + 1] || null;

  const quizItems = useMemo(
    () => DISCIPLESHIP_ALL_ITEMS.filter((i) => i.type === 'quiz'),
    []
  );

  const answeredQuizzesCount = useMemo(
    () => DISCIPLESHIP_QUIZ_QUESTIONS.filter((q) => answers[q.id] !== undefined).length,
    [answers]
  );
  const totalQuizzes = DISCIPLESHIP_QUIZ_QUESTIONS.length;
  const allQuizzesAnswered = answeredQuizzesCount === totalQuizzes;

  const completedSet = useMemo(() => {
    const set = new Set(completedItemIds);
    quizItems.forEach((qi) => {
      if (qi.quiz && answers[qi.quiz.id] !== undefined) {
        set.add(qi.id);
      }
    });
    return set;
  }, [completedItemIds, quizItems, answers]);

  const overallProgressPct = useMemo(() => {
    if (DISCIPLESHIP_ALL_ITEMS.length === 0) return 0;
    return Math.round((completedSet.size / DISCIPLESHIP_ALL_ITEMS.length) * 100);
  }, [completedSet]);

  const activeModuleDoneCount = useMemo(
    () => activeModuleItems.filter((i) => completedSet.has(i.id)).length,
    [activeModuleItems, completedSet]
  );

  const activeModuleProgressPct = useMemo(() => {
    if (activeModuleItems.length === 0) return 0;
    return Math.round((activeModuleDoneCount / activeModuleItems.length) * 100);
  }, [activeModuleDoneCount, activeModuleItems.length]);

  const alreadyCompletedByMember = Boolean(ownMember?.discipleshipQuiz?.completed);

  const firstName = useMemo(() => {
    if (ownMember?.firstName) return ownMember.firstName;
    if (userData?.name) return String(userData.name).split(' ')[0];
    return 'amigo/a';
  }, [ownMember?.firstName, userData?.name]);

  const fullPersonName = useMemo(() => {
    if (ownMember?.firstName || ownMember?.lastName) {
      return `${ownMember.firstName || ''} ${ownMember.lastName || ''}`.trim();
    }
    return userData?.name || currentUser?.displayName || currentUser?.email || 'Miembro IEA';
  }, [ownMember?.firstName, ownMember?.lastName, userData?.name, currentUser?.displayName, currentUser?.email]);

  const openOrIssueModuleDiploma = async (moduleObj, { autoOpen = true } = {}) => {
    if (!moduleObj || !currentUser?.uid) return null;
    const existing = certificatesByModule[moduleObj.id];
    if (existing) {
      if (autoOpen) setActiveDiploma(existing);
      return existing;
    }

    setIssuingDiplomaModuleId(moduleObj.id);
    try {
      const cert = await issueModuleCertificate({
        userId: currentUser.uid,
        memberId: ownMember?.id || null,
        memberName: fullPersonName,
        memberEmail: ownMember?.email || currentUser?.email || '',
        courseId: primaryCourse.id,
        courseName: primaryCourse.nombre,
        moduleId: moduleObj.id,
        moduleNumber: moduleObj.number,
        moduleTitle: moduleObj.title,
      });
      setCertificatesByModule((prev) => ({ ...prev, [moduleObj.id]: cert }));
      if (autoOpen) setActiveDiploma(cert);
      return cert;
    } catch (err) {
      console.error('Error emitiendo diploma del módulo:', err);
      const fallbackCert = {
        code: generateCertificateCode(primaryCourse.id, moduleObj.number),
        memberName: fullPersonName,
        courseId: primaryCourse.id,
        courseName: primaryCourse.nombre,
        moduleId: moduleObj.id,
        moduleNumber: moduleObj.number,
        moduleTitle: moduleObj.title,
        completedAt: new Date(),
        valid: true,
      };
      setCertificatesByModule((prev) => ({ ...prev, [moduleObj.id]: fallbackCert }));
      if (autoOpen) setActiveDiploma(fallbackCert);
      return fallbackCert;
    } finally {
      setIssuingDiplomaModuleId(null);
    }
  };

  const checkModuleCompletionAndIssueDiploma = (itemId, nextCompletedIds, nextAnswers) => {
    const item = DISCIPLESHIP_ALL_ITEMS.find((i) => i.id === itemId);
    if (!item) return;
    const mod = DISCIPLESHIP_MODULES.find((m) => m.id === item.moduleId);
    if (!mod || certificatesByModule[mod.id]) return;

    const nextSet = new Set(nextCompletedIds);
    quizItems.forEach((qi) => {
      if (qi.quiz && nextAnswers[qi.quiz.id] !== undefined) {
        nextSet.add(qi.id);
      }
    });

    const isModuleComplete = mod.items.every((mItem) => nextSet.has(mItem.id));
    if (isModuleComplete) {
      void openOrIssueModuleDiploma(mod, { autoOpen: true });
    }
  };

  const markItemCompleted = (itemId) => {
    const nextCompleted = completedItemIds.includes(itemId)
      ? completedItemIds
      : [...completedItemIds, itemId];
    setCompletedItemIds(nextCompleted);
    checkModuleCompletionAndIssueDiploma(itemId, nextCompleted, answers);
  };

  const selectItem = (itemId) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setActiveItemId(itemId);
    setShowSummary(false);
    setSubmitError('');
    setVideoPlayingId(null);
    if (stageRef.current) {
      stageRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openModuleInPlayer = (moduleObj) => {
    const firstPending = moduleObj.items.find((i) => !completedSet.has(i.id)) || moduleObj.items[0];
    if (firstPending) {
      setOpenModules((prev) => ({ ...prev, [moduleObj.id]: true }));
      selectItem(firstPending.id);
    }
    setViewMode('course');
  };

  const handleContinueCourse = () => {
    const nextPending = DISCIPLESHIP_ALL_ITEMS.find((item) => !completedSet.has(item.id));
    if (nextPending) {
      setOpenModules((prev) => ({ ...prev, [nextPending.moduleId]: true }));
      selectItem(nextPending.id);
    }
    setViewMode('course');
  };

  const handleNext = () => {
    if (!activeItem) return;
    if (activeItem.type !== 'quiz') {
      markItemCompleted(activeItem.id);
    }
    if (!isLastItemInModule) {
      const nextItem = activeModuleItems[activeItemIndexInModule + 1];
      selectItem(nextItem.id);
    } else if (nextModule) {
      openModuleInPlayer(nextModule);
    }
  };

  const handlePrev = () => {
    if (activeItemIndexInModule > 0) {
      const prevItem = activeModuleItems[activeItemIndexInModule - 1];
      selectItem(prevItem.id);
    }
  };

  const handleJumpNextPending = () => {
    const nextPending = activeModuleItems.find((item) => !completedSet.has(item.id));
    if (nextPending) {
      selectItem(nextPending.id);
    }
  };

  const handleSelectOption = (questionId, optionIndex, itemId) => {
    setSubmitError('');
    const nextAnswers = { ...answers, [questionId]: optionIndex };
    const nextCompleted = completedItemIds.includes(itemId)
      ? completedItemIds
      : [...completedItemIds, itemId];
    setAnswers(nextAnswers);
    setCompletedItemIds(nextCompleted);
    checkModuleCompletionAndIssueDiploma(itemId, nextCompleted, nextAnswers);
  };

  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !activeItem) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const parts = [activeItem.title];
    if (activeItem.descripcion) parts.push(activeItem.descripcion);
    if (Array.isArray(activeItem.contenido)) parts.push(...activeItem.contenido);
    if (activeItem.versiculo) parts.push(`${activeItem.versiculo.texto}. ${activeItem.versiculo.referencia}`);
    if (activeItem.quiz) {
      parts.push(activeItem.quiz.pregunta);
      activeItem.quiz.opciones.forEach((op, idx) => parts.push(`Opción ${String.fromCharCode(65 + idx)}: ${op}`));
    }

    const utterance = new SpeechSynthesisUtterance(parts.join('. '));
    utterance.lang = 'es-AR';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleToggleConfig = async (key) => {
    if (!isManager || savingConfig) return;
    setSavingConfig(true);
    try {
      const updated = await updateDiscipleshipConfig(
        { [key]: !config[key] },
        currentUser?.email || userData?.email || ''
      );
      setConfig(updated);
    } catch (err) {
      console.error('Error actualizando configuración:', err);
      alert('No se pudo actualizar la configuración.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSubmitFinalEvaluation = async () => {
    if (!allQuizzesAnswered) {
      const firstUnanswered = quizItems.find((qi) => qi.quiz && answers[qi.quiz.id] === undefined);
      setSubmitError(
        `Te faltan ${totalQuizzes - answeredQuizzesCount} pregunta(s) obligatoria(s) para finalizar.`
      );
      if (firstUnanswered) {
        setOpenModules((prev) => ({ ...prev, [firstUnanswered.moduleId]: true }));
        selectItem(firstUnanswered.id);
      }
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const targetMember =
        isManager && selectedTargetMemberId
          ? members.find((m) => m.id === selectedTargetMemberId) || ownMember
          : ownMember;

      const resolvedName = targetMember
        ? `${targetMember.firstName || ''} ${targetMember.lastName || ''}`.trim()
        : userData?.name || currentUser?.displayName || currentUser?.email || 'Miembro';

      const result = await submitDiscipleshipQuiz({
        memberId: targetMember?.id || null,
        userId: currentUser?.uid,
        memberName: resolvedName,
        memberEmail: targetMember?.email || currentUser?.email || '',
        campusId: targetMember?.campusId || activeCampusId || null,
        courseId: primaryCourse.id,
        courseName: primaryCourse.nombre,
        answers,
        submittedByRole: Array.isArray(userData?.role)
          ? userData.role.join(', ')
          : userData?.role || 'Member',
      });

      setLastSubmitted(result);
      if (targetMember && targetMember.id === ownMember?.id) {
        setOwnMember((prev) =>
          prev
            ? {
                ...prev,
                discipleshipQuiz: {
                  completed: true,
                  submissionId: result.id,
                  courseId: result.courseId,
                  courseName: result.courseName,
                  score: result.score,
                  totalQuestions: result.totalQuestions,
                  percentage: result.percentage,
                  passed: result.passed,
                  completedAt: result.completedAt,
                },
              }
            : prev
        );
      }
      if (isManager) {
        setSubmissions((prev) => [result, ...prev]);
      }
    } catch (err) {
      console.error('Error guardando evaluación en legajo:', err);
      setSubmitError(err?.message || 'No se pudo guardar el cuestionario en el legajo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestartCourse = () => {
    setAnswers({});
    setCompletedItemIds([]);
    setLastSubmitted(null);
    setSubmitError('');
    setActiveItemId(DISCIPLESHIP_ALL_ITEMS[0]?.id || '');
  };

  // Listado unificado para Admin y Pastor: combina miembros + calificaciones de discipulado
  const adminRoster = useMemo(() => {
    if (!isManager) return [];

    const latestByMemberId = new Map();
    const latestByEmail = new Map();
    const unmatchedSubmissions = [];

    submissions.forEach((sub) => {
      if (sub.memberId && !latestByMemberId.has(sub.memberId)) {
        latestByMemberId.set(sub.memberId, sub);
      }
      const normEmail = String(sub.memberEmail || '').trim().toLowerCase();
      if (normEmail && !latestByEmail.has(normEmail)) {
        latestByEmail.set(normEmail, sub);
      }
    });

    const matchedSubIds = new Set();
    const rows = members.map((m) => {
      const normEmail = String(m.email || '').trim().toLowerCase();
      const sub = latestByMemberId.get(m.id) || (normEmail ? latestByEmail.get(normEmail) : null) || null;
      if (sub) matchedSubIds.add(sub.id);

      const quizSummary = sub || (m.discipleshipQuiz?.completed ? m.discipleshipQuiz : null);
      const status = quizSummary
        ? quizSummary.passed
          ? 'passed'
          : 'review'
        : 'pending';

      return {
        rowId: m.id,
        memberId: m.id,
        name: `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email || 'Miembro',
        email: m.email || '',
        group: m.group || '',
        status,
        completed: Boolean(quizSummary),
        score: quizSummary ? quizSummary.score : null,
        totalQuestions: quizSummary ? quizSummary.totalQuestions : totalQuizzes,
        percentage: quizSummary ? Number(quizSummary.percentage || 0) : 0,
        completedAt: quizSummary ? quizSummary.completedAt || quizSummary.createdAt : null,
        answers: sub?.answers || [],
      };
    });

    submissions.forEach((sub) => {
      if (matchedSubIds.has(sub.id)) return;
      unmatchedSubmissions.push({
        rowId: `sub-${sub.id}`,
        memberId: sub.memberId || null,
        name: sub.memberName || sub.memberEmail || 'Usuario',
        email: sub.memberEmail || '',
        group: '',
        status: sub.passed ? 'passed' : 'review',
        completed: true,
        score: sub.score,
        totalQuestions: sub.totalQuestions,
        percentage: Number(sub.percentage || 0),
        completedAt: sub.completedAt || sub.createdAt,
        answers: sub.answers || [],
      });
    });

    const combined = [...unmatchedSubmissions, ...rows];
    const order = { passed: 0, review: 1, pending: 2 };
    return combined.sort((a, b) => {
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return a.name.localeCompare(b.name);
    });
  }, [isManager, members, submissions, totalQuizzes]);

  const filteredRoster = useMemo(() => {
    const term = searchRoster.trim().toLowerCase();
    return adminRoster.filter((row) => {
      if (rosterFilter === 'completed' && !row.completed) return false;
      if (rosterFilter === 'passed' && row.status !== 'passed') return false;
      if (rosterFilter === 'review' && row.status !== 'review') return false;
      if (rosterFilter === 'pending' && row.status !== 'pending') return false;
      if (!term) return true;
      return `${row.name} ${row.email} ${row.group}`.toLowerCase().includes(term);
    });
  }, [adminRoster, rosterFilter, searchRoster]);

  const adminStats = useMemo(() => {
    const totalMembers = adminRoster.length;
    const completedRows = adminRoster.filter((r) => r.completed);
    const passedCount = adminRoster.filter((r) => r.status === 'passed').length;
    const reviewCount = adminRoster.filter((r) => r.status === 'review').length;
    const pendingCount = adminRoster.filter((r) => r.status === 'pending').length;
    const avgScore =
      completedRows.length > 0
        ? Math.round(
            completedRows.reduce((acc, r) => acc + Number(r.percentage || 0), 0) /
              completedRows.length
          )
        : 0;
    const completionRate =
      totalMembers > 0 ? Math.round((completedRows.length / totalMembers) * 100) : 0;
    return {
      totalMembers,
      completedCount: completedRows.length,
      passedCount,
      reviewCount,
      pendingCount,
      avgScore,
      completionRate,
    };
  }, [adminRoster]);

  const currentQuizNumber = useMemo(() => {
    if (activeItem?.type !== 'quiz') return 0;
    return quizItems.findIndex((q) => q.id === activeItem.id) + 1;
  }, [activeItem, quizItems]);

  if (loading) {
    return (
      <div className="lms-standalone">
        <SeoHead title="Discipulado · CRECER 1 | IEA" noindex />
        <div className="lms-loading">Cargando plataforma de Discipulado...</div>
      </div>
    );
  }

  // Control de acceso: si no está habilitado para miembros, solo Admin y Pastor pueden verlo
  if (!isManager && !config.enabledForMembers) {
    return (
      <div className="lms-standalone">
        <SeoHead title="Discipulado · CRECER 1 | IEA" noindex />
        <div className="lms-locked-card">
          <div className="lms-locked-icon">
            <Lock size={28} />
          </div>
          <h2>Discipulado próximamente</h2>
          <p>
            El curso y cuestionario obligatorio de Discipulado todavía no se encuentra habilitado para miembros.
            Cuando el equipo pastoral lo active, podrás acceder desde aquí.
          </p>
          <Button variant="outline" onClick={() => navigate(`${campusPrefix}/dashboard`)}>
            Volver al Portal IEA
          </Button>
        </div>
      </div>
    );
  }

  const isLastItem = activeIndex === DISCIPLESHIP_ALL_ITEMS.length - 1;

  return (
    <div className="lms-standalone animate-fade-in">
      <SeoHead title="Discipulado · CRECER 1 | Iglesia Extremo Amor" noindex />

      {/* CABECERA GLOBAL DE LA PLATAFORMA INDEPENDIENTE DE DISCIPULADO */}
      <header className="lms-global-header">
        <div className="lms-global-brand">
          <button
            type="button"
            className="lms-brand-btn"
            onClick={() => setViewMode('welcome')}
            title="Inicio del Discipulado"
          >
            <img
              src="/img/icon-500x500.png"
              alt="Iglesia Extremo Amor"
              className="lms-brand-logo"
            />
            <div className="lms-brand-text">
              <span className="lms-brand-church">
                <span className="lms-brand-book">IGLESIA</span>{' '}
                <span className="lms-brand-wide">EXTREMO AMOR</span>
              </span>
              <strong>Ruta de crecimiento · Discipulado {primaryCourse.nombre}</strong>
            </div>
          </button>
        </div>

        <nav className="lms-global-nav" aria-label="Navegación de Discipulado">
          <button
            type="button"
            className={`lms-nav-pill ${viewMode === 'welcome' ? 'active' : ''}`}
            onClick={() => setViewMode('welcome')}
          >
            <Home size={15} />
            <span>Bienvenida</span>
          </button>
          <button
            type="button"
            className={`lms-nav-pill ${viewMode === 'course' ? 'active' : ''}`}
            onClick={() => setViewMode('course')}
          >
            <GraduationCap size={15} />
            <span>Aula y Módulos</span>
          </button>
          {isManager && (
            <button
              type="button"
              className={`lms-nav-pill ${viewMode === 'admin' ? 'active' : ''}`}
              onClick={() => setViewMode('admin')}
            >
              <Shield size={15} />
              <span>Gestión y Calificaciones ({adminStats.completedCount}/{adminStats.totalMembers})</span>
            </button>
          )}
        </nav>

        <div className="lms-global-right">
          <div className="lms-stat-pill" title="Preguntas obligatorias respondidas">
            <span className="lms-stat-muted">Quiz</span>
            <strong>
              {answeredQuizzesCount}/{totalQuizzes}
            </strong>
            <span className={`lms-dot ${allQuizzesAnswered ? 'is-green' : 'is-orange'}`} />
          </div>

          <div className="lms-stat-pill" title="Tu avance">
            <Flame size={14} className="lms-flame" />
            <strong>{overallProgressPct}%</strong>
          </div>

          <a
            href={`${campusPrefix}/dashboard`}
            className="lms-portal-link"
            title="Volver al Portal IEA"
          >
            <ArrowLeft size={14} />
            <span>Portal</span>
          </a>
        </div>
      </header>

      {/* ====================================================================
          VISTA 1: BIENVENIDA, INFORMACIÓN DE MÓDULOS Y AVANCE PERSONAL
         ==================================================================== */}
      {viewMode === 'welcome' && (
        <div className="lms-welcome-wrap">
          <section className="lms-hero-card">
            <div className="lms-hero-copy">
              <div className="lms-hero-badges">
                <span className="lms-eyebrow-pill">RUTA DE CRECIMIENTO · I.E.A.</span>
                {config.mandatory && (
                  <span className="lms-badge-accent">Cuestionario obligatorio</span>
                )}
                {isManager && (
                  <span className={`lms-status-tag ${config.enabledForMembers ? 'is-live' : ''}`}>
                    {config.enabledForMembers ? 'Habilitado para miembros' : 'Solo Admin y Pastor'}
                  </span>
                )}
              </div>

              <h1>Bienvenido al Discipulado, {firstName}.</h1>
              <p>
                Te damos la bienvenida a <strong>{primaryCourse.nombre}</strong>. A través de 4 módulos con
                lecturas breves, videos de clase y preguntas interactivas vas a conocer el corazón, la visión
                y los pasos prácticos para crecer junto a la familia de Iglesia Extremo Amor.
              </p>

              <div className="lms-hero-actions">
                <button
                  type="button"
                  className="lms-btn-primary lms-btn-lg"
                  onClick={handleContinueCourse}
                >
                  <span>
                    {overallProgressPct > 0 ? 'Continuar donde quedaste' : 'Comenzar discipulado'}
                  </span>
                  <ArrowRight size={17} />
                </button>

                {isManager && (
                  <button
                    type="button"
                    className="lms-btn-back lms-btn-lg"
                    onClick={() => setViewMode('admin')}
                  >
                    <Users size={16} />
                    <span>Ver calificaciones y avance</span>
                  </button>
                )}
              </div>
            </div>

            <div className="lms-hero-progress-card">
              <div className="lms-hero-progress-head">
                <span>TU AVANCE PERSONAL</span>
                <strong>{overallProgressPct}%</strong>
              </div>
              <div className="lms-progress-track lms-progress-track-lg">
                <div
                  className="lms-progress-fill is-orange-fill"
                  style={{ width: `${overallProgressPct}%` }}
                />
              </div>

              <div className="lms-hero-metrics">
                <div>
                  <span>Lecciones</span>
                  <strong>
                    {completedSet.size} / {DISCIPLESHIP_ALL_ITEMS.length}
                  </strong>
                </div>
                <div>
                  <span>Quizzes obligatorios</span>
                  <strong>
                    {answeredQuizzesCount} / {totalQuizzes}
                  </strong>
                </div>
                <div>
                  <span>Estado en legajo</span>
                  <strong className={alreadyCompletedByMember || lastSubmitted ? 'is-green-txt' : 'is-orange-txt'}>
                    {alreadyCompletedByMember || lastSubmitted ? 'Registrado' : 'Pendiente'}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          {/* LOS 4 NIVELES CRECER */}
          <section className="lms-crecer-overview">
            <div className="lms-section-head">
              <div>
                <span className="lms-eyebrow-pill">RUTA COMPLETA DE DISCIPULADO</span>
                <h2>Los 4 niveles de CRECER</h2>
              </div>
              <p>
                Ingresá a tu nivel disponible para cursar cada módulo, responder el cuestionario obligatorio y obtener tu diploma digital.
              </p>
            </div>

            <div className="lms-crecer-grid">
              {DISCIPLESHIP_COURSES.map((course) => {
                const courseItems = course.modules.flatMap((m) => m.items || []);
                const courseDone = courseItems.filter((i) => completedSet.has(i.id)).length;
                const coursePct =
                  courseItems.length > 0
                    ? Math.round((courseDone / courseItems.length) * 100)
                    : 0;

                return (
                  <button
                    key={course.id}
                    type="button"
                    disabled={course.isLocked}
                    className={`lms-crecer-card ${!course.isLocked ? 'is-selected' : 'is-locked'}`}
                    onClick={() => {
                      if (!course.isLocked) handleContinueCourse();
                    }}
                  >
                    <div className="lms-crecer-card-top">
                      <span className="lms-crecer-num">0{course.number}</span>
                      {course.isLocked ? (
                        <span className="lms-status-pill">
                          <Lock size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                          Próximamente
                        </span>
                      ) : (
                        <span
                          className={`lms-status-pill ${
                            coursePct === 100 ? 'is-approved' : 'is-pending'
                          }`}
                        >
                          {coursePct === 100 ? 'Completado' : `Disponible · ${coursePct}%`}
                        </span>
                      )}
                    </div>

                    <h3>
                      {course.nombre} · <em>{course.subtitulo}</em>
                    </h3>
                    <p>{course.descripcion}</p>

                    <div className="lms-crecer-card-foot">
                      <span>
                        {course.isLocked
                          ? `${course.modules.length} módulos · Próximamente`
                          : `${course.modules.length} módulos · Ingresar`}
                      </span>
                      <ChevronRight size={15} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* ====================================================================
          VISTA 2: AULA LMS (EXACTA AL EJEMPLO · 1 PREGUNTA POR PANTALLA)
         ==================================================================== */}
      {viewMode === 'course' && (
        <div className="lms-player-wrap">
          <div className="lms-player-subbar">
            <div className="lms-topbar-left">
              <button
                type="button"
                className="lms-icon-btn"
                onClick={() => setSidebarOpen((prev) => !prev)}
                title={sidebarOpen ? 'Ocultar temario' : 'Mostrar temario'}
              >
                <PanelLeft size={18} />
              </button>
              <button
                type="button"
                className="lms-portal-link"
                onClick={() => setViewMode('welcome')}
              >
                <ArrowLeft size={14} />
                <span>Módulos</span>
              </button>
              <span className="lms-player-course-name">
                Módulo {activeModule.number}: {activeModule.title}
              </span>
            </div>

            <div className="lms-module-switcher" role="tablist" aria-label="Secciones de módulos">
              {DISCIPLESHIP_MODULES.map((mod) => {
                const modDone = mod.items.every((i) => completedSet.has(i.id));
                const isCurrent = mod.id === activeModule.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    role="tab"
                    aria-selected={isCurrent}
                    className={`lms-module-tab ${isCurrent ? 'active' : ''} ${modDone ? 'is-done' : ''}`}
                    onClick={() => openModuleInPlayer(mod)}
                  >
                    {modDone && <CheckCircle2 size={13} />}
                    <span>Módulo {mod.number}</span>
                  </button>
                );
              })}
            </div>

            <div className="lms-topbar-right">
              <div className="lms-stat-pill lms-rank-pill">
                <Trophy size={14} />
                <span className="lms-badge-accent">
                  {config.mandatory ? 'Obligatorio' : 'CRECER 1'}
                </span>
              </div>
            </div>
          </div>

          <div className={`lms-workspace ${sidebarOpen ? '' : 'is-sidebar-collapsed'}`}>
            {sidebarOpen && (
              <aside className="lms-sidebar">
                <div className="lms-filter-pills">
                  {[
                    { id: 'all', label: 'Todo' },
                    { id: 'content', label: 'Contenido' },
                    { id: 'video', label: 'Videos' },
                    { id: 'quiz', label: 'Quizzes' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`lms-filter-pill ${filterType === f.id ? 'active' : ''}`}
                      onClick={() => setFilterType(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="lms-timeline-scroll">
                  <div className="lms-timeline-rail" aria-hidden="true" />

                  {[activeModule].map((mod) => {
                    const visibleItems =
                      filterType === 'all'
                        ? mod.items
                        : mod.items.filter((item) => item.type === filterType);

                    const moduleDone = mod.items.every((item) => completedSet.has(item.id));
                    const isOpen = openModules[mod.id] !== false;

                    return (
                      <div key={mod.id} className="lms-module-group">
                        <button
                          type="button"
                          className="lms-module-header"
                          onClick={() =>
                            setOpenModules((prev) => ({ ...prev, [mod.id]: !isOpen }))
                          }
                        >
                          <span className={`lms-module-check ${moduleDone ? 'is-done' : ''}`}>
                            {moduleDone ? <CheckCircle2 size={17} /> : <span>{mod.number}</span>}
                          </span>
                          <div className="lms-module-titles">
                            <span className="lms-module-num">Módulo {mod.number}</span>
                            <strong>{mod.title}</strong>
                          </div>
                          <span className="lms-module-chevron">
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </span>
                        </button>

                        {isOpen && (
                          <div className="lms-module-items">
                            {visibleItems.map((item) => {
                              const isActive = item.id === activeItem?.id;
                              const isDone = completedSet.has(item.id);
                              const isQuiz = item.type === 'quiz';
                              const isVideo = item.type === 'video';
                              const quizAnswered =
                                isQuiz && item.quiz && answers[item.quiz.id] !== undefined;

                              return (
                                <div key={item.id} className="lms-timeline-node-wrap">
                                  <span
                                    className={`lms-rail-dot ${
                                      isDone ? 'is-done' : isActive ? 'is-active' : ''
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    className={`lms-lesson-card ${isActive ? 'is-active' : ''} ${
                                      isQuiz ? 'is-quiz-card' : ''
                                    }`}
                                    onClick={() => selectItem(item.id)}
                                  >
                                    <div className="lms-lesson-top">
                                      <div className="lms-lesson-title-row">
                                        {isVideo ? (
                                          <Video size={14} className="lms-type-icon" />
                                        ) : isQuiz ? (
                                          <ClipboardCheck size={14} className="lms-type-icon is-quiz" />
                                        ) : (
                                          <BookOpen size={14} className="lms-type-icon" />
                                        )}
                                        <span className="lms-lesson-title">{item.title}</span>
                                      </div>

                                      {isQuiz ? (
                                        <span
                                          className={`lms-status-pill ${
                                            quizAnswered ? 'is-approved' : 'is-pending'
                                          }`}
                                        >
                                          {quizAnswered ? 'Respondida' : 'Pendiente'}
                                        </span>
                                      ) : isDone ? (
                                        <span className="lms-status-pill is-present">
                                          {isVideo ? 'Visto' : 'Leída'}
                                        </span>
                                      ) : (
                                        <span className="lms-duration-tag">{item.duration}</span>
                                      )}
                                    </div>

                                    {isQuiz && (
                                      <div className="lms-quiz-card-meta">
                                        <span className="lms-quiz-meta-orange">
                                          <ClipboardCheck size={12} /> 1 pregunta en pantalla · Obligatoria
                                        </span>
                                        <span className="lms-quiz-meta-sub">
                                          <Info size={12} /> Se guarda en tu legajo pastoral
                                        </span>
                                      </div>
                                    )}

                                    {isVideo && (
                                      <div className="lms-video-card-footer">
                                        <span>Video de clase · {item.videoDuration || item.duration}</span>
                                        <span className="lms-mini-btn">Ver video</span>
                                      </div>
                                    )}
                                  </button>
                                </div>
                              );
                            })}

                            {moduleDone && (
                              <button
                                type="button"
                                className="lms-sidebar-diploma-btn"
                                disabled={issuingDiplomaModuleId === mod.id}
                                onClick={() => openOrIssueModuleDiploma(mod, { autoOpen: true })}
                              >
                                <Award size={14} />
                                <span>
                                  {issuingDiplomaModuleId === mod.id
                                    ? 'Generando diploma...'
                                    : `Ver diploma · Módulo ${mod.number}`}
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {activeModuleProgressPct < 100 && (
                  <button
                    type="button"
                    className="lms-jump-pill"
                    onClick={handleJumpNextPending}
                  >
                    <ArrowDown size={13} />
                    <span>Ir a la próxima lección</span>
                  </button>
                )}
              </aside>
            )}

            <main className="lms-main">
              <div className="lms-stage-card" ref={stageRef}>
                {lastSubmitted ? (
                  <div className="lms-completion-view">
                    <div className="lms-completion-icon">
                      <Award size={36} />
                    </div>
                    <span className="lms-eyebrow-pill">DISCIPULADO · CRECER 1 COMPLETADO</span>
                    <h2>¡Evaluación guardada en el legajo!</h2>
                    <p className="lms-completion-desc">
                      Se registró la evaluación obligatoria de <strong>{lastSubmitted.memberName}</strong>.
                      Los resultados completos quedan guardados en su legajo y solo Admin y Pastor pueden verlos.
                    </p>

                    {isManager && (
                      <>
                        <div className="lms-score-strip">
                          <div>
                            <span>Puntaje</span>
                            <strong>
                              {lastSubmitted.score} / {lastSubmitted.totalQuestions} ({lastSubmitted.percentage}%)
                            </strong>
                          </div>
                          <div>
                            <span>Estado</span>
                            <strong className={lastSubmitted.passed ? 'is-green-txt' : 'is-orange-txt'}>
                              {lastSubmitted.passed ? 'Aprobado' : 'Requiere repaso'}
                            </strong>
                          </div>
                        </div>

                        <div className="lms-review-stack">
                          {lastSubmitted.answers.map((ans, idx) => (
                            <div
                              key={ans.questionId || idx}
                              className={`lms-review-card ${ans.isCorrect ? 'is-ok' : 'is-err'}`}
                            >
                              <div className="lms-review-head">
                                <span>
                                  {idx + 1}. {ans.pregunta}
                                </span>
                                {ans.isCorrect ? (
                                  <CheckCircle2 size={17} className="is-green-txt" />
                                ) : (
                                  <XCircle size={17} className="is-red-txt" />
                                )}
                              </div>
                              <p>
                                <strong>Elegida:</strong> {ans.selectedText}
                              </p>
                              {!ans.isCorrect && (
                                <p className="is-green-txt">
                                  <strong>Correcta:</strong> {ans.correctText}
                                </p>
                              )}
                              <small>{ans.explicacion}</small>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="lms-completion-actions">
                      {isManager ? (
                        <>
                          <Button variant="outline" onClick={handleRestartCourse}>
                            Reiniciar vista previa
                          </Button>
                          <Button onClick={() => setViewMode('admin')}>
                            Ver listado de calificaciones
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" onClick={() => setViewMode('welcome')}>
                          Volver al inicio del Discipulado
                        </Button>
                      )}
                    </div>
                  </div>
                ) : !isManager && alreadyCompletedByMember ? (
                  <div className="lms-completion-view">
                    <div className="lms-completion-icon">
                      <CheckCircle2 size={36} />
                    </div>
                    <span className="lms-eyebrow-pill">CRECER 1 · COMPLETADO</span>
                    <h2>¡Ya completaste este Discipulado!</h2>
                    <p className="lms-completion-desc">
                      Tu cuestionario obligatorio ya fue registrado en tu legajo para el equipo pastoral.
                    </p>
                  </div>
                ) : activeItem ? (
                  <div className="lms-stage-inner">
                    <div className="lms-eyebrow-pill">
                      MÓDULO {activeItem.moduleNumber} · {activeItem.moduleTitle.toUpperCase()}
                    </div>

                    <h2 className="lms-stage-title">{activeItem.title}</h2>

                    <div className="lms-stage-tools">
                      <button
                        type="button"
                        className={`lms-tool-btn ${isSpeaking ? 'is-active' : ''}`}
                        onClick={handleToggleSpeech}
                      >
                        {isSpeaking ? <Square size={14} /> : <Headphones size={14} />}
                        <span>{isSpeaking ? 'Detener audio' : 'Escuchar'}</span>
                      </button>

                      {activeItem.summary && (
                        <button
                          type="button"
                          className={`lms-tool-btn ${showSummary ? 'is-active' : ''}`}
                          onClick={() => setShowSummary((prev) => !prev)}
                        >
                          <Sparkles size={14} className="lms-spark-icon" />
                          <span>Resumir</span>
                        </button>
                      )}
                    </div>

                    {showSummary && activeItem.summary && (
                      <div className="lms-summary-callout">
                        <strong>Idea clave</strong>
                        <p>{activeItem.summary}</p>
                      </div>
                    )}

                    {activeItem.type === 'video' && (
                      <div className="lms-video-stage">
                        {activeItem.videoUrl ? (
                          <div className="lms-video-frame">
                            <iframe
                              src={activeItem.videoUrl}
                              title={activeItem.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <div className="lms-video-placeholder">
                            <div className="lms-video-overlay">
                              <button
                                type="button"
                                className="lms-play-circle"
                                onClick={() => {
                                  setVideoPlayingId(activeItem.id);
                                  markItemCompleted(activeItem.id);
                                }}
                              >
                                {videoPlayingId === activeItem.id ? (
                                  <CheckCircle2 size={30} />
                                ) : (
                                  <Play size={30} fill="currentColor" />
                                )}
                              </button>
                              <strong>
                                {videoPlayingId === activeItem.id
                                  ? 'Clase marcada como vista'
                                  : `Video de clase · ${activeItem.title}`}
                              </strong>
                              <span>
                                Duración estimada: {activeItem.videoDuration || activeItem.duration} · Listo para incrustar video
                              </span>
                            </div>
                          </div>
                        )}

                        {Array.isArray(activeItem.contenido) && (
                          <div className="lms-prose">
                            {activeItem.contenido.map((p, idx) => (
                              <p key={idx}>{p}</p>
                            ))}
                          </div>
                        )}

                        {Array.isArray(activeItem.listas) &&
                          activeItem.listas.map((lista, idx) => (
                            <div key={idx} className="lms-list-section">
                              <h4>{lista.titulo}</h4>
                              <ul className="lms-orange-list">
                                {lista.items.map((li, i) => (
                                  <li key={i}>{li}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                      </div>
                    )}

                    {activeItem.type === 'content' && (
                      <div className="lms-content-stage">
                        {activeItem.descripcion && (
                          <p className="lms-lead">{activeItem.descripcion}</p>
                        )}

                        {Array.isArray(activeItem.contenido) && (
                          <div className="lms-prose">
                            {activeItem.contenido.map((p, idx) => (
                              <p key={idx}>{p}</p>
                            ))}
                          </div>
                        )}

                        {activeItem.versiculo && (
                          <blockquote className="lms-verse-box">
                            <p>“{activeItem.versiculo.texto}”</p>
                            <cite>— {activeItem.versiculo.referencia}</cite>
                          </blockquote>
                        )}

                        {Array.isArray(activeItem.versiculos) &&
                          activeItem.versiculos.map((v, idx) => (
                            <blockquote key={idx} className="lms-verse-box">
                              <p>“{v.texto}”</p>
                              <cite>— {v.referencia}</cite>
                            </blockquote>
                          ))}

                        {Array.isArray(activeItem.lugares) && (
                          <div className="lms-cards-grid">
                            {activeItem.lugares.map((lugar, idx) => (
                              <div key={idx} className="lms-feature-card">
                                <strong>{lugar.nombre}</strong>
                                <span>{lugar.descripcion}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {Array.isArray(activeItem.modulos) && (
                          <div className="lms-cards-grid">
                            {activeItem.modulos.map((mod) => (
                              <div key={mod.numero} className="lms-feature-card">
                                <small>Módulo {mod.numero}</small>
                                <strong>{mod.nombre}</strong>
                                <span>{mod.descripcion}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {Array.isArray(activeItem.conceptos) && (
                          <div className="lms-cards-grid">
                            {activeItem.conceptos.map((c, idx) => (
                              <div key={idx} className="lms-feature-card">
                                <strong>{c.titulo}</strong>
                                <span>{c.descripcion}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {Array.isArray(activeItem.listas) &&
                          activeItem.listas.map((lista, idx) => (
                            <div key={idx} className="lms-list-section">
                              <h4>{lista.titulo}</h4>
                              <ul className="lms-orange-list">
                                {lista.items.map((li, i) => (
                                  <li key={i}>{li}</li>
                                ))}
                              </ul>
                            </div>
                          ))}

                        {activeItem.meta && (
                          <div className="lms-meta-callout">
                            <span>META PRINCIPAL</span>
                            <strong>{activeItem.meta}</strong>
                          </div>
                        )}
                      </div>
                    )}

                    {activeItem.type === 'quiz' && activeItem.quiz && (
                      <div className="lms-quiz-stage">
                        <div className="lms-quiz-counter-row">
                          <span className="lms-quiz-badge">
                            PREGUNTA {currentQuizNumber} DE {totalQuizzes} · OBLIGATORIA
                          </span>
                          <span className="lms-quiz-sub">
                            Seleccioná una opción para continuar
                          </span>
                        </div>

                        <h3 className="lms-quiz-question">{activeItem.quiz.pregunta}</h3>

                        <div className="lms-quiz-options">
                          {activeItem.quiz.opciones.map((opt, optIdx) => {
                            const selected = answers[activeItem.quiz.id] === optIdx;
                            return (
                              <button
                                type="button"
                                key={optIdx}
                                className={`lms-quiz-option ${selected ? 'is-selected' : ''}`}
                                onClick={() =>
                                  handleSelectOption(activeItem.quiz.id, optIdx, activeItem.id)
                                }
                              >
                                <span className="lms-opt-letter">
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="lms-opt-text">{opt}</span>
                                {selected && <CheckCircle2 size={18} className="lms-opt-check" />}
                              </button>
                            );
                          })}
                        </div>

                        {answers[activeItem.quiz.id] !== undefined && (
                          <div className="lms-quiz-feedback">
                            <CheckCircle2 size={16} />
                            <span>
                              Respuesta registrada.{' '}
                              {allQuizzesAnswered
                                ? 'Ya completaste todas las preguntas obligatorias: podés guardar tu evaluación en el legajo.'
                                : 'Hacé clic en Siguiente para continuar el recorrido.'}
                            </span>
                          </div>
                        )}

                        {submitError && <div className="lms-error-banner">{submitError}</div>}

                        {allQuizzesAnswered && (
                          <div className="lms-final-submit-card">
                            <div>
                              <strong>¡Todas las preguntas obligatorias respondidas!</strong>
                              <span>
                                Hacé clic en el botón para registrar el cuestionario de CRECER 1 en el legajo.
                              </span>
                            </div>
                            <button
                              type="button"
                              className="lms-btn-primary"
                              disabled={submitting}
                              onClick={handleSubmitFinalEvaluation}
                            >
                              {submitting ? 'Guardando...' : 'Finalizar y guardar en legajo'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {!lastSubmitted && (
                <footer className="lms-footer-bar">
                  <div className="lms-footer-progress">
                    <span className="lms-progress-pct">{activeModuleProgressPct}%</span>
                    <div className="lms-progress-track">
                      <div
                        className="lms-progress-fill"
                        style={{ width: `${activeModuleProgressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="lms-footer-actions">
                    <button
                      type="button"
                      className="lms-btn-back"
                      disabled={activeItemIndexInModule === 0}
                      onClick={handlePrev}
                    >
                      Atrás
                    </button>

                    {isLastItem ? (
                      <button
                        type="button"
                        className="lms-btn-primary"
                        disabled={submitting}
                        onClick={handleSubmitFinalEvaluation}
                      >
                        {submitting ? 'Guardando...' : 'Finalizar y guardar en legajo'}
                      </button>
                    ) : isLastItemInModule && nextModule ? (
                      <button
                        type="button"
                        className="lms-btn-primary"
                        onClick={handleNext}
                      >
                        Ir al Módulo {nextModule.number}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="lms-btn-primary"
                        onClick={handleNext}
                      >
                        Siguiente
                      </button>
                    )}
                  </div>
                </footer>
              )}
            </main>
          </div>
        </div>
      )}

      {/* ====================================================================
          VISTA 3: GESTIÓN PASTORAL, CALIFICACIONES Y AVANCE (SOLO ADMIN Y PASTOR)
         ==================================================================== */}
      {isManager && viewMode === 'admin' && (
        <div className="lms-admin-page">
          <div className="lms-admin-drawer">
            <div className="lms-admin-drawer-head">
              <div className="lms-admin-drawer-title">
                <Shield size={17} />
                <strong>Configuración y seguimiento de Discipulado (Solo Admin y Pastor)</strong>
                <span className={`lms-status-tag ${config.enabledForMembers ? 'is-live' : ''}`}>
                  {config.enabledForMembers ? 'Habilitado para miembros' : 'Solo Admin y Pastor'}
                </span>
              </div>
            </div>

            <div className="lms-admin-drawer-body">
              <div className="lms-toggles-row">
                <label className="lms-switch">
                  <input
                    type="checkbox"
                    checked={Boolean(config.enabledForMembers)}
                    disabled={savingConfig}
                    onChange={() => handleToggleConfig('enabledForMembers')}
                  />
                  <span className="lms-switch-track" />
                  <span>Habilitar para miembros</span>
                </label>

                <label className="lms-switch">
                  <input
                    type="checkbox"
                    checked={Boolean(config.mandatory)}
                    disabled={savingConfig}
                    onChange={() => handleToggleConfig('mandatory')}
                  />
                  <span className="lms-switch-track" />
                  <span>Carácter obligatorio</span>
                </label>

                {members.length > 0 && (
                  <div className="lms-target-select">
                    <label htmlFor="lms-member-select">Registrar prueba en legajo de:</label>
                    <select
                      id="lms-member-select"
                      value={selectedTargetMemberId}
                      onChange={(e) => setSelectedTargetMemberId(e.target.value)}
                    >
                      <option value="">
                        Mi propio legajo ({ownMember ? `${ownMember.firstName} ${ownMember.lastName}` : userData?.name || currentUser?.email})
                      </option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.lastName}, {m.firstName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="lms-mini-kpis lms-kpis-5">
                <div>
                  <span>Total miembros</span>
                  <strong>{adminStats.totalMembers}</strong>
                </div>
                <div>
                  <span>Completados ({adminStats.completionRate}%)</span>
                  <strong className="is-green-txt">{adminStats.completedCount}</strong>
                </div>
                <div>
                  <span>Aprobados ({PASSING_PERCENTAGE}%+)</span>
                  <strong className="is-green-txt">{adminStats.passedCount}</strong>
                </div>
                <div>
                  <span>Promedio calificación</span>
                  <strong>{adminStats.avgScore}%</strong>
                </div>
                <div>
                  <span>Pendientes</span>
                  <strong className="is-orange-txt">{adminStats.pendingCount}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="lms-results-panel">
            <div className="lms-results-head">
              <div>
                <h2>
                  <FileCheck2 size={18} /> Listado de calificaciones y avance
                </h2>
                <p>
                  Seguimiento integral del discipulado por miembro. Las calificaciones quedan guardadas en el legajo.
                </p>
              </div>
              <div className="lms-search-input">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Buscar miembro, email o grupo..."
                  value={searchRoster}
                  onChange={(e) => setSearchRoster(e.target.value)}
                />
              </div>
            </div>

            <div className="lms-roster-filters">
              {[
                { id: 'all', label: `Todos (${adminStats.totalMembers})` },
                { id: 'completed', label: `Completados (${adminStats.completedCount})` },
                { id: 'passed', label: `Aprobados (${adminStats.passedCount})` },
                { id: 'review', label: `En repaso (${adminStats.reviewCount})` },
                { id: 'pending', label: `Pendientes (${adminStats.pendingCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`lms-filter-pill ${rosterFilter === tab.id ? 'active' : ''}`}
                  onClick={() => setRosterFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {filteredRoster.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="Sin resultados para este filtro"
                message="Probá cambiando el filtro o el término de búsqueda."
              />
            ) : (
              <div className="lms-submissions-stack">
                {filteredRoster.map((row) => {
                  const isExpanded = expandedRowId === row.rowId;
                  return (
                    <div key={row.rowId} className="lms-sub-card">
                      <div className="lms-sub-row">
                        <div className="lms-roster-person">
                          <strong>{row.name}</strong>
                          <span>
                            {row.email || 'Sin email'}
                            {row.group ? ` · ${row.group}` : ''}
                            {row.completedAt ? ` · ${formatDateTime(row.completedAt)}` : ''}
                          </span>
                        </div>

                        <div className="lms-roster-progress">
                          <div className="lms-progress-track">
                            <div
                              className={`lms-progress-fill ${
                                row.status === 'passed'
                                  ? 'is-green-fill'
                                  : row.status === 'review'
                                    ? 'is-orange-fill'
                                    : ''
                              }`}
                              style={{ width: `${row.completed ? row.percentage : 0}%` }}
                            />
                          </div>
                          <span>
                            {row.completed ? `${row.score}/${row.totalQuestions} (${row.percentage}%)` : '0%'}
                          </span>
                        </div>

                        <div className="lms-sub-actions">
                          {row.status === 'passed' && (
                            <Badge variant="success">Aprobado</Badge>
                          )}
                          {row.status === 'review' && (
                            <Badge variant="warning">En repaso</Badge>
                          )}
                          {row.status === 'pending' && (
                            <Badge variant="gray">Pendiente</Badge>
                          )}

                          {row.memberId && (
                            <a
                              href={`${campusPrefix}/miembros/${row.memberId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="lms-mini-btn"
                            >
                              Ver legajo <ExternalLink size={12} />
                            </a>
                          )}

                          {row.answers.length > 0 && (
                            <button
                              type="button"
                              className="lms-icon-btn"
                              onClick={() => setExpandedRowId(isExpanded ? null : row.rowId)}
                              title="Ver respuestas"
                            >
                              {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && row.answers.length > 0 && (
                        <div className="lms-sub-answers">
                          {row.answers.map((ans, idx) => (
                            <div
                              key={ans.questionId || idx}
                              className={`lms-review-card ${ans.isCorrect ? 'is-ok' : 'is-err'}`}
                            >
                              <div className="lms-review-head">
                                <span>
                                  {idx + 1}. {ans.pregunta}
                                </span>
                                {ans.isCorrect ? (
                                  <CheckCircle2 size={16} className="is-green-txt" />
                                ) : (
                                  <XCircle size={16} className="is-red-txt" />
                                )}
                              </div>
                              <p>
                                <strong>Respuesta:</strong> {ans.selectedText}
                              </p>
                              {!ans.isCorrect && (
                                <p className="is-green-txt">
                                  <strong>Correcta:</strong> {ans.correctText}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER INSTITUCIONAL DE IGLESIA EXTREMO AMOR */}
      <footer className="lms-site-footer">
        <div className="lms-footer-top">
          <div className="lms-footer-brand">
            <div className="lms-footer-brand-head">
              <img src="/img/icon-500x500.png" alt="Iglesia Extremo Amor" />
              <span>
                <span className="lms-brand-book">IGLESIA</span>{' '}
                <span className="lms-brand-wide">EXTREMO AMOR</span>
              </span>
            </div>
            <div className="lms-footer-contact">
              <span>Av. Cnel. Rosales 879-883, Remedios de Escalada</span>
              <span>+54 9 11 3565-9725 / 11 6725-4066</span>
              <span>iglesiaextremoamor@gmail.com</span>
            </div>
          </div>

          <div className="lms-footer-uad">
            <a
              href="https://www.uad.org.ar/v02/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Unión de las Asambleas de Dios, Región 8"
            >
              <img
                src="https://www.uad.org.ar/v02/wp-content/uploads/2018/01/cropped-uad-1.png"
                alt="UAD"
              />
            </a>
            <strong>Unión de las Asambleas de Dios</strong>
            <span>Región 8 · Fichero de reunión general Nº 14</span>
          </div>

          <div className="lms-footer-cols">
            <div className="lms-footer-col">
              <span className="lms-footer-col-title">DISCIPULADO</span>
              <button type="button" onClick={() => setViewMode('welcome')}>
                Bienvenida y avance
              </button>
              <button type="button" onClick={() => setViewMode('course')}>
                Aula y módulos CRECER 1
              </button>
              {isManager && (
                <button type="button" onClick={() => setViewMode('admin')}>
                  Calificaciones y legajos
                </button>
              )}
            </div>

            <div className="lms-footer-col">
              <span className="lms-footer-col-title">PLATAFORMA</span>
              <a href={`${campusPrefix}/dashboard`}>Volver al Portal IEA</a>
              <a href="/home">Sitio web principal</a>
            </div>

            <div className="lms-footer-col">
              <span className="lms-footer-col-title">REDES</span>
              <div className="lms-footer-social">
                <a
                  href="https://instagram.com/iea_escalada"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <Instagram size={17} />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                >
                  <Facebook size={17} />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                >
                  <Youtube size={17} />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="lms-footer-bottom">
          <span>© 2026 Iglesia Extremo Amor. Todos los derechos reservados.</span>
          <div className="lms-footer-slogan">
            <span>Un lugar de <strong>ENCUENTRO</strong>.</span>
            <span>Un lugar para la <strong>FAMILIA</strong>.</span>
            <span>Un lugar para <strong>VOS</strong>.</span>
          </div>
        </div>
      </footer>
      <DiplomaModal
        certificate={activeDiploma}
        onClose={() => setActiveDiploma(null)}
      />
    </div>
  );
};

export default Discipleship;
