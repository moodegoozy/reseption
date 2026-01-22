import { ShiftName, ShiftReport, DailySummary } from '../types';

export const shiftOptions: ShiftName[] = ['الليلي (1ص - 9ص)', 'الصباحي (9ص - 5م)', 'المسائي (5م - 1ص)'];

export function getArabicDayName(dateString: string): string {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const date = new Date(dateString);
  return days[date.getDay()];
}

export function createDailySummary(reports: ShiftReport[], date: string): DailySummary {
  const totalVisitors = reports.reduce((sum, r) => sum + (r.visitorsCount || 0), 0);
  const totalCalls = reports.reduce((sum, r) => sum + (r.callsCount || 0), 0);
  const totalSocialMedia = reports.reduce((sum, r) => sum + (r.socialMediaCount || 0), 0);
  const totalEntry = reports.reduce((sum, r) => sum + (r.entryCount || 0), 0);
  const totalExit = reports.reduce((sum, r) => sum + (r.exitCount || 0), 0);
  const totalDailyRevenue = reports.reduce((sum, r) => sum + (r.dailyRevenue || 0), 0);

  return {
    date,
    dayName: getArabicDayName(date),
    totalVisitors,
    totalCalls,
    totalSocialMedia,
    totalEntry,
    totalExit,
    totalDailyRevenue,
    reports
  };
}
