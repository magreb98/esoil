import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db } from '../db/schema';
import { Banner, Button, Card, Label, PageTitle, SectionTitle, SelectField, TextField } from '../components/ui/primitives';
import { useSelection } from '../hooks/useSelection';
import { newId, nowIso } from '../lib/id';
import type { DrainageClass, FloodingClass, Horizon, SoilStructure } from '../lib/domain/types';
import { runProfileQualityChecks } from '../lib/quality/dataChecks';

function emptyHorizon(code: string, topCm: number): Horizon {
  return {
    code,
    topCm,
    bottomCm: topCm + 25,
    sandPct: 33,
    siltPct: 33,
    clayPct: 34,
    phWater: 6,
    organicCarbonPct: 1,
    exchCa: 5,
    exchMg: 2,
    exchK: 0.3,
    exchNa: 0.1,
    cec: 10,
  };
}

const DRAINAGE_OPTIONS: DrainageClass[] = ['bon', 'modere', 'imparfait', 'pauvre_aere', 'pauvre_drainable', 'pauvre_non_drainable', 'tres_pauvre'];
const FLOODING_OPTIONS: FloodingClass[] = ['F0', 'F1', 'F2', 'F3', 'F4'];
const STRUCTURE_OPTIONS: SoilStructure[] = ['granulaire', 'polyedrique', 'massive', 'vertique', 'oxique', 'particulaire'];

