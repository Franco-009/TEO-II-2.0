import { describe, expect, it } from "vitest";
import {
  createPublicSubjectDraftUseCase,
  getAdminDashboardSummaryUseCase,
  listPublicLibraryCatalogUseCase,
  moderatePublicSubjectUseCase,
  publishPublicContentUseCase,
} from "@/application/admin/admin.use-cases";
import {
  getCurrentProfileUseCase,
  loginWithPasswordUseCase,
  logoutUserUseCase,
  registerUserUseCase,
  updateOwnProfileUseCase,
} from "@/application/auth/auth.use-cases";
import {
  deleteDocumentUseCase,
  getSignedDocumentUrlUseCase,
  listMyDocumentsUseCase,
  uploadDocumentUseCase,
} from "@/application/documents/documents.use-cases";
import {
  getSessionXpBreakdownUseCase,
  getUserProgressUseCase,
} from "@/application/progress/progress.use-cases";
import {
  changeQuestionStatusUseCase,
  createQuestionUseCase,
  listTopicQuestionsUseCase,
  updateQuestionUseCase,
} from "@/application/questions/questions.use-cases";
import {
  completeQuizUseCase,
  getMistakeQuestionsUseCase,
  getQuizSessionDetailsUseCase,
  startQuizUseCase,
  submitAnswerUseCase,
} from "@/application/quizzes/quizzes.use-cases";
import {
  createSubjectUseCase,
  getSubjectByIdUseCase,
  listMySubjectsUseCase,
  updateSubjectUseCase,
} from "@/application/subjects/subjects.use-cases";
import {
  createTopicUseCase,
  listSubjectTopicsTreeUseCase,
  updateTopicUseCase,
} from "@/application/topics/topics.use-cases";
import { APP_CONFIG, isAiEnabled } from "@/config/env";
import type { AuthRepository } from "@/domain/auth/auth.ports";
import { evaluateRouteAccess } from "@/domain/auth/auth.rules";
import type {
  AuthResult,
  LoginInput,
  PasswordResetInput,
  RegisterInput,
  UserProfile,
} from "@/domain/auth/auth.types";
import { InMemoryStudyCatalogStore } from "@/infrastructure/supabase/in-memory-catalog.store";

class E2EAuthRepository implements AuthRepository {
  private users = new Map<string, { password: string; profile: UserProfile }>();
  private activeUserId: string | null = null;

  async signUp(input: RegisterInput): Promise<AuthResult<UserProfile>> {
    const normalizedEmail = input.email.trim().toLowerCase();
    if (this.users.has(normalizedEmail)) {
      return {
        ok: false,
        error: {
          code: "EMAIL_ALREADY_IN_USE",
          message: "Este correo electrónico ya está registrado.",
        },
      };
    }

    const profile: UserProfile = {
      id: `user-${this.users.size + 1}-uuid`,
      email: normalizedEmail,
      displayName: input.displayName,
      avatarPath: null,
      role: "user",
      createdAt: new Date().toISOString(),
    };

    this.users.set(normalizedEmail, { password: input.password, profile });
    this.activeUserId = profile.id;
    return { ok: true, data: profile };
  }

  async signInWithPassword(input: LoginInput): Promise<AuthResult<UserProfile>> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const entry = this.users.get(normalizedEmail);
    if (!entry || entry.password !== input.password) {
      return {
        ok: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Correo electrónico o contraseña incorrectos.",
        },
      };
    }

    this.activeUserId = entry.profile.id;
    return { ok: true, data: entry.profile };
  }

  async signOut(): Promise<AuthResult<{ signedOut: true }>> {
    this.activeUserId = null;
    return { ok: true, data: { signedOut: true } };
  }

  async resetPasswordForEmail(
    input: PasswordResetInput
  ): Promise<AuthResult<{ emailSent: true }>> {
    if (!input.email.trim()) {
      return {
        ok: false,
        error: { code: "INVALID_INPUT", message: "Email requerido" },
      };
    }
    return { ok: true, data: { emailSent: true } };
  }

  async getCurrentSessionProfile(): Promise<AuthResult<UserProfile | null>> {
    for (const { profile } of this.users.values()) {
      if (profile.id === this.activeUserId) {
        return { ok: true, data: profile };
      }
    }
    return { ok: true, data: null };
  }

  async updateOwnProfile(params: {
    userId: string;
    displayName: string;
    avatarPath: string | null;
  }): Promise<AuthResult<UserProfile>> {
    for (const [email, entry] of this.users.entries()) {
      if (entry.profile.id === params.userId) {
        const updated: UserProfile = {
          ...entry.profile,
          displayName: params.displayName,
          avatarPath: params.avatarPath,
        };
        this.users.set(email, { ...entry, profile: updated });
        return { ok: true, data: updated };
      }
    }
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Perfil no encontrado." },
    };
  }
}

