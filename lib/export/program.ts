// Client-side program export (docs/10 Part 4). Libraries are imported lazily
// so they never land in the initial bundle.

export type ProgramExercise = { name: string; sets: number; reps: string; pct_1rm?: number };
export type ProgramDay = { name: string; exercises: ProgramExercise[] };
export type Program = { name: string; days: ProgramDay[] };

function download(blob: Blob, filename: string) {
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const safe = (s: string) => s.replace(/[^\w\- ]+/g, "").trim() || "program";

export async function exportDocx(p: Program) {
  const { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = await import("docx");
  const cell = (text: string, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold })] })] });
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: p.name, heading: HeadingLevel.HEADING_1 }),
        ...p.days.flatMap((day, i) => [
          new Paragraph({ text: `Day ${i + 1}: ${day.name}`, heading: HeadingLevel.HEADING_2 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: ["Exercise", "Sets × Reps", "% 1RM"].map((h) => cell(h, true)) }),
              ...day.exercises.map((e) => new TableRow({
                children: [cell(e.name), cell(`${e.sets} × ${e.reps}`), cell(e.pct_1rm ? `${e.pct_1rm}%` : "")],
              })),
            ],
          }),
        ]),
      ],
    }],
  });
  download(await Packer.toBlob(doc), `${safe(p.name)}.docx`);
}

export async function exportXlsx(p: Program) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Program");
  ws.columns = [
    { header: "Day", key: "day", width: 22 }, { header: "Exercise", key: "name", width: 30 },
    { header: "Sets", key: "sets", width: 8 }, { header: "Reps", key: "reps", width: 10 }, { header: "% 1RM", key: "pct", width: 8 },
  ];
  ws.getRow(1).font = { bold: true };
  p.days.forEach((d, i) => d.exercises.forEach((e) =>
    ws.addRow({ day: `Day ${i + 1}: ${d.name}`, name: e.name, sets: e.sets, reps: e.reps, pct: e.pct_1rm ?? "" })));
  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${safe(p.name)}.xlsx`);
}

/** A bot reply as a simple .docx (one paragraph per line). */
export async function exportTextDocx(title: string, text: string) {
  const { Document, HeadingLevel, Packer, Paragraph } = await import("docx");
  const doc = new Document({ sections: [{ children: [
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
    ...text.split("\n").map((line) => new Paragraph(line)),
  ] }] });
  download(await Packer.toBlob(doc), `${safe(title)}.docx`);
}
