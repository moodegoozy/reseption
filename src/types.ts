export type ShiftName = 'الليلي (1ص - 9ص)' | 'الصباحي (9ص - 5م)' | 'المسائي (5م - 1ص)';

export type UserRole = 'employee' | 'manager';

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: UserRole;
}

export interface EmployeeSummary {
  id: string;
  name: string;
  role: UserRole;
}

export interface ShiftReport {
  id: string;
  employeeId: string;
  employeeName: string;
  shift: ShiftName;
  date: string;
  dayName: string;
  shiftStart: string;
  shiftEnd: string;
  visitorsCount: number;
  callsCount: number;
  socialMediaCount: number;
  needs: string;
  entryCount: number;
  exitCount: number;
  submittedBy?: string;
  updatedAt?: string;
}

export interface DailySummaryRow {
  employeeId: string;
  employeeName: string;
  totalShifts: number;
  totalVisitors: number;
  totalCalls: number;
  totalSocialMedia: number;
  totalEntry: number;
  totalExit: number;
  needs: string[];
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  employee: AuthenticatedUser;
}
