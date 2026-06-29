import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading UI for the dashboard. Shown by Next.js while the async
 * page component fetches the user's playgrounds, so users see a structured
 * placeholder instead of a blank screen.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col justify-start items-center min-h-screen mx-auto max-w-7xl px-4 py-10">
      {/* Action cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>

      {/* Project table */}
      <div className="mt-10 w-full space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-lg border p-4"
            >
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
