"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../AuthContext";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          minHeight: "100dvh",
          background: "#050505",
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          minHeight: "100dvh",
          background: "#050505",
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  return <>{children}</>;
}
