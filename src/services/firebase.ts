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
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

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
  const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  
  if (userDoc.exists()) {
    return {
      user: userCredential.user,
      profile: userDoc.data() as { name: string; role: 'employee' | 'manager' }
    };
  }
  
  // Default profile if not exists
  return {
    user: userCredential.user,
    profile: { name: email.split('@')[0], role: 'employee' as const }
  };
}

export async function registerWithEmail(email: string, password: string, name: string, role: 'employee' | 'manager' = 'employee') {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Save user profile to Firestore
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    name,
    role,
    email,
    createdAt: new Date().toISOString()
  });
  
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
