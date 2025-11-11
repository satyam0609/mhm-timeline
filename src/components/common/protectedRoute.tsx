"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

import { logout, setToken, setVerified } from "@/lib/store/slices/auth-slice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks/useRedux";
import { verifyWebToken } from "@/lib/apis/machine";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const webToken = searchParams.get("token");
  const { token, isVerified } = useAppSelector((state) => state.auth);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!webToken) {
        router.replace("/login");
        return;
      }

      // If already verified, skip rechecking
      if (isVerified) return;

      setIsChecking(true);
      try {
        const data = await verifyWebToken(webToken);

        if (data.success) {
          dispatch(setToken(data.token));
        } else {
          router.replace("/not-found");
        }
      } catch (err) {
        dispatch(logout());
        router.replace("/not-found");
      } finally {
        setIsChecking(false);
      }
    };

    verifyToken();
  }, [webToken, isVerified, router, dispatch]);

  // Optional loader
  if (isChecking)
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Verifying session...</p>
      </div>
    );

  // Redirect handled already
  if (!token || (!isVerified && !isChecking)) return null;

  return <>{children}</>;
}
