import { Skeleton } from '@/components/ui/skeleton';

export default function MainSegmentLoading() {
  return (
    <div className="p-6 space-y-4">
      {/* Encabezado */}
      <Skeleton className="h-8 w-48" />
      {/* Bloques principales */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Skeleton key={idx} className="h-40 w-full" />
        ))}
      </div>
    </div>
  );
} 