export type ShiftName = 'الليلي (1ص - 9ص)' | 'الصباحي (9ص - 5م)' | 'المسائي (5م - 1ص)';

export interface AuthenticatedUser {
  id: string;
  name: string;
}

export interface ShiftReport {
  id: string;
  employeeId: string;
  employeeName: string;
  shift: ShiftName;
  date: string;
  dayName: string;
  visitorsCount: number;
  callsCount: number;
  socialMediaCount: number;
  bookingSource: string;
  bookingType: string;
  needs: string;
  entryCount: number;
  exitCount: number;
  notes: string;
  dailyRevenue: number;
  totalRevenue: number;
  submittedById?: string;
  submittedByName?: string;
  createdAt?: string;
}

export interface DailySummary {
  date: string;
  dayName: string;
  totalVisitors: number;
  totalCalls: number;
  totalSocialMedia: number;
  totalEntry: number;
  totalExit: number;
  totalDailyRevenue: number;
  reports: ShiftReport[];
}
