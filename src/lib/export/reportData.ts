/**
 * Données communes aux trois formats d'export (Excel, Word, PDF, §5) : un classeur/document
 * par site, un onglet/section par culture évaluable, une synthèse, les critères non évalués.
 * Chaque export mentionne la date, la version des tables de référence et les critères non
 * évalués (§5.4).
 */
import type { ClimateSeries, CropEvaluation, NonEvaluatedCriterion, Profile, Site } from '../domain/types';
import { CROPS, isCropEvaluable } from '../../config/crops';
import { evaluateCrop } from '../evaluation/evaluateCrop';
import { estimateYield } from '../yield/managementLevels';

export const REFERENCE_TABLES_VERSION = '1 (paquet de données de référence, transcrit ' +
  'depuis GWETH 2024 et Beernaert & Bitondo 1993)';

export interface CropReportSection {
  cropCode: string;
  cropName: string;
  evaluation: CropEvaluation;
  yieldHighInput: ReturnType<typeof estimateYield>;
  yieldLow: ReturnType<typeof estimateYield>;
}

export interface SiteReport {
  generatedAt: string;
  tablesVersion: string;
  projectName: string;
  siteName: string;
  profileSoilUnit: string;
  sections: CropReportSection[];
  allMissingCriteria: Array<{ cropName: string; criterion: NonEvaluatedCriterion }>;
}

export function buildSiteReport(projectName: string, site: Site, profile: Profile, climateSeries: ClimateSeries): SiteReport {
  const sections: CropReportSection[] = [];
  const allMissingCriteria: Array<{ cropName: string; criterion: NonEvaluatedCriterion }> = [];

  for (const crop of CROPS.filter(isCropEvaluable)) {
    const evaluation = evaluateCrop(profile, climateSeries, crop, site);
    sections.push({
      cropCode: crop.code,
      cropName: crop.name,
      evaluation,
      yieldHighInput: estimateYield(crop.code, evaluation.parametric.classe, 'eleve'),
      yieldLow: estimateYield(crop.code, evaluation.parametric.classe, 'faible'),
    });
    for (const m of evaluation.missingCriteria) {
      allMissingCriteria.push({ cropName: crop.name, criterion: m });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    tablesVersion: REFERENCE_TABLES_VERSION,
    projectName,
    siteName: site.name,
    profileSoilUnit: profile.soilUnit,
    sections,
    allMissingCriteria,
  };
}
