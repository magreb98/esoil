/** Export Word (.docx) client-side, §5.2 : même contenu que l'export Excel. */
import { AlignmentType, Document, Header, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import type { SiteReport } from './reportData';

const HEADER_SHADING = 'D9EAD3';

function headerCell(text: string): TableCell {
  return new TableCell({
    shading: { fill: HEADER_SHADING },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
  });
}

function cell(text: string): TableCell {
  return new TableCell({ children: [new Paragraph(text)] });
}

function criteriaTable(report: SiteReport['sections'][number]) {
  const rows = [
    new TableRow({
      children: ['Caractéristique', 'Valeur', 'Classe', 'Degré', 'Val. param.', 'Catégorie', 'Fiabilité', 'Source'].map(headerCell),
    }),
  ];
  for (const r of [...report.evaluation.climateRatings, ...report.evaluation.soilRatings]) {
    rows.push(
      new TableRow({
        children: [
          cell(r.label),
          cell(typeof r.valeurRetenue === 'number' ? r.valeurRetenue.toFixed(2) : String(r.valeurRetenue)),
          cell(r.classe),
          cell(String(r.degre)),
          cell(r.valeurParametrique.toFixed(1)),
          cell(r.category),
          cell(r.confidence),
          cell(r.source),
        ],
      })
    );
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

export async function buildWordReport(report: SiteReport): Promise<Blob> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: `eSoil — Rapport d'évaluation des terres`, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `${report.projectName} — ${report.siteName} — ${report.profileSoilUnit}`, heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: `Généré le ${new Date(report.generatedAt).toLocaleString('fr-FR')}` }),
    new Paragraph({ text: `Version des tables de référence : ${report.tablesVersion}` }),
    new Paragraph({ text: '' }),
    new Paragraph({ text: 'Synthèse', heading: HeadingLevel.HEADING_1 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: ['Culture', 'Classe finale', 'Désaccord entre méthodes', 'Indice de terre (IT)'].map(headerCell) }),
        ...report.sections.map(
          (s) =>
            new TableRow({
              children: [cell(s.cropName), cell(s.evaluation.finalNotation), cell(s.evaluation.methodsAgree ? 'Non' : 'Oui'), cell(s.evaluation.parametric.indiceTerre.toFixed(1))],
            })
        ),
      ],
    }),
    new Paragraph({ text: '' }),
  ];

  for (const s of report.sections) {
    children.push(new Paragraph({ text: s.cropName, heading: HeadingLevel.HEADING_1 }));
    children.push(new Paragraph({ text: `Notation finale : ${s.evaluation.finalNotation}` }));
    for (const y of s.yieldHighInput.entries) {
      const low = s.yieldLow.entries.find((e) => e.yieldEntryCode === y.yieldEntryCode);
      children.push(
        new Paragraph({
          text: `Rendement (${y.yieldEntryLabel}) — intrants élevés : ${y.rangeHighInputTPerHa ? `${y.rangeHighInputTPerHa[0]}-${y.rangeHighInputTPerHa[1]} ${y.unit}` : 'donnée manquante'} ; intrants faibles : ${low?.estimatedRangeTPerHa ? `${low.estimatedRangeTPerHa[0].toFixed(1)}-${low.estimatedRangeTPerHa[1].toFixed(1)} ${y.unit}` : 'donnée manquante'} (estimation théorique FAO)`,
        })
      );
    }
    children.push(new Paragraph({ text: '' }));
    children.push(criteriaTable(s));
    children.push(new Paragraph({ text: '' }));
  }

  children.push(new Paragraph({ text: 'Critères non évalués', heading: HeadingLevel.HEADING_1 }));
  if (report.allMissingCriteria.length === 0) {
    children.push(new Paragraph({ text: 'Aucun.' }));
  } else {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ['Culture', 'Critère', 'Motif'].map(headerCell) }),
          ...report.allMissingCriteria.map((m) => new TableRow({ children: [cell(m.cropName), cell(m.criterion.label), cell(m.criterion.reason)] })),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        headers: { default: new Header({ children: [new Paragraph({ text: 'eSoil — évaluation des terres FAO', alignment: AlignmentType.RIGHT })] }) },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}
