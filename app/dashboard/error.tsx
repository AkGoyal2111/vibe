"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Route error boundary for the dashboard segment. Next.js renders this when the
 * async page (e.g. fetching playgrounds) throws, instead of a blank error page.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Could not load your dashboard</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "Something went wrong while loading your projects."}
      </p>
      <Button onClick={reset} variant="outline">
        <RotateCcw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
