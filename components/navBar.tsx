"use client"

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Hexagon } from "lucide-react";
import { getCurrentUserClient, getCurrentUserProfileClient } from "@/utils/supabase/services/clientServices";
import { User } from "@supabase/supabase-js";
import { Profile } from "@/utils/types";

export const NavBar: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = await getCurrentUserClient();
        setUser(currentUser);
        
        if (currentUser) {
          const userProfile = await getCurrentUserProfileClient();
          setProfile(userProfile);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className="sticky top-0 z-10 w-full max-w-4xl h-[60px] mx-auto px-8 bg-white/40 backdrop-blur-sm flex items-center justify-between">
      <Link href="/dashboard" className="text-lg font-bold">정코치 면접 솔루션</Link>
      
      {!loading && user && profile && (
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium text-gray-700">
            {profile.name}님
          </span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Hexagon className="w-6 h-6 text-blue-600" />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-600">
                J
              </span>
            </div>
            <span className="text-sm text-gray-600">1,000</span>
          </div>
        </div>
      )}
    </div>
  );
}; 