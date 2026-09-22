import type { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border p-4 ${className}`}
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {children}
    </div>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-foreground)' }}>
      {children}
    </h1>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--color-foreground)' }}>
      {children}
    </h2>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const styles: Record<string, string> = {
    primary: 'text-white',
    secondary: '',
    ghost: 'bg-transparent',
    danger: 'text-white',
  };
  const bg =
    variant === 'primary'
      ? 'var(--color-vegetal)'
      : variant === 'danger'
        ? 'var(--degree-4)'
        : variant === 'secondary'
          ? 'var(--color-surface-raised)'
          : 'transparent';
  const border = variant === 'secondary' ? 'var(--color-border-strong)' : 'transparent';

  return (
    <button
      className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      style={{ backgroundColor: bg, borderColor: border, color: variant === 'secondary' || variant === 'ghost' ? 'var(--color-foreground)' : undefined }}
      {...props}
    />
  );
}

export function Label({ children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }} {...props}>
      {children}
    </label>
  );
}

export function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full min-h-[48px] rounded-md border px-3 py-2 text-base tabular-nums"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border-strong)', color: 'var(--color-foreground)' }}
      {...props}
    />
  );
}

export function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="w-full min-h-[48px] rounded-md border px-3 py-2 text-base"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border-strong)', color: 'var(--color-foreground)' }}
      {...props}
    />
  );
}

export function Banner({ tone, children }: { tone: 'warning' | 'info' | 'danger'; children: ReactNode }) {
  const degree = tone === 'warning' ? 2 : tone === 'danger' ? 4 : 1;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className="rounded-md border px-3 py-2 text-sm"
      style={{ color: `var(--degree-${degree})`, backgroundColor: `var(--degree-${degree}-bg)`, borderColor: `var(--degree-${degree})` }}
    >
      {children}
    </div>
  );
}

export function ScrollTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border" style={{ borderColor: 'var(--color-border)' }}>
      <table className="min-w-full text-sm border-collapse">{children}</table>
    </div>
  );
}
