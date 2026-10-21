"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiRequest,
  getAuthToken,
  getCachedAuthUser,
  setAuthToken,
  setCachedAuthUser,
} from "@/lib/api";
import { AdminPortal } from "@/components/admin-portal";
import type { AdminSection } from "@/components/admin-portal-shared";
import { AuthScreen } from "@/components/auth-screen";
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
  TheoryLinksView,
  type PracticalResult,
  type View,
} from "@/components/exam-flow";
import { ProfileDialog } from "@/components/profile-dialog";
import type { AuthUser, ExamStudent, ThemeSettings } from "@/lib/platform";
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

  useEffect(() => {
    if (view !== "technical-setup" && view !== "kata-setup") return;
    const timer = window.setTimeout(() => void loadExamStudents(), 0);
    return () => window.clearTimeout(timer);
  }, [loadExamStudents, view]);

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

  const logout = () => {
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
    setView("home");
    setMenuOpen(false);
    setProfileOpen(false);
  };

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
      studentId,
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
    student: ExamStudent,
    selectedBelt: PracticalBeltId,
  ) => {
    if (!user) return;
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

  const resumeKataEvaluation = (draft: KataDraft) => {
    setStudentId(draft.studentId);
    setAthlete(draft.athlete);
    setKataId(draft.kataId);
    setKataMode(draft.mode);
    setActiveKataDraft(draft);
    navigate("kata-form");
  };

  const discardDraft = (draft: TechnicalDraft | KataDraft) => {
    if (!window.confirm(`Descartar o rascunho da avaliação de ${draft.athlete}?`)) return;
    void persistence.discardDraft(draft.id);
  };

  const authenticated = (authenticatedUser: AuthUser) => {
    setCachedAuthUser(authenticatedUser);
    setUser(authenticatedUser);
  };

  const updateAuthenticatedUser = (authenticatedUser: AuthUser) => {
    setCachedAuthUser(authenticatedUser);
    setUser(authenticatedUser);
  };

  if (!authReady) {
    return (
      <main className={`auth-screen auth-loading-screen${dark ? " dark" : ""}`}>
        <Brand />
        <div className="auth-boot-spinner" />
        <p>Preparando seu acesso…</p>
      </main>
    );
  }

  if (!user) {
    return <AuthScreen dark={dark} setDark={setDark} onAuthenticated={authenticated} />;
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
        {view === "theory-links" && <TheoryLinksView onBack={() => navigate("home")} />}
        {view === "technical-setup" && (
          <TechnicalSetup
            onBack={() => navigate("home")}
            students={examStudents}
            studentsLoading={examStudentsLoading}
            studentsError={examStudentsError}
            onRetryStudents={() => void loadExamStudents()}
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
