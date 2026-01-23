import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const TOAST_DURATION = 3000;

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex max-h-screen w-full flex-col items-center gap-3 pointer-events-none md:max-w-[400px]",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-auto min-w-[280px] max-w-[380px] items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-full data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-8",
  {
    variants: {
      variant: {
        default: "bg-zinc-900/95 backdrop-blur-xl text-white border border-white/10",
        success: "bg-zinc-900/95 backdrop-blur-xl text-white border border-emerald-500/20",
        destructive: "bg-zinc-900/95 backdrop-blur-xl text-white border border-rose-500/20",
        warning: "bg-zinc-900/95 backdrop-blur-xl text-white border border-amber-500/20",
        info: "bg-zinc-900/95 backdrop-blur-xl text-white border border-blue-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const toastIconConfig = {
  default: { icon: Info, bg: "bg-white/10", color: "text-white" },
  success: { icon: CheckCircle2, bg: "bg-emerald-500/20", color: "text-emerald-400" },
  destructive: { icon: AlertCircle, bg: "bg-rose-500/20", color: "text-rose-400" },
  warning: { icon: AlertTriangle, bg: "bg-amber-500/20", color: "text-amber-400" },
  info: { icon: Info, bg: "bg-blue-500/20", color: "text-blue-400" },
};

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant = "default", children, ...props }, ref) => {
  const config = variant ? toastIconConfig[variant] : toastIconConfig.default;
  const Icon = config.icon;
  
  return (
    <ToastPrimitives.Root 
      ref={ref} 
      className={cn(toastVariants({ variant }), className)} 
      {...props}
    >
      {/* Icon with colored background */}
      <div className={cn(
        "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full",
        config.bg
      )}>
        <Icon className={cn("h-4 w-4", config.color)} strokeWidth={2.5} />
      </div>
      
      <div className="flex-1 min-w-0">
        {children}
      </div>

      {/* Subtle accent line */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-[2px] opacity-60",
        variant === "success" && "bg-gradient-to-r from-transparent via-emerald-500 to-transparent",
        variant === "destructive" && "bg-gradient-to-r from-transparent via-rose-500 to-transparent",
        variant === "warning" && "bg-gradient-to-r from-transparent via-amber-500 to-transparent",
        variant === "info" && "bg-gradient-to-r from-transparent via-blue-500 to-transparent",
        variant === "default" && "bg-gradient-to-r from-transparent via-white/20 to-transparent",
      )} />
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
      "inline-flex h-7 shrink-0 items-center justify-center rounded-full bg-white/10 px-3 text-xs font-medium text-white transition-all duration-200 hover:bg-white/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/20",
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
      "flex-shrink-0 rounded-full p-1.5 text-white/50 transition-all duration-200 hover:text-white hover:bg-white/10 active:scale-95 focus:outline-none",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-3.5 w-3.5" />
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
      "text-sm font-medium text-white leading-tight",
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
      "text-sm text-white/70 leading-relaxed",
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
