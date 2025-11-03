import { initializeApp } from 'firebase/app';
import { Analytics, getAnalytics, isSupported } from 'firebase/analytics';

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

let analyticsPromise: Promise<Analytics | null> | null = null;

if (typeof window !== 'undefined') {
  analyticsPromise = isSupported()
    .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
    .catch(() => null);
}

export const getAnalyticsInstance = () => analyticsPromise;
