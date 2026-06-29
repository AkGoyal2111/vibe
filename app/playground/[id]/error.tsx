"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Route error boundary for the playground segment. Catches render-time failures
 * in the editor/preview tree and offers recovery (retry or back to dashboard).
 */
export default function PlaygroundError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Playground error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">The playground hit a snag</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "Something went wrong while loading this playground."}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" />
          Try again
        </Button>
        <Button onClick={() => router.push("/dashboard")} variant="ghost">
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
