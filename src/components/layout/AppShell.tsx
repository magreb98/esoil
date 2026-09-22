import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  projects: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
  site: 'M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  profiles: 'M4 21V4a1 1 0 0 1 1-1h10l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Zm11-18v5h5',
  soil: 'M3 20h18M5 20V9l4-3 4 3v11M13 20V13l3-2 3 2v7',
  climate: 'M8 19a4 4 0 1 1 1.2-7.8A5 5 0 0 1 19 13.5 3.5 3.5 0 0 1 15.5 17H8Z',
  evaluation: 'M9 11l2 2 4-4M4 5h16v14H4V5Z',
  potential: 'M3 17l6-6 4 4 8-8M21 7v6h-6',
  yields: 'M12 2v20M5 7l7-5 7 5M5 17l7 5 7-5',
  matrix: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
  exports: 'M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  glossary: 'M12 21c-4-2-8-4-8-9V6l8-3 8 3v6c0 5-4 7-8 9Z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  sun: 'M12 3v2m0 14v2m9-9h-2M5 12H3m14.5-6.5-1.4 1.4M6.9 17.1l-1.4 1.4m0-13 1.4 1.4m10.2 10.2 1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  moon: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z',
};

export function useNavItems(t: (key: string) => string): NavItem[] {
  return [
    { to: '/projets', label: t('nav.projects'), icon: <Icon path={ICONS.projects} /> },
    { to: '/site', label: t('nav.site'), icon: <Icon path={ICONS.site} /> },
    { to: '/profils', label: t('nav.profiles'), icon: <Icon path={ICONS.profiles} /> },
    { to: '/diagnostic-sol', label: t('nav.soilDiagnosis'), icon: <Icon path={ICONS.soil} /> },
    { to: '/diagnostic-climat', label: t('nav.climateDiagnosis'), icon: <Icon path={ICONS.climate} /> },
    { to: '/evaluation', label: t('nav.cropEvaluation'), icon: <Icon path={ICONS.evaluation} /> },
    { to: '/potentiel', label: t('nav.potential'), icon: <Icon path={ICONS.potential} /> },
    { to: '/rendements', label: t('nav.yields'), icon: <Icon path={ICONS.yields} /> },
    { to: '/matrice', label: t('nav.matrix'), icon: <Icon path={ICONS.matrix} /> },
    { to: '/exports', label: t('nav.exports'), icon: <Icon path={ICONS.exports} /> },
    { to: '/glossaire', label: t('nav.glossary'), icon: <Icon path={ICONS.glossary} /> },
  ];
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const items = useNavItems(t);
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = items.slice(0, 4);
  const rest = items.slice(4);
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);

  return (
    <div className="min-h-svh flex flex-col md:flex-row" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Sidebar desktop */}
      <aside
        className="hidden md:flex md:flex-col md:w-64 md:shrink-0 border-r px-3 py-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="px-2 mb-6 flex items-center gap-2">
          <span className="text-lg font-bold" style={{ color: 'var(--color-vegetal)' }}>
            {t('app.name')}
          </span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${isActive ? '' : 'opacity-80 hover:opacity-100'}`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--color-vegetal-soft)' : 'transparent',
                color: isActive ? 'var(--color-vegetal)' : 'var(--color-foreground)',
              })}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          className="mt-4 flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium cursor-pointer min-h-[48px]"
          style={{ color: 'var(--color-foreground)' }}
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
          <Icon path={isDark ? ICONS.sun : ICONS.moon} />
          {isDark ? t('common.lightMode') : t('common.darkMode')}
        </button>
      </aside>

      {/* Top bar mobile */}
      <header
        className="md:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <span className="text-lg font-bold" style={{ color: 'var(--color-vegetal)' }}>
          {t('app.name')}
        </span>
        <button
          type="button"
          aria-label={isDark ? t('common.lightMode') : t('common.darkMode')}
          className="p-2 min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer"
          style={{ color: 'var(--color-foreground)' }}
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
          <Icon path={isDark ? ICONS.sun : ICONS.moon} />
        </button>
      </header>

      <main className="flex-1 min-w-0 px-4 py-5 pb-24 md:pb-8 md:px-8">{children}</main>

      {/* Bottom nav mobile (≤5 items, §12/UX) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-20 flex border-t"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {primary.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[11px] font-medium"
            style={({ isActive }) => ({ color: isActive ? 'var(--color-vegetal)' : 'var(--color-foreground-muted)' })}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[11px] font-medium cursor-pointer"
          style={{ color: 'var(--color-foreground-muted)' }}
          onClick={() => setMoreOpen(true)}
          aria-haspopup="true"
          aria-expanded={moreOpen}
        >
          <Icon path={ICONS.more} />
          Plus
        </button>
      </nav>

      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex items-end" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 cursor-pointer"
            aria-label={t('common.cancel')}
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="relative w-full rounded-t-xl border-t p-3 pb-8 max-h-[70svh] overflow-y-auto"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {rest.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-3 min-h-[48px] text-sm font-medium"
                style={{ color: 'var(--color-foreground)' }}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
