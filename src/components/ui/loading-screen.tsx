import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import logoGamako from "@/assets/logo-gamako-full.png";

interface LoadingScreenProps {
  message?: string;
  showLogo?: boolean;
  fullScreen?: boolean;
}

export function LoadingScreen({ 
  message = "Carregando...", 
  showLogo = true,
  fullScreen = true 
}: LoadingScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`flex flex-col items-center justify-center gap-6 bg-background ${
        fullScreen ? "fixed inset-0 z-50" : "w-full h-full min-h-[300px]"
      }`}
    >
      {showLogo && (
        <motion.img
          src={logoGamako}
          alt="Gamako"
          className="h-16 object-contain"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      )}
      
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <div className="relative">
          <motion.div
            className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="w-2 h-2 bg-primary rounded-full" />
          </motion.div>
        </div>
        
        <motion.p
          className="text-muted-foreground text-sm font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {message}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

// Skeleton loaders for specific content
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
          className="bg-card rounded-2xl border p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="h-6 w-24 bg-muted rounded-lg skeleton-shimmer" />
            <div className="h-6 w-16 bg-muted rounded-full skeleton-shimmer" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted rounded skeleton-shimmer" />
            <div className="h-4 w-3/4 bg-muted rounded skeleton-shimmer" />
          </div>
          <div className="h-10 w-full bg-muted rounded-xl skeleton-shimmer" />
        </motion.div>
      ))}
    </>
  );
}

export function TableSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="aspect-square bg-muted rounded-3xl skeleton-shimmer"
        />
      ))}
    </>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
          className="flex items-center gap-4 p-4 bg-card rounded-xl border"
        >
          <div className="w-12 h-12 bg-muted rounded-full skeleton-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 bg-muted rounded skeleton-shimmer" />
            <div className="h-3 w-1/3 bg-muted rounded skeleton-shimmer" />
          </div>
          <div className="h-8 w-20 bg-muted rounded-lg skeleton-shimmer" />
        </motion.div>
      ))}
    </div>
  );
}
