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

export async function registerWithEmail(email: string, password: string, name: string, role: 'employee' | 'manager' = 'employee') {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Try to save user profile to Firestore
  try {
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      name,
      role,
      email,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.log('Could not save user profile to Firestore');
  }
  
  return {
    user: userCredential.user,
    profile: { name, role }
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
    return userDoc.data() as { name: string; role: 'employee' | 'manager'; email: string };
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

export async function getReportsByDate(date: string, userRole: 'employee' | 'manager', userId: string): Promise<ShiftReport[]> {
  const reportsRef = collection(db, 'reports');
  let q;
  
  if (userRole === 'manager') {
    // Manager sees all reports for the date - simple query without orderBy to avoid index issues
    q = query(reportsRef, where('date', '==', date));
  } else {
    // Employee sees only their own reports - simple query
    q = query(reportsRef, where('date', '==', date), where('submittedById', '==', userId));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ShiftReport[];
}

export async function removeReport(reportId: string): Promise<void> {
  await deleteDoc(doc(db, 'reports', reportId));
}

export async function getAllEmployees(): Promise<{ id: string; name: string; role: 'employee' | 'manager'; email: string }[]> {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as { id: string; name: string; role: 'employee' | 'manager'; email: string }[];
}
