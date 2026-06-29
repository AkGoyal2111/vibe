"use client";

import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /**
   * Custom fallback. Receives the error and a reset callback so callers can
   * render their own recovery UI. If omitted, a default card is shown.
   */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** Optional label shown in the default fallback (e.g. "the editor"). */
  label?: string;
  /** Invoked when an error is caught — useful for logging/telemetry. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Generic React error boundary. Wrap any subtree that can throw during render
 * (e.g. the WebContainer preview, the editor) so a single failure does not blank
 * out the whole application.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info);
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <h2 className="mb-1 text-lg font-semibold">
            Something went wrong{this.props.label ? ` in ${this.props.label}` : ""}
          </h2>
          <p className="mb-4 break-words text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred."}
          </p>
          <Button onClick={this.reset} variant="outline" size="sm">
            <RotateCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    );
  }
}
