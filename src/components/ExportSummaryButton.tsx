import { useState } from 'react';
import { DailySummaryRow, ShiftReport } from '../types';
import { exportDailySummaryToExcel, createExcelFile } from '../utils/reportUtils';

interface ExportSummaryButtonProps {
  reports: ShiftReport[];
  summaryRows: DailySummaryRow[];
  date: string;
}

export default function ExportSummaryButton({ reports, summaryRows, date }: ExportSummaryButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const disabled = reports.length === 0;
  const fileName = `تقرير-الاستقبال-${date}`;

  const handleExport = () => {
    if (disabled) return;
    exportDailySummaryToExcel(reports, summaryRows, fileName);
    setMessage('✅ تم تنزيل الملف');
    setTimeout(() => setMessage(null), 3000);
  };

  // مشاركة ملف Excel مباشرة عبر واتساب
  const handleWhatsApp = async () => {
    if (disabled) return;
    
    try {
      const file = createExcelFile(reports, summaryRows, fileName);
      
      // تحقق من دعم مشاركة الملفات
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `تقرير الاستقبال - ${date}`,
          text: `تقرير الاستقبال ليوم ${date}`
        });
      } else {
        // المتصفح لا يدعم - يحتاج جوال
        setMessage('⚠️ مشاركة الملفات تعمل على الجوال فقط. استخدم "تنزيل إكسل"');
        setTimeout(() => setMessage(null), 4000);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setMessage('⚠️ افتح من الجوال لمشاركة الملف مباشرة');
        setTimeout(() => setMessage(null), 4000);
      }
    }
  };

  // إرسال عبر الإيميل
  const handleEmail = () => {
    if (disabled) return;
    exportDailySummaryToExcel(reports, summaryRows, fileName);
    const subject = encodeURIComponent(`تقرير الاستقبال - ${date}`);
    const body = encodeURIComponent(`مرحباً،\n\nمرفق تقرير الاستقبال ليوم ${date}.\n\nمع التحية`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setMessage('📥 تم تنزيل الملف - أرفقه');
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      {message && (
        <p style={{ 
          background: message.includes('✅') ? '#d4edda' : '#fff3cd', 
          color: message.includes('✅') ? '#155724' : '#856404',
          padding: '0.75rem 1.5rem', 
          borderRadius: '8px',
          margin: 0,
          fontWeight: 600,
          textAlign: 'center'
        }}>
          {message}
        </p>
      )}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button type="button" className="secondary" onClick={handleExport} disabled={disabled}>
          📥 تنزيل إكسل
        </button>
        <button 
          type="button" 
          onClick={handleWhatsApp} 
          disabled={disabled}
          style={{ background: '#25D366', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          📱 واتساب
        </button>
        <button 
          type="button" 
          onClick={handleEmail} 
          disabled={disabled}
          style={{ background: '#EA4335', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          📧 إيميل
        </button>
      </div>
    </div>
  );
}
