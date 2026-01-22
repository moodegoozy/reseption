import { useCallback, useEffect, useState } from 'react';
import LoginForm from './components/LoginForm';
import ShiftReportForm, { SubmitShiftReportPayload } from './components/ShiftReportForm';
import ReportTable from './components/ReportTable';
import { 
  loginWithEmail, 
  registerWithEmail, 
  logoutUser, 
  onAuthChange,
  getUserProfile,
  saveReport,
  getReportsByDate,
  removeReport
} from './services/firebase';
import { AuthenticatedUser, ShiftReport } from './types';

const today = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [reports, setReports] = useState<ShiftReport[]>([]);
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
          setCurrentUser({
            id: user.uid,
            name: profile?.name || user.email?.split('@')[0] || 'مستخدم'
          });
        } catch (error) {
          console.error('Error getting user profile:', error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // تحميل التقارير
  const loadData = useCallback(async () => {
    if (!currentUser) {
      setReports([]);
      return;
    }

    setIsLoadingData(true);
    setGlobalError(null);
    try {
      const reportsData = await getReportsByDate(selectedDate, currentUser.id);
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports:', error);
      setReports([]);
      setGlobalError(error instanceof Error ? error.message : 'تعذر تحميل البيانات.');
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // تسجيل الدخول
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

  // إنشاء حساب
  const handleRegister = async ({ email, password, name }: { email: string; password: string; name: string }) => {
    setIsAuthLoading(true);
    try {
      await registerWithEmail(email, password, name);
      setSelectedDate(today());
    } catch (error) {
      throw error instanceof Error ? error : new Error('تعذر إنشاء الحساب.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // تسجيل الخروج
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      // ignore
    } finally {
      setCurrentUser(null);
      setReports([]);
    }
  };

  // إرسال التقرير
  const handleSubmitReport = async (payload: SubmitShiftReportPayload) => {
    if (!currentUser) {
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

  // حذف التقرير
  const handleRemoveReport = async (reportId: string) => {
    if (!currentUser) return;

    try {
      await removeReport(reportId);
      await loadData();
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'تعذر حذف التقرير.');
    }
  };

  return (
    <div className="layout">
      <header>
        <h1>🏢 نظام تقارير الاستقبال</h1>
        <p>سجّل تقاريرك اليومية وشاركها بسهولة</p>
        {currentUser && (
          <div className="userBar">
            <span>👋 مرحباً {currentUser.name}</span>
            <button type="button" className="link" onClick={handleLogout}>
              تسجيل الخروج
            </button>
          </div>
        )}
      </header>

      {!isAuthenticated ? (
        <main className="authWrapper">
          {isAuthLoading ? (
            <div className="card auth">
              <p style={{ textAlign: 'center' }}>⏳ جاري التحميل...</p>
            </div>
          ) : (
            <LoginForm onSubmit={handleLogin} onRegister={handleRegister} isSubmitting={isAuthLoading} />
          )}
        </main>
      ) : (
        <main>
          <ShiftReportForm
            currentUser={currentUser!}
            date={selectedDate}
            onDateChange={(nextDate) => setSelectedDate(nextDate)}
            onSubmit={handleSubmitReport}
            isSubmitting={isSubmittingReport}
          />

          {globalError && <p className="error">{globalError}</p>}
          {isLoadingData && <p className="hint">⏳ جاري تحميل التقارير...</p>}

          <ReportTable
            reports={reports}
            date={selectedDate}
            onRemoveReport={handleRemoveReport}
          />
        </main>
      )}
    </div>
  );
}