export function ProfilesScreen() {
  const { t } = useTranslation();
  const { siteId, profileId, setProfileId } = useSelection();
  const [newSoilUnit, setNewSoilUnit] = useState('');

  const site = useLiveQuery(() => (siteId ? db.sites.get(siteId) : undefined), [siteId]);
  const profiles = useLiveQuery(() => (siteId ? db.profiles.where('siteId').equals(siteId).toArray() : []), [siteId]) ?? [];
  const profile = useLiveQuery(() => (profileId ? db.profiles.get(profileId) : undefined), [profileId]);

  if (!siteId || !site) {
    return (
      <div className="max-w-2xl">
        <PageTitle>{t('profile.title')}</PageTitle>
        <Banner tone="info">Sélectionnez d'abord un site dans l'écran « {t('nav.site')} ».</Banner>
      </div>
    );
  }

  async function createProfile() {
    if (!newSoilUnit.trim() || !siteId) return;
    const id = newId();
    await db.profiles.add({
      id,
      siteId,
      soilUnit: newSoilUnit.trim(),
      latitude: site!.latitude,
      longitude: site!.longitude,
      slopePct: 0,
      drainageClass: 'bon',
      floodingClass: 'F0',
      effectiveDepthCm: 100,
      horizons: [emptyHorizon('H1', 0)],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    setNewSoilUnit('');
    setProfileId(id);
  }

  async function updateProfile(patch: Partial<NonNullable<typeof profile>>) {
    if (!profileId) return;
    await db.profiles.update(profileId, { ...patch, updatedAt: nowIso() } as never);
  }

  async function addHorizon() {
    if (!profile) return;
    const last = profile.horizons[profile.horizons.length - 1];
    const top = last ? last.bottomCm : 0;
    const code = `H${profile.horizons.length + 1}`;
    await updateProfile({ horizons: [...profile.horizons, emptyHorizon(code, top)] });
  }

  async function updateHorizon(index: number, patch: Partial<Horizon>) {
    if (!profile) return;
    const horizons = profile.horizons.map((h, i) => (i === index ? { ...h, ...patch } : h));
    await updateProfile({ horizons });
  }

  async function removeHorizon(index: number) {
    if (!profile) return;
    await updateProfile({ horizons: profile.horizons.filter((_, i) => i !== index) });
  }

  const issues = profile ? runProfileQualityChecks(profile, site) : [];

  return (
    <div className="max-w-5xl">
      <PageTitle>
        {t('profile.title')} — {site.name}
      </PageTitle>

      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <SelectField value={profileId ?? ''} onChange={(e) => setProfileId(e.target.value || null)}>
            <option value="">— Choisir un profil —</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.soilUnit}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <TextField placeholder={t('profile.soilUnit')} value={newSoilUnit} onChange={(e) => setNewSoilUnit(e.target.value)} />
          <Button onClick={createProfile} disabled={!newSoilUnit.trim()}>
            {t('profile.newProfile')}
          </Button>
        </div>
      </Card>

      {profile && (
        <>
          <Card className="mb-4">
            <SectionTitle>{profile.soilUnit}</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label>{t('profile.slope')}</Label>
                <TextField type="number" value={profile.slopePct} onChange={(e) => void updateProfile({ slopePct: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>{t('profile.effectiveDepth')}</Label>
                <TextField
                  type="number"
                  value={profile.effectiveDepthCm}
                  onChange={(e) => void updateProfile({ effectiveDepthCm: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>{t('profile.drainage')}</Label>
                <SelectField value={profile.drainageClass} onChange={(e) => void updateProfile({ drainageClass: e.target.value as DrainageClass })}>
                  {DRAINAGE_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div>
                <Label>{t('profile.flooding')}</Label>
                <SelectField value={profile.floodingClass} onChange={(e) => void updateProfile({ floodingClass: e.target.value as FloodingClass })}>
                  {FLOODING_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>
          </Card>

          {issues.length > 0 && (
            <div className="mb-4 flex flex-col gap-2">
              <SectionTitle>{t('profile.qualityAlerts')}</SectionTitle>
              {issues.map((issue, i) => (
                <Banner key={i} tone={issue.severity === 'erreur' ? 'danger' : 'warning'}>
                  {issue.horizonCode ? `${issue.horizonCode} — ` : ''}
                  {issue.message}
                </Banner>
              ))}
            </div>
          )}

          <SectionTitle>{t('profile.horizons')}</SectionTitle>
          <div className="flex flex-col gap-3 mb-3">
            {profile.horizons.map((h, i) => (
              <Card key={h.code}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-semibold">
                    {h.code} ({h.topCm}-{h.bottomCm}cm)
                  </span>
                  <Button variant="danger" onClick={() => void removeHorizon(i)}>
                    {t('common.delete')}
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Haut (cm)" value={h.topCm} onChange={(v) => void updateHorizon(i, { topCm: v })} />
                  <Field label="Bas (cm)" value={h.bottomCm} onChange={(v) => void updateHorizon(i, { bottomCm: v })} />
                  <Field label="Sable %" value={h.sandPct} onChange={(v) => void updateHorizon(i, { sandPct: v })} />
                  <Field label="Limon %" value={h.siltPct} onChange={(v) => void updateHorizon(i, { siltPct: v })} />
                  <Field label="Argile %" value={h.clayPct} onChange={(v) => void updateHorizon(i, { clayPct: v })} />
                  <div>
                    <Label>Structure</Label>
                    <SelectField
                      value={h.structure ?? ''}
                      onChange={(e) => void updateHorizon(i, { structure: (e.target.value || undefined) as SoilStructure | undefined })}
                    >
                      <option value="">—</option>
                      {STRUCTURE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                  <Field label="pH eau" value={h.phWater} onChange={(v) => void updateHorizon(i, { phWater: v })} />
                  <Field label="CO %" value={h.organicCarbonPct} onChange={(v) => void updateHorizon(i, { organicCarbonPct: v })} />
                  <Field label="N total %" value={h.totalNitrogenPct ?? ''} onChange={(v) => void updateHorizon(i, { totalNitrogenPct: v })} />
                  <Field label="Ca éch." value={h.exchCa} onChange={(v) => void updateHorizon(i, { exchCa: v })} />
                  <Field label="Mg éch." value={h.exchMg} onChange={(v) => void updateHorizon(i, { exchMg: v })} />
                  <Field label="K éch." value={h.exchK} onChange={(v) => void updateHorizon(i, { exchK: v })} />
                  <Field label="Na éch." value={h.exchNa} onChange={(v) => void updateHorizon(i, { exchNa: v })} />
                  <Field label="CEC" value={h.cec} onChange={(v) => void updateHorizon(i, { cec: v })} />
                  <Field label="P Bray II (ppm)" value={h.assimilablePppm ?? ''} onChange={(v) => void updateHorizon(i, { assimilablePppm: v })} />
                  <Field label="ECe (mmhos/cm)" value={h.ece ?? ''} onChange={(v) => void updateHorizon(i, { ece: v })} />
                  <Field label="Éléments grossiers %" value={h.coarseFragmentsPct ?? ''} onChange={(v) => void updateHorizon(i, { coarseFragmentsPct: v })} />
                </div>
              </Card>
            ))}
          </div>
          <Button variant="secondary" onClick={addHorizon}>
            {t('profile.newHorizon')}
          </Button>
        </>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number | string; onChange: (v: number) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <TextField type="number" step="any" value={value} onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : 0)} />
    </div>
  );
}
