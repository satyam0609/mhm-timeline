"use client";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { logout, setToken } from "@/lib/store/slices/auth-slice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks/useRedux";
import { verifyWebToken } from "@/lib/apis/machine";
import { useReactNativeBridge } from "@/lib/utils/useReactNativeBridge";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // const webToken = searchParams.get("token");
  const webToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzJiYjFlMzgzYTNhMjA0OGFhMWFhZTYiLCJpYXQiOjE3NjY0ODQ2NzksImV4cCI6MTc2NjQ5MTg3OX0.eyslPHocf8SyNYt-A99-VX_5e-nRrnbNoWbzzvWnJng";

  const { token, isVerified } = useAppSelector((state) => state.auth);
  const [isChecking, setIsChecking] = useState(false);
  const { isReady } = useReactNativeBridge();
  const IGNORED_ROUTES = ["/not-found", "/something-else"];

  useEffect(() => {
    const verifyToken = async () => {
      if (!webToken) {
        router.replace("/not-found");
        return;
      }
      if (IGNORED_ROUTES.includes(pathname)) return;
      // ⭐ If already verified or we already have token → allow access
      if (isVerified || token) return;

      // ⭐ If NO web token and user is not verified → block access

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
  }, [webToken, router, dispatch]);

  if (isChecking || !isReady)
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );

  // If after checking, still no token → do not render
  if (!token)
    return (
      <div className="flex h-screen items-center justify-center">
        Unauthorized
      </div>
    );

  return <>{children}</>;
}
