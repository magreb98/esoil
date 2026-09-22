/** Export Excel (.xlsx) client-side, §5.1 : un classeur par site, un onglet par culture au format FAO, une synthèse, les critères non évalués. */
import ExcelJS from 'exceljs';
import type { SiteReport } from './reportData';

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F5D3A' } };
const HEADER_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true };

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });
}

export async function buildExcelReport(report: SiteReport): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'eSoil';
  wb.created = new Date(report.generatedAt);

  const summary = wb.addWorksheet('Synthèse');
  summary.columns = [
    { header: 'Culture', key: 'crop', width: 22 },
    { header: 'Classe finale', key: 'classe', width: 14 },
    { header: 'Désaccord', key: 'desaccord', width: 12 },
    { header: 'Indice de terre (IT)', key: 'it', width: 16 },
    { header: 'Rendement intrants élevés', key: 'yieldHigh', width: 22 },
    { header: 'Rendement intrants faibles', key: 'yieldLow', width: 22 },
  ];
  styleHeaderRow(summary.getRow(1));
  for (const s of report.sections) {
    summary.addRow({
      crop: s.cropName,
      classe: s.evaluation.finalNotation,
      desaccord: s.evaluation.methodsAgree ? 'Non' : 'Oui',
      it: Number(s.evaluation.parametric.indiceTerre.toFixed(1)),
      yieldHigh: s.yieldHighInput.entries.map((e) => (e.rangeHighInputTPerHa ? `${e.yieldEntryLabel}: ${e.rangeHighInputTPerHa[0]}-${e.rangeHighInputTPerHa[1]} ${e.unit}` : `${e.yieldEntryLabel}: —`)).join(' / '),
      yieldLow: s.yieldLow.entries.map((e) => (e.estimatedRangeTPerHa ? `${e.yieldEntryLabel}: ${e.estimatedRangeTPerHa[0].toFixed(1)}-${e.estimatedRangeTPerHa[1].toFixed(1)} ${e.unit}` : `${e.yieldEntryLabel}: —`)).join(' / '),
    });
  }

  for (const s of report.sections) {
    const sheetName = s.cropName.slice(0, 31).replace(/[[\]*?/\\:]/g, '_');
    const sheet = wb.addWorksheet(sheetName);
    sheet.columns = [
      { header: 'Caractéristique', key: 'label', width: 32 },
      { header: 'Valeur', key: 'value', width: 14 },
      { header: 'Classe', key: 'classe', width: 10 },
      { header: 'Degré', key: 'degre', width: 8 },
      { header: 'Valeur paramétrique', key: 'param', width: 16 },
      { header: 'Catégorie', key: 'category', width: 10 },
      { header: 'Fiabilité', key: 'confidence', width: 10 },
      { header: 'Source', key: 'source', width: 30 },
    ];
    styleHeaderRow(sheet.getRow(1));
    sheet.addRow({ label: `Notation finale : ${s.evaluation.finalNotation}` });
    sheet.addRow({});
    for (const r of [...s.evaluation.climateRatings, ...s.evaluation.soilRatings]) {
      sheet.addRow({
        label: r.label,
        value: typeof r.valeurRetenue === 'number' ? Number(r.valeurRetenue.toFixed(2)) : r.valeurRetenue,
        classe: r.classe,
        degre: r.degre,
        param: Number(r.valeurParametrique.toFixed(1)),
        category: r.category,
        confidence: r.confidence,
        source: r.source,
      });
    }
  }

  const missing = wb.addWorksheet('Critères non évalués');
  missing.columns = [
    { header: 'Culture', key: 'crop', width: 22 },
    { header: 'Critère', key: 'label', width: 30 },
    { header: 'Motif', key: 'reason', width: 50 },
  ];
  styleHeaderRow(missing.getRow(1));
  for (const m of report.allMissingCriteria) {
    missing.addRow({ crop: m.cropName, label: m.criterion.label, reason: m.criterion.reason });
  }

  const info = wb.addWorksheet('Informations');
  info.addRows([
    ['Projet', report.projectName],
    ['Site', report.siteName],
    ['Profil', report.profileSoilUnit],
    ['Généré le', new Date(report.generatedAt).toLocaleString('fr-FR')],
    ['Version des tables de référence', report.tablesVersion],
  ]);
  info.getColumn(1).width = 28;
  info.getColumn(2).width = 50;

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
