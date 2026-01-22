# نظام لوحة تقارير الشفتات

## نظرة عامة على البنية المعمارية

هذا مشروع **React + TypeScript** (الواجهة) مع **Express.js** (الخادم) لإدارة تقارير الشفتات اليومية للموظفين، مع دعم Firebase للمصادقة وFirestore لتخزين البيانات.

### التكامل المزدوج: Firebase + Node.js Backend

- **Firebase**: للمصادقة (`getAuth`) وتخزين التقارير في Firestore (`getFirestore`)
- **Node.js Server**: للمهام المجدولة (إرسال التقارير الساعة 1 صباحاً)، وتوليد ملفات Excel، وإرسال البريد الإلكتروني
- البيانات تُخزن في Firestore ولكن يتم حفظ نسخة احتياطية في `server/data/` للتقارير

## القواعد الأساسية

### 1. اللغة والاتجاه
- **جميع النصوص في الواجهة بالعربية** وتستخدم RTL (اتجاه من اليمين لليسار)
- أسماء المتغيرات والدوال بالإنجليزية، لكن القيم المعروضة بالعربية
- مثال: `shift: 'الصباحي (9ص - 5م)'` في [types.ts](src/types.ts#L1)

### 2. نموذج البيانات الأساسي
انظر [src/types.ts](src/types.ts) للأنواع الرئيسية:
- `ShiftReport`: يحتوي على `employeeId`, `shift`, `date`, `visitorsCount`, `callsCount`, `socialMediaCount`, `needs`, `entryCount`, `exitCount`, `notes`, `dailyRevenue`, `totalRevenue`
- كل تقرير يرتبط بموظف واحد وشفت واحد في تاريخ محدد
- **القاعدة**: إعادة إرسال نفس الشفت يستبدل التقرير السابق (انظر منطق الحفظ في [firebase.ts](src/services/firebase.ts))

### 3. تدفق البيانات
1. المستخدم يسجل الدخول عبر Firebase Auth → يتم جلب الملف الشخصي من Firestore
2. النماذج ترسل البيانات إلى Firestore عبر `saveReport()` في [firebase.ts](src/services/firebase.ts)
3. الخادم يقرأ من Firestore ويولد التقارير اليومية بصيغة Excel
4. مهمة cron مجدولة في [server/index.js](server/index.js) لإرسال التقرير الساعة 1 صباحاً

### 4. أنماط المكونات
- استخدم **React Hooks** (useState, useEffect, useCallback)
- المكونات النموذجية: [ShiftReportForm.tsx](src/components/ShiftReportForm.tsx), [ReportTable.tsx](src/components/ReportTable.tsx)
- معالجة الأخطاء تتم محلياً داخل كل مكون مع عرض رسائل عربية للمستخدم

## أوامر التطوير الأساسية

```bash
# تشغيل الواجهة (المنفذ 5173)
npm run dev

# تشغيل الخادم (المنفذ 4000)
cd server && npm start

# بناء الإنتاج
npm run build

# نشر على GitHub Pages
npm run deploy
```

## إعداد البيئة

### إعدادات Firebase (مضمنة في [firebase.ts](src/services/firebase.ts))
```typescript
const firebaseConfig = {
  apiKey: 'AIzaSyAz7NPtrEtcR53GOUA62AGv3Yrt2TgmDss',
  authDomain: 'reseption-8bc50.firebaseapp.com',
  projectId: 'reseption-8bc50',
  // ...
};
```

### متغيرات الخادم (`server/.env`)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=example@gmail.com
SMTP_PASS=app-password
SUMMARY_RECIPIENT=moode434@gmail.com
```

## الأنماط والاصطلاحات المحددة

### معالجة الشفتات
- الشفتات الثلاث: `'الليلي (1ص - 9ص)'`, `'الصباحي (9ص - 5م)'`, `'المسائي (5م - 1ص)'`
- انظر `shiftOptions` في [reportUtils.ts](src/utils/reportUtils.ts)

### التحقق من الصلاحيات
- لا يوجد نظام صلاحيات معقد: جميع المستخدمين يمكنهم إدخال تقارير
- المدير لديه صلاحية حذف التقارير (انظر `removeReport` في [firebase.ts](src/services/firebase.ts))

### إدارة الحالة
- الحالة الرئيسية في [App.tsx](src/App.tsx): `currentUser`, `reports`, `selectedDate`
- استخدم `useCallback` لتحسين الأداء عند تحميل البيانات

## نقاط التكامل الحرجة

### 1. Firebase ↔ React
- `onAuthChange()` في [App.tsx](src/App.tsx#L31) يستمع لتغييرات المصادقة
- جميع عمليات Firestore تتم عبر [services/firebase.ts](src/services/firebase.ts)

### 2. Node.js Cron Jobs
- مهمة مجدولة في [server/index.js](server/index.js) باستخدام `node-cron`
- تعمل يومياً الساعة 1 صباحاً: `'0 1 * * *'`
- تولد ملف Excel وترسله عبر SMTP

### 3. توليد Excel
- يستخدم `exceljs` في الخادم
- الواجهة أيضاً تستخدم `xlsx` لتصدير محلي (انظر [reportUtils.ts](src/utils/reportUtils.ts))

## نصائح لتحسين الإنتاجية

1. **عند إضافة حقول جديدة للتقرير**: حدّث `ShiftReport` في [types.ts](src/types.ts)، ثم حدّث النموذج في [ShiftReportForm.tsx](src/components/ShiftReportForm.tsx)، وأخيراً منطق حفظ Firestore
2. **لتغيير وقت المهمة المجدولة**: ابحث عن `node-cron` في [server/index.js](server/index.js)
3. **لإضافة حقول للملخص**: حدّث `buildSummaryRows` في [server/index.js](server/index.js)
4. **عند مواجهة أخطاء Firebase**: تحقق من قواعد Firestore في [firestore.rules](firestore.rules)

## الملفات الأساسية للرجوع إليها

- [src/types.ts](src/types.ts) - أنواع TypeScript الرئيسية
- [src/services/firebase.ts](src/services/firebase.ts) - جميع عمليات Firebase
- [src/App.tsx](src/App.tsx) - منطق التطبيق الرئيسي
- [server/index.js](server/index.js) - API والمهام المجدولة
- [src/utils/reportUtils.ts](src/utils/reportUtils.ts) - أدوات معالجة التقارير وExcel
