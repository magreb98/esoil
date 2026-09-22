import { useId, useState } from 'react';
import glossary from '../../config/glossary.json';

type GlossarySection = 'classes' | 'categories' | 'flooding' | 'drainage' | 'textureSys' | 'indices';

interface GlossaryTermProps {
  section: GlossarySection;
  code: string;
  children?: React.ReactNode;
}

/** Code FAO avec infobulle de définition (glossaire intégré, §12). Accessible au clavier. */
export function GlossaryTerm({ section, code, children }: GlossaryTermProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const entry = (glossary[section] as Record<string, { label: string; definition: string; page?: string } | undefined>)[code];

  if (!entry) return <span className="font-mono">{children ?? code}</span>;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="font-mono underline decoration-dotted underline-offset-2 cursor-pointer"
        style={{ color: 'var(--color-vegetal)' }}
        aria-describedby={open ? tooltipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
      >
        {children ?? code}
      </button>
      {open && (
        <span
          role="tooltip"
          id={tooltipId}
          className="absolute z-20 mt-1 w-64 rounded-md border p-3 text-sm shadow-lg"
          style={{ backgroundColor: 'var(--color-surface-raised)', borderColor: 'var(--color-border-strong)', color: 'var(--color-foreground)' }}
        >
          <strong>{entry.label}</strong>
          <p className="mt-1 mb-0" style={{ color: 'var(--color-foreground-muted)' }}>
            {entry.definition}
          </p>
          {entry.page && <p className="mt-1 mb-0 text-xs opacity-70">Manuel {entry.page}</p>}
        </span>
      )}
    </span>
  );
}
