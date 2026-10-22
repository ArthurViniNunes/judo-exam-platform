"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  apiRequest,
  getAuthToken,
  getCachedAuthUser,
  setAuthToken,
  setCachedAuthUser,
} from "@/lib/api";
import { AdminPortal } from "@/components/admin-portal";
import type { AdminSection } from "@/components/admin-portal-shared";
import { AuthScreen } from "@/components/auth-screen";
import { StudentAuthScreen } from "@/components/student-auth-screen";
import { StudentPortal } from "@/components/student-portal";
import {
  Brand,
  HomeView,
  KataForm,
  KataResultView,
  KataSetup,
  PublicShell,
  TechnicalForm,
  TechnicalResultView,
  TechnicalSetup,
  type PracticalResult,
  type View,
} from "@/components/exam-flow";
import { ProfileDialog } from "@/components/profile-dialog";
import type { AuthUser, EventTaskLaunch, ExamStudent, PracticalCandidate, ThemeSettings } from "@/lib/platform";
import type { EvaluationSubmission } from "@/lib/platform";
import { DEFAULT_THEME_SETTINGS } from "@/lib/theme";
import { KATAS, type KataId, type KataMode, type KataResult } from "@/lib/kata-exams";
import { PRACTICAL_BELTS, createPracticalExam, type PracticalBeltId } from "@/lib/practical-exams";
import {
  clearSyncedUserData,
  type KataDraft,
  type TechnicalDraft,
} from "@/lib/offline-evaluations";
import { useEvaluationPersistence } from "@/lib/use-evaluation-persistence";

type EntryPortal = "student" | "professional";

const initialPracticalResult: PracticalResult = {
  score: 0,
  approved: false,
  detail: "",
  categories: [],
  items: [],
};

const initialKataResult: KataResult = {
  score: 0,
  rawScore: 10,
  severeApplied: false,
  totalDeductions: 0,
  reviewedCount: 0,
  groups: [],
  errorCounts: { small: 0, medium: 0, large: 0, severe: 0 },
  items: [],
};

