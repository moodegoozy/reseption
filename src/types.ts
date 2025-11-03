export type ShiftName = 'الصباح' | 'المساء' | 'الليل';

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
  tasksCompleted: string;
  issues: string;
  handoverNotes: string;
  productivityScore?: number;
  submittedBy?: string;
  updatedAt?: string;
}

export interface DailySummaryRow {
  employeeId: string;
  employeeName: string;
  totalShifts: number;
  productivityAverage: number | null;
  tasks: string[];
  issues: string[];
  handoverNotes: string[];
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  employee: AuthenticatedUser;
}
