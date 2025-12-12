import { useState } from 'react';
import { AuthenticatedUser, DailySummaryRow, ShiftReport } from '../types';

interface SummaryTableProps {
  currentUser: AuthenticatedUser;
  date: string;
  reports: ShiftReport[];
  summaryRows: DailySummaryRow[];
  onRemoveReport: (id: string) => Promise<void> | void;
  onSendSummaryEmail?: () => Promise<void>;
}

export default function SummaryTable({
  currentUser,
  date,
  reports,
  summaryRows,
  onRemoveReport,
  onSendSummaryEmail
}: SummaryTableProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const canRemove = (report: ShiftReport) => currentUser.role === 'manager' || report.employeeId === currentUser.id;
  const canTriggerSummary = currentUser.role === 'manager' && typeof onSendSummaryEmail === 'function';

  if (reports.length === 0) {
    return (
      <section className="card">
        <h2>لا توجد تقارير بعد</h2>
        <p>أدخل تقارير الشفتات لعرض ملخص اليوم تلقائياً.</p>
      </section>
    );
  }

  const handleSendSummary = async () => {
    if (!onSendSummaryEmail) {
      return;
    }

    setIsSending(true);
    setMessage(null);
    setError(null);

    try {
      const result = await onSendSummaryEmail();
      const label = typeof result === 'string' ? result : 'تم تجهيز ملف الإكسل وإرساله (أو حفظه) بنجاح.';
      setMessage(label);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'تعذر إرسال الملخص عبر البريد.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="grid">
      <article className="card">
        <header className="sectionHeader">
          <div>
            <h2>تقارير الشفتات</h2>
            <p>التاريخ المحدد: {date}</p>
          </div>
        </header>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>اليوم</th>
                <th>الموظف</th>
                <th>الشفت</th>
                <th>البداية</th>
                <th>النهاية</th>
                <th>الزوار</th>
                <th>الاتصالات</th>
                <th>التواصل</th>
                <th>الدخول</th>
                <th>الخروج</th>
                <th>الاحتياج</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.date}</td>
                  <td>{report.dayName}</td>
                  <td>{report.employeeName}</td>
                  <td>{report.shift}</td>
                  <td>{report.shiftStart}</td>
                  <td>{report.shiftEnd}</td>
                  <td>{report.visitorsCount}</td>
                  <td>{report.callsCount}</td>
                  <td>{report.socialMediaCount}</td>
                  <td>{report.entryCount}</td>
                  <td>{report.exitCount}</td>
                  <td>{report.needs || '-'}</td>
                  <td>
                    {canRemove(report) ? (
                      <button type="button" className="link" onClick={() => onRemoveReport(report.id)}>
                        حذف
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card">
        <header className="sectionHeader">
          <div>
            <h2>ملخص اليوم</h2>
            <p>إجماليات حسب الموظف</p>
          </div>
          {canTriggerSummary ? (
            <button type="button" className="secondary" onClick={handleSendSummary} disabled={isSending}>
              {isSending ? 'جاري الإرسال...' : 'إرسال الملخص للبريد'}
            </button>
          ) : null}
        </header>
        {message ? <p className="success compact">{message}</p> : null}
        {error ? <p className="error compact">{error}</p> : null}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>الموظف</th>
                <th>الشفتات</th>
                <th>الزوار</th>
                <th>الاتصالات</th>
                <th>التواصل</th>
                <th>الدخول</th>
                <th>الخروج</th>
                <th>الاحتياجات</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => (
                <tr key={row.employeeId}>
                  <td>{row.employeeName}</td>
                  <td>{row.totalShifts}</td>
                  <td>{row.totalVisitors}</td>
                  <td>{row.totalCalls}</td>
                  <td>{row.totalSocialMedia}</td>
                  <td>{row.totalEntry}</td>
                  <td>{row.totalExit}</td>
                  <td>
                    {row.needs.length > 0 ? (
                      <ul>
                        {row.needs.map((need, index) => (
                          <li key={`${row.employeeId}-need-${index}`}>{need}</li>
                        ))}
                      </ul>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