export default function App() {
  const [view, setView] = useState<View>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [entryReady, setEntryReady] = useState(false);
  const [entryPortal, setEntryPortal] = useState<EntryPortal>("student");
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(
    DEFAULT_THEME_SETTINGS,
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminSection, setAdminSection] = useState<AdminSection>("overview");
  const [belt, setBelt] = useState<PracticalBeltId>("gray");
  const [studentId, setStudentId] = useState("");
  const [athlete, setAthlete] = useState("");
  const [examStudents, setExamStudents] = useState<ExamStudent[]>([]);
  const [practicalCandidates, setPracticalCandidates] = useState<PracticalCandidate[]>([]);
  const [examStudentsLoading, setExamStudentsLoading] = useState(false);
  const [examStudentsError, setExamStudentsError] = useState("");
  const [result, setResult] = useState<PracticalResult>(initialPracticalResult);
  const [kataId, setKataId] = useState<KataId>("nage-no-kata");
  const [kataMode, setKataMode] = useState<KataMode>("partial");
  const [kataResult, setKataResult] = useState<KataResult>(initialKataResult);
  const [activeTechnicalDraft, setActiveTechnicalDraft] = useState<TechnicalDraft | null>(null);
  const [activeKataDraft, setActiveKataDraft] = useState<KataDraft | null>(null);
  const [lastEvaluationId, setLastEvaluationId] = useState("");
  const [lastSubmission, setLastSubmission] = useState<EvaluationSubmission | null>(null);
  const [evaluationSaveError, setEvaluationSaveError] = useState("");
  const persistence = useEvaluationPersistence(user?.id);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedAccess = params.get("acesso");
    const isProfessionalEntry =
      requestedAccess === "avaliador" ||
      (requestedAccess !== "aluno" && params.get("cadastro") === "1");
    const timer = window.setTimeout(() => {
      setEntryPortal(isProfessionalEntry ? "professional" : "student");
      setEntryReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    apiRequest<ThemeSettings>("/api/settings/theme")
      .then(setThemeSettings)
      .catch(() => setThemeSettings(DEFAULT_THEME_SETTINGS));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--theme-light-accent", themeSettings.lightAccent);
    root.style.setProperty("--theme-dark-accent", themeSettings.darkAccent);
    root.style.setProperty("--theme-dark-bg", themeSettings.darkBackground);
  }, [themeSettings]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("ajrc-theme");
    const timer = window.setTimeout(() => {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDark(savedTheme ? savedTheme === "dark" : prefersDark);
      setThemeReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadExamStudents = useCallback(async () => {
    if (!user) return;
    setExamStudentsLoading(true);
    setExamStudentsError("");
    try {
      const students = await apiRequest<ExamStudent[]>("/api/students/available");
      setExamStudents(students);
    } catch (caught) {
      setExamStudents([]);
      setExamStudentsError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar os judocas.",
      );
    } finally {
      setExamStudentsLoading(false);
    }
  }, [user]);

  const loadPracticalCandidates = useCallback(async () => {
    if (!user) return;
    setExamStudentsLoading(true);
    setExamStudentsError("");
    try {
      setPracticalCandidates(
        await apiRequest<PracticalCandidate[]>("/api/practical-candidates"),
      );
    } catch (caught) {
      setPracticalCandidates([]);
      setExamStudentsError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar os candidatos.",
      );
    } finally {
      setExamStudentsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (view !== "technical-setup" && view !== "kata-setup") return;
    const timer = window.setTimeout(
      () => void (view === "technical-setup" ? loadPracticalCandidates() : loadExamStudents()),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [loadExamStudents, loadPracticalCandidates, view]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      const timer = window.setTimeout(() => setAuthReady(true), 0);
      return () => window.clearTimeout(timer);
    }

    apiRequest<{ user: AuthUser }>("/api/auth/me")
      .then(({ user: authenticatedUser }) => {
        setCachedAuthUser(authenticatedUser);
        setUser(authenticatedUser);
        setEntryPortal(
          authenticatedUser.context === "student" ? "student" : "professional",
        );
      })
      .catch(() => {
        const cachedUser = getAuthToken()
          ? getCachedAuthUser<AuthUser>()
          : null;
        setUser(cachedUser);
      })
      .finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    if (themeReady) {
      window.localStorage.setItem("ajrc-theme", dark ? "dark" : "light");
    }
  }, [dark, themeReady]);

  useEffect(() => {
    const expire = () => {
      const cachedUser = getCachedAuthUser<AuthUser>();
      setEntryPortal(cachedUser?.context === "professional" ? "professional" : "student");
      setCachedAuthUser(null);
      setUser(null);
      setView("home");
    };
    window.addEventListener("ajrc:session-expired", expire);
    return () => window.removeEventListener("ajrc:session-expired", expire);
  }, []);

  useEffect(() => {
    if (!persistence.hasPendingData) return;
    const protectPendingData = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", protectPendingData);
    return () => window.removeEventListener("beforeunload", protectPendingData);
  }, [persistence.hasPendingData]);

  const navigate = (nextView: View) => {
    setMenuOpen(false);
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const selectEntryPortal = useCallback((portal: EntryPortal) => {
    setEntryPortal(portal);
    const url = portal === "professional"
      ? `${window.location.pathname}?acesso=avaliador`
      : window.location.pathname;
    window.history.replaceState({}, "", url);
  }, []);

  const logoutTo = (targetPortal: EntryPortal) => {
    if (
      persistence.hasPendingData &&
      !window.confirm(
        "Existem avaliações salvas somente neste aparelho. Deseja sair mesmo assim? Os dados serão mantidos para este usuário.",
      )
    ) {
      return;
    }
    if (user && !persistence.hasPendingData) {
      void clearSyncedUserData(user.id).catch(() => undefined);
    }
    void apiRequest<void>("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setAuthToken(null);
    setCachedAuthUser(null);
    setUser(null);
    selectEntryPortal(targetPortal);
    setView("home");
    setMenuOpen(false);
    setProfileOpen(false);
  };

  const logout = () => logoutTo(entryPortal);

  const queueLastSubmission = async (
    evaluation: EvaluationSubmission,
    draftId?: string,
  ) => {
    setLastEvaluationId(evaluation.id);
    setLastSubmission(evaluation);
    setEvaluationSaveError("");
    try {
      await persistence.queueEvaluation(evaluation, draftId);
    } catch (error) {
      setEvaluationSaveError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a avaliação neste aparelho.",
      );
    }
  };

  const retryLastSubmission = () => {
    if (evaluationSaveError && lastSubmission) {
      void queueLastSubmission(lastSubmission, lastEvaluationId);
      return;
    }
    void persistence.retrySync();
  };

  const saveTechnicalEvaluation = async (practicalResult: PracticalResult) => {
    if (!activeTechnicalDraft) return;
    const beltName = PRACTICAL_BELTS.find((item) => item.id === belt)?.name ?? belt;
    const evaluation: EvaluationSubmission = {
      id: activeTechnicalDraft.id,
      eventTaskId: activeTechnicalDraft.eventTaskId,
      studentId,
      beltId: belt,
      belt: beltName,
      type: "técnica" as const,
      score: practicalResult.score * 10,
      result: practicalResult.approved ? "Aprovado" : "Reexame necessário",
      detail: practicalResult.detail,
      categories: practicalResult.categories.map((category) => ({
        ...category,
        score: category.score * 10,
      })),
      items: practicalResult.items.map((item) => ({
        ...item,
        score: item.score * 10,
        parts: item.parts?.map((part) => ({
          ...part,
          score: part.score * 10,
        })),
      })),
    };

    await queueLastSubmission(evaluation, activeTechnicalDraft.id);
    setActiveTechnicalDraft(null);
  };

  const saveKataEvaluation = async (evaluationResult: KataResult) => {
    if (!activeKataDraft) return;
    const kataName = KATAS.find((item) => item.id === kataId)?.name ?? kataId;
    const severeNote = evaluationResult.severeApplied
      ? "Fator de erro grave aplicado."
      : "Sem fator de erro grave.";
    const observations = evaluationResult.notes
      ? ` Observações: ${evaluationResult.notes}`
      : "";
    const detail = `Descontos: ${evaluationResult.totalDeductions}. ${severeNote}${observations}`;
    const evaluation: EvaluationSubmission = {
      id: activeKataDraft.id,
      eventTaskId: activeKataDraft.eventTaskId,
      studentId,
      belt: kataName,
      type: "kata" as const,
      score: evaluationResult.score * 10,
      result: "Registro técnico",
      detail,
      items: evaluationResult.items.map((item) => ({
        ...item,
        score: item.score * 10,
      })),
    };

    await queueLastSubmission(evaluation, activeKataDraft.id);
    setActiveKataDraft(null);
  };

  const startTechnicalEvaluation = (
    student: PracticalCandidate & {
      eligibility: NonNullable<PracticalCandidate["eligibility"]>;
    },
  ) => {
    if (!user) return;
    const selectedBelt = student.eligibility.beltId;
    const now = new Date().toISOString();
    const draft: TechnicalDraft = {
      id: crypto.randomUUID(),
      userId: user.id,
      kind: "technical",
      studentId: student.id,
      athlete: student.name,
      beltId: selectedBelt,
      createdAt: now,
      updatedAt: now,
      data: {
        exam: createPracticalExam(selectedBelt),
        groupIndex: 0,
        standardScores: {},
        sequenceScores: {},
        notes: "",
      },
    };
    setStudentId(student.id);
    setAthlete(student.name);
    setBelt(selectedBelt);
    setActiveTechnicalDraft(draft);
    void persistence.saveDraft(draft);
    navigate("technical-form");
  };

  const resumeTechnicalEvaluation = (draft: TechnicalDraft) => {
    const candidate = practicalCandidates.find((item) => item.id === draft.studentId);
    if (!candidate?.eligibility || candidate.eligibility.beltId !== draft.beltId) {
      window.alert(
        "Este rascunho não pode ser retomado porque a elegibilidade teórica do judoca não corresponde à graduação da avaliação.",
      );
      return;
    }
    setStudentId(draft.studentId);
    setAthlete(draft.athlete);
    setBelt(draft.beltId);
    setActiveTechnicalDraft(draft);
    navigate("technical-form");
  };

  const startKataEvaluation = (
    student: ExamStudent,
    selectedKata: KataId,
    selectedMode: KataMode,
  ) => {
    if (!user) return;
    const now = new Date().toISOString();
    const draft: KataDraft = {
      id: crypto.randomUUID(),
      userId: user.id,
      kind: "kata",
      studentId: student.id,
      athlete: student.name,
      kataId: selectedKata,
      mode: selectedMode,
      createdAt: now,
      updatedAt: now,
      data: { marks: {}, notes: "" },
    };
    setStudentId(student.id);
    setAthlete(student.name);
    setKataId(selectedKata);
    setKataMode(selectedMode);
    setActiveKataDraft(draft);
    void persistence.saveDraft(draft);
    navigate("kata-form");
  };

  const startEventTask = (task: EventTaskLaunch) => {
    if (!user) return;
    const existingDraft = persistence.drafts.find((draft) => draft.eventTaskId === task.taskId);
    if (existingDraft?.kind === "technical") {
      setStudentId(existingDraft.studentId);
      setAthlete(existingDraft.athlete);
      setBelt(existingDraft.beltId);
      setActiveTechnicalDraft(existingDraft);
      navigate("technical-form");
      return;
    }
    if (existingDraft?.kind === "kata") {
      setStudentId(existingDraft.studentId);
      setAthlete(existingDraft.athlete);
      setKataId(existingDraft.kataId);
      setKataMode(existingDraft.mode);
      setActiveKataDraft(existingDraft);
      navigate("kata-form");
      return;
    }

    const now = new Date().toISOString();
    if (task.modality === "technical") {
      const selectedBelt = PRACTICAL_BELTS.find((item) => item.id === task.beltId)?.id;
      if (!selectedBelt) {
        window.alert("A graduação desta tarefa não é compatível com a avaliação técnica.");
        return;
      }
      const draft: TechnicalDraft = {
        id: crypto.randomUUID(),
        userId: user.id,
        eventId: task.eventId,
        eventTaskId: task.taskId,
        kind: "technical",
        studentId: task.studentId,
        athlete: task.studentName,
        beltId: selectedBelt,
        createdAt: now,
        updatedAt: now,
        data: { exam: createPracticalExam(selectedBelt), groupIndex: 0, standardScores: {}, sequenceScores: {}, notes: "" },
      };
      setStudentId(task.studentId);
      setAthlete(task.studentName);
      setBelt(selectedBelt);
      setActiveTechnicalDraft(draft);
      void persistence.saveDraft(draft);
      navigate("technical-form");
      return;
    }

    const kataIdForTask: KataId = task.kataType === "katame-no-kata" ? "katame-no-kata" : "nage-no-kata";
    const modeForTask: KataMode = task.kataType === "nage-no-kata-partial" ? "partial" : "complete";
    const draft: KataDraft = {
      id: crypto.randomUUID(),
      userId: user.id,
      eventId: task.eventId,
      eventTaskId: task.taskId,
      kind: "kata",
      studentId: task.studentId,
      athlete: task.studentName,
      kataId: kataIdForTask,
      mode: modeForTask,
      createdAt: now,
      updatedAt: now,
      data: { marks: {}, notes: "" },
    };
    setStudentId(task.studentId);
    setAthlete(task.studentName);
    setKataId(kataIdForTask);
    setKataMode(modeForTask);
    setActiveKataDraft(draft);
    void persistence.saveDraft(draft);
    navigate("kata-form");
  };

  const resumeKataEvaluation = (draft: KataDraft) => {
    setStudentId(draft.studentId);
    setAthlete(draft.athlete);
    setKataId(draft.kataId);
    setKataMode(draft.mode);
    setActiveKataDraft(draft);
    navigate("kata-form");
  };

  const discardDraft = async (draft: TechnicalDraft | KataDraft) => {
    if (!window.confirm(`Descartar o rascunho da avaliação de ${draft.athlete}?`)) return;
    if (draft.eventId && draft.eventTaskId) {
      try {
        await apiRequest(`/api/exam-events/${draft.eventId}/tasks/${draft.eventTaskId}/release`, {
          method: "POST",
        });
      } catch (caught) {
        if (caught instanceof ApiError && (caught.status === 404 || caught.status === 409)) {
          await persistence.discardDraft(draft.id);
          return;
        }
        window.alert(
          caught instanceof Error
            ? caught.message
            : "Não foi possível liberar a avaliação no evento.",
        );
        return;
      }
    }
    await persistence.discardDraft(draft.id);
  };

  const authenticated = (authenticatedUser: AuthUser) => {
    setCachedAuthUser(authenticatedUser);
    setUser(authenticatedUser);
    setEntryPortal(
      authenticatedUser.context === "student" ? "student" : "professional",
    );
  };

  const updateAuthenticatedUser = (authenticatedUser: AuthUser) => {
    setCachedAuthUser(authenticatedUser);
    setUser(authenticatedUser);
  };

  if (!authReady || !entryReady) {
    return (
      <main className={`auth-screen auth-loading-screen${dark ? " dark" : ""}`}>
        <Brand />
        <div className="auth-boot-spinner" />
        <p>Preparando seu acesso…</p>
      </main>
    );
  }

  if (!user) {
    return entryPortal === "student" ? (
      <StudentAuthScreen
        dark={dark}
        setDark={setDark}
        onAuthenticated={authenticated}
        onUseProfessional={() => selectEntryPortal("professional")}
      />
    ) : (
      <AuthScreen
        dark={dark}
        setDark={setDark}
        onAuthenticated={authenticated}
        onUseStudent={() => selectEntryPortal("student")}
      />
    );
  }

  if (user.context === "student") {
    return (
      <StudentPortal
        user={user}
        dark={dark}
        setDark={setDark}
        onLogout={() => logoutTo("student")}
        onUseProfessional={() => logoutTo("professional")}
      />
    );
  }

  if (view === "admin") {
    return (
      <>
        <AdminPortal
          user={user}
          initialSection={adminSection}
          dark={dark}
          setDark={setDark}
          onExit={() => {
            setAdminSection("overview");
            navigate("home");
          }}
          onLogout={logout}
          onOpenProfile={() => setProfileOpen(true)}
          themeSettings={themeSettings}
          onThemeSaved={setThemeSettings}
          onStartEventTask={startEventTask}
        />
        {profileOpen && (
          <ProfileDialog
            user={user}
            dark={dark}
            onClose={() => setProfileOpen(false)}
            onSaved={updateAuthenticatedUser}
          />
        )}
      </>
    );
  }

  return (
    <>
      <PublicShell
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        dark={dark}
        setDark={setDark}
        navigate={navigate}
        user={user}
        onLogout={logout}
        onOpenProfile={() => setProfileOpen(true)}
        syncSummary={persistence.summary}
        storageError={persistence.storageError}
        onRetrySync={() => void persistence.retrySync()}
      >
        {view === "home" && <HomeView navigate={navigate} />}
        {view === "technical-setup" && (
          <TechnicalSetup
            onBack={() => navigate("home")}
            students={practicalCandidates}
            studentsLoading={examStudentsLoading}
            studentsError={examStudentsError}
            onRetryStudents={() => void loadPracticalCandidates()}
            onManageStudents={() => {
              setAdminSection("students");
              navigate("admin");
            }}
            drafts={persistence.drafts.filter((draft): draft is TechnicalDraft => draft.kind === "technical")}
            onResumeDraft={resumeTechnicalEvaluation}
            onDiscardDraft={discardDraft}
            onStart={startTechnicalEvaluation}
          />
        )}
        {view === "technical-form" && activeTechnicalDraft && (
          <TechnicalForm
            athlete={athlete}
            beltId={belt}
            draft={activeTechnicalDraft}
            onSaveDraft={persistence.saveDraft}
            onExit={() => navigate("home")}
            onFinish={async (practicalResult) => {
              setResult(practicalResult);
              navigate("technical-result");
              await saveTechnicalEvaluation(practicalResult);
            }}
          />
        )}
        {view === "technical-result" && (
          <TechnicalResultView
            result={result}
            athlete={athlete}
            navigate={navigate}
            saveRecord={persistence.recordFor(lastEvaluationId)}
            saveError={evaluationSaveError}
            onRetrySave={retryLastSubmission}
          />
        )}
        {view === "kata-setup" && (
          <KataSetup
            onBack={() => navigate("home")}
            students={examStudents}
            studentsLoading={examStudentsLoading}
            studentsError={examStudentsError}
            onRetryStudents={() => void loadExamStudents()}
            onManageStudents={() => {
              setAdminSection("students");
              navigate("admin");
            }}
            drafts={persistence.drafts.filter((draft): draft is KataDraft => draft.kind === "kata")}
            onResumeDraft={resumeKataEvaluation}
            onDiscardDraft={discardDraft}
            onStart={startKataEvaluation}
          />
        )}
        {view === "kata-form" && activeKataDraft && (
          <KataForm
            athlete={athlete}
            kataId={kataId}
            mode={kataMode}
            draft={activeKataDraft}
            onSaveDraft={persistence.saveDraft}
            onExit={() => navigate("home")}
            onFinish={async (evaluationResult) => {
              setKataResult(evaluationResult);
              navigate("kata-result");
              await saveKataEvaluation(evaluationResult);
            }}
          />
        )}
        {view === "kata-result" && (
          <KataResultView
            result={kataResult}
            athlete={athlete}
            kataId={kataId}
            mode={kataMode}
            navigate={navigate}
            saveRecord={persistence.recordFor(lastEvaluationId)}
            saveError={evaluationSaveError}
            onRetrySave={retryLastSubmission}
          />
        )}
      </PublicShell>
      {profileOpen && (
        <ProfileDialog
          user={user}
          dark={dark}
          onClose={() => setProfileOpen(false)}
          onSaved={updateAuthenticatedUser}
        />
      )}
    </>
  );
}
