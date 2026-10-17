"use client";

import { BookOpenCheck, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Overview, StudentsView } from "@/components/admin-overview";
import { MatricesView } from "@/components/admin-portal-matrices";
import {
  type AdminSection,
  emptyDashboard,
} from "@/components/admin-portal-shared";
import { AdminPortalShell } from "@/components/admin-portal-shell";
import { TeamView } from "@/components/admin-portal-team";
import { apiRequest } from "@/lib/api";
import type {
  AuthUser,
  DashboardData,
  ExamMatrix,
  ManagedUser,
  StudentRecord,
} from "@/lib/platform";

type AdminPortalProps = {
  user: AuthUser;
  dark: boolean;
  setDark: (value: boolean) => void;
  onExit: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
};

export function AdminPortal({
  user,
  dark,
  setDark,
  onExit,
  onLogout,
  onOpenProfile,
}: AdminPortalProps) {
  const [section, setSection] = useState<AdminSection>("overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [matrices, setMatrices] = useState<ExamMatrix[]>([]);
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
      const [nextDashboard, nextStudents, nextMatrices, nextUsers] =
        await Promise.all([
          apiRequest<DashboardData>(`/api/dashboard${suffix}`),
          apiRequest<StudentRecord[]>(`/api/students${suffix}`),
          apiRequest<ExamMatrix[]>("/api/matrices"),
          userRequest,
        ]);

      setDashboard(nextDashboard);
      setStudents(nextStudents);
      setMatrices(nextMatrices);
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
      { id: "students" as const, label: "Alunos", icon: <Users size={19} /> },
      { id: "matrices" as const, label: "Matrizes", icon: <BookOpenCheck size={19} /> },
      ...(user.role === "super_admin"
        ? [{ id: "team" as const, label: "Equipe", icon: <ShieldCheck size={19} /> }]
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
            />
          )}
          {section === "matrices" && (
            <MatricesView
              matrices={matrices}
              loading={loading}
              canManage={user.role === "super_admin"}
              reload={() => void loadData()}
            />
          )}
          {section === "team" && user.role === "super_admin" && (
            <TeamView
              users={users}
              loading={loading}
              currentUser={user}
              reload={() => void loadData()}
            />
          )}
        </>
      )}
    </AdminPortalShell>
  );
}
