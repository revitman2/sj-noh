'use client';

import { useEffect } from "react";
import { setupPingMechanism } from "@/lib/supabase";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Supabase 핑 메커니즘 설정
  useEffect(() => {
    // 14일마다 핑 실행 (약 2주)
    const cleanupPing = setupPingMechanism(14);
    
    // 컴포넌트 언마운트 시 핑 메커니즘 정리
    return () => {
      cleanupPing();
    };
  }, []);

  return <>{children}</>;
} 