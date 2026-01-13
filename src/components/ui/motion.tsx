import { motion, HTMLMotionProps } from "framer-motion";
import { forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Motion Card with hover effects
interface MotionCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  hoverScale?: number;
  hoverY?: number;
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ children, className, hoverScale = 1.02, hoverY = -4, ...props }, ref) => (
    <motion.div
      ref={ref}
      whileHover={{ scale: hoverScale, y: hoverY }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn("cursor-pointer", className)}
      {...props}
    >
      {children}
    </motion.div>
  )
);
MotionCard.displayName = "MotionCard";

// Motion Button with click effects
interface MotionButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  className?: string;
}

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ children, className, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  )
);
MotionButton.displayName = "MotionButton";

// Motion List Item with stagger
interface MotionListItemProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  index?: number;
}

export const MotionListItem = forwardRef<HTMLDivElement, MotionListItemProps>(
  ({ children, className, index = 0, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        delay: index * 0.05,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
MotionListItem.displayName = "MotionListItem";

// Motion Container for staggered children
interface MotionContainerProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export const MotionContainer = forwardRef<HTMLDivElement, MotionContainerProps>(
  ({ children, className, staggerDelay = 0.05, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
MotionContainer.displayName = "MotionContainer";

// Motion Fade In
interface MotionFadeProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
}

export const MotionFade = forwardRef<HTMLDivElement, MotionFadeProps>(
  ({ children, className, delay = 0, direction = "up", ...props }, ref) => {
    const directionOffset = {
      up: { y: 20 },
      down: { y: -20 },
      left: { x: 20 },
      right: { x: -20 },
      none: {},
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, ...directionOffset[direction] }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, ...directionOffset[direction] }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          delay,
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionFade.displayName = "MotionFade";

// Pulse animation for notifications
interface MotionPulseProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  isActive?: boolean;
}

export const MotionPulse = forwardRef<HTMLDivElement, MotionPulseProps>(
  ({ children, className, isActive = true, ...props }, ref) => (
    <motion.div
      ref={ref}
      animate={
        isActive
          ? {
              scale: [1, 1.05, 1],
              opacity: [1, 0.8, 1],
            }
          : {}
      }
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
MotionPulse.displayName = "MotionPulse";

// Shimmer loading effect
interface MotionShimmerProps extends HTMLMotionProps<"div"> {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const MotionShimmer = forwardRef<HTMLDivElement, MotionShimmerProps>(
  ({ className, width = "100%", height = 20, ...props }, ref) => (
    <motion.div
      ref={ref}
      animate={{
        backgroundPosition: ["200% 0", "-200% 0"],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "linear",
      }}
      className={cn(
        "rounded-md bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%]",
        className
      )}
      style={{ width, height }}
      {...props}
    />
  )
);
MotionShimmer.displayName = "MotionShimmer";
