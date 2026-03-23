interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded bg-white/[0.06] ${className}`} />
}

export function WorkoutCardSkeleton() {
  return (
    <div className="card space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="card space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-8 w-12" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="px-4 py-6 pb-28 space-y-5">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-48" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Goal card */}
      <Skeleton className="h-16 w-full rounded-2xl" />

      {/* CTA buttons */}
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />

      {/* Recent workouts */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function HistorySkeleton() {
  return (
    <div className="px-4 py-6 pb-28 space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-36" />
      </div>

      {/* Search bar */}
      <Skeleton className="h-12 w-full rounded-2xl" />

      {/* Workout cards */}
      <div className="space-y-3">
        <WorkoutCardSkeleton />
        <WorkoutCardSkeleton />
        <WorkoutCardSkeleton />
        <WorkoutCardSkeleton />
        <WorkoutCardSkeleton />
      </div>
    </div>
  )
}
