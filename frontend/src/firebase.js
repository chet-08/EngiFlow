import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut 
} from "firebase/auth";

// PASTE YOUR EXACT CONFIG OBJECT HERE FROM FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyCziW_27UWVhIiJ1s2w9pbThYjOATMQh_A",
  authDomain: "engiflow-22d4d.firebaseapp.com",
  projectId: "engiflow-22d4d",
  storageBucket: "engiflow-22d4d.firebasestorage.app",
  messagingSenderId: "483131305220",
  appId: "1:483131305220:web:9b19a6341bd4049aed3451",
  measurementId: "G-KGQCYEDPS6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export instances to use throughout the app
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

/**
 * Helper: Triggers Google Login via Redirect.
 * This is the most stable method for local development and fixes COOP errors.
 */
export const loginWithGoogle = async () => {
  try {
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error("Login initiation failed:", error);
  }
};

/**
 * Helper: Logs the user out.
 */
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
  }
};

/**
 * Helper: This catches the result after the user is redirected back.
 * You should call this in your Login.jsx or App.js inside a useEffect.
 */
export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      // This is where you'd get the user if needed immediately
      return result.user;
    }
  } catch (error) {
    console.error("Error retrieving redirect result:", error);
    return null;
  }
};