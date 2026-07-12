// Firebase Configuration
// Replace with your actual Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBcj26zvZFr1EshD5YReTDydRD2eEcZyP4",
    authDomain: "rudra-b35ea.firebaseapp.com",
    projectId: "rudra-b35ea",
    storageBucket: "rudra-b35ea.firebasestorage.app",
    messagingSenderId: "1065975452357",
    appId: "1:1065975452357:web:267df33b6b0b08ac8f56ac",
    measurementId: "G-226Y6K9HQE"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Export for use in other files
window.firebaseAuth = auth;
window.firebaseDb = db;