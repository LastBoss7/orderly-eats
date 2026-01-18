import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

type StrengthLevel = 'empty' | 'weak' | 'medium' | 'strong';

interface StrengthResult {
  level: StrengthLevel;
  score: number;
  label: string;
  color: string;
  bgColor: string;
  icon: typeof Shield;
  tips: string[];
}

export function usePasswordStrength(password: string): StrengthResult {
  return useMemo(() => {
    if (!password) {
      return {
        level: 'empty',
        score: 0,
        label: '',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        icon: Shield,
        tips: [],
      };
    }

    let score = 0;
    const tips: string[] = [];

    // Length checks
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    // Tips based on what's missing
    if (password.length < 8) tips.push('Use pelo menos 8 caracteres');
    if (!/[A-Z]/.test(password)) tips.push('Adicione letras maiúsculas');
    if (!/[0-9]/.test(password)) tips.push('Adicione números');
    if (!/[^a-zA-Z0-9]/.test(password)) tips.push('Adicione caracteres especiais (!@#$%)');

    // Determine strength level
    let level: StrengthLevel;
    let label: string;
    let color: string;
    let bgColor: string;
    let icon: typeof Shield;

    if (score <= 2) {
      level = 'weak';
      label = 'Fraca';
      color = 'text-destructive';
      bgColor = 'bg-destructive';
      icon = ShieldAlert;
    } else if (score <= 4) {
      level = 'medium';
      label = 'Média';
      color = 'text-warning';
      bgColor = 'bg-warning';
      icon = Shield;
    } else {
      level = 'strong';
      label = 'Forte';
      color = 'text-success';
      bgColor = 'bg-success';
      icon = ShieldCheck;
    }

    return { level, score, label, color, bgColor, icon, tips };
  }, [password]);
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const strength = usePasswordStrength(password);

  if (strength.level === 'empty') return null;

  const Icon = strength.icon;
  const maxScore = 7;
  const percentage = (strength.score / maxScore) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Strength bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              strength.bgColor
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className={cn('flex items-center gap-1.5 text-sm font-medium min-w-[80px]', strength.color)}>
          <Icon className="w-4 h-4" />
          <span>{strength.label}</span>
        </div>
      </div>

      {/* Tips */}
      {strength.tips.length > 0 && strength.level !== 'strong' && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {strength.tips.slice(0, 2).map((tip, index) => (
            <p key={index} className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              {tip}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function PasswordStrengthMini({ password }: { password: string }) {
  const strength = usePasswordStrength(password);

  if (strength.level === 'empty') return null;

  return (
    <div className="flex gap-1.5 mt-2">
      {[1, 2, 3].map((bar) => (
        <div
          key={bar}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-all duration-300',
            bar === 1 && strength.score >= 1 ? strength.bgColor : 'bg-muted',
            bar === 2 && strength.score >= 3 ? strength.bgColor : bar === 2 ? 'bg-muted' : '',
            bar === 3 && strength.score >= 5 ? strength.bgColor : bar === 3 ? 'bg-muted' : ''
          )}
        />
      ))}
    </div>
  );
}
