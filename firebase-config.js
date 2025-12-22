// firebase-config.js
// TODO: Replace with your actual config from Firebase Console > Project Settings > General
const firebaseConfig = {
    apiKey: "AIzaSyCAL5mwC0J6gUVbaUOmf8xcjKg13_GERKg",
    authDomain: "portfolio-f3c2b.firebaseapp.com",
    projectId: "portfolio-f3c2b",
    storageBucket: "portfolio-f3c2b.firebasestorage.app",
    messagingSenderId: "765935902852",
    appId: "1:765935902852:web:9365a635fff5741225a2d1",
    measurementId: "G-9XBB4KZQ3G"
  };

// Initialize Firebase
let db, auth, storage;

if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    // Remove the newline gap
    db = firebase.firestore();
    auth = firebase.auth();
    storage = firebase.storage();
} else {
    console.error("Firebase SDK not loaded!");
}