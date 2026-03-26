"use client";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { logout, setToken } from "@/lib/store/slices/auth-slice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks/useRedux";
import { verifyWebToken } from "@/lib/apis/machine";
import { useReactNativeBridge } from "./reactNativeBridgeProvider";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isReady, data, sendToReactNative } = useReactNativeBridge();
  const [error, setError] = useState<string | null>(null);
  // const webToken = searchParams.get("token");
  const webToken = data?.token;

  // const webToken =
  //   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzJiYjFlMzgzYTNhMjA0OGFhMWFhZTYiLCJpYXQiOjE3NjY0ODQ2NzksImV4cCI6MTc2NjQ5MTg3OX0.eyslPHocf8SyNYt-A99-VX_5e-nRrnbNoWbzzvWnJng";

  const { token, isVerified } = useAppSelector((state) => state.auth);
  const [isChecking, setIsChecking] = useState(false);

  const IGNORED_ROUTES = ["/not-found", "/something-else"];

  useEffect(() => {
    const verifyToken = async () => {
      // if (!webToken && isReady) {
      //   router.replace("/not-found");
      //   return;
      // }
      if (IGNORED_ROUTES.includes(pathname)) return;

      // if (isVerified || token || !webToken) return;
      if (!webToken) return;

      setIsChecking(true);
      try {
        const responseData = await verifyWebToken(webToken);

        if (responseData.success) {
          dispatch(setToken(responseData.token));
        } else {
          setError(responseData?.message ?? "Something went wrong");
        }
      } catch (err: any) {
        setError(err?.message ? err.message : "Something went wrong");
        dispatch(logout());
      } finally {
        setIsChecking(false);
      }
    };

    dispatch(logout());
    verifyToken();
  }, [webToken, dispatch]);

  if (isChecking || !isReady)
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-blue-950 font-semibold">Loading...</p>
      </div>
    );

  // If after checking, still no token → do not render
  if (isReady && !token) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-blue-950 font-semibold">"Access denied"</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-blue-950 font-semibold">{error}</p>
      </div>
    );
  }

  return <>{children}</>;
}
