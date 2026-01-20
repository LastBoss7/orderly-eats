import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface PremiumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PremiumDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  className,
}: PremiumDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-[500px] p-0 gap-0 overflow-hidden border-0 shadow-2xl",
        className
      )}>
        {/* Premium Header with gradient */}
        <div className="relative bg-gradient-to-br from-primary via-primary to-accent p-6 pb-8">
          {/* Decorative background elements */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              {icon ? (
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-lg">
                  {icon}
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-lg">
                  <Sparkles className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1">
                <DialogTitle className="text-xl font-bold text-white">
                  {title}
                </DialogTitle>
                {description && (
                  <DialogDescription className="text-white/80 mt-1">
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>
          
          {/* Curved bottom edge */}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-background rounded-t-3xl" />
        </div>

        {/* Content area */}
        <div className="px-6 pb-6 -mt-2">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PremiumFormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "highlighted";
}

export function PremiumFormSection({
  title,
  description,
  children,
  className,
  variant = "default",
}: PremiumFormSectionProps) {
  return (
    <div className={cn(
      "space-y-3",
      variant === "highlighted" && "p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50",
      className
    )}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

interface PremiumInputGroupProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function PremiumInputGroup({
  label,
  required,
  hint,
  error,
  children,
  className,
}: PremiumInputGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium text-foreground flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

interface PremiumToggleRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function PremiumToggleRow({
  label,
  description,
  children,
  icon,
}: PremiumToggleRowProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/50 to-transparent border border-border/50 hover:border-border transition-colors">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

interface PremiumImageUploadProps {
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}

export function PremiumImageUpload({
  imageUrl,
  uploading,
  onUpload,
  onRemove,
}: PremiumImageUploadProps) {
  return (
    <div className="flex items-start gap-4">
      {imageUrl ? (
        <div className="relative group">
          <img
            src={imageUrl}
            alt="Imagem do produto"
            className="w-28 h-28 object-cover rounded-xl border-2 border-border shadow-lg"
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      ) : (
        <div className="w-28 h-28 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center bg-muted/30 text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          <span className="text-xs mt-1">Sem foto</span>
        </div>
      )}
      <div className="flex-1 space-y-2">
        <label className="cursor-pointer inline-block">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
            disabled={uploading}
          />
          <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors">
            {uploading ? (
              <>
                <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><line x1="16" x2="22" y1="5" y2="5"/><line x1="19" x2="19" y1="2" y2="8"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                <span>Enviar foto</span>
              </>
            )}
          </div>
        </label>
        <p className="text-xs text-muted-foreground">
          JPG, PNG ou WebP. Máximo 4MB.
        </p>
      </div>
    </div>
  );
}
