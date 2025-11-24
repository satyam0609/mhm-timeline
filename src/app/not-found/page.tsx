"use client";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReactNativeBridge } from "@/lib/utils/useReactNativeBridge";

export default function NotFound() {
  const { sendToReactNative } = useReactNativeBridge();
  const handleRefresh = () => {
    sendToReactNative("action", null, "refresh");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-9xl font-bold text-slate-900 dark:text-slate-100">
            404
          </h1>
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold text-slate-800 dark:text-slate-200">
              Page Not Found
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Oops! The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleRefresh} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh Page
          </Button>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
