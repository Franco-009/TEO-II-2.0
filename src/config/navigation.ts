export interface NavItem {
  label: string;
  href: string;
  description?: string;
  badge?: string;
}

export const PUBLIC_NAV_ITEMS: NavItem[] = [
  { label: "Inicio", href: "/" },
  { label: "Catálogo Público", href: "/library" },
];

export const APP_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/app", description: "Resumen diario y acceso rápido" },
  { label: "Mis Materias", href: "/app/subjects", description: "Biblioteca privada y temas" },
  { label: "Documentos PDF", href: "/app/documents", description: "Apuntes privados (máx. 15 MB)" },
  { label: "Practicar Quiz", href: "/app/quizzes/new", description: "Modos práctica, desafío y errores" },
  { label: "Repaso de Errores", href: "/app/review", badge: "3 pendientes" },
  { label: "Mi Progreso", href: "/app/progress", description: "Precisión, racha y XP" },
  { label: "Catálogo Público", href: "/library", description: "Material compartido verificado" },
];

export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { label: "Mi Perfil", href: "/profile" },
  { label: "Administración", href: "/admin", badge: "Admin" },
];
