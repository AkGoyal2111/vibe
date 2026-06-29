"use client";

import { AlertTriangle, RotateCcw, MonitorX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WebContainerFallbackProps {
  /** Title shown in the card. */
  title?: string;
  /** Explanation of why the preview is unavailable. */
  message: string;
  /** Optional retry handler; when provided a "Try again" button is shown. */
  onRetry?: () => void;
  /** Use the "unsupported browser" icon instead of the generic error icon. */
  unsupported?: boolean;
}

/**
 * Friendly fallback shown when the WebContainer preview cannot run — either
 * because the browser is unsupported or because booting failed.
 */
export default function WebContainerFallback({
  title,
  message,
  onRetry,
  unsupported = false,
}: WebContainerFallbackProps) {
  const Icon = unsupported ? MonitorX : AlertTriangle;

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="max-w-md rounded-lg border bg-muted/30 p-6 text-center">
        <Icon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h2 className="mb-2 text-lg font-semibold">
          {title ?? (unsupported ? "Preview not available here" : "Preview failed to start")}
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RotateCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
