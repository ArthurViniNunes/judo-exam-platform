import {
  Home,
  LogOut,
  Menu,
  Moon,
  Pencil,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import type { AuthUser } from "@/lib/platform";
import { initials, type AdminSection } from "./admin-portal-shared";

const LOGO =
  "https://media.base44.com/images/public/6a9b8ceb32f349c5600d2fdc/ecc432c62_41508.png/v1/fit/w_176,h_176,q_90,usm_0.66_1.00_0.01,enc_webp,quality_auto/ecc432c62_41508.webp";
type NavigationItem = { id: AdminSection; label: string; icon: ReactNode };

export function AdminPortalShell({
  user,
  dark,
  setDark,
  onExit,
  onLogout,
  onOpenProfile,
  section,
  mobileMenu,
  setMobileMenu,
  navigation,
  chooseSection,
  loadError,
  loadData,
  children,
}: {
  user: AuthUser;
  dark: boolean;
  setDark: (value: boolean) => void;
  onExit: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  section: AdminSection;
  mobileMenu: boolean;
  setMobileMenu: (value: boolean) => void;
  navigation: NavigationItem[];
  chooseSection: (next: AdminSection) => void;
  loadError: string;
  loadData: () => void;
  children: ReactNode;
}) {
  return (
    <main className={`management-shell${dark ? " dark" : ""}`}>
      <aside className={`management-sidebar${mobileMenu ? " open" : ""}`}>
        <div className="management-brand">
          <Image
            src={LOGO}
            alt="Associação Judô Rogério Cruz"
            width={58}
            height={58}
          />
          <div>
            <strong>Gestão de exames</strong>
            <span>Judô Rogério Cruz</span>
          </div>
          <button onClick={() => setMobileMenu(false)} aria-label="Fechar menu">
            <X size={19} />
          </button>
        </div>
        <nav>
          {navigation.map((item) => (
            <button
              key={item.id}
              className={section === item.id ? "active" : ""}
              onClick={() => chooseSection(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="management-sidebar-actions">
          <button onClick={onExit}>
            <Home size={18} /> Aplicar avaliação
          </button>
          <button onClick={() => setDark(!dark)}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}{" "}
            {dark ? "Tema claro" : "Tema escuro"}
          </button>
        </div>
        <div className="management-account">
          <span>{initials(user.name)}</span>
          <button className="management-profile-button" onClick={onOpenProfile}>
            <strong>{user.name}</strong>
            <small>Editar perfil</small>
          </button>
          <button onClick={onLogout} aria-label="Sair da conta">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      {mobileMenu && (
        <button
          className="management-backdrop"
          onClick={() => setMobileMenu(false)}
          aria-label="Fechar menu"
        />
      )}
      <section className="management-content">
        <header className="management-topbar">
          <button
            className="management-menu-button"
            onClick={() => setMobileMenu(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <div>
            <span>
              {user.role === "super_admin"
                ? "Super Admin"
                : "Área do avaliador"}
            </span>
            <strong>
              {navigation.find((item) => item.id === section)?.label}
            </strong>
          </div>
          <button
            className="management-user-button"
            onClick={onOpenProfile}
            aria-label="Abrir perfil"
          >
            <span>{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>Editar perfil</small>
            </div>
            <Pencil size={16} />
          </button>
        </header>
        {loadError ? (
          <div className="management-page">
            <div className="management-error-page">
              <ShieldCheck size={30} />
              <h2>Os dados não foram carregados</h2>
              <p>{loadError}</p>
              <button className="management-primary" onClick={loadData}>
                Tentar novamente
              </button>
            </div>
          </div>
        ) : (
          children
        )}
      </section>
      <nav className="management-bottom-nav" aria-label="Administração">
        {navigation.map((item) => (
          <button
            key={item.id}
            className={section === item.id ? "active" : ""}
            onClick={() => chooseSection(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
