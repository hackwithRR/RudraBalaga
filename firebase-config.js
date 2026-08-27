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

// Replace these placeholders with the account that receives event payments.
const paymentConfig = {
  upiId: "rudra80508421@barodampay",
  appName: "Rudra Balaga",
  // UPI IDs admins can choose per event in the Add/Edit Event form.
  // The first entry is the default. Replace the placeholder IDs with real ones.
  upiIds: [
    { label: "Rudrabalaga Trust", id: "rudra80508421@barodampay" },
    { label: "UPI ID 2 (placeholder)", id: "placeholder2@upi" },
    { label: "UPI ID 3 (placeholder)", id: "placeholder3@upi" }
  ]
};

// Donation payment details (UPI is reused from paymentConfig; bank transfer is funnel-specific).
const donationConfig = {
  appName: paymentConfig.appName,
  upiId: paymentConfig.upiId,
  bankTransfer: {
    bankName: "State Bank of India",
    accountName: "Rudra Balaga",
    accountNumber: "00000000000000000",
    ifscCode: "SBIN0000000"
  },
  note: "Thank you for your generous donation. Payment is non-refundable."
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Export for use in other files
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseStorage = storage;
window.paymentConfig = paymentConfig;
window.donationConfig = donationConfig;