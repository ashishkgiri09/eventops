"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { useAppStore } from "@/store";
import { usePathname, useRouter } from "next/navigation";

import { checkRouteAccess } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { sessionService } from "@/lib/auth/session";
import { authApi } from "@/lib/api/auth";
import { organizationsApi } from "@/lib/api/organizations";
import { eventsApi } from "@/lib/api/events";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobileSidebarOpen, setMobileSidebarOpen, theme, currentRole, setWorkspaceCategory, setCurrentUser, setWorkspaceData, setCurrentOrganization, setCurrentEvent } = useAppStore();
  const [sessionReady, setSessionReady] = useState(false);

  // If on public auth/onboarding pages, render simple container without main ops shell
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify-otp") ||
    /^\/events\/[^/]+\/register$/.test(pathname) ||
    pathname === "/student/portal" ||
    pathname === "/student/login";

  useEffect(() => {
    let active = true;
    const frame = requestAnimationFrame(() => {
      if (isAuthPage) {
        setSessionReady(true);
        return;
      }
      if (!sessionService.hasActiveSession()) {
        router.replace("/login");
        return;
      }
      const storedWorkspace = sessionService.getStoredWorkspace();
      if (storedWorkspace?.category) setWorkspaceCategory(storedWorkspace.category);
      Promise.all([authApi.getMe(), organizationsApi.getAll(), eventsApi.getAll()])
        .then(([user, organizations, events]) => {
          if (!active) return;
          setCurrentUser(user);
          setWorkspaceData(organizations, events);
          // Restore a valid event context after reload. Older sessions may have
          // stored an organization but no event (or an event ID from demo data).
          const selectedEvent = events.find((item) => item.id === storedWorkspace?.eventId)
            || events.find((item) => item.organizationId === storedWorkspace?.orgId)
            || events[0];
          const organizationId = selectedEvent?.organizationId || storedWorkspace?.orgId;
          const organization = organizations.find((item) => item.id === organizationId);
          if (organization) setCurrentOrganization(organization);
          if (selectedEvent) setCurrentEvent(selectedEvent);
        })
        .catch((error: unknown) => {
          if (error instanceof Error && "status" in error && error.status === 401) {
            sessionService.clearSession();
            router.replace("/login");
          }
        })
        .finally(() => { if (active) setSessionReady(true); });
    });
    return () => { active = false; cancelAnimationFrame(frame); };
  }, [isAuthPage, pathname, router, setWorkspaceCategory, setCurrentUser, setWorkspaceData, setCurrentOrganization, setCurrentEvent]);

  useEffect(() => {
    // Ensure dark class is synchronized on html
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  if (isAuthPage) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        {children}
      </main>
    );
  }

  if (!sessionReady) {
    return <main className="min-h-screen bg-slate-950 text-slate-300 grid place-items-center text-sm">Loading your EVENTOPS workspace…</main>;
  }

  // Check RBAC permissions for current route
  const accessCheck = checkRouteAccess(currentRole, pathname);

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full bg-slate-950 shadow-2xl">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Topbar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {accessCheck.authorized ? (
            children
          ) : (
            <AccessDenied attemptedPath={pathname} allowedRoles={accessCheck.allowedRoles} />
          )}
        </main>
      </div>

      {/* Global Quick Command Palette (Cmd+K) */}
      <CommandPalette />
    </div>
  );
};
