import { DailySummaryRow, ShiftReport } from '../types';
import { exportDailySummaryToExcel } from '../utils/reportUtils';

interface ExportSummaryButtonProps {
  reports: ShiftReport[];
  summaryRows: DailySummaryRow[];
  date: string;
}

export default function ExportSummaryButton({ reports, summaryRows, date }: ExportSummaryButtonProps) {
  const disabled = reports.length === 0;

  const handleExport = () => {
    if (disabled) {
      return;
    }

    exportDailySummaryToExcel(reports, summaryRows, `تقرير-اليوم-${date}`);
  };

  return (
    <button type="button" className="secondary" onClick={handleExport} disabled={disabled}>
      تنزيل ملف إكسل لملخص {date}
    </button>
  );
}
