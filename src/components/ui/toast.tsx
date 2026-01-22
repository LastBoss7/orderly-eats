import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TOAST_DURATION = 3000; // 3 seconds

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-4 right-4 z-[100] flex max-h-screen w-full flex-col gap-3 md:max-w-[420px]",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border-0 p-4 pr-10 shadow-2xl transition-all duration-300 ease-out backdrop-blur-sm data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-right-full data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-right-full",
  {
    variants: {
      variant: {
        default: "default-toast bg-card/95 text-foreground shadow-lg ring-1 ring-border/50",
        success: "success bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/25",
        destructive: "destructive bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-rose-500/25",
        warning: "warning bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-amber-500/25",
        info: "info bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-blue-500/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const toastIconMap = {
  default: Sparkles,
  success: CheckCircle2,
  destructive: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

// Progress bar component that animates from 100% to 0%
const ToastProgressBar = React.forwardRef<
  HTMLDivElement,
  { variant?: "default" | "success" | "destructive" | "warning" | "info" }
>(({ variant = "default" }, ref) => {
  const progressColors = {
    default: "bg-primary/60",
    success: "bg-white/40",
    destructive: "bg-white/40",
    warning: "bg-white/40",
    info: "bg-white/40",
  };

  return (
    <div
      ref={ref}
      className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-xl"
    >
      <div className="absolute inset-0 bg-black/10" />
      <div
        className={cn(
          "h-full origin-left animate-[shrink-width_3s_linear_forwards]",
          progressColors[variant]
        )}
        style={{
          animation: `shrink-width ${TOAST_DURATION}ms linear forwards`,
        }}
      />
    </div>
  );
});
ToastProgressBar.displayName = "ToastProgressBar";

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant = "default", children, ...props }, ref) => {
  const Icon = variant ? toastIconMap[variant] : null;
  
  return (
    <ToastPrimitives.Root 
      ref={ref} 
      className={cn(toastVariants({ variant }), className)} 
      {...props}
    >
      {/* Decorative glow effect */}
      <div className="absolute inset-0 -z-10 opacity-50 blur-xl">
        <div className={cn(
          "h-full w-full rounded-xl",
          variant === "success" && "bg-emerald-500",
          variant === "destructive" && "bg-rose-500",
          variant === "warning" && "bg-amber-500",
          variant === "info" && "bg-blue-500",
        )} />
      </div>

      {/* Icon with pulse animation for colored variants */}
      {Icon && (
        <div className={cn(
          "flex-shrink-0 mt-0.5",
          variant !== "default" && "animate-[pulse_2s_ease-in-out_1]"
        )}>
          <div className={cn(
            "rounded-full p-1.5",
            variant === "default" && "bg-primary/10",
            variant !== "default" && "bg-white/20"
          )}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      )}
      
      <div className="flex-1 min-w-0 space-y-1">
        {children}
      </div>

      {/* Progress bar */}
      <ToastProgressBar variant={variant} />
    </ToastPrimitives.Root>
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-lg border bg-transparent px-3 text-sm font-medium ring-offset-background transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "group-[.default-toast]:border-border group-[.default-toast]:hover:bg-muted",
      "group-[.success]:border-white/30 group-[.success]:hover:bg-white/20",
      "group-[.destructive]:border-white/30 group-[.destructive]:hover:bg-white/20",
      "group-[.warning]:border-white/30 group-[.warning]:hover:bg-white/20",
      "group-[.info]:border-white/30 group-[.info]:hover:bg-white/20",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-3 rounded-full p-1.5 opacity-70 transition-all duration-200 hover:opacity-100 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring",
      "group-[.default-toast]:text-muted-foreground group-[.default-toast]:hover:bg-muted group-[.default-toast]:hover:text-foreground",
      "group-[.success]:text-white/80 group-[.success]:hover:bg-white/20 group-[.success]:hover:text-white",
      "group-[.destructive]:text-white/80 group-[.destructive]:hover:bg-white/20 group-[.destructive]:hover:text-white",
      "group-[.warning]:text-white/80 group-[.warning]:hover:bg-white/20 group-[.warning]:hover:text-white",
      "group-[.info]:text-white/80 group-[.info]:hover:bg-white/20 group-[.info]:hover:text-white",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title 
    ref={ref} 
    className={cn(
      "text-sm font-semibold leading-tight tracking-tight",
      className
    )} 
    {...props} 
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description 
    ref={ref} 
    className={cn(
      "text-sm opacity-90 leading-relaxed",
      "group-[.default-toast]:text-muted-foreground",
      className
    )} 
    {...props} 
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
