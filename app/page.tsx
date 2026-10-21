"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, getAuthToken, setAuthToken } from "@/lib/api";
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
import { DEFAULT_THEME_SETTINGS } from "@/lib/theme";
import { KATAS, type KataId, type KataMode, type KataResult } from "@/lib/kata-exams";
import { PRACTICAL_BELTS, type PracticalBeltId } from "@/lib/practical-exams";

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
      .then(({ user: authenticatedUser }) => setUser(authenticatedUser))
      .catch(() => setUser(null))
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

  const navigate = (nextView: View) => {
    setMenuOpen(false);
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const logout = () => {
    void apiRequest<void>("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setAuthToken(null);
    setUser(null);
    setView("home");
    setMenuOpen(false);
    setProfileOpen(false);
  };

  const saveTechnicalEvaluation = (practicalResult: PracticalResult) => {
    const beltName = PRACTICAL_BELTS.find((item) => item.id === belt)?.name ?? belt;
    const evaluation = {
      id: crypto.randomUUID(),
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

    void apiRequest("/api/evaluations", {
      method: "POST",
      body: JSON.stringify(evaluation),
    }).catch(() => undefined);
  };

  const saveKataEvaluation = (evaluationResult: KataResult) => {
    const kataName = KATAS.find((item) => item.id === kataId)?.name ?? kataId;
    const severeNote = evaluationResult.severeApplied
      ? "Fator de erro grave aplicado."
      : "Sem fator de erro grave.";
    const observations = evaluationResult.notes
      ? ` Observações: ${evaluationResult.notes}`
      : "";
    const detail = `Descontos: ${evaluationResult.totalDeductions}. ${severeNote}${observations}`;
    const evaluation = {
      id: crypto.randomUUID(),
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

    void apiRequest("/api/evaluations", {
      method: "POST",
      body: JSON.stringify(evaluation),
    }).catch(() => undefined);
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
    return <AuthScreen dark={dark} setDark={setDark} onAuthenticated={setUser} />;
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
            onSaved={setUser}
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
            onStart={(student, selectedBelt) => {
              setStudentId(student.id);
              setAthlete(student.name);
              setBelt(selectedBelt);
              navigate("technical-form");
            }}
          />
        )}
        {view === "technical-form" && (
          <TechnicalForm
            athlete={athlete}
            beltId={belt}
            onExit={() => navigate("home")}
            onFinish={(practicalResult) => {
              setResult(practicalResult);
              saveTechnicalEvaluation(practicalResult);
              navigate("technical-result");
            }}
          />
        )}
        {view === "technical-result" && (
          <TechnicalResultView result={result} athlete={athlete} navigate={navigate} />
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
            onStart={(student, selectedKata, selectedMode) => {
              setStudentId(student.id);
              setAthlete(student.name);
              setKataId(selectedKata);
              setKataMode(selectedMode);
              navigate("kata-form");
            }}
          />
        )}
        {view === "kata-form" && (
          <KataForm
            athlete={athlete}
            kataId={kataId}
            mode={kataMode}
            onExit={() => navigate("home")}
            onFinish={(evaluationResult) => {
              setKataResult(evaluationResult);
              saveKataEvaluation(evaluationResult);
              navigate("kata-result");
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
          />
        )}
      </PublicShell>
      {profileOpen && (
        <ProfileDialog
          user={user}
          dark={dark}
          onClose={() => setProfileOpen(false)}
          onSaved={setUser}
        />
      )}
    </>
  );
}
