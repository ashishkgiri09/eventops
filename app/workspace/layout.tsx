import type { ReactNode } from "react";

// Workspace selection is protected by AppShell during session hydration.
export const instant = false;

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return children;
}
