import * as XLSX from 'xlsx';
import { DailySummaryRow, ShiftReport } from '../types';

export const shiftOptions = ['الصباح', 'المساء', 'الليل'] as const;

export function normalizeProductivity(value?: number): number | undefined {
  if (value === undefined || Number.isNaN(value)) {
    return undefined;
  }
  return Math.min(Math.max(value, 0), 100);
}

export function createDailySummary(reports: ShiftReport[]): DailySummaryRow[] {
  const byEmployee = new Map<string, ShiftReport[]>();

  reports.forEach((report) => {
    const existing = byEmployee.get(report.employeeId) ?? [];
    existing.push(report);
    byEmployee.set(report.employeeId, existing);
  });

  return Array.from(byEmployee.entries()).map(([employeeId, employeeReports]) => {
    const { employeeName } = employeeReports[0];
    const productivityValues = employeeReports
      .map((report) => report.productivityScore)
      .filter((value): value is number => typeof value === 'number');

    const productivityAverage =
      productivityValues.length > 0
        ? Number(
            (
              productivityValues.reduce((total, value) => total + value, 0) /
              productivityValues.length
            ).toFixed(2)
          )
        : null;

    return {
      employeeId,
      employeeName,
      totalShifts: employeeReports.length,
      productivityAverage,
      tasks: employeeReports.map((report) => report.tasksCompleted).filter(Boolean),
      issues: employeeReports.map((report) => report.issues).filter(Boolean),
      handoverNotes: employeeReports.map((report) => report.handoverNotes).filter(Boolean)
    };
  });
}

export function exportDailySummaryToExcel(
  reports: ShiftReport[],
  summaryRows: DailySummaryRow[],
  fileName: string
): void {
  const workbook = XLSX.utils.book_new();

  const reportSheet = XLSX.utils.json_to_sheet(
    reports.map((report) => ({
      التاريخ: report.date,
      الموظف: report.employeeName,
      الشفت: report.shift,
      'المهام المنجزة': report.tasksCompleted,
      'الملاحظات والبلاغات': report.issues,
      'ملاحظات التسليم': report.handoverNotes,
      'تقييم الإنتاجية (%)': report.productivityScore ?? ''
    }))
  );

  const summarySheet = XLSX.utils.json_to_sheet(
    summaryRows.map((row) => ({
      الموظف: row.employeeName,
      'عدد الشفتات': row.totalShifts,
      'متوسط الإنتاجية (%)': row.productivityAverage ?? 'غير متوفر',
      'المهام البارزة': row.tasks.join('\n'),
      'أهم الملاحظات': row.issues.join('\n'),
      'ملاحظات التسليم': row.handoverNotes.join('\n')
    }))
  );

  XLSX.utils.book_append_sheet(workbook, reportSheet, 'تقارير الشفتات');
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'ملخص اليوم');

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
