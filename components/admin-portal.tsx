"use client";

import { ClipboardList, FileQuestion, LayoutDashboard, Palette, ShieldCheck, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Overview, StudentsView } from "@/components/admin-overview";
import { EvaluationsView } from "@/components/admin-evaluations";
import {
  type AdminSection,
  emptyDashboard,
} from "@/components/admin-portal-shared";
import { AdminPortalShell } from "@/components/admin-portal-shell";
import { TeamView } from "@/components/admin-portal-team";
import { ThemeSettingsView } from "@/components/admin-theme-settings";
import { TheoryExamsView } from "@/components/admin-theory-exams";
import { apiRequest } from "@/lib/api";
import type {
  AuthUser,
  DashboardData,
  EvaluationRecord,
  ManagedUser,
  StudentRecord,
  ThemeSettings,
} from "@/lib/platform";

type AdminPortalProps = {
  user: AuthUser;
  initialSection?: AdminSection;
  dark: boolean;
  setDark: (value: boolean) => void;
  onExit: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  themeSettings: ThemeSettings;
  onThemeSaved: (settings: ThemeSettings) => void;
};

export function AdminPortal({
  user,
  initialSection = "overview",
  dark,
  setDark,
  onExit,
  onLogout,
  onOpenProfile,
  themeSettings,
  onThemeSaved,
}: AdminPortalProps) {
  const [section, setSection] = useState<AdminSection>(initialSection);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [evaluatorId, setEvaluatorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const suffix = evaluatorId
      ? `?evaluator=${encodeURIComponent(evaluatorId)}`
      : "";

    try {
      const userRequest =
        user.role === "super_admin"
          ? apiRequest<ManagedUser[]>("/api/users")
          : Promise.resolve([]);
      const [nextDashboard, nextStudents, nextEvaluations, nextUsers] =
        await Promise.all([
          apiRequest<DashboardData>(`/api/dashboard${suffix}`),
          apiRequest<StudentRecord[]>(`/api/students${suffix}`),
          apiRequest<EvaluationRecord[]>(`/api/evaluations${suffix}`),
          userRequest,
        ]);

      setDashboard(nextDashboard);
      setStudents(nextStudents);
      setEvaluations(nextEvaluations);
      setUsers(nextUsers);
    } catch (caught) {
      setLoadError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar a administração.",
      );
    } finally {
      setLoading(false);
    }
  }, [evaluatorId, user.role]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const navigation = useMemo(
    () => [
      { id: "overview" as const, label: "Resumo", icon: <LayoutDashboard size={19} /> },
      { id: "evaluations" as const, label: "Notas", icon: <ClipboardList size={19} /> },
      { id: "students" as const, label: "Alunos", icon: <Users size={19} /> },
      ...(user.role === "super_admin"
        ? [
            { id: "theory" as const, label: "Provas", icon: <FileQuestion size={19} /> },
            { id: "team" as const, label: "Equipe", icon: <ShieldCheck size={19} /> },
            { id: "appearance" as const, label: "Cores", icon: <Palette size={19} /> },
          ]
        : []),
    ],
    [user.role],
  );

  const chooseSection = (next: AdminSection) => {
    setSection(next);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return (
    <AdminPortalShell
      user={user}
      dark={dark}
      setDark={setDark}
      onExit={onExit}
      onLogout={onLogout}
      onOpenProfile={onOpenProfile}
      section={section}
      mobileMenu={mobileMenu}
      setMobileMenu={setMobileMenu}
      navigation={navigation}
      chooseSection={chooseSection}
      loadError={loadError}
      loadData={() => void loadData()}
    >
      {!loadError && (
        <>
          {section === "overview" && (
            <Overview
              data={dashboard}
              loading={loading}
              user={user}
              users={users}
              evaluatorId={evaluatorId}
              setEvaluatorId={setEvaluatorId}
            />
          )}
          {section === "students" && (
            <StudentsView
              students={students}
              loading={loading}
              user={user}
              users={users}
              evaluatorId={evaluatorId}
              setEvaluatorId={setEvaluatorId}
              reload={loadData}
            />
          )}
          {section === "evaluations" && (
            <EvaluationsView
              evaluations={evaluations}
              loading={loading}
              reload={loadData}
            />
          )}
          {section === "team" && user.role === "super_admin" && (
            <TeamView
              users={users}
              loading={loading}
              currentUser={user}
              reload={loadData}
            />
          )}
          {section === "theory" && user.role === "super_admin" && (
            <TheoryExamsView />
          )}
          {section === "appearance" && user.role === "super_admin" && (
            <ThemeSettingsView settings={themeSettings} onSaved={onThemeSaved} />
          )}
        </>
      )}
    </AdminPortalShell>
  );
}
