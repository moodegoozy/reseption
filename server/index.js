import cors from 'cors';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import express from 'express';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuid } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const EMPLOYEES_PATH = path.join(DATA_DIR, 'employees.json');
const REPORTS_PATH = path.join(DATA_DIR, 'reports.json');

const app = express();
app.use(cors());
app.use(express.json());

const sessions = new Map();

async function readJSON(filePath, fallback) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      if (fallback !== undefined) {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), 'utf8');
        return fallback;
      }
    }
    throw error;
  }
}

async function readEmployees() {
  const employees = await readJSON(EMPLOYEES_PATH, []);
  return employees;
}

async function readReports() {
  const reports = await readJSON(REPORTS_PATH, []);
  return reports;
}

async function writeReports(reports) {
  await fs.writeFile(REPORTS_PATH, JSON.stringify(reports, null, 2), 'utf8');
}

function buildSummaryRows(reports) {
  const grouped = new Map();

  reports.forEach((report) => {
    const list = grouped.get(report.employeeId) ?? [];
    list.push(report);
    grouped.set(report.employeeId, list);
  });

  return Array.from(grouped.values()).map((employeeReports) => {
    const [first] = employeeReports;
    const productivityValues = employeeReports
      .map((report) => (typeof report.productivityScore === 'number' ? report.productivityScore : null))
      .filter((value) => value !== null);

    const productivityAverage =
      productivityValues.length > 0
        ? Number(
            (
              productivityValues.reduce((total, value) => total + value, 0) /
              productivityValues.length
            ).toFixed(2)
          )
        : null;

    return {
      employeeId: first.employeeId,
      employeeName: first.employeeName,
      totalShifts: employeeReports.length,
      productivityAverage,
      tasks: employeeReports.map((report) => report.tasksCompleted).filter(Boolean),
      issues: employeeReports.map((report) => report.issues).filter(Boolean),
      handoverNotes: employeeReports.map((report) => report.handoverNotes).filter(Boolean)
    };
  });
}

