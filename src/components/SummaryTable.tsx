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
            <h2>التقارير المدخلة</h2>
            <p>التاريخ المحدد: {date}</p>
          </div>
        </header>
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الموظف</th>
              <th>الشفت</th>
              <th>المهام الرئيسية</th>
              <th>الملاحظات</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td>{report.date}</td>
                <td>{report.employeeName}</td>
                <td>{report.shift}</td>
                <td>{report.tasksCompleted}</td>
                <td>
                  <div className="notes">
                    {report.issues ? <p>بلاغات: {report.issues}</p> : null}
                    {report.handoverNotes ? <p>تسليم: {report.handoverNotes}</p> : null}
                    {typeof report.productivityScore === 'number' ? (
                      <p>الإنتاجية: {report.productivityScore}%</p>
                    ) : null}
                  </div>
                </td>
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
      </article>

      <article className="card">
        <header className="sectionHeader">
          <div>
            <h2>ملخص اليوم</h2>
            <p>ملخص حسب الموظف للشفتات المدخلة.</p>
          </div>
          {canTriggerSummary ? (
            <button type="button" className="secondary" onClick={handleSendSummary} disabled={isSending}>
              {isSending ? 'جاري الإرسال...' : 'إرسال الملخص للبريد'}
            </button>
          ) : null}
        </header>
        {message ? <p className="success compact">{message}</p> : null}
        {error ? <p className="error compact">{error}</p> : null}
        <table>
          <thead>
            <tr>
              <th>الموظف</th>
              <th>عدد الشفتات</th>
              <th>متوسط الإنتاجية</th>
              <th>أبرز المهام</th>
              <th>الملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((row) => (
              <tr key={row.employeeId}>
                <td>{row.employeeName}</td>
                <td>{row.totalShifts}</td>
                <td>{row.productivityAverage ?? 'غير متوفر'}</td>
                <td>
                  <ul>
                    {row.tasks.map((task, index) => (
                      <li key={`${row.employeeId}-task-${index}`}>{task}</li>
                    ))}
                  </ul>
                </td>
                <td>
                  <ul>
                    {[...row.issues, ...row.handoverNotes].map((note, index) => (
                      <li key={`${row.employeeId}-note-${index}`}>{note}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
