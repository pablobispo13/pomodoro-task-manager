import { Skeleton } from "@/components/ui/skeleton"

export function AppLoader() {
  return (
    <div className="flex h-full">

      <div className="w-56 border-r p-4 space-y-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>

      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-10 w-40"/>
        <Skeleton className="h-64 w-full"/>
      </div>

    </div>
  )
}