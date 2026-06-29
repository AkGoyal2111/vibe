import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading UI for the playground/editor. Renders a placeholder that
 * mirrors the editor layout (file sidebar + editor + preview) while the
 * playground data and template load.
 */
export default function PlaygroundLoading() {
  return (
    <div className="flex h-screen w-full">
      {/* File explorer sidebar */}
      <div className="hidden md:flex w-60 flex-col gap-2 border-r p-3">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>

      {/* Editor + preview area */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b p-3">
          <Skeleton className="h-6 w-40" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>

        <div className="flex flex-1">
          {/* Editor */}
          <div className="flex-1 space-y-3 p-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-4"
                style={{ width: `${40 + ((i * 13) % 55)}%` }}
              />
            ))}
          </div>
          {/* Preview */}
          <div className="hidden lg:flex w-1/2 items-center justify-center border-l">
            <Skeleton className="h-3/4 w-5/6 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
