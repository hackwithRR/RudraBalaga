// State
let confirmationResult = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    showLoadingScreen();
    
    // Check if user is already logged in
    firebaseAuth.onAuthStateChanged(user => {
        if (user) {
            checkUserRole(user);
        } else {
            hideLoadingScreen();
            setupEventListeners();
        }
    });
});

// Show loading screen
function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.classList.remove('hidden');
}

// Hide loading screen
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
}

// Setup all event listeners
function setupEventListeners() {
    // Phone login form
    document.getElementById('phone-login-form').addEventListener('submit', sendOTP);
    
    // OTP form
    document.getElementById('otp-form').addEventListener('submit', verifyOTP);
    
    // Google login button
    document.getElementById('google-login-btn').addEventListener('click', googleLogin);
}

// Send OTP to phone number
function sendOTP(e) {
    e.preventDefault();
    
    const phoneNumber = document.getElementById('phone-number').value;
    
    if (!phoneNumber) {
        showError('Please enter a phone number');
        return;
    }
    
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
    
    firebaseAuth.signInWithPhoneNumber(formattedPhone, window.recaptchaVerifier)
        .then(result => {
            confirmationResult = result;
            document.getElementById('phone-login-section').classList.add('hidden');
            document.getElementById('otp-section').classList.remove('hidden');
        })
        .catch(error => {
            showError(error.message);
        });
}

// Verify OTP
function verifyOTP(e) {
    e.preventDefault();
    
    const otpCode = document.getElementById('otp-code').value;
    
    if (!confirmationResult) {
        showError('Please send OTP first');
        return;
    }
    
    confirmationResult.confirm(otpCode)
        .then(userCredential => {
            checkUserRole(userCredential.user);
        })
        .catch(error => {
            showError(error.message);
        });
}

// Google login
function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    firebaseAuth.signInWithPopup(provider)
        .then(userCredential => {
            checkUserRole(userCredential.user);
        })
        .catch(error => {
            showError(error.message);
        });
}

// Check user role and redirect
function checkUserRole(user) {
    // Get user document from Firestore
    firebaseDb.collection('users').doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                if (userData.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'index.html';
                }
            } else {
                // If no user document, create one as regular member
                firebaseDb.collection('users').doc(user.uid).set({
                    email: user.email || '',
                    phone: user.phoneNumber || '',
                    role: 'member',
                    name: user.displayName || 'Member'
                }).then(() => {
                    window.location.href = 'index.html';
                });
            }
        })
        .catch(error => {
            showError('Error checking user role: ' + error.message);
        });
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}