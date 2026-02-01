import { useState, useRef, useEffect } from 'react';
import { ShiftReport } from '../types';
import { getArabicDayName } from '../utils/reportUtils';

interface ReportTableProps {
  reports: ShiftReport[];
  date: string;
  onDelete?: (reportId: string) => void;
}

export default function ReportTable({ reports, date, onDelete }: ReportTableProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const dayName = getArabicDayName(date);

  // حساب الإجماليات
  const totals = reports.reduce((acc, r) => ({
    visitors: acc.visitors + r.visitorsCount,
    calls: acc.calls + r.callsCount,
    social: acc.social + r.socialMediaCount,
    interaction: acc.interaction + r.visitorsCount + r.callsCount + r.socialMediaCount,
    entry: acc.entry + r.entryCount,
    exit: acc.exit + r.exitCount,
    revenue: acc.revenue + r.dailyRevenue,
    total: acc.total + r.totalRevenue
  }), { visitors: 0, calls: 0, social: 0, interaction: 0, entry: 0, exit: 0, revenue: 0, total: 0 });

  // توليد الصورة
  const generateImage = async (): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const width = 1100;
    const rowHeight = 50;
    const headerHeight = 160;
    const revenueDetailsHeight = reports.filter(r => r.dailyRevenueDetails && r.dailyRevenueDetails.includes('+')).length > 0 ? 80 : 0;
    const footerHeight = 180 + revenueDetailsHeight;
    const height = headerHeight + (reports.length * rowHeight) + footerHeight + 100;
    
    canvas.width = width;
    canvas.height = height;

    // خلفية متدرجة احترافية داكنة
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0f0c29');
    gradient.addColorStop(0.5, '#302b63');
    gradient.addColorStop(1, '#24243e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // إطار ذهبي مزدوج
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, width - 24, height - 24);
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // شعار/أيقونة
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏢', width / 2, 60);

    // العنوان الرئيسي
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('تقرير الاستقبال اليومي', width / 2, 105);

    // خط زخرفي
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(300, 120);
    ctx.lineTo(800, 120);
    ctx.stroke();

    // التاريخ واليوم
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(`📅 ${dayName}  |  ${date}`, width / 2, 150);

    // رؤوس الجدول
    const startY = 200;
    const columns = [
      { label: 'الموظف', x: 1050 },
      { label: 'الشفت', x: 960 },
      { label: 'الزوار', x: 870 },
      { label: 'الاتصالات', x: 780 },
      { label: 'التواصل', x: 690 },
      { label: 'مجموع التواصل', x: 565 },
      { label: 'الدخول', x: 440 },
      { label: 'الخروج', x: 380 },
      { label: 'الإيراد', x: 260 },
      { label: 'الإجمالي', x: 130 }
    ];

    // خلفية رؤوس الجدول
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(40, startY - 30, width - 80, 45);

    ctx.fillStyle = '#0f0c29';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'right';
    columns.forEach(col => {
      ctx.fillText(col.label, col.x, startY);
    });

    // صفوف البيانات
    ctx.font = '14px Arial';
    reports.forEach((report, index) => {
      const y = startY + 50 + (index * rowHeight);
      
      // خلفية الصف متبادلة
      ctx.fillStyle = index % 2 === 0 ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(40, y - 25, width - 80, rowHeight);

      // خط فاصل
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, y + 20);
      ctx.lineTo(width - 40, y + 20);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      
      const shortShift = report.shift.includes('صباحي') ? '☀️ صباحي' : 
                         report.shift.includes('مسائي') ? '🌙 مسائي' : '🌃 ليلي';

      const interactionTotal = report.visitorsCount + report.callsCount + report.socialMediaCount;
      const rowData = [
        { value: report.employeeName, x: 1050 },
        { value: shortShift, x: 960 },
        { value: String(report.visitorsCount), x: 870 },
        { value: String(report.callsCount), x: 780 },
        { value: String(report.socialMediaCount), x: 690 },
        { value: String(interactionTotal), x: 565 },
        { value: String(report.entryCount), x: 440 },
        { value: String(report.exitCount), x: 380 },
        { value: `${report.dailyRevenue}`, x: 260 },
        { value: `${report.totalRevenue}`, x: 130 }
      ];

      rowData.forEach(item => {
        ctx.fillText(item.value, item.x, y);
      });
    });

    // قسم الإجماليات
    const summaryY = startY + 70 + (reports.length * rowHeight);
    
    // خلفية الإجماليات
    const summaryGradient = ctx.createLinearGradient(40, summaryY - 15, 40, summaryY + 70);
    summaryGradient.addColorStop(0, '#ffd700');
    summaryGradient.addColorStop(1, '#ffb347');
    ctx.fillStyle = summaryGradient;
    ctx.fillRect(40, summaryY - 15, width - 80, 85);

    ctx.fillStyle = '#0f0c29';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📊 المجموع الكلي', width / 2, summaryY + 12);

    ctx.font = 'bold 14px Arial';
    const line1 = `👥 الزوار: ${totals.visitors}  |  📞 الاتصالات: ${totals.calls}  |  💬 التواصل: ${totals.social}  |  🔢 مجموع التواصل: ${totals.interaction}`;
    const line2 = `🚪 الدخول: ${totals.entry}  |  🚶 الخروج: ${totals.exit}  |  💰 الإيراد: ${totals.revenue}  |  💎 الإجمالي: ${totals.total}`;
    ctx.fillText(line1, width / 2, summaryY + 38);
    ctx.fillText(line2, width / 2, summaryY + 60);

    // الملاحظات والاحتياجات
    const notesY = summaryY + 95;
    const allNeeds = reports.map(r => r.needs).filter(Boolean);
    const allNotes = reports.map(r => r.notes).filter(Boolean);

    if (allNeeds.length > 0 || allNotes.length > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(40, notesY, width - 80, 50);

      ctx.fillStyle = '#ffd700';
      ctx.font = '13px Arial';
      ctx.textAlign = 'right';
      
      if (allNeeds.length > 0) {
        const needsText = allNeeds.slice(0, 2).join(' | ');
        ctx.fillText(`📌 الاحتياجات: ${needsText.substring(0, 80)}`, width - 55, notesY + 20);
      }
      if (allNotes.length > 0) {
        const notesText = allNotes.slice(0, 2).join(' | ');
        ctx.fillText(`📝 ملاحظات: ${notesText.substring(0, 80)}`, width - 55, notesY + 40);
      }
    }

    // قسم تفاصيل الإيراد
    const reportsWithDetails = reports.filter(r => r.dailyRevenueDetails && r.dailyRevenueDetails.includes('+'));
    let revenueDetailsEndY = notesY + (allNeeds.length > 0 || allNotes.length > 0 ? 60 : 0);
    
    if (reportsWithDetails.length > 0) {
      const revenueY = revenueDetailsEndY + 10;
      
      // خلفية قسم تفاصيل الإيراد
      ctx.fillStyle = 'rgba(0, 200, 83, 0.15)';
      ctx.fillRect(40, revenueY, width - 80, 60);
      
      // عنوان
      ctx.fillStyle = '#00c853';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('💵 تفاصيل الإيراد', width / 2, revenueY + 18);
      
      // تفاصيل كل موظف
      ctx.font = '13px Arial';
      ctx.textAlign = 'right';
      const detailsText = reportsWithDetails.map(r => 
        `${r.employeeName}: ${r.dailyRevenueDetails} = ${r.dailyRevenue}`
      ).join('  |  ');
      
      ctx.fillText(detailsText, width - 55, revenueY + 42);
      revenueDetailsEndY = revenueY + 65;
    }

    // التذييل
    ctx.fillStyle = '#ffd700';
    ctx.font = '13px Arial';
    ctx.textAlign = 'center';
    const now = new Date();
    ctx.fillText(`⏰ ${now.toLocaleTimeString('ar-SA')} | نظام تقارير الاستقبال © 2025`, width / 2, height - 35);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  // توليد وعرض الصورة
  const handleGenerateImage = async () => {
    if (reports.length === 0) return;
    
    setIsGenerating(true);
    try {
      const blob = await generateImage();
      if (blob) {
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // مشاركة عبر واتساب
  const handleShareWhatsApp = async () => {
    if (reports.length === 0) return;
    
    setIsGenerating(true);
    try {
      const blob = await generateImage();
      if (!blob) return;

      const file = new File([blob], `تقرير-${date}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `تقرير الاستقبال - ${date}`,
          text: `تقرير الاستقبال ليوم ${dayName} ${date}`
        });
      } else {
        // الكمبيوتر: تنزيل الصورة وفتح واتساب
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `تقرير-${date}.png`;
        a.click();
        URL.revokeObjectURL(url);
        
        setTimeout(() => {
          window.open('https://web.whatsapp.com/', '_blank');
        }, 500);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // تنزيل الصورة
  const handleDownload = async () => {
    if (reports.length === 0) return;
    
    setIsGenerating(true);
    try {
      const blob = await generateImage();
      if (!blob) return;

      // الحصول على أسماء الموظفين من التقارير
      const employeeNames = [...new Set(reports.map(r => r.employeeName))].join('-');
      const now = new Date();
      const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }).replace(':', '-');
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `تقرير-${employeeNames}-${date}-${timeStr}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
    }
  };

  if (reports.length === 0) {
    return (
      <section className="card">
        <h2>📋 لا توجد تقارير</h2>
        <p>أضف تقريرك الأول لعرضه هنا</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>📊 تقارير اليوم ({reports.length})</h2>
      <p style={{ color: '#666', marginBottom: '1rem' }}>{dayName} - {date}</p>

      {/* جدول التقارير */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>الموظف</th>
              <th>الشفت</th>
              <th>الزوار</th>
              <th>الاتصالات</th>
              <th>التواصل</th>
              <th>مجموع التواصل</th>
              <th>مصدر الحجز</th>
              <th>نوع الحجز</th>
              <th>الدخول</th>
              <th>الخروج</th>
              <th>الإيراد</th>
              <th>الإجمالي</th>
              {onDelete && <th>إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td>{report.employeeName}</td>
                <td>{report.shift.split(' ')[0]}</td>
                <td>{report.visitorsCount}</td>
                <td>{report.callsCount}</td>
                <td>{report.socialMediaCount}</td>
                <td>{report.visitorsCount + report.callsCount + report.socialMediaCount}</td>
                <td>{report.bookingSource || '-'}</td>
                <td>{report.bookingType || '-'}</td>
                <td>{report.entryCount}</td>
                <td>{report.exitCount}</td>
                <td>{report.dailyRevenue}</td>
                <td>{report.totalRevenue}</td>
                {onDelete && (
                  <td>
                    <button
                      type="button"
                      onClick={() => onDelete(report.id)}
                      style={{
                        background: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        padding: '0.3rem 0.8rem',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      🗑️ حذف
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold', background: '#f8f9fa' }}>
              <td>الإجمالي</td>
              <td>-</td>
              <td>{totals.visitors}</td>
              <td>{totals.calls}</td>
              <td>{totals.social}</td>
              <td>{totals.interaction}</td>
              <td>-</td>
              <td>-</td>
              <td>{totals.entry}</td>
              <td>{totals.exit}</td>
              <td>{totals.revenue}</td>
              <td>{totals.total}</td>
              {onDelete && <td>-</td>}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* شريط تفاصيل الإيراد */}
      {reports.some(r => r.dailyRevenueDetails) && (
        <div style={{ 
          background: '#f8f9fa', 
          border: '2px solid #ffd700', 
          borderRadius: '10px', 
          padding: '1rem', 
          marginTop: '1rem' 
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>💰 تفاصيل الإيراد</h3>
          {reports.map((report, index) => (
            report.dailyRevenueDetails && (
              <div key={report.id} style={{ 
                padding: '0.5rem', 
                background: index % 2 === 0 ? '#fff' : '#f0f0f0',
                borderRadius: '5px',
                marginBottom: '0.3rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <span style={{ fontWeight: 'bold', color: '#3498db' }}>
                  {report.employeeName} ({report.shift.split(' ')[0]}):
                </span>
                <span style={{ direction: 'ltr', fontFamily: 'monospace', fontSize: '14px' }}>
                  {report.dailyRevenueDetails} = <strong>{report.dailyRevenue}</strong>
                </span>
              </div>
            )
          ))}
          <div style={{ 
            marginTop: '0.5rem', 
            paddingTop: '0.5rem', 
            borderTop: '2px solid #ffd700',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>
            📊 المجموع الكلي: {totals.revenue}
          </div>
        </div>
      )}

      {/* أزرار المشاركة */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1.5rem' }}>
        <button 
          type="button" 
          onClick={handleDownload}
          disabled={isGenerating}
          style={{ 
            background: '#3498db', 
            color: 'white', 
            border: 'none', 
            padding: '0.8rem 1.5rem', 
            borderRadius: '10px', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          {isGenerating ? '⏳' : '📥'} تنزيل صورة
        </button>
        
        <button 
          type="button" 
          onClick={handleShareWhatsApp}
          disabled={isGenerating}
          style={{ 
            background: '#25D366', 
            color: 'white', 
            border: 'none', 
            padding: '0.8rem 1.5rem', 
            borderRadius: '10px', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          {isGenerating ? '⏳' : '📱'} واتساب
        </button>

        <button 
          type="button" 
          onClick={handleGenerateImage}
          disabled={isGenerating}
          style={{ 
            background: '#9b59b6', 
            color: 'white', 
            border: 'none', 
            padding: '0.8rem 1.5rem', 
            borderRadius: '10px', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          {isGenerating ? '⏳' : '👁️'} معاينة
        </button>
      </div>

      {/* معاينة الصورة */}
      {imageUrl && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <h3>معاينة التقرير:</h3>
          <img 
            src={imageUrl} 
            alt="تقرير الاستقبال" 
            style={{ 
              maxWidth: '100%', 
              borderRadius: '12px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)' 
            }} 
          />
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </section>
  );
}
