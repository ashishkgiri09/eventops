import { create } from "zustand";
import { User, Organization, EventItem, UserRole, WorkspaceMode, WorkspaceCategory } from "@/types";
import { mockOrganizations, mockInvitations } from "@/lib/mock-data/organizations";
import { sessionService } from "@/lib/auth/session";

interface AppState {
  currentUser: User;
  currentRole: UserRole;
  currentOrganization: Organization;
  currentEvent: EventItem;
  theme: "dark" | "light";
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  isCommandPaletteOpen: boolean;
  activeNotificationCount: number;

  // Workspace Mode State
  workspaceMode: WorkspaceMode;
  workspaceCategory: WorkspaceCategory;
  userOrganizations: Organization[];
  userEvents: EventItem[];
  personalEvents: EventItem[];
  activePersonalEvent: EventItem | null;

  // Actions
  setCurrentUser: (user: User) => void;
  setCurrentRole: (role: UserRole) => void;
  setCurrentOrganization: (org: Organization) => void;
  setCurrentEvent: (event: EventItem) => void;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  setWorkspaceCategory: (category: WorkspaceCategory) => void;
  setWorkspaceData: (organizations: Organization[], events: EventItem[]) => void;
  selectOrganizationWorkspace: (orgId: string) => void;
  selectPersonalEventWorkspace: (eventId: string) => void;
  toggleTheme: () => void;
  setTheme: (theme: "dark" | "light") => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  decrementNotificationCount: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: {} as User,
  currentRole: "EVENT_ADMIN",
  currentOrganization: {} as Organization,
  currentEvent: {} as EventItem,
  theme: "dark",
  isSidebarCollapsed: false,
  isMobileSidebarOpen: false,
  isCommandPaletteOpen: false,
  activeNotificationCount: 0,

  // Workspace Mode State
  workspaceMode: "ORGANIZATION",
  workspaceCategory: "INSTITUTIONAL",
  userOrganizations: [],
  userEvents: [],
  personalEvents: [],
  activePersonalEvent: null,

  setCurrentUser: (user) => set({ currentUser: user, currentRole: user.role }),
  setCurrentRole: (role) => set((state) => ({ currentRole: role, currentUser: { ...state.currentUser, role } })),
  setCurrentOrganization: (org) => {
    const category: WorkspaceCategory = ["Business", "Business / Corporate", "Corporate"].includes(org.type) ? "CORPORATE" : "INSTITUTIONAL";
    sessionService.setStoredWorkspace({ orgId: org.id, mode: "ORGANIZATION", category });
    set((state) => ({
      currentOrganization: org,
      userOrganizations: state.userOrganizations.some((item) => item.id === org.id) ? state.userOrganizations : [org, ...state.userOrganizations],
      workspaceMode: "ORGANIZATION",
      workspaceCategory: category,
    }));
  },
  setCurrentEvent: (event) => {
    const organization = event.organizationId
      ? get().userOrganizations.find((item) => item.id === event.organizationId) || get().currentOrganization
      : null;
    const category: WorkspaceCategory = event.organizationId === null || event.isPersonalEvent
      ? "PERSONAL"
      : organization?.type === "Business" || organization?.type === "Business / Corporate" || ["Conference", "Corporate Event", "Career Fair"].includes(event.type)
        ? "CORPORATE"
        : "INSTITUTIONAL";
    sessionService.setStoredWorkspace({ orgId: event.organizationId || undefined, eventId: event.id, mode: category === "PERSONAL" ? "PERSONAL" : "ORGANIZATION", category });
    set((state) => ({
      userEvents: state.userEvents.some((item) => item.id === event.id) ? state.userEvents : [event, ...state.userEvents],
      ...(category === "PERSONAL"
        ? { currentEvent: event, activePersonalEvent: event, workspaceMode: "PERSONAL" as const, workspaceCategory: category }
        : { currentEvent: event, workspaceMode: "ORGANIZATION" as const, workspaceCategory: category }),
    }));
  },
  setWorkspaceMode: (mode) => set({ workspaceMode: mode }),
  setWorkspaceData: (organizations, events) => set({
    userOrganizations: organizations,
    userEvents: events,
    personalEvents: events.filter((event) => !event.organizationId || event.isPersonalEvent),
  }),
  setWorkspaceCategory: (workspaceCategory) => {
    sessionService.setStoredWorkspace({
      mode: workspaceCategory === "PERSONAL" ? "PERSONAL" : "ORGANIZATION",
      category: workspaceCategory,
    });
    set({ workspaceCategory });
  },

  selectOrganizationWorkspace: (orgId: string) => {
    const org = get().userOrganizations.find((o) => o.id === orgId);
    if (org) {
      const category: WorkspaceCategory = org.type === "Business" || org.type === "Business / Corporate" ? "CORPORATE" : "INSTITUTIONAL";
      const isCorporate = category === "CORPORATE";
      const orgEvents = get().userEvents.filter((e) => e.organizationId === org.id && (
        isCorporate
          ? ["Conference", "Corporate Event", "Career Fair"].includes(e.type)
          : !["Conference", "Corporate Event", "Career Fair"].includes(e.type)
      ));
      const targetEvent = orgEvents[0];
      sessionService.setStoredWorkspace({
        orgId: org.id,
        eventId: targetEvent?.id,
        mode: "ORGANIZATION",
        category,
      });
      set({
        currentOrganization: org,
        workspaceMode: "ORGANIZATION",
        workspaceCategory: category,
        currentEvent: targetEvent || ({} as EventItem),
      });
    }
  },

  selectPersonalEventWorkspace: (eventId: string) => {
    const event = get().personalEvents.find((e) => e.id === eventId);
    if (event) {
      sessionService.setStoredWorkspace({
        eventId: event.id,
        mode: "PERSONAL",
        category: "PERSONAL",
      });
      set({
        currentEvent: event,
        activePersonalEvent: event,
        workspaceMode: "PERSONAL",
        workspaceCategory: "PERSONAL",
        currentRole: "EVENT_ADMIN",
      });
    }
  },

  logout: () => {
    sessionService.clearSession();
    set({
      currentUser: {} as User,
      currentRole: "EVENT_ADMIN",
      currentOrganization: {} as Organization,
      currentEvent: {} as EventItem,
      workspaceMode: "ORGANIZATION",
      workspaceCategory: "INSTITUTIONAL",
      userOrganizations: [],
      userEvents: [],
      personalEvents: [],
      activePersonalEvent: null,
    });
  },

  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        if (nextTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
      return { theme: nextTheme };
    }),

  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    set({ theme });
  },

  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
  setMobileSidebarOpen: (isMobileSidebarOpen) => set({ isMobileSidebarOpen }),
  setCommandPaletteOpen: (isCommandPaletteOpen) => set({ isCommandPaletteOpen }),
  decrementNotificationCount: () =>
    set((state) => ({ activeNotificationCount: Math.max(0, state.activeNotificationCount - 1) })),
}));

