import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AuthenticatedUser, EmployeeSummary, ShiftName } from '../types';
import { getArabicDayName, getShiftTimes, shiftOptions } from '../utils/reportUtils';

export interface SubmitShiftReportPayload {
  employeeId: string;
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
}

interface ShiftReportFormProps {
  currentUser: AuthenticatedUser;
  employees: EmployeeSummary[];
  date: string;
  onDateChange: (value: string) => void;
  onSubmit: (payload: SubmitShiftReportPayload) => Promise<void> | void;
  isSubmitting?: boolean;
}

export default function ShiftReportForm({
  currentUser,
  employees,
  date,
  onDateChange,
  onSubmit,
  isSubmitting = false
}: ShiftReportFormProps) {
  const [employeeId, setEmployeeId] = useState<string>(
    currentUser.role === 'employee' ? currentUser.id : employees[0]?.id ?? ''
  );
  const [shift, setShift] = useState<ShiftName>('الصباحي (9ص - 5م)');
  const [visitorsCount, setVisitorsCount] = useState('');
  const [callsCount, setCallsCount] = useState('');
  const [socialMediaCount, setSocialMediaCount] = useState('');
  const [needs, setNeeds] = useState('');
  const [entryCount, setEntryCount] = useState('');
  const [exitCount, setExitCount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser.role === 'employee') {
      setEmployeeId(currentUser.id);
      return;
    }

    if (!employeeId && employees.length > 0) {
      setEmployeeId(employees[0].id);
    }
  }, [currentUser, employeeId, employees]);

  const dayName = useMemo(() => getArabicDayName(date), [date]);
  const shiftTimes = useMemo(() => getShiftTimes(shift), [shift]);

  const canSelectEmployee = currentUser.role === 'manager';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!employeeId) {
      setError('يرجى اختيار موظف لإرسال التقرير.');
      return;
    }

    try {
      await onSubmit({
        employeeId,
        shift,
        date,
        dayName,
        shiftStart: shiftTimes.start,
        shiftEnd: shiftTimes.end,
        visitorsCount: Number(visitorsCount) || 0,
        callsCount: Number(callsCount) || 0,
        socialMediaCount: Number(socialMediaCount) || 0,
        needs,
        entryCount: Number(entryCount) || 0,
        exitCount: Number(exitCount) || 0
      });
      setVisitorsCount('');
      setCallsCount('');
      setSocialMediaCount('');
      setNeeds('');
      setEntryCount('');
      setExitCount('');
      setSuccess('تم حفظ التقرير بنجاح.');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'تعذر حفظ التقرير.');
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>تقرير شفت الاستقبال</h2>
      <div className="form-grid">
        {canSelectEmployee ? (
          <label className="field">
            <span>اسم الموظف</span>
            <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="field readOnly">
            <span>اسم الموظف</span>
            <strong>{currentUser.name}</strong>
          </div>
        )}

        <label className="field">
          <span>التاريخ</span>
          <input
            type="date"
            value={date}
            onChange={(event) => {
              const next = event.target.value;
              if (next) {
                onDateChange(next);
              }
            }}
            required
          />
        </label>

        <div className="field readOnly">
          <span>اليوم</span>
          <strong>{dayName}</strong>
        </div>

        <label className="field">
          <span>الشفت</span>
          <select value={shift} onChange={(event) => setShift(event.target.value as ShiftName)}>
            {shiftOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="field readOnly">
          <span>بداية الشفت</span>
          <strong>{shiftTimes.start}</strong>
        </div>

        <div className="field readOnly">
          <span>نهاية الشفت</span>
          <strong>{shiftTimes.end}</strong>
        </div>

        <label className="field">
          <span>عدد الزوار</span>
          <input
            type="number"
            min={0}
            value={visitorsCount}
            onChange={(event) => setVisitorsCount(event.target.value)}
            placeholder="0"
            required
          />
        </label>

        <label className="field">
          <span>عدد الاتصالات</span>
          <input
            type="number"
            min={0}
            value={callsCount}
            onChange={(event) => setCallsCount(event.target.value)}
            placeholder="0"
            required
          />
        </label>

        <label className="field">
          <span>التواصل الاجتماعي</span>
          <input
            type="number"
            min={0}
            value={socialMediaCount}
            onChange={(event) => setSocialMediaCount(event.target.value)}
            placeholder="0"
            required
          />
        </label>

        <label className="field">
          <span>عدد الدخول</span>
          <input
            type="number"
            min={0}
            value={entryCount}
            onChange={(event) => setEntryCount(event.target.value)}
            placeholder="0"
            required
          />
        </label>

        <label className="field">
          <span>عدد الخروج</span>
          <input
            type="number"
            min={0}
            value={exitCount}
            onChange={(event) => setExitCount(event.target.value)}
            placeholder="0"
            required
          />
        </label>
      </div>

      <label className="field">
        <span>الاحتياج</span>
        <textarea
          value={needs}
          onChange={(event) => setNeeds(event.target.value)}
          placeholder="أدخل أي احتياجات أو ملاحظات"
        />
      </label>

      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      <button type="submit" className="primary" disabled={isSubmitting}>
        {isSubmitting ? 'جاري الحفظ...' : 'إرسال التقرير'}
      </button>
    </form>
  );
}
