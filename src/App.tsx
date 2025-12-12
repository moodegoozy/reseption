import { useCallback, useEffect, useMemo, useState } from 'react';
import LoginForm from './components/LoginForm';
import ShiftReportForm, { SubmitShiftReportPayload } from './components/ShiftReportForm';
import SummaryTable from './components/SummaryTable';
import ExportSummaryButton from './components/ExportSummaryButton';
import {
  deleteReport,
  fetchEmployees,
  fetchReports,
  fetchSummary,
  login,
  logout,
  sendDailySummary,
  submitReport
} from './services/api';
import { AuthenticatedUser, DailySummaryRow, EmployeeSummary, ShiftReport } from './types';
import { createDailySummary } from './utils/reportUtils';

const today = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [summaryRows, setSummaryRows] = useState<DailySummaryRow[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => today());
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const isAuthenticated = Boolean(token && currentUser);

  useEffect(() => {
    if (!token || !currentUser) {
      setEmployees([]);
      return;
    }

    let mounted = true;

    const loadEmployees = async () => {
      try {
        const list = await fetchEmployees(token);
        if (!mounted) {
          return;
        }

        if (currentUser.role === 'manager') {
          setEmployees(list);
        } else {
          const ownRecord = list.find((employee) => employee.id === currentUser.id);
          setEmployees(ownRecord ? [ownRecord] : [{ ...currentUser }]);
        }
      } catch (error) {
        if (!mounted) {
          return;
        }
        setEmployees([{ ...currentUser }]);
      }
    };

    loadEmployees();

    return () => {
      mounted = false;
    };
  }, [token, currentUser]);

  const loadData = useCallback(async () => {
    if (!token || !currentUser) {
      setReports([]);
      setSummaryRows([]);
      return;
    }

    setIsLoadingData(true);
    setGlobalError(null);
    try {
      const [reportsResponse, summaryResponse] = await Promise.all([
        fetchReports(token, selectedDate),
        fetchSummary(token, selectedDate)
      ]);
      setReports(reportsResponse);
      setSummaryRows(summaryResponse);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'تعذر تحميل البيانات.');
      try {
        const reportsResponse = await fetchReports(token, selectedDate);
        setReports(reportsResponse);
        setSummaryRows(createDailySummary(reportsResponse));
      } catch (secondError) {
        setReports([]);
        setSummaryRows([]);
        setGlobalError(
          secondError instanceof Error ? secondError.message : 'تعذر تحميل البيانات من الخادم.'
        );
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [token, currentUser, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogin = async ({ username, password }: { username: string; password: string }) => {
    setIsAuthLoading(true);
    try {
      const response = await login(username, password);
      setToken(response.token);
      setCurrentUser(response.employee);
      setSelectedDate(today());
    } catch (error) {
      setToken(null);
      setCurrentUser(null);
      throw error instanceof Error ? error : new Error('تعذر تسجيل الدخول.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!token) {
      setToken(null);
      setCurrentUser(null);
      return;
    }

    try {
      await logout(token);
    } catch (error) {
      // ignore logout errors, session will be cleared locally
    } finally {
      setToken(null);
      setCurrentUser(null);
      setReports([]);
      setSummaryRows([]);
    }
  };

  const handleSubmitReport = async (payload: SubmitShiftReportPayload) => {
    if (!token || !currentUser) {
      throw new Error('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.');
    }

    setIsSubmittingReport(true);
    try {
      await submitReport(token, payload);
      await loadData();
    } catch (error) {
      throw error instanceof Error ? error : new Error('تعذر حفظ التقرير.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleRemoveReport = async (reportId: string) => {
    if (!token || !currentUser) {
      return;
    }

    try {
      await deleteReport(token, reportId);
      await loadData();
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'تعذر حذف التقرير.');
    }
  };

  const handleSendSummaryEmail = async () => {
    if (!token || !currentUser) {
      throw new Error('انتهت الجلسة، يرجى تسجيل الدخول.');
    }

    try {
      const result = (await sendDailySummary(token, selectedDate)) as
        | {
            sent?: boolean;
            reason?: string;
            savedTo?: string;
            date?: string;
            messageId?: string;
          }
        | undefined;

      if (!result) {
        return 'تم تنفيذ الطلب بنجاح.';
      }

      if (result.sent) {
        return 'تم إرسال الملخص إلى البريد الإلكتروني بنجاح.';
      }

      if (result.reason === 'NO_REPORTS') {
        throw new Error('لا توجد تقارير لإرسالها في هذا التاريخ.');
      }

      if (result.reason === 'SMTP_NOT_CONFIGURED' && result.savedTo) {
        return `لم يتم ضبط بريد الإرسال، تم حفظ الملف في: ${result.savedTo}`;
      }

      return 'تم تجهيز الملف، تحقق من إعدادات البريد للتأكد من الإرسال.';
    } catch (error) {
      throw error instanceof Error ? error : new Error('تعذر إرسال الملخص.');
    }
  };

  const headerDescription = useMemo(() => {
    if (!currentUser) {
      return 'أدخل بيانات الدخول لمتابعة تقارير الشفتات اليومية.';
    }

    return currentUser.role === 'manager'
      ? 'تابع جميع تقارير الموظفين، قم بتنزيل الملخص أو إرساله تلقائياً إلى البريد.'
      : 'قم بإدخال تقرير الشفت الخاص بك، وسيصل الملخص إلى الإدارة تلقائياً في نهاية اليوم.';
  }, [currentUser]);

  return (
    <div className="layout">
      <header>
        <h1>لوحة متابعة تقارير الشفتات</h1>
        <p>{headerDescription}</p>
        {currentUser ? (
          <div className="userBar">
            <span>
              مرحباً {currentUser.name} ({currentUser.role === 'manager' ? 'مدير' : 'موظف'})
            </span>
            <button type="button" className="link" onClick={handleLogout}>
              تسجيل الخروج
            </button>
          </div>
        ) : null}
      </header>

      {!isAuthenticated ? (
        <main className="authWrapper">
          <LoginForm onSubmit={handleLogin} isSubmitting={isAuthLoading} />
        </main>
      ) : (
        <main>
          <ShiftReportForm
            currentUser={currentUser!}
            employees={employees}
            date={selectedDate}
            onDateChange={(nextDate) => setSelectedDate(nextDate)}
            onSubmit={handleSubmitReport}
            isSubmitting={isSubmittingReport}
          />

          {globalError ? <p className="error">{globalError}</p> : null}
          {isLoadingData ? <p className="hint">جاري تحميل بيانات اليوم...</p> : null}

          <SummaryTable
            currentUser={currentUser!}
            date={selectedDate}
            reports={reports}
            summaryRows={summaryRows}
            onRemoveReport={handleRemoveReport}
            onSendSummaryEmail={currentUser?.role === 'manager' ? async () => { await handleSendSummaryEmail(); } : undefined}
          />
        </main>
      )}

      {isAuthenticated ? (
        <footer>
          <ExportSummaryButton reports={reports} summaryRows={summaryRows} date={selectedDate} />
        </footer>
      ) : null}
    </div>
  );
}
