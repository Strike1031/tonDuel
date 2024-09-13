import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDYd7mZvLzR81rdU5nhYMq4hYIH6rIUHSs",
  authDomain: "tongame-3f1de.firebaseapp.com",
  projectId: "tongame-3f1de",
  storageBucket: "tongame-3f1de.appspot.com",
  messagingSenderId: "623586846030",
  appId: "1:623586846030:web:44ed50996abf50dea92a1f",
  measurementId: "G-LS98KMDLXM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };