import { useTranslation } from 'react-i18next';
import { Card, PageTitle, SectionTitle } from '../components/ui/primitives';
import { ClassBadge } from '../components/ui/ClassBadge';
import glossary from '../config/glossary.json';

export function GlossaryScreen() {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl">
      <PageTitle>{t('glossary.title')}</PageTitle>
      <p className="text-sm mb-6" style={{ color: 'var(--color-foreground-muted)' }}>
        Résumé de la méthode d'évaluation des terres FAO (1976), version paramétrique de Sys et al. — source : {glossary._source}.
      </p>

      <SectionTitle>{t('glossary.classes')}</SectionTitle>
      <div className="flex flex-col gap-2 mb-6">
        {Object.entries(glossary.classes).map(([code, entry]) => (
          <Card key={code} className="flex items-start gap-3">
            <ClassBadge classe={code} />
            <div>
              <p className="font-semibold m-0">{entry.label}</p>
              <p className="text-sm m-0" style={{ color: 'var(--color-foreground-muted)' }}>
                {entry.definition}
              </p>
              <p className="text-xs m-0 opacity-70">Manuel {entry.page}</p>
            </div>
          </Card>
        ))}
      </div>

      <SectionTitle>{t('glossary.categories')}</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
        {Object.entries(glossary.categories).map(([code, entry]) => (
          <Card key={code}>
            <p className="font-mono font-semibold m-0">{code} — {entry.label}</p>
            <p className="text-sm m-0" style={{ color: 'var(--color-foreground-muted)' }}>
              {entry.definition}
            </p>
          </Card>
        ))}
      </div>

      <SectionTitle>{t('glossary.indices')}</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
        {Object.entries(glossary.indices).map(([code, entry]) => (
          <Card key={code}>
            <p className="font-mono font-semibold m-0">{code} — {entry.label}</p>
            <p className="text-sm m-0" style={{ color: 'var(--color-foreground-muted)' }}>
              {entry.definition}
            </p>
            <p className="text-xs m-0 opacity-70">Manuel {entry.page}</p>
          </Card>
        ))}
      </div>

      <SectionTitle>Notation Sys (texture)</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Object.entries(glossary.textureSys)
          .filter(([code]) => code !== '_note')
          .map(([code, entry]) => (
            <Card key={code}>
              <p className="font-mono font-semibold m-0">{code}</p>
              <p className="text-xs m-0" style={{ color: 'var(--color-foreground-muted)' }}>
                {(entry as { label: string }).label}
              </p>
            </Card>
          ))}
      </div>
    </div>
  );
}
