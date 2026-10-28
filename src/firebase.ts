import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyAqwBD1zlW2mzwkBhdLcAETZKoMI0f2Vog",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "pro-cumulus-xmvz5.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pro-cumulus-xmvz5",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "pro-cumulus-xmvz5.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "306958613280",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:306958613280:web:2b5b09d18bb570e780f545",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics =
  typeof window !== "undefined" ? getAnalytics(app) : null;
