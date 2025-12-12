import * as XLSX from 'xlsx';
import { DailySummaryRow, ShiftName, ShiftReport } from '../types';

export const shiftOptions: ShiftName[] = ['الليلي (1ص - 9ص)', 'الصباحي (9ص - 5م)', 'المسائي (5م - 1ص)'];

export function getShiftTimes(shift: ShiftName): { start: string; end: string } {
  switch (shift) {
    case 'الليلي (1ص - 9ص)':
      return { start: '01:00', end: '09:00' };
    case 'الصباحي (9ص - 5م)':
      return { start: '09:00', end: '17:00' };
    case 'المسائي (5م - 1ص)':
      return { start: '17:00', end: '01:00' };
    default:
      return { start: '', end: '' };
  }
}

export function getArabicDayName(dateString: string): string {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const date = new Date(dateString);
  return days[date.getDay()];
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

    const totalVisitors = employeeReports.reduce((sum, r) => sum + (r.visitorsCount || 0), 0);
    const totalCalls = employeeReports.reduce((sum, r) => sum + (r.callsCount || 0), 0);
    const totalSocialMedia = employeeReports.reduce((sum, r) => sum + (r.socialMediaCount || 0), 0);
    const totalEntry = employeeReports.reduce((sum, r) => sum + (r.entryCount || 0), 0);
    const totalExit = employeeReports.reduce((sum, r) => sum + (r.exitCount || 0), 0);

    return {
      employeeId,
      employeeName,
      totalShifts: employeeReports.length,
      totalVisitors,
      totalCalls,
      totalSocialMedia,
      totalEntry,
      totalExit,
      needs: employeeReports.map((report) => report.needs).filter(Boolean)
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
      'التاريخ': report.date,
      'اليوم': report.dayName,
      'اسم الموظف': report.employeeName,
      'الشفت': report.shift,
      'بداية الشفت': report.shiftStart,
      'نهاية الشفت': report.shiftEnd,
      'عدد الزوار': report.visitorsCount,
      'عدد الاتصالات': report.callsCount,
      'التواصل الاجتماعي': report.socialMediaCount,
      'عدد الدخول': report.entryCount,
      'عدد الخروج': report.exitCount,
      'الاحتياج': report.needs
    }))
  );

  const summarySheet = XLSX.utils.json_to_sheet(
    summaryRows.map((row) => ({
      'اسم الموظف': row.employeeName,
      'عدد الشفتات': row.totalShifts,
      'إجمالي الزوار': row.totalVisitors,
      'إجمالي الاتصالات': row.totalCalls,
      'إجمالي التواصل الاجتماعي': row.totalSocialMedia,
      'إجمالي الدخول': row.totalEntry,
      'إجمالي الخروج': row.totalExit,
      'الاحتياجات': row.needs.join(' | ')
    }))
  );

  XLSX.utils.book_append_sheet(workbook, reportSheet, 'تقارير الشفتات');
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'ملخص اليوم');

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