describe("Suite E2E y Trazabilidad del MVP StudyPlay v1.0.0 (Sección 12.2 y Sección 14)", () => {
  it("ejecuta el circuito completo de extremo a extremo verificando los 12 Casos Imprescindibles y los 16 Criterios de Aceptación", async () => {
    // =========================================================================
    // 0. VERIFICACIÓN SIN IA (Caso #12 y Criterio #14)
    // =========================================================================
    expect(APP_CONFIG.enableAiFeatures).toBe(false);
    expect(isAiEnabled()).toBe(false);
    expect(APP_CONFIG.version).toBe("1.0.0");

    const authRepo = new E2EAuthRepository();
    const store = new InMemoryStudyCatalogStore(false);

    // =========================================================================
    // 1. AUTENTICACIÓN, RUTAS PRIVADAS Y PERFIL (Casos #1, #2 y Criterio #1)
    // =========================================================================
    // Caso #2: Visitante no autenticado intenta entrar a rutas privadas (/app/* y /admin/*)
    const guestAppAccess = evaluateRouteAccess({
      pathname: "/app/subjects",
      isAuthenticated: false,
      role: null,
    });
    expect(guestAppAccess.allowed).toBe(false);
    if (!guestAppAccess.allowed) {
      expect(guestAppAccess.reason).toBe("UNAUTHENTICATED");
      expect(guestAppAccess.redirectTo).toContain("/login");
    }

    const guestAdminAccess = evaluateRouteAccess({
      pathname: "/admin/content",
      isAuthenticated: false,
      role: null,
    });
    expect(guestAdminAccess.allowed).toBe(false);

    // Caso #1: Contraseña inválida (< 8 caracteres) es rechazada en el registro
    const weakPassRes = await registerUserUseCase(authRepo, {
      displayName: "Usuario A",
      email: "usuario.a@studyplay.dev",
      password: "123",
    });
    expect(weakPassRes.ok).toBe(false);
    if (!weakPassRes.ok) {
      expect(weakPassRes.error.code).toBe("WEAK_PASSWORD");
    }

    // Caso #1 y Criterio #1: Registro válido de Usuario A y Usuario B (nacen siempre con role = 'user')
    const regARes = await registerUserUseCase(authRepo, {
      displayName: "Ana Estudiante",
      email: "ana@studyplay.dev",
      password: "passwordSegura123",
    });
    expect(regARes.ok).toBe(true);
    if (!regARes.ok) return;
    expect(regARes.data.role).toBe("user");

    // Caso #1: Email duplicado rechazado
    const dupEmailRes = await registerUserUseCase(authRepo, {
      displayName: "Ana Duplicada",
      email: "ANA@studyplay.dev",
      password: "otraPassword123",
    });
    expect(dupEmailRes.ok).toBe(false);
    if (!dupEmailRes.ok) {
      expect(dupEmailRes.error.code).toBe("EMAIL_ALREADY_IN_USE");
    }

    const regBRes = await registerUserUseCase(authRepo, {
      displayName: "Bruno Estudiante",
      email: "bruno@studyplay.dev",
      password: "passwordSegura456",
    });
    expect(regBRes.ok).toBe(true);
    if (!regBRes.ok) return;

    // Criterio #1: Cerrar sesión e iniciar sesión nuevamente
    const logoutRes = await logoutUserUseCase(authRepo);
    expect(logoutRes.ok).toBe(true);
    const sessionAfterLogout = await getCurrentProfileUseCase(authRepo);
    expect(sessionAfterLogout.ok && sessionAfterLogout.data).toBeNull();

    const loginARes = await loginWithPasswordUseCase(authRepo, {
      email: "ana@studyplay.dev",
      password: "passwordSegura123",
    });
    expect(loginARes.ok).toBe(true);

    // Intento de escalación de rol desde cliente es bloqueado con FORBIDDEN_ROLE
    const roleEscalationRes = await updateOwnProfileUseCase(
      authRepo,
      { id: regARes.data.id, role: "user" },
      regARes.data.id,
      { displayName: "Ana Admin Fake", role: "admin" }
    );
    expect(roleEscalationRes.ok).toBe(false);
    if (!roleEscalationRes.ok) {
      expect(roleEscalationRes.error.code).toBe("FORBIDDEN_ROLE");
    }

    // Usuario con rol 'user' no puede entrar a /admin/*
    const userToAdminRoute = evaluateRouteAccess({
      pathname: "/admin",
      isAuthenticated: true,
      role: "user",
    });
    expect(userToAdminRoute.allowed).toBe(false);
    if (!userToAdminRoute.allowed) {
      expect(userToAdminRoute.reason).toBe("FORBIDDEN_ADMIN");
    }

    const userA = { userId: regARes.data.id, role: "user" as const };
    const userB = { userId: regBRes.data.id, role: "user" as const };
    const adminActor = { userId: "admin-root-uuid", role: "admin" as const };

    // =========================================================================
    // 2. MATERIAS Y TEMAS PRIVADOS + AISLAMIENTO (Casos #3, #4 y Criterios #2, #13)
    // =========================================================================
    // Caso #3: Dos usuarios crean materias con el mismo título sin cruzar datos
    const subjARes = await createSubjectUseCase(store, userA, {
      title: "Fisiología Médica",
      description: "Resumen privado de Ana",
      status: "published",
    });
    const subjBRes = await createSubjectUseCase(store, userB, {
      title: "Fisiología Médica",
      description: "Resumen privado de Bruno",
      status: "published",
    });
    expect(subjARes.ok && subjBRes.ok).toBe(true);
    if (!subjARes.ok || !subjBRes.ok) return;
    expect(subjARes.data.id).not.toBe(subjBRes.data.id);

    const listSubjectsA = await listMySubjectsUseCase(store, userA);
    const listSubjectsB = await listMySubjectsUseCase(store, userB);
    expect(listSubjectsA.ok && listSubjectsA.data).toHaveLength(1);
    expect(listSubjectsB.ok && listSubjectsB.data).toHaveLength(1);
    if (listSubjectsA.ok && listSubjectsB.ok) {
      expect(listSubjectsA.data[0].description).toBe("Resumen privado de Ana");
      expect(listSubjectsB.data[0].description).toBe("Resumen privado de Bruno");
    }

    // Caso #4 y Criterio #2: Propietario puede editar y archivar/re-publicar su materia; otro usuario no puede
    const editByOwner = await updateSubjectUseCase(
      store,
      userA,
      subjARes.data.id,
      {
        title: "Fisiología Médica I",
        description: "Apuntes actualizados de Ana",
      }
    );
    expect(editByOwner.ok).toBe(true);

    const archiveSubjectB = await updateSubjectUseCase(
      store,
      userB,
      subjBRes.data.id,
      { status: "archived" }
    );
    expect(archiveSubjectB.ok && archiveSubjectB.data.status).toBe("archived");

    // Usuario B intenta leer o editar la materia privada de Usuario A -> FORBIDDEN_NOT_OWNER (Caso #4, Criterio #13)
    const crossReadSubject = await getSubjectByIdUseCase(
      store,
      userB,
      subjARes.data.id
    );
    expect(crossReadSubject.ok).toBe(false);
    if (!crossReadSubject.ok) {
      expect(crossReadSubject.error.code).toBe("FORBIDDEN_NOT_OWNER");
    }

    const crossEditSubject = await updateSubjectUseCase(
      store,
      userB,
      subjARes.data.id,
      { title: "Intrusión de Bruno" }
    );
    expect(crossEditSubject.ok).toBe(false);
    if (!crossEditSubject.ok) {
      expect(crossEditSubject.error.code).toBe("FORBIDDEN_NOT_OWNER");
    }

    // Criterio #2: Crear y editar temas jerárquicos en la materia de Usuario A
    const rootTopicRes = await createTopicUseCase(store, store, userA, {
      subjectId: subjARes.data.id,
      title: "1. Sistema Cardiovascular",
      description: "Fisiología cardíaca y hemodinamia",
      sortOrder: 1,
    });
    expect(rootTopicRes.ok).toBe(true);
    if (!rootTopicRes.ok) return;

    const subTopicRes = await createTopicUseCase(store, store, userA, {
      subjectId: subjARes.data.id,
      parentTopicId: rootTopicRes.data.id,
      title: "1.1 Ciclo Cardíaco",
      description: "Sístole y diástole ventricular",
      sortOrder: 2,
    });
    expect(subTopicRes.ok).toBe(true);
    if (!subTopicRes.ok) return;

    const editTopicRes = await updateTopicUseCase(
      store,
      store,
      userA,
      subTopicRes.data.id,
      { description: "Sístole, diástole y ruidos cardíacos" }
    );
    expect(editTopicRes.ok).toBe(true);

    const topicsTreeRes = await listSubjectTopicsTreeUseCase(
      store,
      store,
      userA,
      subjARes.data.id
    );
    expect(topicsTreeRes.ok && topicsTreeRes.data).toHaveLength(2);

    // =========================================================================
    // 3. DOCUMENTOS PDF PRIVADOS Y STORAGE (Caso #10 y Criterios #3, #13)
    // =========================================================================
    const uploadPdfARes = await uploadDocumentUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      storagePort: store,
      actor: userA,
      input: {
        subjectId: subjARes.data.id,
        topicId: rootTopicRes.data.id,
        filename: "Guia_Cardiovascular_2026.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2_450_000,
        headerSignature: "%PDF-1.7",
      },
    });
    expect(uploadPdfARes.ok).toBe(true);
    if (!uploadPdfARes.ok) return;
    expect(uploadPdfARes.data.status).toBe("available");
    expect(uploadPdfARes.data.storagePath).toContain(userA.userId);

    // Criterio #3: Usuario A puede listar y obtener URL firmada de su PDF privado
    const myDocsARes = await listMyDocumentsUseCase(store, userA);
    expect(myDocsARes.ok && myDocsARes.data).toHaveLength(1);

    const signedUrlARes = await getSignedDocumentUrlUseCase({
      docsRepo: store,
      storagePort: store,
      actor: userA,
      documentId: uploadPdfARes.data.id,
    });
    expect(signedUrlARes.ok).toBe(true);
    if (signedUrlARes.ok) {
      expect(signedUrlARes.data.signedUrl).toContain(
        uploadPdfARes.data.storagePath
      );
    }

    // Caso #10 y Criterio #13: Un PDF de Usuario A NO se descarga desde Usuario B (ni Admin)
    const crossDownloadByB = await getSignedDocumentUrlUseCase({
      docsRepo: store,
      storagePort: store,
      actor: userB,
      documentId: uploadPdfARes.data.id,
    });
    expect(crossDownloadByB.ok).toBe(false);
    if (!crossDownloadByB.ok) {
      expect(crossDownloadByB.error.code).toBe("FORBIDDEN_NOT_OWNER");
    }

    const crossDownloadByAdmin = await getSignedDocumentUrlUseCase({
      docsRepo: store,
      storagePort: store,
      actor: adminActor,
      documentId: uploadPdfARes.data.id,
    });
    expect(crossDownloadByAdmin.ok).toBe(false);

    // =========================================================================
    // 4. PREGUNTAS Y EDITOR DETERMINISTA (Criterios #4 y #5)
    // =========================================================================
    // Criterio #5: El editor impide publicar preguntas mal configuradas (ej. sin explicación general)
    const invalidPublishedQuestion = await createQuestionUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      questionsRepo: store,
      actor: userA,
      input: {
        topicId: rootTopicRes.data.id,
        type: "single_choice",
        prompt: "¿Cuál es el marcapasos fisiológico del corazón?",
        explanation: "", // Vacía -> debe fallar al intentar publicar
        difficulty: "easy",
        status: "published",
        options: [
          { text: "Nodo sinusal", isCorrect: true },
          { text: "Nodo auriculoventricular", isCorrect: false },
        ],
      },
    });
    expect(invalidPublishedQuestion.ok).toBe(false);
    if (!invalidPublishedQuestion.ok) {
      expect(invalidPublishedQuestion.error.code).toBe(
        "MISSING_GENERAL_EXPLANATION"
      );
    }

    // Criterio #4: Crear preguntas de opción múltiple (single_choice), verdadero/falso (true_false) y selección múltiple (multiple_select)
    const qSingleRes = await createQuestionUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      questionsRepo: store,
      actor: userA,
      input: {
        topicId: rootTopicRes.data.id,
        type: "single_choice",
        prompt: "¿Cuál es el marcapasos fisiológico normal del corazón humano?",
        explanation:
          "El nodo sinoauricular (Keith-Flack) tiene la mayor frecuencia de despolarización espontánea.",
        difficulty: "easy",
        status: "published",
        sourceDocumentId: uploadPdfARes.data.id,
        sourcePage: 12,
        options: [
          { text: "Nodo sinusal", isCorrect: true },
          { text: "Haz de His", isCorrect: false },
          { text: "Fibras de Purkinje", isCorrect: false },
        ],
      },
    });
    expect(qSingleRes.ok).toBe(true);
    if (!qSingleRes.ok) return;

    const qTrueFalseRes = await createQuestionUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      questionsRepo: store,
      actor: userA,
      input: {
        topicId: rootTopicRes.data.id,
        type: "true_false",
        prompt:
          "Durante la contracción isovolumétrica ventricular, las válvulas semilunares y auriculoventriculares están cerradas.",
        explanation:
          "Ambas válvulas permanecen cerradas mientras aumenta la presión intraventricular sin cambio de volumen.",
        difficulty: "medium",
        status: "published",
        options: [
          { text: "Verdadero", isCorrect: true },
          { text: "Falso", isCorrect: false },
        ],
      },
    });
    expect(qTrueFalseRes.ok).toBe(true);
    if (!qTrueFalseRes.ok) return;

    const qMultiRes = await createQuestionUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      questionsRepo: store,
      actor: userA,
      input: {
        topicId: rootTopicRes.data.id,
        type: "multiple_select",
        prompt:
          "Seleccioná los factores que incrementan el volumen sistólico cardíaco:",
        explanation:
          "El aumento de la precarga (Ley de Frank-Starling) y el aumento del inotropismo incrementan el volumen sistólico; el aumento de poscarga lo reduce.",
        difficulty: "hard",
        status: "published",
        options: [
          { text: "Aumento de la precarga", isCorrect: true },
          {
            text: "Aumento de la contractilidad (inotropismo)",
            isCorrect: true,
          },
          { text: "Aumento agudo de la poscarga aórtica", isCorrect: false },
        ],
      },
    });
    expect(qMultiRes.ok).toBe(true);
    if (!qMultiRes.ok) return;

    // Creamos 2 preguntas adicionales publicadas en el mismo tema para alcanzar >= 5 intentos y verificar el dominio del tema (mastered)
    const qExtra4Res = await createQuestionUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      questionsRepo: store,
      actor: userA,
      input: {
        topicId: rootTopicRes.data.id,
        type: "true_false",
        prompt:
          "El primer ruido cardíaco (R1) corresponde al cierre de las válvulas auriculoventriculares.",
        explanation:
          "El cierre mitral y tricuspídeo al inicio de la sístole genera R1.",
        difficulty: "easy",
        status: "published",
        options: [
          { text: "Verdadero", isCorrect: true },
          { text: "Falso", isCorrect: false },
        ],
      },
    });
    const qExtra5Res = await createQuestionUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      questionsRepo: store,
      actor: userA,
      input: {
        topicId: rootTopicRes.data.id,
        type: "true_false",
        prompt:
          "El gasto cardíaco es igual al volumen sistólico multiplicado por la frecuencia cardíaca.",
        explanation: "GC = VS x FC (aproximadamente 5 L/min en reposo).",
        difficulty: "easy",
        status: "published",
        options: [
          { text: "Verdadero", isCorrect: true },
          { text: "Falso", isCorrect: false },
        ],
      },
    });
    expect(qExtra4Res.ok && qExtra5Res.ok).toBe(true);
    if (!qExtra4Res.ok || !qExtra5Res.ok) return;

    // Verificar que al editar una pregunta publicada se incrementa su `version` y que al borrar el PDF fuente la pregunta se preserva con "Fuente no disponible"
    const updatedQSingleRes = await updateQuestionUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      questionsRepo: store,
      actor: userA,
      questionId: qSingleRes.data.id,
      input: {
        prompt:
          "¿Cuál es el marcapasos fisiológico primario del corazón humano?",
      },
    });
    expect(updatedQSingleRes.ok).toBe(true);
    if (!updatedQSingleRes.ok) return;
    expect(updatedQSingleRes.data.version).toBe(2);

    const deletePdfRes = await deleteDocumentUseCase({
      docsRepo: store,
      storagePort: store,
      actor: userA,
      documentId: uploadPdfARes.data.id,
    });
    expect(deletePdfRes.ok).toBe(true);

    const topicQuestionsAfterPdfDelete = await listTopicQuestionsUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      actor: userA,
      topicId: rootTopicRes.data.id,
    });
    expect(topicQuestionsAfterPdfDelete.ok).toBe(true);
    if (topicQuestionsAfterPdfDelete.ok) {
      const preservedQ = topicQuestionsAfterPdfDelete.data.find(
        (q) => q.id === qSingleRes.data.id
      );
      expect(preservedQ?.sourceDocumentId).toBeNull();
      expect(preservedQ?.sourceDocumentName).toBe(
        "guia_cardiovascular_2026.pdf"
      );
      expect(preservedQ?.sourceDocumentAvailable).toBe(false);
    }

    // =========================================================================
    // 5. MOTOR DE JUEGO, CORRECCIÓN DETERMINISTA Y GAMIFICACIÓN IDEMPOTENTE
    //    (Casos #6, #7, #8, #9, #11 y Criterios #6, #7, #8, #9, #10, #11, #13)
    // =========================================================================
    // Criterio #6: Usuario A inicia un cuestionario desde el tema
    const quiz1Res = await startQuizUseCase({
      subjectsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      actor: userA,
      input: {
        subjectId: subjARes.data.id,
        topicId: rootTopicRes.data.id,
        mode: "practice",
        questionCount: 5,
        seed: "e2e-seed-cardio-1",
      },
    });
    expect(quiz1Res.ok).toBe(true);
    if (!quiz1Res.ok) return;
    const session1Id = quiz1Res.data.session.id;
    expect(quiz1Res.data.questions).toHaveLength(5);

    // Caso #9 y Criterio #13: Usuario B NO puede enviar respuestas a la sesión ajena de Usuario A
    const foreignAttemptByB = await submitAnswerUseCase({
      questionsRepo: store,
      quizzesRepo: store,
      progressRepo: store,
      actor: userB,
      input: {
        sessionId: session1Id,
        questionId: qSingleRes.data.id,
        selectedOptionIds: [qSingleRes.data.options[0].id],
      },
    });
    expect(foreignAttemptByB.ok).toBe(false);
    if (!foreignAttemptByB.ok) {
      expect(foreignAttemptByB.error.code).toBe("FORBIDDEN_SESSION_OWNER");
    }

    // Caso #6: Una pregunta de opción múltiple rechaza respuestas que no son opciones de esa pregunta
    const foreignOptionAttempt = await submitAnswerUseCase({
      questionsRepo: store,
      quizzesRepo: store,
      progressRepo: store,
      actor: userA,
      input: {
        sessionId: session1Id,
        questionId: qSingleRes.data.id,
        selectedOptionIds: ["opcion-inexistente-de-otra-pregunta"],
      },
    });
    expect(foreignOptionAttempt.ok).toBe(false);
    if (!foreignOptionAttempt.ok) {
      expect(foreignOptionAttempt.error.code).toBe("INVALID_OPTION_ID");
    }

    // Criterio #7 y Caso #8 (Criterio #11): Enviar respuesta correcta a qSingle -> corrección inmediata con explicación + reintento de red no duplica XP
    const correctSingleOptionId = qSingleRes.data.options.find(
      (o) => o.isCorrect
    )!.id;

    const firstSubmitSingle = await submitAnswerUseCase({
      questionsRepo: store,
      quizzesRepo: store,
      progressRepo: store,
      actor: userA,
      activityDate: "2026-11-11",
      input: {
        sessionId: session1Id,
        questionId: qSingleRes.data.id,
        selectedOptionIds: [correctSingleOptionId],
        elapsedMs: 12_000,
      },
    });
    expect(firstSubmitSingle.ok).toBe(true);
    if (!firstSubmitSingle.ok) return;
    expect(firstSubmitSingle.data.evaluation.isCorrect).toBe(true);
    expect(firstSubmitSingle.data.evaluation.generalExplanation).toContain(
      "Keith-Flack"
    );
    expect(firstSubmitSingle.data.attempt.questionVersion).toBe(2);
    expect(firstSubmitSingle.data.wasDuplicateRetry).toBe(false);
    expect(firstSubmitSingle.data.xpAwarded).toBe(10); // +10 XP por acierto

    // Caso #8 y Criterio #11: Reintento repetido por red sobre el mismo (sessionId, questionId) NO duplica XP
    const networkRetrySingle = await submitAnswerUseCase({
      questionsRepo: store,
      quizzesRepo: store,
      progressRepo: store,
      actor: userA,
      activityDate: "2026-11-11",
      input: {
        sessionId: session1Id,
        questionId: qSingleRes.data.id,
        selectedOptionIds: [correctSingleOptionId],
        elapsedMs: 12_000,
      },
    });
    expect(networkRetrySingle.ok).toBe(true);
    if (!networkRetrySingle.ok) return;
    expect(networkRetrySingle.data.wasDuplicateRetry).toBe(true);
    expect(networkRetrySingle.data.xpAwarded).toBe(0);

    // Caso #7: En multiple_select, elegir solo una parte del conjunto correcto se califica como INCORRECTA (isCorrect = false)
    const multiCorrectOptions = qMultiRes.data.options.filter(
      (o) => o.isCorrect
    );
    expect(multiCorrectOptions).toHaveLength(2);

    const partialMultiSubmit = await submitAnswerUseCase({
      questionsRepo: store,
      quizzesRepo: store,
      progressRepo: store,
      actor: userA,
      activityDate: "2026-11-11",
      input: {
        sessionId: session1Id,
        questionId: qMultiRes.data.id,
        selectedOptionIds: [multiCorrectOptions[0].id], // Falta la segunda opción correcta
        elapsedMs: 18_000,
      },
    });
    expect(partialMultiSubmit.ok).toBe(true);
    if (!partialMultiSubmit.ok) return;
    expect(partialMultiSubmit.data.evaluation.isCorrect).toBe(false);
    expect(partialMultiSubmit.data.xpAwarded).toBe(0);

    // Respondemos correctamente las otras 3 preguntas de la sesión (4 aciertos de 5 intentos = 80% precisión en el tema -> alcanza `mastered` +50 XP)
    for (const q of [qTrueFalseRes.data, qExtra4Res.data, qExtra5Res.data]) {
      const rightOpt = q.options.find((o) => o.isCorrect)!;
      const ansRes = await submitAnswerUseCase({
        questionsRepo: store,
        quizzesRepo: store,
        progressRepo: store,
        actor: userA,
        activityDate: "2026-11-11",
        input: {
          sessionId: session1Id,
          questionId: q.id,
          selectedOptionIds: [rightOpt.id],
          elapsedMs: 10_000,
        },
      });
      expect(ansRes.ok).toBe(true);
    }

    // Cerrar la sesión 1 -> consolida resultado y otorga +20 XP (idempotente)
    const complete1Res = await completeQuizUseCase({
      quizzesRepo: store,
      progressRepo: store,
      actor: userA,
      sessionId: session1Id,
      activityDate: "2026-11-11",
    });
    expect(complete1Res.ok).toBe(true);
    if (!complete1Res.ok) return;
    expect(complete1Res.data.status).toBe("completed");
    expect(complete1Res.data.accuracy).toBe(80); // 4 de 5

    // Reintentar cerrar la misma sesión no duplica los +20 XP de finalización
    const complete1RetryRes = await completeQuizUseCase({
      quizzesRepo: store,
      progressRepo: store,
      actor: userA,
      sessionId: session1Id,
      activityDate: "2026-11-11",
    });
    expect(complete1RetryRes.ok).toBe(true);

    // Caso #11: Una sesión cerrada NO acepta nuevos intentos (SESSION_CLOSED)
    const attemptOnClosedSession = await submitAnswerUseCase({
      questionsRepo: store,
      quizzesRepo: store,
      progressRepo: store,
      actor: userA,
      input: {
        sessionId: session1Id,
        questionId: qSingleRes.data.id,
        selectedOptionIds: [correctSingleOptionId],
      },
    });
    expect(attemptOnClosedSession.ok).toBe(false);
    if (!attemptOnClosedSession.ok) {
      expect(attemptOnClosedSession.error.code).toBe("SESSION_CLOSED");
    }

    // Criterio #8: El resultado y los intentos quedan persistidos
    const session1Detail = await getQuizSessionDetailsUseCase({
      questionsRepo: store,
      quizzesRepo: store,
      actor: userA,
      sessionId: session1Id,
    });
    expect(session1Detail.ok).toBe(true);
    if (session1Detail.ok) {
      expect(session1Detail.data.attempts).toHaveLength(5);
      expect(session1Detail.data.session.status).toBe("completed");
    }

    // Verificar desglose de XP directo de la sesión: 4 aciertos (+40 XP) + completar cuestionario (+20 XP) = 60 XP
    const xpBreakdown1 = await getSessionXpBreakdownUseCase({
      progressRepo: store,
      userId: userA.userId,
      sessionId: session1Id,
    });
    expect(xpBreakdown1.ok).toBe(true);
    if (xpBreakdown1.ok) {
      expect(xpBreakdown1.data.correctAnswersXp).toBe(40);
      expect(xpBreakdown1.data.completionBonusXp).toBe(20);
      expect(xpBreakdown1.data.totalSessionXp).toBe(60);
    }

    // Criterio #9 y Caso #7: El Modo Errores recupera la pregunta `multiple_select` fallada y acierta solo cuando coincide el conjunto completo
    const mistakesListBefore = await getMistakeQuestionsUseCase({
      subjectsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      actor: userA,
      subjectId: subjARes.data.id,
    });
    expect(mistakesListBefore.ok).toBe(true);
    if (!mistakesListBefore.ok) return;
    expect(mistakesListBefore.data).toHaveLength(1);
    expect(mistakesListBefore.data[0].question.id).toBe(qMultiRes.data.id);

    const mistakesQuizRes = await startQuizUseCase({
      subjectsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      actor: userA,
      input: {
        subjectId: subjARes.data.id,
        mode: "mistakes",
        questionCount: 5,
        seed: "e2e-seed-mistakes",
      },
    });
    expect(mistakesQuizRes.ok).toBe(true);
    if (!mistakesQuizRes.ok) return;
    expect(mistakesQuizRes.data.questions.map((q) => q.id)).toEqual([
      qMultiRes.data.id,
    ]);

    // Caso #7: Selección múltiple acierta cuando se envía el conjunto completo de opciones correctas
    const fullSetMultiSubmit = await submitAnswerUseCase({
      questionsRepo: store,
      quizzesRepo: store,
      progressRepo: store,
      actor: userA,
      activityDate: "2026-11-11",
      input: {
        sessionId: mistakesQuizRes.data.session.id,
        questionId: qMultiRes.data.id,
        selectedOptionIds: multiCorrectOptions.map((o) => o.id),
        elapsedMs: 9_000,
      },
    });
    expect(fullSetMultiSubmit.ok).toBe(true);
    if (!fullSetMultiSubmit.ok) return;
    expect(fullSetMultiSubmit.data.evaluation.isCorrect).toBe(true);

    await completeQuizUseCase({
      quizzesRepo: store,
      progressRepo: store,
      actor: userA,
      sessionId: mistakesQuizRes.data.session.id,
      activityDate: "2026-11-11",
    });

    // El historial previo NO se borra (ahora hay 6 intentos totales de Usuario A), pero la cola de errores pendientes queda resuelta
    const mistakesListAfter = await getMistakeQuestionsUseCase({
      subjectsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      actor: userA,
      subjectId: subjARes.data.id,
    });
    expect(mistakesListAfter.ok && mistakesListAfter.data).toHaveLength(0);

    // Criterio #10: El dashboard de Usuario A muestra estadísticas coherentes y aisladas de Usuario B
    const progressARes = await getUserProgressUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      progressRepo: store,
      actor: userA,
      referenceDate: "2026-11-11",
    });
    expect(progressARes.ok).toBe(true);
    if (!progressARes.ok) return;
    expect(progressARes.data.totalAttemptsCount).toBe(6);
    expect(progressARes.data.totalCorrectCount).toBe(5);
    expect(progressARes.data.masteredTopicsCount).toBe(1);
    expect(progressARes.data.streak.streakDays).toBe(1);
    expect(progressARes.data.levelProgress.totalXp).toBe(140); // 110 + 10 (acierto en mistakes) + 20 (cierre de sesión mistakes)

    const progressBRes = await getUserProgressUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      progressRepo: store,
      actor: userB,
      referenceDate: "2026-11-11",
    });
    expect(progressBRes.ok).toBe(true);
    if (progressBRes.ok) {
      expect(progressBRes.data.totalAttemptsCount).toBe(0);
      expect(progressBRes.data.levelProgress.totalXp).toBe(0);
    }

    // =========================================================================
    // 6. CATÁLOGO PÚBLICO Y MODERACIÓN ADMIN (Caso #5 y Criterios #12, #13)
    // =========================================================================
    // Admin no puede moderar la materia privada de Usuario A (NOT_PUBLIC_SUBJECT)
    const adminTouchPrivateRes = await moderatePublicSubjectUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      adminRepo: store,
      actor: adminActor,
      input: {
        subjectId: subjARes.data.id,
        targetStatus: "archived",
      },
    });
    expect(adminTouchPrivateRes.ok).toBe(false);
    if (!adminTouchPrivateRes.ok) {
      expect(adminTouchPrivateRes.error.code).toBe("NOT_PUBLIC_SUBJECT");
    }

    // Caso #5 y Criterio #12: Admin crea una materia pública en estado `draft` -> NO aparece en el catálogo público
    const publicDraftRes = await createPublicSubjectDraftUseCase({
      subjectsRepo: store,
      adminRepo: store,
      actor: adminActor,
      input: {
        title: "Farmacología Clínica — Catálogo Oficial",
        description: "Banco compartido de farmacocinética y farmacodinamia.",
      },
    });
    expect(publicDraftRes.ok).toBe(true);
    if (!publicDraftRes.ok) return;
    const pubSubjectId = publicDraftRes.data.subject.id;

    const catalogWhileDraft = await listPublicLibraryCatalogUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
    });
    expect(catalogWhileDraft.ok).toBe(true);
    if (catalogWhileDraft.ok) {
      expect(catalogWhileDraft.data.some((s) => s.id === pubSubjectId)).toBe(
        false
      );
    }

    // Admin agrega 1 tema y 1 pregunta publicada y aprueba la publicación en `/library`
    const pubTopicRes = await createTopicUseCase(store, store, adminActor, {
      subjectId: pubSubjectId,
      title: "1. Farmacocinética General",
      sortOrder: 1,
    });
    expect(pubTopicRes.ok).toBe(true);
    if (!pubTopicRes.ok) return;

    const pubQuestionRes = await createQuestionUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      questionsRepo: store,
      actor: adminActor,
      input: {
        topicId: pubTopicRes.data.id,
        type: "true_false",
        prompt:
          "La biodisponibilidad por vía intravenosa es del 100% por definición.",
        explanation:
          "Al administrarse directamente en el torrente vascular no existe fase de absorción ni primer paso hepático.",
        difficulty: "easy",
        status: "published",
        options: [
          { text: "Verdadero", isCorrect: true },
          { text: "Falso", isCorrect: false },
        ],
      },
    });
    expect(pubQuestionRes.ok).toBe(true);
    if (!pubQuestionRes.ok) return;

    // Agregar una pregunta en borrador en la materia pública para comprobar que el catálogo solo expone preguntas publicadas
    const pubDraftQuestionRes = await createQuestionUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      docsRepo: store,
      questionsRepo: store,
      actor: adminActor,
      input: {
        topicId: pubTopicRes.data.id,
        type: "single_choice",
        prompt: "Pregunta pública aún en borrador",
        explanation: "",
        difficulty: "medium",
        status: "draft",
        options: [
          { text: "Opción 1", isCorrect: true },
          { text: "Opción 2", isCorrect: false },
        ],
      },
    });
    expect(pubDraftQuestionRes.ok).toBe(true);

    const publishPublicRes = await publishPublicContentUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      adminRepo: store,
      actor: adminActor,
      subjectId: pubSubjectId,
      notes: "Aprobada e incorporada al catálogo oficial v1.0.0",
    });
    expect(publishPublicRes.ok).toBe(true);

    // Criterio #12: Ahora aparece en `/library` y solo expone la pregunta `published`
    const catalogAfterPublish = await listPublicLibraryCatalogUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
    });
    expect(catalogAfterPublish.ok).toBe(true);
    if (catalogAfterPublish.ok) {
      const found = catalogAfterPublish.data.find((s) => s.id === pubSubjectId);
      expect(found).toBeDefined();
      expect(found?.questionsCount).toBe(1);
    }

    // Usuario B practica sobre la materia pública y su intento/XP queda en su cuenta privada
    const quizPublicByB = await startQuizUseCase({
      subjectsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      actor: userB,
      input: {
        subjectId: pubSubjectId,
        mode: "practice",
        questionCount: 5,
      },
    });
    expect(quizPublicByB.ok).toBe(true);
    if (!quizPublicByB.ok) return;
    expect(quizPublicByB.data.questions).toHaveLength(1);

    const ansPublicByB = await submitAnswerUseCase({
      questionsRepo: store,
      quizzesRepo: store,
      progressRepo: store,
      actor: userB,
      activityDate: "2026-11-11",
      input: {
        sessionId: quizPublicByB.data.session.id,
        questionId: pubQuestionRes.data.id,
        selectedOptionIds: [
          pubQuestionRes.data.options.find((o) => o.isCorrect)!.id,
        ],
      },
    });
    expect(ansPublicByB.ok && ansPublicByB.data.evaluation.isCorrect).toBe(
      true
    );

    await completeQuizUseCase({
      quizzesRepo: store,
      progressRepo: store,
      actor: userB,
      sessionId: quizPublicByB.data.session.id,
      activityDate: "2026-11-11",
    });

    // También verificamos cambio de estado de pregunta por su propietario (`changeQuestionStatusUseCase`)
    const archiveQRes = await changeQuestionStatusUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      actor: userA,
      questionId: qExtra5Res.data.id,
      status: "archived",
    });
    expect(archiveQRes.ok && archiveQRes.data.status).toBe("archived");

    // Admin archiva la materia pública -> deja de aparecer en `/library` pero preserva la bitácora y el progreso de Usuario B
    const archivePublicRes = await moderatePublicSubjectUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      adminRepo: store,
      actor: adminActor,
      input: {
        subjectId: pubSubjectId,
        targetStatus: "archived",
        notes: "Retirada por actualización curricular",
      },
    });
    expect(archivePublicRes.ok).toBe(true);

    const adminSummary = await getAdminDashboardSummaryUseCase({
      adminRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      actor: adminActor,
    });
    expect(adminSummary.ok).toBe(true);
    if (adminSummary.ok) {
      expect(adminSummary.data.archivedCount).toBe(1);
      expect(adminSummary.data.recentAuditLogs.length).toBeGreaterThanOrEqual(
        3
      );
    }

    const progressBAfterArchive = await getUserProgressUseCase({
      subjectsRepo: store,
      topicsRepo: store,
      questionsRepo: store,
      quizzesRepo: store,
      progressRepo: store,
      actor: userB,
      referenceDate: "2026-11-11",
    });
    expect(progressBAfterArchive.ok).toBe(true);
    if (progressBAfterArchive.ok) {
      expect(progressBAfterArchive.data.totalAttemptsCount).toBe(1);
      expect(progressBAfterArchive.data.levelProgress.totalXp).toBe(30); // +10 acierto + 20 cierre
    }
  });
});
