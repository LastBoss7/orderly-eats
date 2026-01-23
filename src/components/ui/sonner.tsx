import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      expand={false}
      richColors={false}
      closeButton
      gap={8}
      duration={3000}
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-zinc-900/95 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-white group-[.toaster]:border group-[.toaster]:border-white/10 group-[.toaster]:shadow-[0_8px_32px_rgba(0,0,0,0.25)] group-[.toaster]:rounded-xl group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:pointer-events-auto group-[.toaster]:overflow-hidden group-[.toaster]:max-w-[90vw] group-[.toaster]:w-auto",
          title: "group-[.toast]:text-sm group-[.toast]:font-medium group-[.toast]:text-white",
          description: "group-[.toast]:text-xs group-[.toast]:text-white/70",
          actionButton:
            "group-[.toast]:bg-white/10 group-[.toast]:text-white group-[.toast]:rounded-full group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs group-[.toast]:font-medium hover:group-[.toast]:bg-white/20",
          cancelButton:
            "group-[.toast]:bg-white/5 group-[.toast]:text-white/70 group-[.toast]:rounded-full group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs",
          closeButton:
            "group-[.toast]:bg-transparent group-[.toast]:text-white/50 group-[.toast]:border-none hover:group-[.toast]:text-white hover:group-[.toast]:bg-white/10 group-[.toast]:rounded-full",
          success:
            "group-[.toaster]:border-emerald-500/30 [&>svg]:text-emerald-400",
          error:
            "group-[.toaster]:border-rose-500/30 [&>svg]:text-rose-400",
          warning:
            "group-[.toaster]:border-amber-500/30 [&>svg]:text-amber-400",
          info:
            "group-[.toaster]:border-blue-500/30 [&>svg]:text-blue-400",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
