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
  getReportsByDateRange,
  removeReport
} from './services/firebase';
import { AuthenticatedUser, ShiftReport } from './types';

const today = () => new Date().toISOString().slice(0, 10);

type TabType = 'today' | 'history';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [historyReports, setHistoryReports] = useState<ShiftReport[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => today());
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [startDate, setStartDate] = useState<string>(() => today());
  const [endDate, setEndDate] = useState<string>(() => today());
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const isAuthenticated = Boolean(currentUser);

  // تصفية التقارير حسب الموظف الحالي
  const filteredReports = currentUser 
    ? reports.filter(r => r.employeeName === currentUser.name)
    : [];
  
  const filteredHistoryReports = currentUser 
    ? historyReports.filter(r => r.employeeName === currentUser.name)
    : [];

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
      // تحميل تقرير اليوم فقط
      const todayDate = today();
      const reportsData = await getReportsByDate(todayDate, currentUser.id);
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports:', error);
      setReports([]);
      setGlobalError(error instanceof Error ? error.message : 'تعذر تحميل البيانات.');
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser]);

  // تحميل سجل التقارير
  const loadHistoryReports = useCallback(async () => {
    if (!currentUser) {
      setHistoryReports([]);
      return;
    }

    setIsLoadingHistory(true);
    setGlobalError(null);
    try {
      const reportsData = await getReportsByDateRange(startDate, endDate, currentUser.id);
      setHistoryReports(reportsData);
    } catch (error) {
      console.error('Error loading history:', error);
      setHistoryReports([]);
      setGlobalError(error instanceof Error ? error.message : 'تعذر تحميل السجل.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [currentUser, startDate, endDate]);

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

  // حذف تقرير من السجل
  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التقرير؟')) return;
    
    try {
      await removeReport(reportId);
      setHistoryReports(prev => prev.filter(r => r.id !== reportId));
    } catch (error) {
      console.error('Error deleting report:', error);
      setGlobalError('تعذر حذف التقرير.');
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
          {/* التبويبات */}
          <div className="tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              style={{
                padding: '0.8rem 1.5rem',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                background: activeTab === 'today' ? '#3498db' : '#e0e0e0',
                color: activeTab === 'today' ? 'white' : '#333'
              }}
            >
              📝 تقرير اليوم
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              style={{
                padding: '0.8rem 1.5rem',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                background: activeTab === 'history' ? '#3498db' : '#e0e0e0',
                color: activeTab === 'history' ? 'white' : '#333'
              }}
            >
              📋 سجل التقارير
            </button>
          </div>

          {activeTab === 'today' ? (
            <>
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
                reports={filteredReports}
                date={today()}
              />
            </>
          ) : (
            <>
              {/* سجل التقارير */}
              <div className="card" style={{ marginBottom: '1rem' }}>
                <h2>📋 سجل التقارير</h2>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '1rem' }}>
                  <label className="field" style={{ flex: 1, minWidth: '150px' }}>
                    <span>من تاريخ</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </label>
                  <label className="field" style={{ flex: 1, minWidth: '150px' }}>
                    <span>إلى تاريخ</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={loadHistoryReports}
                    disabled={isLoadingHistory}
                    style={{
                      padding: '0.8rem 1.5rem',
                      background: '#27ae60',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      marginTop: '1.5rem'
                    }}
                  >
                    {isLoadingHistory ? '⏳ جاري البحث...' : '🔍 عرض التقارير'}
                  </button>
                </div>
              </div>

              {globalError && <p className="error">{globalError}</p>}

              <ReportTable
                reports={filteredHistoryReports}
                date={`${startDate} - ${endDate}`}
                onDelete={handleDeleteReport}
              />
            </>
          )}
        </main>
      )}
    </div>
  );
}
