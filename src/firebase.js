import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCK_KRyeEgEjHTqX7grMO1P2wWOtqW7qTQ",
  authDomain: "zad-academy-dc800.firebaseapp.com",
  projectId: "zad-academy-dc800",
  storageBucket: "zad-academy-dc800.firebasestorage.app",
  messagingSenderId: "1036438824344",
  appId: "1:1036438824344:web:7b41a0a5368c7c155f37ed",
  measurementId: "G-5G32VSN9CL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);