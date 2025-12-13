import { useCallback, useEffect, useMemo, useState } from 'react';
import LoginForm from './components/LoginForm';
import ShiftReportForm, { SubmitShiftReportPayload } from './components/ShiftReportForm';
import SummaryTable from './components/SummaryTable';
import ExportSummaryButton from './components/ExportSummaryButton';
import { 
  loginWithEmail, 
  registerWithEmail, 
  logoutUser, 
  onAuthChange,
  getUserProfile,
  saveReport,
  getReportsByDate,
  removeReport,
  getAllEmployees
} from './services/firebase';
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
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const isAuthenticated = Boolean(currentUser);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          const idToken = await user.getIdToken();
          setToken(idToken);
          setCurrentUser({
            id: user.uid,
            name: profile?.name || user.email?.split('@')[0] || 'مستخدم',
            role: profile?.role || 'employee'
          });
        } catch (error) {
          console.error('Error getting user profile:', error);
          setToken(null);
          setCurrentUser(null);
        }
      } else {
        setToken(null);
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setEmployees([]);
      return;
    }

    // Fetch employees from Firestore for managers
    const loadEmployees = async () => {
      if (currentUser.role === 'manager') {
        try {
          const allUsers = await getAllEmployees();
          setEmployees(allUsers.map(u => ({ id: u.id, name: u.name, role: u.role })));
        } catch (error) {
          console.error('Error loading employees:', error);
          setEmployees([{ id: currentUser.id, name: currentUser.name, role: currentUser.role }]);
        }
      } else {
        setEmployees([{ id: currentUser.id, name: currentUser.name, role: currentUser.role }]);
      }
    };
    
    loadEmployees();
  }, [currentUser]);

  const loadData = useCallback(async () => {
    if (!token || !currentUser) {
      setReports([]);
      setSummaryRows([]);
      return;
    }

    setIsLoadingData(true);
    setGlobalError(null);
    try {
      const reportsData = await getReportsByDate(selectedDate, currentUser.role, currentUser.id);
      setReports(reportsData);
      setSummaryRows(createDailySummary(reportsData));
    } catch (error) {
      console.error('Error loading reports:', error);
      setReports([]);
      setSummaryRows([]);
      setGlobalError(error instanceof Error ? error.message : 'تعذر تحميل البيانات.');
    } finally {
      setIsLoadingData(false);
    }
  }, [token, currentUser, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    setIsAuthLoading(true);
    try {
      await loginWithEmail(email, password);
      setSelectedDate(today());
    } catch (error) {
      throw error instanceof Error ? error : new Error('تعذر تسجيل الدخول.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRegister = async ({ email, password, name, role }: { email: string; password: string; name: string; role: 'employee' | 'manager' }) => {
    setIsAuthLoading(true);
    try {
      await registerWithEmail(email, password, name, role);
      setSelectedDate(today());
    } catch (error) {
      throw error instanceof Error ? error : new Error('تعذر إنشاء الحساب.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      // ignore logout errors
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
      await saveReport({
        ...payload,
        submittedById: currentUser.id,
        submittedByName: currentUser.name
      });
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
      await removeReport(reportId);
      await loadData();
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'تعذر حذف التقرير.');
    }
  };

  const handleSendSummaryEmail = async () => {
    // Summary email functionality - can be implemented later
    return 'تم تجهيز الملخص. استخدم زر التصدير لتحميل ملف Excel.';
  };

  const headerDescription = useMemo(() => {
    if (!currentUser) {
      return 'سجّل دخولك لإدارة تقارير الاستقبال اليومية بكل سهولة';
    }

    return currentUser.role === 'manager'
      ? 'تابع جميع تقارير الموظفين وقم بتصدير الملخصات بضغطة زر'
      : 'أدخل بيانات شفتك اليومية بسرعة وسهولة';
  }, [currentUser]);

  return (
    <div className="layout">
      <header>
        <h1>نظام تقارير الاستقبال</h1>
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
          {isAuthLoading ? (
            <div className="card auth">
              <p style={{ textAlign: 'center' }}>جاري التحميل...</p>
            </div>
          ) : (
            <LoginForm onSubmit={handleLogin} onRegister={handleRegister} isSubmitting={isAuthLoading} />
          )}
        </main>
      ) : (
        <main>
          {/* المدير لا يكتب تقارير - فقط يشاهدها */}
          {currentUser?.role === 'manager' ? (
            <section className="card">
              <h2>📊 لوحة تحكم المدير</h2>
              <p>مرحباً بك في لوحة التحكم. يمكنك مشاهدة جميع تقارير الموظفين وتحميلها.</p>
              <label className="field" style={{ maxWidth: '300px' }}>
                <span>اختر التاريخ</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </label>
            </section>
          ) : (
            <ShiftReportForm
              currentUser={currentUser!}
              employees={employees}
              date={selectedDate}
              onDateChange={(nextDate) => setSelectedDate(nextDate)}
              onSubmit={handleSubmitReport}
              isSubmitting={isSubmittingReport}
            />
          )}

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
