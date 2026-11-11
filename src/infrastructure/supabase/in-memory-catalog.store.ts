import type { AdminRepository } from "@/domain/admin/admin.ports";
import type {
  AdminAuditLogEntity,
  AdminResult,
  CreateAdminAuditLogInput,
} from "@/domain/admin/admin.types";
import type { AttemptEntity } from "@/domain/attempts/attempts.types";
import type {
  DocumentsRepository,
  PrivateDocumentStoragePort,
} from "@/domain/documents/documents.ports";
import type {
  DocumentEntity,
  DocumentResult,
  DocumentStatus,
  SignedDocumentUrl,
} from "@/domain/documents/documents.types";
import {
  addUtcDays,
  getXpPointsForEventType,
  normalizeDateString,
} from "@/domain/gamification/gamification.rules";
import type {
  AwardXpInput,
  AwardXpOutput,
  XpEventEntity,
} from "@/domain/gamification/gamification.types";
import type {
  ContentStatus,
  ContentVisibility,
  QuestionDifficulty,
  QuestionType,
  QuizMode,
} from "@/domain/models/studyplay";
import type { ProgressRepository } from "@/domain/progress/progress.ports";
import type {
  DailyActivityEntity,
  ProgressResult,
  RecordDailyActivityInput,
} from "@/domain/progress/progress.types";
import type { QuestionsRepository } from "@/domain/questions/questions.ports";
import type {
  QuestionEntity,
  QuestionOptionEntity,
  QuestionResult,
} from "@/domain/questions/questions.types";
import type { QuizzesRepository } from "@/domain/quizzes/quizzes.ports";
import type {
  QuizResult,
  QuizSessionEntity,
  QuizSessionSettings,
  QuizSessionStatus,
} from "@/domain/quizzes/quizzes.types";
import type { SubjectsRepository } from "@/domain/subjects/subjects.ports";
import type {
  SubjectEntity,
  SubjectResult,
} from "@/domain/subjects/subjects.types";
import type { TopicsRepository } from "@/domain/topics/topics.ports";
import type { TopicEntity, TopicResult } from "@/domain/topics/topics.types";
import {
  MOCK_DOCUMENTS,
  MOCK_PRIVATE_SUBJECTS,
  MOCK_PUBLIC_SUBJECTS,
  MOCK_QUESTIONS,
  MOCK_TOPICS,
  MOCK_USER_PROFILE,
} from "@/features/mock-data/phase1-fixtures";

function buildInitialSubjects(): SubjectEntity[] {
  const nowIso = "2026-11-10T12:00:00.000Z";
  const privates: SubjectEntity[] = MOCK_PRIVATE_SUBJECTS.map((s) => ({
    id: s.id,
    ownerId: MOCK_USER_PROFILE.id,
    title: s.title,
    description: s.description,
    visibility: s.visibility,
    status: s.status,
    publishedAt: s.status === "published" ? nowIso : null,
    createdAt: nowIso,
    updatedAt: s.updatedAt,
    topicsCount: s.topicsCount,
    questionsCount: s.questionsCount,
    documentsCount: s.documentsCount,
    masteryAccuracy: s.masteryAccuracy,
    attemptsCount: s.attemptsCount,
  }));

  const publics: SubjectEntity[] = MOCK_PUBLIC_SUBJECTS.map((s) => ({
    id: s.id,
    ownerId: "usr-admin-catalog",
    title: s.title,
    description: s.description,
    visibility: s.visibility,
    status: s.status,
    publishedAt: s.status === "published" ? nowIso : null,
    createdAt: nowIso,
    updatedAt: s.updatedAt,
    authorName: s.authorName,
    topicsCount: s.topicsCount,
    questionsCount: s.questionsCount,
    documentsCount: s.documentsCount,
    masteryAccuracy: s.masteryAccuracy,
    attemptsCount: s.attemptsCount,
  }));

  const moderationExtraPublics: SubjectEntity[] = [
    {
      id: "pub-bioestadistica-draft",
      ownerId: "usr-admin-catalog",
      title: "Bioestadística Clínica — Unidad 4",
      description:
        "Diseño de ensayos clínicos aleatorizados, tamaño muestral, riesgo relativo y curvas de supervivencia de Kaplan-Meier.",
      visibility: "public",
      status: "draft",
      publishedAt: null,
      createdAt: nowIso,
      updatedAt: "Hace 3 horas",
      authorName: "Dr. Martín Pereyra",
      topicsCount: 1,
      questionsCount: 1,
      documentsCount: 0,
      masteryAccuracy: 0,
      attemptsCount: 0,
    },
    {
      id: "pub-farmaco-archived",
      ownerId: "usr-admin-catalog",
      title: "Guía 2023 Obsoleta de Farmacocinética",
      description:
        "Modelos compartimentales y depuración renal (versión histórica reemplazada por plan 2026).",
      visibility: "public",
      status: "archived",
      publishedAt: nowIso,
      createdAt: nowIso,
      updatedAt: "Hace 2 semanas",
      authorName: "Archivo Histórico",
      topicsCount: 1,
      questionsCount: 1,
      documentsCount: 0,
      masteryAccuracy: 0,
      attemptsCount: 0,
    },
  ];

  return [...privates, ...publics, ...moderationExtraPublics];
}

function buildInitialTopics(): TopicEntity[] {
  const nowIso = "2026-11-10T12:00:00.000Z";
  const privateTopics = MOCK_TOPICS.map((t) => ({
    id: t.id,
    subjectId: t.subjectId,
    parentTopicId: t.parentTopicId,
    title: t.title,
    description: t.description,
    sortOrder: t.sortOrder,
    createdAt: nowIso,
    updatedAt: nowIso,
    questionsCount: t.questionsCount,
    documentsCount: t.documentsCount,
    accuracy: t.accuracy,
    attemptsCount: t.attemptsCount,
  }));

  const publicTopics: TopicEntity[] = [
    {
      id: "top-pub-prob-1",
      subjectId: "pub-estadistica",
      parentTopicId: null,
      title: "1. Variables Aleatorias y Esperanza Matemática",
      description:
        "Variables discretas y continuas, función de densidad y propiedades de la esperanza y varianza.",
      sortOrder: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
      questionsCount: 2,
      documentsCount: 0,
      accuracy: 80,
      attemptsCount: 5,
    },
    {
      id: "top-pub-quim-1",
      subjectId: "pub-quimica",
      parentTopicId: null,
      title: "1. Hibridación y Mecanismos SN1 / SN2",
      description:
        "Cinética nucleofílica bimolecular vs unimolecular, inversión de Walden y estabilidad de carbocationes.",
      sortOrder: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
      questionsCount: 1,
      documentsCount: 0,
      accuracy: 75,
      attemptsCount: 4,
    },
    {
      id: "top-pub-bio-1",
      subjectId: "pub-bioestadistica-draft",
      parentTopicId: null,
      title: "1. Riesgo Relativo y Odds Ratio en Ensayos Clínicos",
      description:
        "Medidas de asociación epidemiológica e interpretación de intervalos de confianza del 95%.",
      sortOrder: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
      questionsCount: 1,
      documentsCount: 0,
      accuracy: 0,
      attemptsCount: 0,
    },
    {
      id: "top-pub-farm-1",
      subjectId: "pub-farmaco-archived",
      parentTopicId: null,
      title: "1. Cinética de Eliminación de Primer Orden",
      description: "Vida media plasmática y volumen aparente de distribución.",
      sortOrder: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
      questionsCount: 1,
      documentsCount: 0,
      accuracy: 0,
      attemptsCount: 0,
    },
  ];

  return [...privateTopics, ...publicTopics];
}

