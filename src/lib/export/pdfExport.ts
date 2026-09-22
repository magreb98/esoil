/** Rapport PDF technique généré côté client (§5.3), hors ligne (pdfmake — aucune police ni ressource distante). */
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { SiteReport } from './reportData';

(pdfMake as unknown as { vfs: unknown }).vfs = (pdfFonts as unknown as { pdfMake?: { vfs: unknown }; vfs?: unknown }).pdfMake?.vfs ?? (pdfFonts as unknown as { vfs: unknown }).vfs;

const GREEN = '#1F5D3A';

function criteriaTableContent(section: SiteReport['sections'][number]): Content {
  const body: Content[][] = [
    [
      { text: 'Caractéristique', style: 'tableHeader' },
      { text: 'Valeur', style: 'tableHeader' },
      { text: 'Classe', style: 'tableHeader' },
      { text: 'Degré', style: 'tableHeader' },
      { text: 'Val. param.', style: 'tableHeader' },
      { text: 'Source', style: 'tableHeader' },
    ],
  ];
  for (const r of [...section.evaluation.climateRatings, ...section.evaluation.soilRatings]) {
    body.push([
      String(r.label),
      typeof r.valeurRetenue === 'number' ? r.valeurRetenue.toFixed(2) : String(r.valeurRetenue),
      String(r.classe),
      String(r.degre),
      r.valeurParametrique.toFixed(1),
      { text: r.source, fontSize: 7 },
    ]);
  }
  return { table: { headerRows: 1, widths: ['*', 45, 32, 28, 45, 90], body }, fontSize: 8, margin: [0, 4, 0, 12] };
}

export function buildPdfReport(report: SiteReport): Promise<Blob> {
  const content: Content[] = [
    { text: "eSoil — Rapport d'évaluation des terres", style: 'title' },
    { text: `${report.projectName} — ${report.siteName} — ${report.profileSoilUnit}`, style: 'subtitle' },
    { text: `Généré le ${new Date(report.generatedAt).toLocaleString('fr-FR')}`, fontSize: 9, color: '#666' },
    { text: `Version des tables de référence : ${report.tablesVersion}`, fontSize: 9, color: '#666', margin: [0, 0, 0, 12] },
    { text: 'Synthèse', style: 'h1' },
    {
      table: {
        headerRows: 1,
        widths: ['*', 60, 60, 60],
        body: [
          [
            { text: 'Culture', style: 'tableHeader' },
            { text: 'Classe finale', style: 'tableHeader' },
            { text: 'Désaccord', style: 'tableHeader' },
            { text: 'IT', style: 'tableHeader' },
          ],
          ...report.sections.map((s) => [s.cropName, s.evaluation.finalNotation, s.evaluation.methodsAgree ? 'Non' : 'Oui', s.evaluation.parametric.indiceTerre.toFixed(1)]),
        ],
      },
      margin: [0, 4, 0, 16],
    },
  ];

  for (const s of report.sections) {
    content.push({ text: s.cropName, style: 'h1', pageBreak: 'before' });
    content.push({ text: `Notation finale : ${s.evaluation.finalNotation}`, bold: true, margin: [0, 0, 0, 4] });
    for (const y of s.yieldHighInput.entries) {
      const low = s.yieldLow.entries.find((e) => e.yieldEntryCode === y.yieldEntryCode);
      content.push({
        text: `Rendement (${y.yieldEntryLabel}) — élevé : ${y.rangeHighInputTPerHa ? `${y.rangeHighInputTPerHa[0]}-${y.rangeHighInputTPerHa[1]} ${y.unit}` : '—'} ; faible : ${low?.estimatedRangeTPerHa ? `${low.estimatedRangeTPerHa[0].toFixed(1)}-${low.estimatedRangeTPerHa[1].toFixed(1)} ${y.unit}` : '—'} (estimation théorique FAO)`,
        fontSize: 9,
      });
    }
    content.push(criteriaTableContent(s));
  }

  content.push({ text: 'Critères non évalués', style: 'h1', pageBreak: 'before' });
  if (report.allMissingCriteria.length === 0) {
    content.push({ text: 'Aucun.' });
  } else {
    content.push({
      table: {
        headerRows: 1,
        widths: ['auto', '*', '*'],
        body: [
          [
            { text: 'Culture', style: 'tableHeader' },
            { text: 'Critère', style: 'tableHeader' },
            { text: 'Motif', style: 'tableHeader' },
          ],
          ...report.allMissingCriteria.map((m) => [m.cropName, m.criterion.label, { text: m.criterion.reason, fontSize: 8 }]),
        ],
      },
    });
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [32, 40, 32, 32],
    content,
    styles: {
      title: { fontSize: 18, bold: true, color: GREEN, margin: [0, 0, 0, 2] },
      subtitle: { fontSize: 12, bold: true, margin: [0, 0, 0, 8] },
      h1: { fontSize: 13, bold: true, color: GREEN, margin: [0, 4, 0, 4] },
      tableHeader: { bold: true, fillColor: '#e3f0e8', fontSize: 8 },
    },
    defaultStyle: { fontSize: 9 },
  };

  return new Promise((resolve) => {
    pdfMake.createPdf(docDefinition).getBlob((blob: Blob) => resolve(blob));
  });
}
