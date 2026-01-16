import { motion } from "framer-motion";

interface OrderCardSkeletonProps {
  count?: number;
  variant?: "pending" | "preparing" | "ready";
}

const borderColors = {
  pending: "border-l-amber-500/50",
  preparing: "border-l-red-500/50",
  ready: "border-l-emerald-500/50",
};

export function OrderCardSkeleton({ count = 3, variant = "pending" }: OrderCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            delay: i * 0.08, 
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          className={`bg-card rounded-lg border shadow-sm overflow-hidden border-l-[3px] ${borderColors[variant]}`}
        >
          <div className="p-3 space-y-3">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Order type icon skeleton */}
                <div className="w-6 h-6 rounded bg-muted skeleton-shimmer" />
                {/* Order number skeleton */}
                <div className="w-16 h-4 bg-muted rounded skeleton-shimmer" />
              </div>
              {/* Timer skeleton */}
              <div className="w-14 h-5 bg-muted rounded-full skeleton-shimmer" />
            </div>
            
            {/* Customer and price row */}
            <div className="flex items-center justify-between">
              <div className="w-24 h-4 bg-muted rounded skeleton-shimmer" />
              <div className="w-16 h-4 bg-muted rounded skeleton-shimmer" />
            </div>
            
            {/* Items preview */}
            <div className="space-y-1.5">
              <div className="w-full h-3 bg-muted rounded skeleton-shimmer" />
              <div className="w-3/4 h-3 bg-muted rounded skeleton-shimmer" />
            </div>
            
            {/* Action button skeleton */}
            <div className="w-full h-8 bg-muted rounded-md skeleton-shimmer" />
          </div>
        </motion.div>
      ))}
    </>
  );
}

// Full column skeleton for initial loading
export function KanbanColumnSkeleton({ 
  title, 
  variant,
  headerClass 
}: { 
  title: string; 
  variant: "pending" | "preparing" | "ready";
  headerClass: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="w-64 lg:w-72 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg overflow-hidden"
    >
      {/* Column Header */}
      <div className={`${headerClass} py-2 px-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white/90">{title}</span>
        </div>
        <div className="w-6 h-5 bg-white/20 rounded-full skeleton-shimmer" />
      </div>
      
      {/* Column Content */}
      <div className="flex-1 overflow-hidden p-2 space-y-2">
        <OrderCardSkeleton count={2} variant={variant} />
      </div>
    </motion.div>
  );
}

// Dashboard skeleton with all columns
export function DashboardSkeleton() {
  return (
    <div className="h-full flex flex-col">
      {/* Top Bar Skeleton */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-card border-b px-3 py-2"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sidebar trigger skeleton */}
          <div className="w-8 h-8 bg-muted rounded skeleton-shimmer" />
          
          {/* Store status skeleton */}
          <div className="w-24 h-7 bg-muted rounded-full skeleton-shimmer" />
          
          {/* Filter tabs skeleton */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className="w-14 h-6 bg-muted-foreground/10 rounded skeleton-shimmer"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          
          {/* Spacer */}
          <div className="flex-1" />
          
          {/* Search skeleton */}
          <div className="w-40 h-8 bg-muted rounded-lg skeleton-shimmer hidden sm:block" />
          
          {/* New order button skeleton */}
          <div className="w-20 h-8 bg-primary/20 rounded-lg skeleton-shimmer" />
          
          {/* Icon buttons skeleton */}
          <div className="flex items-center gap-1">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i} 
                className="w-8 h-8 bg-muted rounded skeleton-shimmer"
                style={{ animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
        </div>
      </motion.div>
      
      {/* Kanban Columns Skeleton */}
      <div className="flex-1 overflow-hidden p-3 flex gap-3">
        <div className="flex-1 h-full flex gap-3 overflow-x-auto">
          <KanbanColumnSkeleton 
            title="Em análise" 
            variant="pending"
            headerClass="kanban-header analysis"
          />
          <KanbanColumnSkeleton 
            title="Em produção" 
            variant="preparing"
            headerClass="kanban-header production"
          />
          <KanbanColumnSkeleton 
            title="Prontos" 
            variant="ready"
            headerClass="kanban-header ready"
          />
        </div>
      </div>
    </div>
  );
}
