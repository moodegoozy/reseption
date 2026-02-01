import { initializeApp } from 'firebase/app';
import { Analytics, getAnalytics, isSupported } from 'firebase/analytics';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc,
  orderBy 
} from 'firebase/firestore';
import { ShiftReport } from '../types';

const firebaseConfig = {
  apiKey: 'AIzaSyAz7NPtrEtcR53GOUA62AGv3Yrt2TgmDss',
  authDomain: 'reseption-8bc50.firebaseapp.com',
  projectId: 'reseption-8bc50',
  storageBucket: 'reseption-8bc50.firebasestorage.app',
  messagingSenderId: '529566205253',
  appId: '1:529566205253:web:43a9c1c0a7baafdab8ea2c',
  measurementId: 'G-F4M464ZDQ4'
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

let analyticsPromise: Promise<Analytics | null> | null = null;

if (typeof window !== 'undefined') {
  analyticsPromise = isSupported()
    .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
    .catch(() => null);
}

export const getAnalyticsInstance = () => analyticsPromise;

// Auth functions
export async function loginWithEmail(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
  try {
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (userDoc.exists()) {
      return {
        user: userCredential.user,
        profile: userDoc.data() as { name: string; role: 'employee' | 'manager' }
      };
    }
  } catch (error) {
    console.log('Could not fetch user profile from Firestore, using default');
  }
  
  // Default profile if not exists or error
  return {
    user: userCredential.user,
    profile: { name: email.split('@')[0], role: 'employee' as const }
  };
}

export async function registerWithEmail(email: string, password: string, name: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Try to save user profile to Firestore
  try {
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      name,
      email,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.log('Could not save user profile to Firestore');
  }
  
  return {
    user: userCredential.user,
    profile: { name }
  };
}

export async function logoutUser() {
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function getUserProfile(uid: string) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return userDoc.data() as { name: string; email: string };
  }
  return null;
}

// Report functions - Firestore
export async function saveReport(report: Omit<ShiftReport, 'id'>): Promise<ShiftReport> {
  const docRef = await addDoc(collection(db, 'reports'), {
    ...report,
    createdAt: new Date().toISOString()
  });
  return { ...report, id: docRef.id };
}

export async function getReportsByDate(date: string, userId: string): Promise<ShiftReport[]> {
  const reportsRef = collection(db, 'reports');
  // الموظف يرى تقاريره فقط
  const q = query(reportsRef, where('date', '==', date), where('submittedById', '==', userId));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ShiftReport[];
}

export async function getReportsByDateRange(startDate: string, endDate: string, userId: string): Promise<ShiftReport[]> {
  const reportsRef = collection(db, 'reports');
  // جلب جميع تقارير المستخدم ثم تصفيتها محلياً لتجنب مشاكل الفهرسة
  const q = query(
    reportsRef, 
    where('submittedById', '==', userId)
  );
  
  const snapshot = await getDocs(q);
  const allReports = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ShiftReport[];
  
  // تصفية حسب التاريخ محلياً وترتيب تنازلي
  return allReports
    .filter(r => r.date >= startDate && r.date <= endDate)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function removeReport(reportId: string): Promise<void> {
  await deleteDoc(doc(db, 'reports', reportId));
}
