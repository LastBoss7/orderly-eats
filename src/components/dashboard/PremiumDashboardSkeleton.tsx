import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

export function PremiumDashboardSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header Skeleton */}
      <div className="bg-card/95 backdrop-blur-xl border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="w-24 h-8 rounded-full" />
          <div className="flex-1 flex justify-center">
            <Skeleton className="w-96 h-10 rounded-xl" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-48 h-9 rounded-xl" />
            <Skeleton className="w-28 h-9 rounded-xl" />
            <Skeleton className="w-9 h-9 rounded-xl" />
            <Skeleton className="w-9 h-9 rounded-xl" />
            <Skeleton className="w-9 h-9 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Stats Bar Skeleton */}
      <div className="bg-card/50 border-b px-4 py-2.5">
        <div className="flex items-center gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-xl" />
              <div>
                <Skeleton className="w-20 h-3 mb-1" />
                <Skeleton className="w-16 h-5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban Board Skeleton */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full flex gap-4">
          {[1, 2, 3, 4].map((col) => (
            <motion.div
              key={col}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: col * 0.1, duration: 0.3 }}
              className="w-80 xl:w-[340px] flex-shrink-0 flex flex-col rounded-2xl border border-border/50 overflow-hidden bg-muted/30"
            >
              {/* Column Header Skeleton */}
              <div className="h-14 bg-muted/60 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <Skeleton className="w-24 h-5" />
                </div>
                <Skeleton className="w-8 h-7 rounded-lg" />
              </div>

              {/* Cards Skeleton */}
              <div className="flex-1 p-3 space-y-3">
                {Array.from({ length: col === 2 ? 4 : col === 3 ? 2 : 3 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: (col * 0.1) + (i * 0.05) }}
                    className="bg-card rounded-xl border border-border/60 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-16 h-5 rounded-md" />
                      <Skeleton className="w-12 h-5" />
                      <Skeleton className="w-10 h-4 ml-auto" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="w-32 h-4" />
                      <Skeleton className="w-16 h-5" />
                    </div>
                    <Skeleton className="w-full h-1 rounded-full" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
