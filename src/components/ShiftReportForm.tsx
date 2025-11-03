import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AuthenticatedUser, EmployeeSummary, ShiftName } from '../types';
import { normalizeProductivity, shiftOptions } from '../utils/reportUtils';

export interface SubmitShiftReportPayload {
  employeeId: string;
  shift: ShiftName;
  date: string;
  tasksCompleted: string;
  issues: string;
  handoverNotes: string;
  productivityScore?: number;
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
  const [shift, setShift] = useState<ShiftName>('الصباح');
  const [tasksCompleted, setTasksCompleted] = useState('');
  const [issues, setIssues] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [productivity, setProductivity] = useState('');
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

  const productivityNumber = useMemo(() => {
    const value = Number(productivity);
    return Number.isNaN(value) ? undefined : normalizeProductivity(value);
  }, [productivity]);

  const canSelectEmployee = currentUser.role === 'manager';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!employeeId) {
      setError('يرجى اختيار موظف لإرسال التقرير.');
      return;
    }

    if (!tasksCompleted.trim()) {
      setError('الرجاء إدخال المهام المنجزة.');
      return;
    }

    try {
      await onSubmit({
        employeeId,
        shift,
        date,
        tasksCompleted,
        issues,
        handoverNotes,
        productivityScore: productivityNumber
      });
      setTasksCompleted('');
      setIssues('');
      setHandoverNotes('');
      setProductivity('');
      setSuccess('تم حفظ التقرير بنجاح.');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'تعذر حفظ التقرير.');
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>إدخال تقرير شفت</h2>
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
          <span>تاريخ الشفت</span>
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

        <label className="field">
          <span>تقييم الإنتاجية (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={productivity}
            onChange={(event) => setProductivity(event.target.value)}
            placeholder="مثال: 85"
          />
        </label>
      </div>

      <label className="field">
        <span>المهام المنجزة</span>
        <textarea
          value={tasksCompleted}
          onChange={(event) => setTasksCompleted(event.target.value)}
          placeholder="أدخل أهم المهام التي تمت خلال الشفت"
          required
        />
      </label>

      <label className="field">
        <span>الملاحظات والبلاغات</span>
        <textarea
          value={issues}
          onChange={(event) => setIssues(event.target.value)}
          placeholder="أدخل المشاكل أو البلاغات إن وجدت"
        />
      </label>

      <label className="field">
        <span>ملاحظات التسليم</span>
        <textarea
          value={handoverNotes}
          onChange={(event) => setHandoverNotes(event.target.value)}
          placeholder="ملاحظات تساعد الفريق في الشفت التالي"
        />
      </label>

      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      <button type="submit" className="primary" disabled={isSubmitting}>
        {isSubmitting ? 'جاري الحفظ...' : 'حفظ التقرير'}
      </button>
    </form>
  );
}
