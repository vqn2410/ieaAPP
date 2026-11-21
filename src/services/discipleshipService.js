import { db } from './firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  DISCIPLESHIP_QUIZ_QUESTIONS,
  PASSING_PERCENTAGE,
} from '../pages/discipulado/discipleshipData';
import { invalidateMembersCache } from './memberService';
import { recordAudit } from './auditService';

const SUBMISSIONS_COLLECTION = 'discipleshipSubmissions';
const CERTIFICATES_COLLECTION = 'discipleshipCertificates';
const CONFIG_DOC_REF = () => doc(db, 'settings', 'discipleship');

export const DEFAULT_DISCIPLESHIP_CONFIG = {
  enabledForMembers: false,
  mandatory: true,
  courseId: 'crecer-1',
};

export const getDiscipleshipConfig = async () => {
  try {
    const snap = await getDoc(CONFIG_DOC_REF());
    if (!snap.exists()) return { ...DEFAULT_DISCIPLESHIP_CONFIG };
    return { ...DEFAULT_DISCIPLESHIP_CONFIG, ...snap.data() };
  } catch (error) {
    console.error('Error cargando configuración de discipulado:', error);
    return { ...DEFAULT_DISCIPLESHIP_CONFIG };
  }
};

export const updateDiscipleshipConfig = async (patch, updatedBy = '') => {
  const current = await getDiscipleshipConfig();
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date(),
    updatedBy,
  };
  await setDoc(CONFIG_DOC_REF(), next, { merge: true });
  void recordAudit({
    action: 'update',
    entity: 'discipleshipConfig',
    entityId: 'discipleship',
    details: patch,
  }).catch(() => {});
  return next;
};

export const evaluateDiscipleshipAnswers = (answersMap) => {
  const detailedAnswers = DISCIPLESHIP_QUIZ_QUESTIONS.map((q) => {
    const rawSelected = answersMap?.[q.id];
    const selectedIndex =
      rawSelected === undefined || rawSelected === null ? null : Number(rawSelected);
    const isValidIndex =
      selectedIndex !== null &&
      Number.isInteger(selectedIndex) &&
      selectedIndex >= 0 &&
      selectedIndex < q.opciones.length;
    const isCorrect = isValidIndex && selectedIndex === q.respuestaCorrecta;

    return {
      questionId: q.id,
      sectionTitle: q.sectionTitle,
      pregunta: q.pregunta,
      selectedIndex: isValidIndex ? selectedIndex : null,
      selectedText: isValidIndex ? q.opciones[selectedIndex] : 'Sin responder',
      correctIndex: q.respuestaCorrecta,
      correctText: q.opciones[q.respuestaCorrecta],
      isCorrect,
      explicacion: q.explicacion,
    };
  });

  const totalQuestions = DISCIPLESHIP_QUIZ_QUESTIONS.length;
  const answeredCount = detailedAnswers.filter((a) => a.selectedIndex !== null).length;
  const score = detailedAnswers.filter((a) => a.isCorrect).length;
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const passed = percentage >= PASSING_PERCENTAGE;

  return {
    detailedAnswers,
    answeredCount,
    totalQuestions,
    score,
    percentage,
    passed,
  };
};

export const submitDiscipleshipQuiz = async ({
  memberId = null,
  userId,
  memberName = '',
  memberEmail = '',
  campusId = null,
  courseId = 'crecer-1',
  courseName = 'CRECER 1',
  answers,
  submittedByRole = 'Member',
}) => {
  if (!userId) {
    throw new Error('Debés iniciar sesión para enviar el cuestionario.');
  }

  const evaluation = evaluateDiscipleshipAnswers(answers);
  if (evaluation.answeredCount < evaluation.totalQuestions) {
    throw new Error('Por favor respondé todas las preguntas obligatorias antes de enviar.');
  }

  const completedAt = new Date();
  const payload = {
    memberId: memberId || null,
    userId,
    memberName: String(memberName || '').trim(),
    memberEmail: String(memberEmail || '').trim().toLowerCase(),
    campusId: campusId || null,
    courseId,
    courseName,
    score: evaluation.score,
    totalQuestions: evaluation.totalQuestions,
    percentage: evaluation.percentage,
    passed: evaluation.passed,
    answers: evaluation.detailedAnswers,
    submittedByRole,
    completedAt,
    createdAt: completedAt,
  };

  const docRef = await addDoc(collection(db, SUBMISSIONS_COLLECTION), payload);

  // Guardar resumen en el legajo del miembro (visible únicamente para Admin y Pastor en el perfil)
  if (memberId) {
    try {
      const memberRef = doc(db, 'members', memberId);
      const memberSnap = await getDoc(memberRef);
      const existingGrowthPath = memberSnap.exists() ? (memberSnap.data()?.growthPath || {}) : {};
      const existingDiscipulado = existingGrowthPath.Discipulado || {};

      await setDoc(
        memberRef,
        {
          growthPath: {
            ...existingGrowthPath,
            Discipulado: {
              ...existingDiscipulado,
              status: evaluation.passed ? 'Completo' : (existingDiscipulado.status || 'Cursando'),
              courseId,
              courseName,
              completedAt,
            },
          },
          discipleshipQuiz: {
            completed: true,
            submissionId: docRef.id,
            courseId,
            courseName,
            score: evaluation.score,
            totalQuestions: evaluation.totalQuestions,
            percentage: evaluation.percentage,
            passed: evaluation.passed,
            completedAt,
          },
          updatedAt: completedAt,
        },
        { merge: true }
      );
      invalidateMembersCache();
    } catch (memberErr) {
      console.error('No se pudo actualizar el legajo del miembro:', memberErr);
    }
  }

  void recordAudit({
    action: 'create',
    entity: SUBMISSIONS_COLLECTION,
    entityId: docRef.id,
    details: { memberId, courseId, percentage: evaluation.percentage, passed: evaluation.passed },
  }).catch(() => {});

  return { id: docRef.id, ...payload };
};

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const getAllDiscipleshipSubmissions = async () => {
  try {
    const snap = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
    return snap.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => toMillis(b.completedAt || b.createdAt) - toMillis(a.completedAt || a.createdAt));
  } catch (error) {
    console.error('Error obteniendo cuestionarios de discipulado:', error);
    return [];
  }
};

