import { FormEvent, useMemo, useState } from 'react';
import { AuthenticatedUser, ShiftName } from '../types';
import { getArabicDayName, shiftOptions } from '../utils/reportUtils';

export interface SubmitShiftReportPayload {
  employeeId: string;
  employeeName: string;
  shift: ShiftName;
  date: string;
  dayName: string;
  visitorsCount: number;
  callsCount: number;
  socialMediaCount: number;
  bookingSource: string;
  bookingType: string;
  needs: string;
  entryCount: number;
  exitCount: number;
  notes: string;
  dailyRevenue: number;
  totalRevenue: number;
}

interface ShiftReportFormProps {
  currentUser: AuthenticatedUser;
  date: string;
  onDateChange: (value: string) => void;
  onSubmit: (payload: SubmitShiftReportPayload) => Promise<void> | void;
  isSubmitting?: boolean;
}

export default function ShiftReportForm({
  currentUser,
  date,
  onDateChange,
  onSubmit,
  isSubmitting = false
}: ShiftReportFormProps) {
  const employeeOptions = ['تغريد', 'ريناد', 'أصالة', 'عيسى'];
  const [selectedEmployee, setSelectedEmployee] = useState(employeeOptions[0]);
  const [shift, setShift] = useState<ShiftName>('الصباحي (9ص - 5م)');
  const [visitorsCount, setVisitorsCount] = useState('');
  const [callsCount, setCallsCount] = useState('');
  const [socialMediaCount, setSocialMediaCount] = useState('');
  const [bookingSource, setBookingSource] = useState('');
  const [bookingType, setBookingType] = useState('');
  const [needs, setNeeds] = useState('');
  const [entryCount, setEntryCount] = useState('');
  const [exitCount, setExitCount] = useState('');
  const [notes, setNotes] = useState('');
  const [dailyRevenue, setDailyRevenue] = useState('');
  const [totalRevenue, setTotalRevenue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const dayName = useMemo(() => getArabicDayName(date), [date]);

  // حساب العملية الحسابية للإيراد اليومي
  const calculatedRevenue = useMemo(() => {
    try {
      // السماح فقط بالأرقام وعلامات الجمع والطرح والضرب والقسمة والنقطة والمسافات
      const sanitized = dailyRevenue.replace(/[^0-9+\-*/.\s]/g, '');
      if (!sanitized.trim()) return 0;
      // تقييم العملية الحسابية بأمان
      const result = Function('"use strict"; return (' + sanitized + ')')();
      return isNaN(result) ? 0 : Math.round(result * 100) / 100;
    } catch {
      return 0;
    }
  }, [dailyRevenue]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await onSubmit({
        employeeId: currentUser.id,
        employeeName: selectedEmployee,
        shift,
        date,
        dayName,
        visitorsCount: Number(visitorsCount) || 0,
        callsCount: Number(callsCount) || 0,
        socialMediaCount: Number(socialMediaCount) || 0,
        bookingSource,
        bookingType,
        needs,
        entryCount: Number(entryCount) || 0,
        exitCount: Number(exitCount) || 0,
        notes,
        dailyRevenue: calculatedRevenue,
        totalRevenue: calculatedRevenue
      });
      // مسح الحقول بعد الإرسال
      setVisitorsCount('');
      setCallsCount('');
      setSocialMediaCount('');
      setBookingSource('');
      setBookingType('');
      setNeeds('');
      setEntryCount('');
      setExitCount('');
      setNotes('');
      setDailyRevenue('');
      setSuccess('✅ تم حفظ التقرير بنجاح!');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'تعذر حفظ التقرير.');
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>📝 تقرير الشفت</h2>
      
      <div className="form-grid">
        <label className="field">
          <span>اسم الموظف</span>
          <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
            {employeeOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>الشفت</span>
          <select value={shift} onChange={(e) => setShift(e.target.value as ShiftName)}>
            {shiftOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>التاريخ</span>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            required
          />
        </label>

        <div className="field readOnly">
          <span>اليوم</span>
          <strong>{dayName}</strong>
        </div>

        <label className="field">
          <span>عدد الزوار</span>
          <input
            type="number"
            min={0}
            value={visitorsCount}
            onChange={(e) => setVisitorsCount(e.target.value)}
            placeholder="0"
          />
        </label>

        <label className="field">
          <span>عدد الاتصالات</span>
          <input
            type="number"
            min={0}
            value={callsCount}
            onChange={(e) => setCallsCount(e.target.value)}
            placeholder="0"
          />
        </label>

        <label className="field">
          <span>التواصل الاجتماعي</span>
          <input
            type="number"
            min={0}
            value={socialMediaCount}
            onChange={(e) => setSocialMediaCount(e.target.value)}
            placeholder="0"
          />
        </label>

        <div className="field readOnly">
          <span>مجموع التواصل</span>
          <strong>{(Number(visitorsCount) || 0) + (Number(callsCount) || 0) + (Number(socialMediaCount) || 0)}</strong>
        </div>

        <label className="field">
          <span>مصدر الحجز</span>
          <input
            type="text"
            value={bookingSource}
            onChange={(e) => setBookingSource(e.target.value)}
            placeholder="مثال: بوكينج"
          />
        </label>

        <label className="field">
          <span>نوع الحجز</span>
          <input
            type="text"
            value={bookingType}
            onChange={(e) => setBookingType(e.target.value)}
            placeholder="مثال: غرفة"
          />
        </label>

        <label className="field">
          <span>عدد الدخول</span>
          <input
            type="number"
            min={0}
            value={entryCount}
            onChange={(e) => setEntryCount(e.target.value)}
            placeholder="0"
          />
        </label>

        <label className="field">
          <span>عدد الخروج</span>
          <input
            type="number"
            min={0}
            value={exitCount}
            onChange={(e) => setExitCount(e.target.value)}
            placeholder="0"
          />
        </label>

        <label className="field">
          <span>الإيراد اليومي (يمكن الجمع)</span>
          <input
            type="text"
            value={dailyRevenue}
            onChange={(e) => setDailyRevenue(e.target.value)}
            placeholder="مثال: 140+20+50"
            dir="ltr"
            style={{ textAlign: 'left' }}
          />
        </label>

        <div className="field readOnly">
          <span>الإجمالي</span>
          <strong>{calculatedRevenue}</strong>
        </div>
      </div>

      <label className="field">
        <span>الاحتياج</span>
        <textarea
          value={needs}
          onChange={(e) => setNeeds(e.target.value)}
          placeholder="أدخل أي احتياجات..."
          rows={2}
        />
      </label>

      <label className="field">
        <span>ملاحظات</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أدخل أي ملاحظات إضافية..."
          rows={2}
        />
      </label>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <button type="submit" className="primary" disabled={isSubmitting}>
        {isSubmitting ? '⏳ جاري الحفظ...' : '📤 إرسال التقرير'}
      </button>
    </form>
  );
}
