import { motion, AnimatePresence, Variants } from "framer-motion";
import { ReactNode } from "react";

interface WaiterViewTransitionProps {
  children: ReactNode;
  viewKey: string;
  direction?: "left" | "right" | "up" | "down" | "fade";
  className?: string;
}

const getVariants = (direction: string): Variants => {
  const offset = 50;
  
  switch (direction) {
    case "left":
      return {
        initial: { opacity: 0, x: -offset },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: offset },
      };
    case "right":
      return {
        initial: { opacity: 0, x: offset },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -offset },
      };
    case "up":
      return {
        initial: { opacity: 0, y: -offset },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: offset },
      };
    case "down":
      return {
        initial: { opacity: 0, y: offset },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -offset },
      };
    case "fade":
    default:
      return {
        initial: { opacity: 0, scale: 0.98 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.98 },
      };
  }
};

const transition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

export const WaiterViewTransition = ({
  children,
  viewKey,
  direction = "right",
  className = "",
}: WaiterViewTransitionProps) => {
  const variants = getVariants(direction);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        transition={transition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Animated list item for staggered animations
interface AnimatedListItemProps {
  children: ReactNode;
  index?: number;
  className?: string;
}

export const AnimatedListItem = ({
  children,
  index = 0,
  className = "",
}: AnimatedListItemProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        delay: index * 0.03,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Animated button with tap feedback
interface AnimatedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const AnimatedButton = ({
  children,
  onClick,
  className = "",
  disabled = false,
}: AnimatedButtonProps) => {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </motion.button>
  );
};

// Animated card for tables/tabs
interface AnimatedCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  index?: number;
  isSelected?: boolean;
}

export const AnimatedCard = ({
  children,
  onClick,
  className = "",
  index = 0,
  isSelected = false,
}: AnimatedCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        boxShadow: isSelected 
          ? "0 0 0 2px hsl(var(--primary))"
          : "0 4px 12px rgba(0, 0, 0, 0.1)",
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ 
        scale: 1.03, 
        y: -4,
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
      }}
      whileTap={{ scale: 0.97 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        delay: index * 0.02,
      }}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Animated modal backdrop
interface AnimatedModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  position?: "center" | "bottom";
}

export const AnimatedModal = ({
  children,
  isOpen,
  onClose,
  position = "center",
}: AnimatedModalProps) => {
  const contentVariants: Variants = position === "bottom" 
    ? {
        initial: { opacity: 0, y: 100 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 100 },
      }
    : {
        initial: { opacity: 0, scale: 0.9, y: 20 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.9, y: 20 },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 ${
            position === "bottom" ? "flex items-end justify-center" : "flex items-center justify-center p-4"
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget && onClose) onClose();
          }}
        >
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={contentVariants}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Page slide transition for full views
interface PageSlideProps {
  children: ReactNode;
  direction?: "left" | "right";
  className?: string;
}

export const PageSlide = ({
  children,
  direction = "right",
  className = "",
}: PageSlideProps) => {
  const offset = 100;
  
  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        x: direction === "right" ? offset : -offset,
      }}
      animate={{ 
        opacity: 1, 
        x: 0,
      }}
      exit={{ 
        opacity: 0, 
        x: direction === "right" ? -offset : offset,
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Staggered container for lists
interface StaggeredContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export const StaggeredContainer = ({
  children,
  className = "",
  staggerDelay = 0.03,
}: StaggeredContainerProps) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
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
    >
      {children}
    </motion.div>
  );
};

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
};