export const getDiscipleshipSubmissionsByMember = async (memberId) => {
  if (!memberId) return [];
  try {
    const snap = await getDocs(
      query(collection(db, SUBMISSIONS_COLLECTION), where('memberId', '==', memberId))
    );
    return snap.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => toMillis(b.completedAt || b.createdAt) - toMillis(a.completedAt || a.createdAt));
  } catch (error) {
    console.error('Error obteniendo cuestionarios del miembro:', error);
    return [];
  }
};

export const deleteDiscipleshipSubmission = async (submissionId) => {
  if (!submissionId) return;
  await deleteDoc(doc(db, SUBMISSIONS_COLLECTION, submissionId));
  void recordAudit({
    action: 'delete',
    entity: SUBMISSIONS_COLLECTION,
    entityId: submissionId,
  }).catch(() => {});
};

// === Diplomas digitales por módulo con QR de validación ===
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const randomSegment = (length = 6) => {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
};

export const generateCertificateCode = (courseId = 'crecer-1', moduleNumber = 1) => {
  const coursePrefix = String(courseId).toLowerCase().includes('2') ? 'C2' : 'C1';
  return `IEA-${coursePrefix}-M${moduleNumber}-${randomSegment(6)}`;
};

export const getUserCertificates = async (userId) => {
  if (!userId) return [];
  try {
    const snap = await getDocs(
      query(collection(db, CERTIFICATES_COLLECTION), where('userId', '==', userId))
    );
    return snap.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => Number(a.moduleNumber || 0) - Number(b.moduleNumber || 0));
  } catch (error) {
    console.error('Error obteniendo diplomas del usuario:', error);
    return [];
  }
};

export const getCertificateByCode = async (code) => {
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode) return null;
  try {
    const snap = await getDoc(doc(db, CERTIFICATES_COLLECTION, cleanCode));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error('Error validando diploma:', error);
    return null;
  }
};

export const issueModuleCertificate = async ({
  userId,
  memberId = null,
  memberName,
  memberEmail = '',
  courseId = 'crecer-1',
  courseName = 'CRECER 1',
  moduleId,
  moduleNumber,
  moduleTitle,
}) => {
  if (!userId || !moduleId) {
    throw new Error('Datos insuficientes para emitir el diploma.');
  }

  // Evitar duplicados si el usuario ya obtuvo el diploma de este módulo
  const existing = await getUserCertificates(userId);
  const found = existing.find((c) => c.courseId === courseId && c.moduleId === moduleId);
  if (found) return found;

  const code = generateCertificateCode(courseId, moduleNumber);
  const completedAt = new Date();
  const payload = {
    code,
    userId,
    memberId: memberId || null,
    memberName: String(memberName || 'Miembro IEA').trim(),
    memberEmail: String(memberEmail || '').trim().toLowerCase(),
    courseId,
    courseName,
    moduleId,
    moduleNumber: Number(moduleNumber || 1),
    moduleTitle: String(moduleTitle || '').trim(),
    completedAt,
    issuedAt: completedAt,
    valid: true,
  };

  await setDoc(doc(db, CERTIFICATES_COLLECTION, code), payload);

  void recordAudit({
    action: 'create',
    entity: CERTIFICATES_COLLECTION,
    entityId: code,
    details: { memberId, moduleId, moduleNumber },
  }).catch(() => {});

  return { id: code, ...payload };
};
