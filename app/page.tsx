"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { sessionService } from "@/lib/auth/session";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(sessionService.hasActiveSession() ? "/workspace" : "/login");
  }, [router]);

  return null;
}
