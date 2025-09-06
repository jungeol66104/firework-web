"use client"

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Hexagon, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUserClient, getCurrentUserProfileClient } from "@/lib/supabase/services/clientServices";
import { useTokens, useRefreshTokens } from "@/lib/zustand";
import { usePaymentPopup } from "@/hooks/usePaymentPopup";
import { User } from "@supabase/supabase-js";
import { Profile } from "@/lib/types";

interface NavBarProps {
  children?: React.ReactNode
}

export const NavBar: React.FC<NavBarProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Global token state
  const tokens = useTokens();
  const refreshTokens = useRefreshTokens();
  const { openPaymentPopup } = usePaymentPopup();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = await getCurrentUserClient();
        setUser(currentUser);
        
        if (currentUser) {
          const userProfile = await getCurrentUserProfileClient();
          setProfile(userProfile);
          
          // Refresh tokens using global state
          await refreshTokens();
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
    <div className="sticky top-0 z-10 w-full max-w-4xl mx-auto bg-white/40 backdrop-blur-sm">
      <div className="h-[60px] px-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-bold">
          빅토리 포뮬러
        </Link>
      
      {!loading && user && profile && (
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="sm:px-3 px-0 sm:hover:bg-gray-100 hover:bg-transparent">
            {/* Mobile: First letter with border */}
            <div className="sm:hidden w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {profile.name?.charAt(0) || 'U'}
              </span>
            </div>
            {/* Desktop: Full name */}
            <span className="hidden sm:block text-sm font-medium text-gray-700">
              {profile.name}님
            </span>
          </Button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Hexagon className="w-6 h-6 text-blue-600" />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-600">
                J
              </span>
            </div>
            <span className="text-sm text-gray-600">{tokens.toLocaleString()}</span>
          </div>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white sm:px-3 sm:py-1 sm:h-8 sm:w-auto w-8 h-8 p-0 text-sm flex items-center justify-center gap-2"
            onClick={() => {
              openPaymentPopup({
                onClose: () => refreshTokens() // Refresh global token state
              })
            }}
          >
            <CreditCard className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">충전하기</span>
          </Button>
        </div>
      )}
      </div>
      
      {/* Table of Contents for Dashboard - Mobile only */}
      {children}
    </div>
  );
}; 