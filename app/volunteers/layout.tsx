import type { ReactNode } from "react";

// The shared app shell intentionally withholds protected page content until
// session and workspace hydration finish, so this route cannot validate an
// instant navigation during that period.
export const instant = false;

export default function VolunteersLayout({ children }: { children: ReactNode }) {
  return children;
}
