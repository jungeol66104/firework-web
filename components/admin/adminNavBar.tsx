"use client"

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchInterviewByIdClient } from "@/lib/supabase/services/clientServices";
import { Interview } from "@/lib/types";

export const AdminNavBar: React.FC = () => {
  const { interviewId } = useParams() as { interviewId?: string };
  const [interview, setInterview] = useState<Interview | null>(null);

  useEffect(() => {
    if (!interviewId) return;
    const fetchInterview = async () => {
      try {
        const data = await fetchInterviewByIdClient(interviewId);
        if (data) setInterview(data);
      } catch (error) {
        console.error("Error fetching interview:", error);
      }
    };
    fetchInterview();
  }, [interviewId]);

  return (
    <div className="sticky top-0 z-10 w-full max-w-4xl h-[60px] mx-auto px-8 bg-white/40 backdrop-blur-sm flex items-center justify-between">
      <Link href="/admin" className="text-lg font-bold">정코치 면접 관리 시스템</Link>
      {interviewId && (
        <div className="text-right text-zinc-700">
          <div className="text-xs">{interview?.candidate_name}</div>
          <div className="text-xs">{interviewId}</div>
        </div>
      )}
    </div>
  );
}; 