function buildInitialDocuments(): DocumentEntity[] {
  return MOCK_DOCUMENTS.map((d) => ({
    id: d.id,
    ownerId: MOCK_USER_PROFILE.id,
    subjectId: d.subjectId,
    subjectTitle: d.subjectTitle,
    topicId: d.topicId,
    topicTitle: d.topicTitle,
    storagePath: `${MOCK_USER_PROFILE.id}/${d.id}/${d.filename}`,
    filename: d.filename,
    mimeType: "application/pdf",
    sizeBytes: d.sizeBytes,
    status: d.status,
    linkedQuestionsCount: d.linkedQuestionsCount,
    createdAt: d.createdAt,
  }));
}

function buildInitialQuestions(): QuestionEntity[] {
  const nowIso = "2026-11-10T12:00:00.000Z";
  const privateQuestions: QuestionEntity[] = MOCK_QUESTIONS.map((q) => {
    const isAvailableDoc = q.sourceDocumentAvailable && q.sourceDocumentName;
    const sourceDocId = isAvailableDoc ? "doc-01" : null;

    return {
      id: q.id,
      topicId: q.topicId,
      topicTitle: q.topicTitle,
      subjectId: "subj-anatomia",
      subjectTitle: q.subjectTitle,
      authorId: MOCK_USER_PROFILE.id,
      type: q.type,
      prompt: q.prompt,
      explanation: q.explanation,
      difficulty: q.difficulty,
      status: q.status,
      sourceDocumentId: sourceDocId,
      sourceDocumentName: q.sourceDocumentName,
      sourceDocumentAvailable: q.sourceDocumentAvailable,
      sourcePage: q.sourcePage,
      version: q.version,
      options: q.options.map((opt) => ({
        id: opt.id,
        questionId: q.id,
        text: opt.text,
        isCorrect: opt.isCorrect,
        feedback: opt.feedback,
        sortOrder: opt.sortOrder,
      })),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });

  const publicQuestions: QuestionEntity[] = [
    {
      id: "q-pub-201",
      topicId: "top-pub-prob-1",
      topicTitle: "1. Variables Aleatorias y Esperanza Matemática",
      subjectId: "pub-estadistica",
      subjectTitle: "Probabilidad y Estadística Aplicada",
      authorId: "usr-admin-catalog",
      type: "single_choice",
      prompt:
        "Si X es una variable aleatoria con esperanza E(X) = 4 y varianza Var(X) = 3, ¿cuál es el valor de Var(2X + 5)?",
      explanation:
        "Por propiedades de la varianza, Var(aX + b) = a² Var(X). Por lo tanto, Var(2X + 5) = 4 * 3 = 12.",
      difficulty: "medium",
      status: "published",
      sourceDocumentId: null,
      sourceDocumentName: null,
      sourceDocumentAvailable: false,
      sourcePage: null,
      version: 1,
      options: [
        {
          id: "opt-pub-1",
          questionId: "q-pub-201",
          text: "12",
          isCorrect: true,
          feedback:
            "Correcto: la constante aditiva no altera la dispersión y el factor 2 se eleva al cuadrado (4 * 3 = 12).",
          sortOrder: 1,
        },
        {
          id: "opt-pub-2",
          questionId: "q-pub-201",
          text: "11",
          isCorrect: false,
          feedback:
            "Incorrecto: la varianza no es lineal como la esperanza matemática.",
          sortOrder: 2,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: "q-pub-202-draft",
      topicId: "top-pub-prob-1",
      topicTitle: "1. Variables Aleatorias y Esperanza Matemática",
      subjectId: "pub-estadistica",
      subjectTitle: "Probabilidad y Estadística Aplicada",
      authorId: "usr-admin-catalog",
      type: "true_false",
      prompt: "Borrador interno de administración aún no publicado.",
      explanation: "En revisión.",
      difficulty: "easy",
      status: "draft",
      sourceDocumentId: null,
      sourceDocumentName: null,
      sourceDocumentAvailable: false,
      sourcePage: null,
      version: 1,
      options: [
        {
          id: "opt-pub-d1",
          questionId: "q-pub-202-draft",
          text: "Verdadero",
          isCorrect: true,
          feedback: "Correcto.",
          sortOrder: 1,
        },
        {
          id: "opt-pub-d2",
          questionId: "q-pub-202-draft",
          text: "Falso",
          isCorrect: false,
          feedback: "Incorrecto.",
          sortOrder: 2,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: "q-pub-301",
      topicId: "top-pub-quim-1",
      topicTitle: "1. Hibridación y Mecanismos SN1 / SN2",
      subjectId: "pub-quimica",
      subjectTitle: "Química Orgánica I — Fundamentos",
      authorId: "usr-admin-catalog",
      type: "single_choice",
      prompt:
        "¿Qué característica estereoquímica distingue a una sustitución nucleofílica bimolecular (SN2) sobre un carbono quiral?",
      explanation:
        "El mecanismo SN2 ocurre en una sola etapa concertada con ataque dorsal del nucleófilo, produciendo la inversión completa de la configuración (inversión de Walden).",
      difficulty: "medium",
      status: "published",
      sourceDocumentId: null,
      sourceDocumentName: null,
      sourceDocumentAvailable: false,
      sourcePage: null,
      version: 1,
      options: [
        {
          id: "opt-pub-q1",
          questionId: "q-pub-301",
          text: "Inversión completa de la configuración (inversión de Walden)",
          isCorrect: true,
          feedback:
            "Correcto: el estado de transición pentacoordinado invierte la estereoquímica del centro quiral.",
          sortOrder: 1,
        },
        {
          id: "opt-pub-q2",
          questionId: "q-pub-301",
          text: "Racemización total por intermediario carbocatiónico plano",
          isCorrect: false,
          feedback:
            "Incorrecto: la formación de carbocatión planar corresponde al mecanismo SN1.",
          sortOrder: 2,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: "q-pub-401",
      topicId: "top-pub-bio-1",
      topicTitle: "1. Riesgo Relativo y Odds Ratio en Ensayos Clínicos",
      subjectId: "pub-bioestadistica-draft",
      subjectTitle: "Bioestadística Clínica — Unidad 4",
      authorId: "usr-admin-catalog",
      type: "single_choice",
      prompt:
        "En un ensayo clínico controlado donde el Riesgo Relativo (RR) de un evento adverso es 1.0 con IC 95% [0.62 - 1.48], ¿cuál es la interpretación estadística?",
      explanation:
        "Cuando el intervalo de confianza del 95% para el Riesgo Relativo incluye el valor nulo (RR = 1.0), no existe diferencia estadísticamente significativa entre ambos grupos al nivel alfa = 0.05.",
      difficulty: "medium",
      status: "published",
      sourceDocumentId: null,
      sourceDocumentName: null,
      sourceDocumentAvailable: false,
      sourcePage: null,
      version: 1,
      options: [
        {
          id: "opt-pub-b1",
          questionId: "q-pub-401",
          text: "No hay asociación estadísticamente significativa al incluir el valor nulo 1.0",
          isCorrect: true,
          feedback:
            "Correcto: en razones de riesgo el valor neutro es 1.0.",
          sortOrder: 1,
        },
        {
          id: "opt-pub-b2",
          questionId: "q-pub-401",
          text: "El tratamiento duplica significativamente el riesgo del evento",
          isCorrect: false,
          feedback: "Incorrecto: el RR puntual es 1.0 y el IC 95% cruza la nulidad.",
          sortOrder: 2,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: "q-pub-501",
      topicId: "top-pub-farm-1",
      topicTitle: "1. Cinética de Eliminación de Primer Orden",
      subjectId: "pub-farmaco-archived",
      subjectTitle: "Guía 2023 Obsoleta de Farmacocinética",
      authorId: "usr-admin-catalog",
      type: "true_false",
      prompt:
        "En la cinética de eliminación de primer orden, una fracción constante del fármaco se elimina por unidad de tiempo.",
      explanation:
        "Verdadero. En cinética de primer orden la velocidad de eliminación es proporcional a la concentración plasmática, manteniendo constante la vida media (t1/2).",
      difficulty: "easy",
      status: "published",
      sourceDocumentId: null,
      sourceDocumentName: null,
      sourceDocumentAvailable: false,
      sourcePage: null,
      version: 1,
      options: [
        {
          id: "opt-pub-f1",
          questionId: "q-pub-501",
          text: "Verdadero",
          isCorrect: true,
          feedback: "Correcto.",
          sortOrder: 1,
        },
        {
          id: "opt-pub-f2",
          questionId: "q-pub-501",
          text: "Falso",
          isCorrect: false,
          feedback: "Incorrecto.",
          sortOrder: 2,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  return [...privateQuestions, ...publicQuestions];
}

function buildInitialQuizSessions(): QuizSessionEntity[] {
  return [
    {
      id: "session-demo",
      userId: MOCK_USER_PROFILE.id,
      subjectId: "subj-anatomia",
      subjectTitle: "Fisiología y Biofísica",
      mode: "practice",
      settingsJson: {
        questionCount: 2,
        seed: "seed-demo-session",
        topicId: null,
        questionIds: ["q-101", "q-102"],
      },
      status: "in_progress",
      startedAt: "2026-11-10T11:30:00.000Z",
      completedAt: null,
      score: 10,
      accuracy: 50,
    },
  ];
}

function buildInitialAttempts(): AttemptEntity[] {
  return [
    {
      id: "att-demo-1",
      sessionId: "session-demo",
      userId: MOCK_USER_PROFILE.id,
      questionId: "q-102",
      responseJson: { selectedOptionIds: ["opt-tf-v"] },
      isCorrect: false,
      elapsedMs: 14200,
      answeredAt: "2026-11-10T11:31:00.000Z",
      questionVersion: 1,
    },
    {
      id: "att-hist-1",
      sessionId: "session-hist-1",
      userId: MOCK_USER_PROFILE.id,
      questionId: "q-101",
      responseJson: { selectedOptionIds: ["opt-1"] },
      isCorrect: true,
      elapsedMs: 8500,
      answeredAt: "2026-11-08T10:15:00.000Z",
      questionVersion: 2,
    },
    {
      id: "att-hist-2",
      sessionId: "session-hist-2",
      userId: MOCK_USER_PROFILE.id,
      questionId: "q-101",
      responseJson: { selectedOptionIds: ["opt-1"] },
      isCorrect: true,
      elapsedMs: 7400,
      answeredAt: "2026-11-09T10:15:00.000Z",
      questionVersion: 2,
    },
    {
      id: "att-hist-3",
      sessionId: "session-hist-3",
      userId: MOCK_USER_PROFILE.id,
      questionId: "q-101",
      responseJson: { selectedOptionIds: ["opt-1"] },
      isCorrect: true,
      elapsedMs: 6900,
      answeredAt: "2026-11-09T18:20:00.000Z",
      questionVersion: 2,
    },
    {
      id: "att-hist-4",
      sessionId: "session-hist-4",
      userId: MOCK_USER_PROFILE.id,
      questionId: "q-101",
      responseJson: { selectedOptionIds: ["opt-1"] },
      isCorrect: true,
      elapsedMs: 6100,
      answeredAt: "2026-11-10T09:10:00.000Z",
      questionVersion: 2,
    },
    {
      id: "att-hist-5",
      sessionId: "session-hist-5",
      userId: MOCK_USER_PROFILE.id,
      questionId: "q-101",
      responseJson: { selectedOptionIds: ["opt-1"] },
      isCorrect: true,
      elapsedMs: 5800,
      answeredAt: "2026-11-10T11:25:00.000Z",
      questionVersion: 2,
    },
  ];
}

function buildInitialXpEvents(): XpEventEntity[] {
  const userId = MOCK_USER_PROFILE.id;
  return [
    {
      id: "xp-seed-1",
      userId,
      eventKey: `attempt_correct:session-hist-1:q-101`,
      eventType: "attempt_correct",
      points: 10,
      referenceId: "session-hist-1",
      createdAt: "2026-11-08T10:15:00.000Z",
    },
    {
      id: "xp-seed-2",
      userId,
      eventKey: `attempt_correct:session-hist-2:q-101`,
      eventType: "attempt_correct",
      points: 10,
      referenceId: "session-hist-2",
      createdAt: "2026-11-09T10:15:00.000Z",
    },
    {
      id: "xp-seed-3",
      userId,
      eventKey: `attempt_correct:session-hist-3:q-101`,
      eventType: "attempt_correct",
      points: 10,
      referenceId: "session-hist-3",
      createdAt: "2026-11-09T18:20:00.000Z",
    },
    {
      id: "xp-seed-4",
      userId,
      eventKey: `attempt_correct:session-hist-4:q-101`,
      eventType: "attempt_correct",
      points: 10,
      referenceId: "session-hist-4",
      createdAt: "2026-11-10T09:10:00.000Z",
    },
    {
      id: "xp-seed-5",
      userId,
      eventKey: `attempt_correct:session-hist-5:q-101`,
      eventType: "attempt_correct",
      points: 10,
      referenceId: "session-hist-5",
      createdAt: "2026-11-10T11:25:00.000Z",
    },
    {
      id: "xp-seed-6",
      userId,
      eventKey: `quiz_completed:session-hist-5`,
      eventType: "quiz_completed",
      points: 20,
      referenceId: "session-hist-5",
      createdAt: "2026-11-10T11:26:00.000Z",
    },
    {
      id: "xp-seed-7",
      userId,
      eventKey: `topic_mastered:${userId}:top-cardio-1`,
      eventType: "topic_mastered",
      points: 50,
      referenceId: "top-cardio-1",
      createdAt: "2026-11-10T11:26:05.000Z",
    },
  ];
}

function buildInitialDailyActivities(): DailyActivityEntity[] {
  const userId = MOCK_USER_PROFILE.id;
  const todayStr = normalizeDateString(new Date());
  const nowIso = new Date().toISOString();

  // Crear 3 días consecutivos hasta hoy para que el usuario demo tenga racha activa verificable
  return [
    {
      id: "daily-seed-3",
      userId,
      activityDate: todayStr,
      questionsAnswered: 6,
      correctAnswers: 5,
      quizzesCompleted: 1,
      minutesStudied: 24,
      updatedAt: nowIso,
    },
    {
      id: "daily-seed-2",
      userId,
      activityDate: addUtcDays(todayStr, -1),
      questionsAnswered: 10,
      correctAnswers: 8,
      quizzesCompleted: 2,
      minutesStudied: 35,
      updatedAt: nowIso,
    },
    {
      id: "daily-seed-1",
      userId,
      activityDate: addUtcDays(todayStr, -2),
      questionsAnswered: 8,
      correctAnswers: 7,
      quizzesCompleted: 1,
      minutesStudied: 28,
      updatedAt: nowIso,
    },
  ];
}

function buildInitialAdminAuditLogs(): AdminAuditLogEntity[] {
  return [
    {
      id: "audit-seed-1",
      actorId: MOCK_USER_PROFILE.id,
      action: "publish_subject",
      targetType: "subject",
      targetId: "pub-estadistica",
      targetTitle: "Probabilidad y Estadística Aplicada",
      previousStatus: "draft",
      newStatus: "published",
      notes:
        "Publicado en catálogo general (visibility=public, status=published) tras verificación de preguntas.",
      createdAt: "2026-11-09T14:20:00.000Z",
    },
    {
      id: "audit-seed-2",
      actorId: MOCK_USER_PROFILE.id,
      action: "archive_subject",
      targetType: "subject",
      targetId: "pub-farmaco-archived",
      targetTitle: "Guía 2023 Obsoleta de Farmacocinética",
      previousStatus: "published",
      newStatus: "archived",
      notes:
        "Retirada de búsquedas nuevas; conserva integridad de intentos previos de los estudiantes.",
      createdAt: "2026-11-10T09:00:00.000Z",
    },
  ];
}

export class InMemoryStudyCatalogStore
  implements
    SubjectsRepository,
    TopicsRepository,
    DocumentsRepository,
    PrivateDocumentStoragePort,
    QuestionsRepository,
    QuizzesRepository,
    ProgressRepository,
    AdminRepository
{
  private subjects: SubjectEntity[];
  private topics: TopicEntity[];
  private documents: DocumentEntity[];
  private questions: QuestionEntity[];
  private quizSessions: QuizSessionEntity[];
  private attempts: AttemptEntity[];
  private xpEvents: XpEventEntity[];
  private dailyActivities: DailyActivityEntity[];
  private adminAuditLogs: AdminAuditLogEntity[];
  private storedBlobs = new Set<string>();
  private seq = 100;

  constructor(seedWithDefaults = true) {
    this.subjects = seedWithDefaults ? buildInitialSubjects() : [];
    this.topics = seedWithDefaults ? buildInitialTopics() : [];
    this.documents = seedWithDefaults ? buildInitialDocuments() : [];
    this.questions = seedWithDefaults ? buildInitialQuestions() : [];
    this.quizSessions = seedWithDefaults ? buildInitialQuizSessions() : [];
    this.attempts = seedWithDefaults ? buildInitialAttempts() : [];
    this.xpEvents = seedWithDefaults ? buildInitialXpEvents() : [];
    this.dailyActivities = seedWithDefaults
      ? buildInitialDailyActivities()
      : [];
    this.adminAuditLogs = seedWithDefaults
      ? buildInitialAdminAuditLogs()
      : [];
    for (const doc of this.documents) {
      if (doc.status === "available") {
        this.storedBlobs.add(doc.storagePath);
      }
    }
  }

  private enrichQuestion(q: QuestionEntity): QuestionEntity {
    const topic = this.topics.find((t) => t.id === q.topicId);
    const subject = topic
      ? this.subjects.find((s) => s.id === topic.subjectId)
      : undefined;
    const doc = q.sourceDocumentId
      ? this.documents.find((d) => d.id === q.sourceDocumentId)
      : undefined;

    const sourceAvailable = Boolean(doc && doc.status === "available");

    return {
      ...q,
      topicTitle: topic?.title ?? q.topicTitle ?? "Tema",
      subjectId: subject?.id ?? topic?.subjectId ?? q.subjectId,
      subjectTitle: subject?.title ?? q.subjectTitle ?? "Materia",
      sourceDocumentId: sourceAvailable ? doc!.id : null,
      sourceDocumentName: doc?.filename ?? q.sourceDocumentName ?? null,
      sourceDocumentAvailable: sourceAvailable,
      options: [...q.options].sort((a, b) => a.sortOrder - b.sortOrder),
    };
  }

  async listByOwner(ownerId: string): Promise<SubjectResult<SubjectEntity[]>> {
    return {
      ok: true,
      data: this.subjects
        .filter((s) => s.ownerId === ownerId)
        .map((s) => {
          const subjectTopicIds = new Set(
            this.topics.filter((t) => t.subjectId === s.id).map((t) => t.id)
          );
          const qCount = this.questions.filter((q) =>
            subjectTopicIds.has(q.topicId)
          ).length;

          return {
            ...s,
            topicsCount: subjectTopicIds.size || (s.topicsCount ?? 0),
            questionsCount: qCount || (s.questionsCount ?? 0),
            documentsCount:
              this.documents.filter(
                (d) => d.subjectId === s.id && d.status === "available"
              ).length || (s.documentsCount ?? 0),
          };
        }),
    };
  }

  async listPublicPublished(): Promise<SubjectResult<SubjectEntity[]>> {
    return {
      ok: true,
      data: this.subjects.filter(
        (s) => s.visibility === "public" && s.status === "published"
      ),
    };
  }

  async findById(
    subjectId: string
  ): Promise<SubjectResult<SubjectEntity | null>> {
    const found = this.subjects.find((s) => s.id === subjectId) ?? null;
    if (!found) {
      return { ok: true, data: null };
    }
    const subjectTopicIds = new Set(
      this.topics.filter((t) => t.subjectId === found.id).map((t) => t.id)
    );
    const qCount = this.questions.filter((q) =>
      subjectTopicIds.has(q.topicId)
    ).length;

    return {
      ok: true,
      data: {
        ...found,
        topicsCount: subjectTopicIds.size || (found.topicsCount ?? 0),
        questionsCount: qCount || (found.questionsCount ?? 0),
        documentsCount:
          this.documents.filter(
            (d) => d.subjectId === found.id && d.status === "available"
          ).length || (found.documentsCount ?? 0),
      },
    };
  }

  async create(params: {
    ownerId: string;
    title: string;
    description: string;
    visibility: ContentVisibility;
    status: ContentStatus;
    publishedAt: string | null;
  }): Promise<SubjectResult<SubjectEntity>> {
    this.seq += 1;
    const nowIso = new Date().toISOString();
    const created: SubjectEntity = {
      id: `subj-${this.seq}`,
      ownerId: params.ownerId,
      title: params.title,
      description: params.description,
      visibility: params.visibility,
      status: params.status,
      publishedAt: params.publishedAt,
      createdAt: nowIso,
      updatedAt: "Recién creada",
      topicsCount: 0,
      questionsCount: 0,
      documentsCount: 0,
      masteryAccuracy: 0,
      attemptsCount: 0,
      authorName:
        params.visibility === "public"
          ? "Equipo Académico StudyPlay"
          : undefined,
    };

    this.subjects.unshift(created);
    return { ok: true, data: created };
  }

  async update(
    subjectId: string,
    params: {
      title: string;
      description: string;
      visibility: ContentVisibility;
      status: ContentStatus;
      publishedAt: string | null;
    }
  ): Promise<SubjectResult<SubjectEntity>> {
    const idx = this.subjects.findIndex((s) => s.id === subjectId);
    if (idx === -1) {
      return {
        ok: false,
        error: { code: "SUBJECT_NOT_FOUND", message: "Materia no encontrada" },
      };
    }

    const updated: SubjectEntity = {
      ...this.subjects[idx],
      title: params.title,
      description: params.description,
      visibility: params.visibility,
      status: params.status,
      publishedAt: params.publishedAt,
      updatedAt: "Actualizado recién",
    };

    this.subjects[idx] = updated;
    return { ok: true, data: updated };
  }

  async delete(subjectId: string): Promise<SubjectResult<{ deleted: true }>> {
    const topicIds = new Set(
      this.topics.filter((t) => t.subjectId === subjectId).map((t) => t.id)
    );
    this.subjects = this.subjects.filter((s) => s.id !== subjectId);
    this.topics = this.topics.filter((t) => t.subjectId !== subjectId);
    this.documents = this.documents.filter((d) => d.subjectId !== subjectId);
    this.questions = this.questions.filter((q) => !topicIds.has(q.topicId));
    this.quizSessions = this.quizSessions.filter(
      (s) => s.subjectId !== subjectId
    );
    return { ok: true, data: { deleted: true } };
  }

  async listBySubject(subjectId: string): Promise<TopicResult<TopicEntity[]>> {
    const list = this.topics
      .filter((t) => t.subjectId === subjectId)
      .map((t) => ({
        ...t,
        questionsCount: this.questions.filter((q) => q.topicId === t.id).length,
        documentsCount: this.documents.filter(
          (d) => d.topicId === t.id && d.status === "available"
        ).length,
      }));
    return { ok: true, data: list };
  }

  async findTopicById(
    topicId: string
  ): Promise<TopicResult<TopicEntity | null>> {
    const topic = this.topics.find((t) => t.id === topicId) ?? null;
    if (!topic) return { ok: true, data: null };
    return {
      ok: true,
      data: {
        ...topic,
        questionsCount: this.questions.filter((q) => q.topicId === topic.id)
          .length,
        documentsCount: this.documents.filter(
          (d) => d.topicId === topic.id && d.status === "available"
        ).length,
      },
    };
  }

  async createTopic(params: {
    subjectId: string;
    parentTopicId: string | null;
    title: string;
    description: string;
    sortOrder: number;
  }): Promise<TopicResult<TopicEntity>> {
    this.seq += 1;
    const nowIso = new Date().toISOString();
    const created: TopicEntity = {
      id: `top-${this.seq}`,
      subjectId: params.subjectId,
      parentTopicId: params.parentTopicId,
      title: params.title,
      description: params.description,
      sortOrder: params.sortOrder,
      createdAt: nowIso,
      updatedAt: nowIso,
      questionsCount: 0,
      documentsCount: 0,
      accuracy: 0,
      attemptsCount: 0,
    };

    this.topics.push(created);
    return { ok: true, data: created };
  }

  async updateTopic(
    topicId: string,
    params: {
      parentTopicId: string | null;
      title: string;
      description: string;
      sortOrder: number;
    }
  ): Promise<TopicResult<TopicEntity>> {
    const idx = this.topics.findIndex((t) => t.id === topicId);
    if (idx === -1) {
      return {
        ok: false,
        error: { code: "TOPIC_NOT_FOUND", message: "Tema no encontrado" },
      };
    }

    const updated: TopicEntity = {
      ...this.topics[idx],
      parentTopicId: params.parentTopicId,
      title: params.title,
      description: params.description,
      sortOrder: params.sortOrder,
      updatedAt: new Date().toISOString(),
    };

    this.topics[idx] = updated;
    return { ok: true, data: updated };
  }

  async deleteTopic(
    topicId: string
  ): Promise<TopicResult<{ deleted: true }>> {
    const toRemove = new Set(
      this.topics
        .filter((t) => t.id === topicId || t.parentTopicId === topicId)
        .map((t) => t.id)
    );
    this.topics = this.topics.filter((t) => !toRemove.has(t.id));
    this.questions = this.questions.filter((q) => !toRemove.has(q.topicId));
    return { ok: true, data: { deleted: true } };
  }

  // --- DocumentsRepository ---

  async listDocumentsByOwner(
    ownerId: string
  ): Promise<DocumentResult<DocumentEntity[]>> {
    return {
      ok: true,
      data: this.documents
        .filter((d) => d.ownerId === ownerId)
        .map((d) => ({
          ...d,
          linkedQuestionsCount:
            this.questions.filter((q) => q.sourceDocumentId === d.id).length ||
            d.linkedQuestionsCount,
        })),
    };
  }

  async listDocumentsBySubject(
    subjectId: string,
    ownerId: string
  ): Promise<DocumentResult<DocumentEntity[]>> {
    return {
      ok: true,
      data: this.documents
        .filter((d) => d.subjectId === subjectId && d.ownerId === ownerId)
        .map((d) => ({
          ...d,
          linkedQuestionsCount:
            this.questions.filter((q) => q.sourceDocumentId === d.id).length ||
            d.linkedQuestionsCount,
        })),
    };
  }

  async listDocumentsByTopic(
    topicId: string,
    ownerId: string
  ): Promise<DocumentResult<DocumentEntity[]>> {
    return {
      ok: true,
      data: this.documents
        .filter((d) => d.topicId === topicId && d.ownerId === ownerId)
        .map((d) => ({
          ...d,
          linkedQuestionsCount:
            this.questions.filter((q) => q.sourceDocumentId === d.id).length ||
            d.linkedQuestionsCount,
        })),
    };
  }

  async findDocumentById(
    documentId: string
  ): Promise<DocumentResult<DocumentEntity | null>> {
    const found = this.documents.find((d) => d.id === documentId) ?? null;
    return { ok: true, data: found };
  }

  async createDocumentRecord(params: {
    id: string;
    ownerId: string;
    subjectId: string;
    subjectTitle?: string;
    topicId: string | null;
    topicTitle?: string | null;
    storagePath: string;
    filename: string;
    mimeType: "application/pdf";
    sizeBytes: number;
    status: DocumentStatus;
  }): Promise<DocumentResult<DocumentEntity>> {
    const subject = this.subjects.find((s) => s.id === params.subjectId);
    const topic = params.topicId
      ? this.topics.find((t) => t.id === params.topicId)
      : null;

    const entity: DocumentEntity = {
      id: params.id,
      ownerId: params.ownerId,
      subjectId: params.subjectId,
      subjectTitle: params.subjectTitle ?? subject?.title ?? "Materia",
      topicId: params.topicId,
      topicTitle: params.topicTitle ?? topic?.title ?? null,
      storagePath: params.storagePath,
      filename: params.filename,
      mimeType: "application/pdf",
      sizeBytes: params.sizeBytes,
      status: params.status,
      linkedQuestionsCount: 0,
      createdAt: new Date().toLocaleDateString("es-AR"),
    };

    const existingIdx = this.documents.findIndex(
      (d) => d.id === params.id || d.storagePath === params.storagePath
    );
    if (existingIdx !== -1) {
      this.documents[existingIdx] = entity;
    } else {
      this.documents.unshift(entity);
    }

    return { ok: true, data: entity };
  }

  async updateDocumentStatus(
    documentId: string,
    status: DocumentStatus
  ): Promise<DocumentResult<DocumentEntity>> {
    const idx = this.documents.findIndex((d) => d.id === documentId);
    if (idx === -1) {
      return {
        ok: false,
        error: {
          code: "DOCUMENT_NOT_FOUND",
          message: "Documento no encontrado",
        },
      };
    }

    const updated: DocumentEntity = {
      ...this.documents[idx],
      status,
    };
    this.documents[idx] = updated;
    return { ok: true, data: updated };
  }

  async deleteDocumentRecord(
    documentId: string
  ): Promise<
    DocumentResult<{
      deleted: true;
      preservedLinkedQuestions: number;
    }>
  > {
    const idx = this.documents.findIndex((d) => d.id === documentId);
    if (idx === -1) {
      return {
        ok: false,
        error: {
          code: "DOCUMENT_NOT_FOUND",
          message: "Documento no encontrado",
        },
      };
    }

    const target = this.documents[idx];

    let affectedQuestions = 0;
    this.questions = this.questions.map((q) => {
      if (q.sourceDocumentId === documentId) {
        affectedQuestions += 1;
        return {
          ...q,
          sourceDocumentId: null,
          sourceDocumentName: q.sourceDocumentName ?? target.filename,
          sourceDocumentAvailable: false,
        };
      }
      return q;
    });

    const preserved = Math.max(
      affectedQuestions,
      target.linkedQuestionsCount ?? 0
    );

    this.documents.splice(idx, 1);

    return {
      ok: true,
      data: {
        deleted: true,
        preservedLinkedQuestions: preserved,
      },
    };
  }

  // --- PrivateDocumentStoragePort ---

  async uploadPdfObject(params: {
    storagePath: string;
    mimeType: "application/pdf";
    sizeBytes: number;
    simulateFailure?: boolean;
  }): Promise<DocumentResult<{ storagePath: string }>> {
    if (params.simulateFailure) {
      return {
        ok: false,
        error: {
          code: "STORAGE_UPLOAD_FAILED",
          message:
            "Error de red al subir el PDF al bucket privado. Puedes reintentar sin duplicar el registro.",
        },
      };
    }

    this.storedBlobs.add(params.storagePath);
    return {
      ok: true,
      data: { storagePath: params.storagePath },
    };
  }

  async createSignedReadUrl(params: {
    documentId: string;
    filename: string;
    storagePath: string;
    expiresInSeconds: number;
  }): Promise<DocumentResult<SignedDocumentUrl>> {
    const expiresAt = new Date(
      Date.now() + params.expiresInSeconds * 1000
    ).toISOString();
    const token = Buffer.from(
      `${params.storagePath}:${expiresAt}`,
      "utf-8"
    ).toString("base64url");

    return {
      ok: true,
      data: {
        documentId: params.documentId,
        filename: params.filename,
        storagePath: params.storagePath,
        signedUrl: `https://storage.studyplay.local/study-documents/${params.storagePath}?token=${token}&exp=${params.expiresInSeconds}`,
        expiresInSeconds: params.expiresInSeconds,
        expiresAt,
      },
    };
  }

  async removePdfObject(
    storagePath: string
  ): Promise<DocumentResult<{ removed: true }>> {
    this.storedBlobs.delete(storagePath);
    return { ok: true, data: { removed: true } };
  }

  // --- QuestionsRepository ---

  async listQuestionsByTopic(
    topicId: string
  ): Promise<QuestionResult<QuestionEntity[]>> {
    const list = this.questions
      .filter((q) => q.topicId === topicId)
      .map((q) => this.enrichQuestion(q));
    return { ok: true, data: list };
  }

  async listQuestionsBySubject(
    subjectId: string
  ): Promise<QuestionResult<QuestionEntity[]>> {
    const topicIds = new Set(
      this.topics.filter((t) => t.subjectId === subjectId).map((t) => t.id)
    );
    const list = this.questions
      .filter((q) => topicIds.has(q.topicId))
      .map((q) => this.enrichQuestion(q));
    return { ok: true, data: list };
  }

  async findQuestionById(
    questionId: string
  ): Promise<QuestionResult<QuestionEntity | null>> {
    const found = this.questions.find((q) => q.id === questionId) ?? null;
    return {
      ok: true,
      data: found ? this.enrichQuestion(found) : null,
    };
  }

  async createQuestionRecord(params: {
    topicId: string;
    authorId: string;
    type: QuestionType;
    prompt: string;
    explanation: string;
    difficulty: QuestionDifficulty;
    status: ContentStatus;
    sourceDocumentId: string | null;
    sourceDocumentName: string | null;
    sourcePage: number | null;
    version: number;
    options: Array<{
      id?: string;
      text: string;
      isCorrect: boolean;
      feedback: string;
      sortOrder: number;
    }>;
  }): Promise<QuestionResult<QuestionEntity>> {
    this.seq += 1;
    const questionId = `q-${this.seq}`;
    const nowIso = new Date().toISOString();

    const mappedOptions: QuestionOptionEntity[] = params.options.map(
      (opt, idx) => ({
        id: opt.id || `${questionId}-opt-${idx + 1}`,
        questionId,
        text: opt.text,
        isCorrect: opt.isCorrect,
        feedback: opt.feedback,
        sortOrder: opt.sortOrder,
      })
    );

    const created: QuestionEntity = {
      id: questionId,
      topicId: params.topicId,
      authorId: params.authorId,
      type: params.type,
      prompt: params.prompt,
      explanation: params.explanation,
      difficulty: params.difficulty,
      status: params.status,
      sourceDocumentId: params.sourceDocumentId,
      sourceDocumentName: params.sourceDocumentName,
      sourceDocumentAvailable: Boolean(params.sourceDocumentId),
      sourcePage: params.sourcePage,
      version: params.version,
      options: mappedOptions,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.questions.unshift(created);
    return { ok: true, data: this.enrichQuestion(created) };
  }

  async updateQuestionRecord(
    questionId: string,
    params: {
      type: QuestionType;
      prompt: string;
      explanation: string;
      difficulty: QuestionDifficulty;
      status: ContentStatus;
      sourceDocumentId: string | null;
      sourceDocumentName: string | null;
      sourcePage: number | null;
      version: number;
      options: Array<{
        id?: string;
        text: string;
        isCorrect: boolean;
        feedback: string;
        sortOrder: number;
      }>;
    }
  ): Promise<QuestionResult<QuestionEntity>> {
    const idx = this.questions.findIndex((q) => q.id === questionId);
    if (idx === -1) {
      return {
        ok: false,
        error: {
          code: "QUESTION_NOT_FOUND",
          message: "Pregunta no encontrada.",
        },
      };
    }

    const mappedOptions: QuestionOptionEntity[] = params.options.map(
      (opt, i) => ({
        id: opt.id || `${questionId}-opt-${i + 1}`,
        questionId,
        text: opt.text,
        isCorrect: opt.isCorrect,
        feedback: opt.feedback,
        sortOrder: opt.sortOrder,
      })
    );

    const updated: QuestionEntity = {
      ...this.questions[idx],
      type: params.type,
      prompt: params.prompt,
      explanation: params.explanation,
      difficulty: params.difficulty,
      status: params.status,
      sourceDocumentId: params.sourceDocumentId,
      sourceDocumentName: params.sourceDocumentName,
      sourcePage: params.sourcePage,
      version: params.version,
      options: mappedOptions,
      updatedAt: new Date().toISOString(),
    };

    this.questions[idx] = updated;
    return { ok: true, data: this.enrichQuestion(updated) };
  }

  async updateQuestionStatus(
    questionId: string,
    status: ContentStatus
  ): Promise<QuestionResult<QuestionEntity>> {
    const idx = this.questions.findIndex((q) => q.id === questionId);
    if (idx === -1) {
      return {
        ok: false,
        error: {
          code: "QUESTION_NOT_FOUND",
          message: "Pregunta no encontrada.",
        },
      };
    }

    const updated: QuestionEntity = {
      ...this.questions[idx],
      status,
      updatedAt: new Date().toISOString(),
    };

    this.questions[idx] = updated;
    return { ok: true, data: this.enrichQuestion(updated) };
  }

  async deleteQuestionRecord(
    questionId: string
  ): Promise<QuestionResult<{ deleted: true }>> {
    const idx = this.questions.findIndex((q) => q.id === questionId);
    if (idx === -1) {
      return {
        ok: false,
        error: {
          code: "QUESTION_NOT_FOUND",
          message: "Pregunta no encontrada.",
        },
      };
    }

    this.questions.splice(idx, 1);
    return { ok: true, data: { deleted: true } };
  }

  // --- QuizzesRepository ---

  private enrichQuizSession(s: QuizSessionEntity): QuizSessionEntity {
    const subject = this.subjects.find((sub) => sub.id === s.subjectId);
    return {
      ...s,
      subjectTitle: subject?.title ?? s.subjectTitle ?? "Materia",
    };
  }

  async createQuizSessionRecord(params: {
    userId: string;
    subjectId: string;
    mode: QuizMode;
    settingsJson: QuizSessionSettings;
  }): Promise<QuizResult<QuizSessionEntity>> {
    this.seq += 1;
    const nowIso = new Date().toISOString();
    const created: QuizSessionEntity = {
      id: `session-${this.seq}`,
      userId: params.userId,
      subjectId: params.subjectId,
      mode: params.mode,
      settingsJson: params.settingsJson,
      status: "in_progress",
      startedAt: nowIso,
      completedAt: null,
      score: 0,
      accuracy: 0,
    };

    this.quizSessions.unshift(created);
    return { ok: true, data: this.enrichQuizSession(created) };
  }

  async findQuizSessionById(
    sessionId: string
  ): Promise<QuizResult<QuizSessionEntity | null>> {
    const found = this.quizSessions.find((s) => s.id === sessionId) ?? null;
    return {
      ok: true,
      data: found ? this.enrichQuizSession(found) : null,
    };
  }

  async listQuizSessionsByUser(
    userId: string
  ): Promise<QuizResult<QuizSessionEntity[]>> {
    return {
      ok: true,
      data: this.quizSessions
        .filter((s) => s.userId === userId)
        .map((s) => this.enrichQuizSession(s)),
    };
  }

  async updateQuizSessionProgress(
    sessionId: string,
    params: {
      status: QuizSessionStatus;
      score: number;
      accuracy: number;
      completedAt: string | null;
    }
  ): Promise<QuizResult<QuizSessionEntity>> {
    const idx = this.quizSessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) {
      return {
        ok: false,
        error: {
          code: "SESSION_NOT_FOUND",
          message: "Sesión no encontrada.",
        },
      };
    }

    const updated: QuizSessionEntity = {
      ...this.quizSessions[idx],
      status: params.status,
      score: params.score,
      accuracy: params.accuracy,
      completedAt: params.completedAt ?? this.quizSessions[idx].completedAt,
    };

    this.quizSessions[idx] = updated;
    return { ok: true, data: this.enrichQuizSession(updated) };
  }

  async recordAttemptIdempotent(params: {
    sessionId: string;
    userId: string;
    questionId: string;
    selectedOptionIds: string[];
    isCorrect: boolean;
    elapsedMs: number;
    questionVersion: number;
  }): Promise<
    QuizResult<{
      attempt: AttemptEntity;
      wasDuplicateRetry: boolean;
    }>
  > {
    // Idempotencia por (sessionId, questionId)
    const existing = this.attempts.find(
      (a) =>
        a.sessionId === params.sessionId && a.questionId === params.questionId
    );

    if (existing) {
      return {
        ok: true,
        data: {
          attempt: existing,
          wasDuplicateRetry: true,
        },
      };
    }

    this.seq += 1;
    const created: AttemptEntity = {
      id: `att-${this.seq}`,
      sessionId: params.sessionId,
      userId: params.userId,
      questionId: params.questionId,
      responseJson: { selectedOptionIds: [...params.selectedOptionIds] },
      isCorrect: params.isCorrect,
      elapsedMs: params.elapsedMs,
      answeredAt: new Date().toISOString(),
      questionVersion: params.questionVersion,
    };

    this.attempts.push(created);
    return {
      ok: true,
      data: {
        attempt: created,
        wasDuplicateRetry: false,
      },
    };
  }

  async listAttemptsBySession(
    sessionId: string
  ): Promise<QuizResult<AttemptEntity[]>> {
    return {
      ok: true,
      data: this.attempts.filter((a) => a.sessionId === sessionId),
    };
  }

  async listAttemptsByUser(
    userId: string,
    subjectId?: string
  ): Promise<QuizResult<AttemptEntity[]>> {
    let list = this.attempts.filter((a) => a.userId === userId);
    if (subjectId) {
      const subjectSessionIds = new Set(
        this.quizSessions
          .filter((s) => s.subjectId === subjectId && s.userId === userId)
          .map((s) => s.id)
      );
      const subjectTopicIds = new Set(
        this.topics.filter((t) => t.subjectId === subjectId).map((t) => t.id)
      );
      const subjectQuestionIds = new Set(
        this.questions
          .filter((q) => subjectTopicIds.has(q.topicId))
          .map((q) => q.id)
      );

      list = list.filter(
        (a) =>
          subjectSessionIds.has(a.sessionId) ||
          subjectQuestionIds.has(a.questionId)
      );
    }
    return { ok: true, data: list };
  }

  // --- ProgressRepository (Fase 7) ---

  async awardXpEventIdempotent(
    input: AwardXpInput
  ): Promise<ProgressResult<AwardXpOutput>> {
    const normalizedKey = input.eventKey.trim();
    if (normalizedKey.length < 3) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "El event_key debe tener al menos 3 caracteres.",
        },
      };
    }

    const expectedPoints = getXpPointsForEventType(input.eventType);
    if (input.points !== expectedPoints || input.points <= 0) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `El evento ${input.eventType} requiere exactamente ${expectedPoints} puntos XP.`,
        },
      };
    }

    // Caso Imprescindible #8: Idempotencia estricta por event_key
    const existing = this.xpEvents.find((ev) => ev.eventKey === normalizedKey);
    if (existing) {
      return {
        ok: true,
        data: {
          event: existing,
          wasDuplicate: true,
        },
      };
    }

    this.seq += 1;
    const created: XpEventEntity = {
      id: `xp-${this.seq}`,
      userId: input.userId,
      eventKey: normalizedKey,
      eventType: input.eventType,
      points: expectedPoints,
      referenceId: input.referenceId ?? null,
      createdAt: new Date().toISOString(),
    };

    this.xpEvents.unshift(created);
    return {
      ok: true,
      data: {
        event: created,
        wasDuplicate: false,
      },
    };
  }

  async listXpEventsByUser(
    userId: string
  ): Promise<ProgressResult<XpEventEntity[]>> {
    const events = this.xpEvents
      .filter((ev) => ev.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { ok: true, data: events };
  }

  async recordDailyActivityIncrement(
    input: RecordDailyActivityInput
  ): Promise<ProgressResult<DailyActivityEntity>> {
    const activityDate = normalizeDateString(input.activityDate);
    if (!activityDate) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Fecha de actividad diaria inválida.",
        },
      };
    }

    const qDelta = Math.max(0, Math.floor(input.questionsAnsweredDelta ?? 0));
    const cDelta = Math.max(0, Math.floor(input.correctAnswersDelta ?? 0));
    const zDelta = Math.max(0, Math.floor(input.quizzesCompletedDelta ?? 0));
    const mDelta = Math.max(0, Math.floor(input.minutesStudiedDelta ?? 0));

    const idx = this.dailyActivities.findIndex(
      (d) => d.userId === input.userId && d.activityDate === activityDate
    );

    const nowIso = new Date().toISOString();
    if (idx >= 0) {
      const prev = this.dailyActivities[idx];
      const nextQuestions = prev.questionsAnswered + qDelta;
      const nextCorrect = Math.min(nextQuestions, prev.correctAnswers + cDelta);
      const updated: DailyActivityEntity = {
        ...prev,
        questionsAnswered: nextQuestions,
        correctAnswers: nextCorrect,
        quizzesCompleted: prev.quizzesCompleted + zDelta,
        minutesStudied: prev.minutesStudied + mDelta,
        updatedAt: nowIso,
      };
      this.dailyActivities[idx] = updated;
      return { ok: true, data: updated };
    }

    this.seq += 1;
    const nextQuestions = qDelta;
    const nextCorrect = Math.min(nextQuestions, cDelta);
    const created: DailyActivityEntity = {
      id: `daily-${this.seq}`,
      userId: input.userId,
      activityDate,
      questionsAnswered: nextQuestions,
      correctAnswers: nextCorrect,
      quizzesCompleted: zDelta,
      minutesStudied: mDelta,
      updatedAt: nowIso,
    };

    this.dailyActivities.unshift(created);
    return { ok: true, data: created };
  }

  async listDailyActivityByUser(
    userId: string
  ): Promise<ProgressResult<DailyActivityEntity[]>> {
    const items = this.dailyActivities
      .filter((d) => d.userId === userId)
      .sort((a, b) => b.activityDate.localeCompare(a.activityDate));
    return { ok: true, data: items };
  }

  // --- AdminRepository (Fase 8) ---

  async listAllPublicSubjectsForModeration(): Promise<
    AdminResult<SubjectEntity[]>
  > {
    const publicSubjects = this.subjects
      .filter((s) => s.visibility === "public")
      .map((s) => {
        const subjectTopicIds = new Set(
          this.topics.filter((t) => t.subjectId === s.id).map((t) => t.id)
        );
        const pubQCount = this.questions.filter(
          (q) => subjectTopicIds.has(q.topicId) && q.status === "published"
        ).length;

        return {
          ...s,
          topicsCount: subjectTopicIds.size || (s.topicsCount ?? 0),
          questionsCount: pubQCount || (s.questionsCount ?? 0),
        };
      });

    return { ok: true, data: publicSubjects };
  }

  async recordAuditLog(
    input: CreateAdminAuditLogInput
  ): Promise<AdminResult<AdminAuditLogEntity>> {
    const targetTitle = input.targetTitle.trim();
    if (!targetTitle) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "El título del recurso auditado es obligatorio.",
        },
      };
    }

    this.seq += 1;
    const created: AdminAuditLogEntity = {
      id: `audit-${this.seq}`,
      actorId: input.actorId.trim(),
      action: input.action,
      targetType: input.targetType ?? "subject",
      targetId: input.targetId.trim(),
      targetTitle,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      notes: (input.notes ?? "").trim().slice(0, 500),
      createdAt: new Date().toISOString(),
    };

    this.adminAuditLogs.unshift(created);
    return { ok: true, data: created };
  }

  async listAuditLogs(
    limit = 20
  ): Promise<AdminResult<AdminAuditLogEntity[]>> {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const sorted = [...this.adminAuditLogs]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, safeLimit);
    return { ok: true, data: sorted };
  }
}

const globalForCatalog = globalThis as unknown as {
  studyPlayCatalogStore?: InMemoryStudyCatalogStore;
};

export const defaultInMemoryCatalogStore =
  globalForCatalog.studyPlayCatalogStore ??
  (globalForCatalog.studyPlayCatalogStore = new InMemoryStudyCatalogStore(true));