async function buildWorkbookBuffer({ date, reports, summaryRows }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Reseption Shift Reporter';
  workbook.created = new Date();

  const reportsSheet = workbook.addWorksheet('تقارير الشفتات');
  reportsSheet.columns = [
    { header: 'التاريخ', key: 'date', width: 15 },
    { header: 'الموظف', key: 'employeeName', width: 20 },
    { header: 'الشفت', key: 'shift', width: 12 },
    { header: 'المهام المنجزة', key: 'tasksCompleted', width: 50 },
    { header: 'الملاحظات والبلاغات', key: 'issues', width: 50 },
    { header: 'ملاحظات التسليم', key: 'handoverNotes', width: 50 },
    { header: 'تقييم الإنتاجية (%)', key: 'productivityScore', width: 22 }
  ];

  reports.forEach((report) => {
    reportsSheet.addRow({
      date: report.date,
      employeeName: report.employeeName,
      shift: report.shift,
      tasksCompleted: report.tasksCompleted,
      issues: report.issues,
      handoverNotes: report.handoverNotes,
      productivityScore: report.productivityScore ?? ''
    });
  });

  const summarySheet = workbook.addWorksheet('ملخص اليوم');
  summarySheet.columns = [
    { header: 'الموظف', key: 'employeeName', width: 20 },
    { header: 'عدد الشفتات', key: 'totalShifts', width: 15 },
    { header: 'متوسط الإنتاجية (%)', key: 'productivityAverage', width: 20 },
    { header: 'المهام البارزة', key: 'tasks', width: 50 },
    { header: 'الملاحظات', key: 'notes', width: 50 }
  ];

  summaryRows.forEach((row) => {
    summarySheet.addRow({
      employeeName: row.employeeName,
      totalShifts: row.totalShifts,
      productivityAverage: row.productivityAverage ?? 'غير متوفر',
      tasks: row.tasks.join('\n'),
      notes: [...row.issues, ...row.handoverNotes].join('\n')
    });
  });

  const fileName = `تقرير-اليوم-${date}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();

  return { buffer, fileName };
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });

  return transporter;
}

async function sendSummaryEmailForDate(date) {
  const allReports = await readReports();
  const reports = allReports.filter((report) => report.date === date);

  if (reports.length === 0) {
    return { sent: false, reason: 'NO_REPORTS', date };
  }

  const summaryRows = buildSummaryRows(reports);
  const { buffer, fileName } = await buildWorkbookBuffer({ date, reports, summaryRows });

  const transporter = createTransporter();

  if (!transporter) {
    const fallbackPath = path.join(DATA_DIR, fileName);
    await fs.writeFile(fallbackPath, Buffer.from(buffer));
    return {
      sent: false,
      reason: 'SMTP_NOT_CONFIGURED',
      savedTo: fallbackPath,
      date
    };
  }

  const recipient = process.env.SUMMARY_RECIPIENT ?? 'moode434@gmail.com';
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  const info = await transporter.sendMail({
    from,
    to: recipient,
    subject: `ملخص تقارير الشفتات ليوم ${date}`,
    text: `مرفق ملف الإكسل الذي يحتوي على جميع تقارير الشفتات ليوم ${date}.`,
    attachments: [
      {
        filename: fileName,
        content: buffer
      }
    ]
  });

  return {
    sent: true,
    messageId: info.messageId,
    date
  };
}

async function authenticateRequest(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'يرجى تسجيل الدخول.' });
    }

    const token = header.slice(7);
    const employeeId = sessions.get(token);

    if (!employeeId) {
      return res.status(401).json({ message: 'انتهت صلاحية الجلسة.' });
    }

    const employees = await readEmployees();
    const employee = employees.find((item) => item.id === employeeId);

    if (!employee) {
      return res.status(401).json({ message: 'حساب الموظف غير متوفر.' });
    }

    req.user = { id: employee.id, name: employee.name, role: employee.role };
    req.employees = employees;

    return next();
  } catch (error) {
    return next(error);
  }
}

app.post('/api/login', async (req, res, next) => {
  try {
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      return res.status(400).json({ message: 'يرجى إدخال اسم المستخدم وكلمة المرور.' });
    }

    const employees = await readEmployees();
    const employee = employees.find((item) => item.username === username && item.password === password);

    if (!employee) {
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة.' });
    }

    const token = uuid();
    sessions.set(token, employee.id);

    return res.json({
      token,
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role
      }
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/logout', authenticateRequest, (req, res) => {
  const header = req.headers.authorization;
  const token = header.slice(7);
  sessions.delete(token);
  return res.status(204).end();
});

app.get('/api/employees', authenticateRequest, (req, res) => {
  const employees = req.employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    role: employee.role
  }));

  return res.json(employees);
});

app.get('/api/reports', authenticateRequest, async (req, res, next) => {
  try {
    const { date } = req.query;
    const allReports = await readReports();
    let filtered = allReports;

    if (date) {
      filtered = filtered.filter((report) => report.date === date);
    }

    if (req.user.role !== 'manager') {
      filtered = filtered.filter((report) => report.employeeId === req.user.id);
    }

    return res.json(filtered);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/summary', authenticateRequest, async (req, res, next) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'يرجى تحديد تاريخ الملخص.' });
    }

    const allReports = await readReports();
    let filtered = allReports.filter((report) => report.date === date);

    if (req.user.role !== 'manager') {
      filtered = filtered.filter((report) => report.employeeId === req.user.id);
    }

    return res.json(buildSummaryRows(filtered));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/reports', authenticateRequest, async (req, res, next) => {
  try {
    const { shift, date, tasksCompleted, issues, handoverNotes, productivityScore, employeeId } = req.body ?? {};

    if (!shift || !date) {
      return res.status(400).json({ message: 'التاريخ والشفت مطلوبان.' });
    }

    const targetEmployeeId = req.user.role === 'manager' && employeeId ? employeeId : req.user.id;
    const targetEmployee = req.employees.find((employee) => employee.id === targetEmployeeId);

    if (!targetEmployee) {
      return res.status(400).json({ message: 'لم يتم العثور على الموظف المطلوب.' });
    }

    const allReports = await readReports();
    const existingIndex = allReports.findIndex(
      (report) => report.employeeId === targetEmployeeId && report.shift === shift && report.date === date
    );

    const numericProductivity = typeof productivityScore === 'number' ? productivityScore : Number(productivityScore);
    const sanitizedProductivity = Number.isFinite(numericProductivity) ? Math.min(Math.max(numericProductivity, 0), 100) : undefined;

    const now = new Date().toISOString();
    const newReport = {
      id: existingIndex >= 0 ? allReports[existingIndex].id : uuid(),
      employeeId: targetEmployeeId,
      employeeName: targetEmployee.name,
      shift,
      date,
      tasksCompleted: tasksCompleted ?? '',
      issues: issues ?? '',
      handoverNotes: handoverNotes ?? '',
      productivityScore: sanitizedProductivity,
      submittedBy: req.user.id,
      updatedAt: now
    };

    if (existingIndex >= 0) {
      allReports[existingIndex] = newReport;
    } else {
      allReports.push(newReport);
    }

    await writeReports(allReports);

    return res.status(existingIndex >= 0 ? 200 : 201).json(newReport);
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/reports/:id', authenticateRequest, async (req, res, next) => {
  try {
    const { id } = req.params;
    const allReports = await readReports();
    const index = allReports.findIndex((report) => report.id === id);

    if (index === -1) {
      return res.status(404).json({ message: 'التقرير غير موجود.' });
    }

    const targetReport = allReports[index];

    if (req.user.role !== 'manager' && targetReport.employeeId !== req.user.id) {
      return res.status(403).json({ message: 'ليست لديك صلاحية لحذف هذا التقرير.' });
    }

    allReports.splice(index, 1);
    await writeReports(allReports);

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.post('/api/admin/send-summary', authenticateRequest, async (req, res, next) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ message: 'الصلاحيات غير كافية.' });
    }

    const { date } = req.body ?? {};
    const targetDate = date || dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    const result = await sendSummaryEmailForDate(targetDate);

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

app.use((err, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected error', err);
  res.status(500).json({ message: 'حدث خطأ غير متوقع في الخادم.' });
});

const port = process.env.PORT || 4000;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on http://localhost:${port}`);
});

cron.schedule('0 1 * * *', async () => {
  const targetDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  try {
    const result = await sendSummaryEmailForDate(targetDate);
    // eslint-disable-next-line no-console
    console.log(`[cron] Daily summary for ${targetDate}`, result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[cron] Failed to send summary for ${targetDate}`, error);
  }
});
