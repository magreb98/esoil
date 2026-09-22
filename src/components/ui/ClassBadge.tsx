import type { FinalClass, LimitationDegree, SuitabilityClass } from '../../lib/domain/types';

const DEGREE_BY_CLASS: Record<string, LimitationDegree> = {
  'S1-0': 0,
  'S1-0/1': 1,
  'S1-1': 1,
  'S1-1/S2': 2,
  S2: 2,
  'S2/S3': 3,
  S3: 3,
  'S3/N': 4,
  N1: 4,
  N2: 4,
};

const DEGREE_ICON: Record<LimitationDegree, string> = {
  0: '●',
  1: '◐',
  2: '◑',
  3: '◒',
  4: '○',
};

const CLASS_KEYS_BY_LENGTH_DESC = Object.keys(DEGREE_BY_CLASS).sort((a, b) => b.length - a.length);

/**
 * Accepte un code de classe nu (« S3 ») ou une notation complète avec sous-classe
 * (« S3c », « S3/N(c,f) », §7.4) : reconnaît le préfixe de classe le plus long.
 */
export function classDegree(classe: string): LimitationDegree {
  const match = CLASS_KEYS_BY_LENGTH_DESC.find((key) => classe.startsWith(key));
  return match ? DEGREE_BY_CLASS[match]! : 4;
}

interface ClassBadgeProps {
  classe: SuitabilityClass | FinalClass | string;
  label?: string;
  size?: 'sm' | 'md';
}

/** Badge de classe FAO : couleur sémantique + code + icône (jamais la couleur seule, §12). */
export function ClassBadge({ classe, label, size = 'md' }: ClassBadgeProps) {
  const degree = classDegree(classe);
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-mono font-semibold tabular-nums ${padding}`}
      style={{
        color: `var(--degree-${degree})`,
        backgroundColor: `var(--degree-${degree}-bg)`,
        borderColor: `var(--degree-${degree})`,
      }}
      title={label}
    >
      <span aria-hidden="true">{DEGREE_ICON[degree]}</span>
      <span>{classe}</span>
      {label && size !== 'sm' && <span className="font-sans font-normal opacity-80">— {label}</span>}
    </span>
  );
}

interface DegreeBadgeProps {
  degree: LimitationDegree;
}

const DEGREE_LABELS: Record<LimitationDegree, string> = {
  0: 'Aucune',
  1: 'Légère',
  2: 'Modérée',
  3: 'Sévère',
  4: 'Très sévère',
};

export function DegreeBadge({ degree }: DegreeBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ color: `var(--degree-${degree})`, backgroundColor: `var(--degree-${degree}-bg)` }}
    >
      <span aria-hidden="true">{DEGREE_ICON[degree]}</span>
      {degree} — {DEGREE_LABELS[degree]}
    </span>
  );
}
