export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-atlas-border rounded ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-atlas-card border border-atlas-border rounded-xl px-[18px] py-4">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-7 w-16" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-atlas-card border border-atlas-border rounded-[14px]">
      <div className="px-5 py-4 border-b border-atlas-border">
        <Skeleton className="h-4 w-28" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-5 py-3 border-t border-atlas-border flex gap-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-6">
      <div>
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <TableSkeleton />
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-7 pt-5 pb-4 border-b border-atlas-border">
        <Skeleton className="h-5 w-24 mb-2" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="flex-1 px-7 py-5 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`flex gap-2.5 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
            <Skeleton className="w-[30px] h-[30px] rounded-full shrink-0" />
            <Skeleton className="h-16 w-[60%] rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
