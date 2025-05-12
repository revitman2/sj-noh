'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useEffect } from "react";
import { setupPingMechanism } from "@/lib/supabase";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Supabase 핑 메커니즘 설정
  useEffect(() => {
    // 14일마다 핑 실행 (약 2주)
    const cleanupPing = setupPingMechanism(14);
    
    // 컴포넌트 언마운트 시 핑 메커니즘 정리
    return () => {
      cleanupPing();
    };
  }, []);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
