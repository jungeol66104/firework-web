"use client"

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { sampleData } from "@/lib/constants";

export const NavBar: React.FC = () => {
  const { userId } = useParams() as { userId?: string };
  const user = userId ? sampleData.find((u) => u.id === userId) : null;

  return (
    <div className="sticky top-0 z-10 w-full max-w-4xl h-[60px] mx-auto px-8 bg-white/40 backdrop-blur-sm flex items-center justify-between">
      <Link href="/" className="text-lg font-bold">정코치 면접 관리 시스템</Link>
      {user && (
        <div className="text-right text-zinc-700">
          <div className="text-sm">{user.name}</div>
          <div className="text-xs">{user.id}</div>
        </div>
      )}
    </div>
  );
}; 