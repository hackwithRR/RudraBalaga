// State Management
const state = {
    events: [],
    rsvps: {},
    busRoutes: {},
    user: null
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    showLoadingScreen();
    
    // Check authentication state
    firebaseAuth.onAuthStateChanged(user => {
        if (user) {
            state.user = user;
            loadEvents();
            loadRsvps();
            loadBusRoutes();
            hideLoadingScreen();
            setupEventListeners();
            renderEvents();
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
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

// Load events from Firestore
function loadEvents() {
    firebaseDb.collection('events').orderBy('date').get()
        .then(snapshot => {
            state.events = [];
            snapshot.forEach(doc => {
                state.events.push({ id: doc.id, ...doc.data() });
            });
        })
        .catch(error => {
            console.error('Error loading events: ', error);
        });
}

// Load RSVPs from Firestore
function loadRsvps() {
    if (!state.user) return;
    
    firebaseDb.collection('rsvps').doc(state.user.uid).onSnapshot(doc => {
        if (doc.exists) {
            state.rsvps = doc.data();
        } else {
            state.rsvps = {};
        }
        renderEvents();
    });
}

// Load bus routes from Firestore
function loadBusRoutes() {
    firebaseDb.collection('busRoutes').get()
        .then(snapshot => {
            state.busRoutes = {};
            snapshot.forEach(doc => {
                state.busRoutes[doc.id] = doc.data().routes || [];
            });
        })
        .catch(error => {
            console.error('Error loading bus routes: ', error);
        });
}

// Setup all event listeners
function setupEventListeners() {
    // RSVP buttons
    document.getElementById('attending-btn').addEventListener('click', () => setRSVP('attending'));
    document.getElementById('not-attending-btn').addEventListener('click', () => setRSVP('not-attending'));

    // Bus pickup selection
    document.getElementById('bus-pickup-select').addEventListener('change', setPickupPoint);

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', logout);
}

// Logout function
function logout() {
    firebaseAuth.signOut().then(() => {
        window.location.href = 'login.html';
    });
}

// Render events on member dashboard
function renderEvents() {
    const eventCard = document.getElementById('event-card');
    const noEvents = document.getElementById('no-events');
    const rsvpSection = document.getElementById('rsvp-section');
    const busPickupSection = document.getElementById('bus-pickup-section');

    // Get the next upcoming event
    const nextEvent = state.events.length > 0 ? state.events[0] : null;

    if (!nextEvent) {
        eventCard.classList.add('hidden');
        noEvents.classList.remove('hidden');
        rsvpSection.classList.add('hidden');
        busPickupSection.classList.add('hidden');
        return;
    }

    // Display event
    document.getElementById('event-title').textContent = nextEvent.title;
    document.getElementById('event-datetime').textContent = `${formatDate(nextEvent.date)} at ${nextEvent.time}`;
    document.getElementById('event-type').textContent = nextEvent.type;
    
    eventCard.classList.remove('hidden');
    noEvents.classList.add('hidden');
    rsvpSection.classList.remove('hidden');

    // Check RSVP status
    const userRsvp = state.rsvps[nextEvent.id];
    if (userRsvp) {
        if (userRsvp.status === 'attending') {
            document.getElementById('attending-btn').classList.add('selected');
            document.getElementById('not-attending-btn').classList.remove('selected');
        } else {
            document.getElementById('not-attending-btn').classList.add('selected');
            document.getElementById('attending-btn').classList.remove('selected');
        }
    } else {
        document.getElementById('attending-btn').classList.remove('selected');
        document.getElementById('not-attending-btn').classList.remove('selected');
    }

    // Handle bus pickup for outstation events
    if (nextEvent.type === 'Outstation') {
        busPickupSection.classList.remove('hidden');
        const busNotice = document.getElementById('bus-notice');
        const busSelect = document.getElementById('bus-pickup-select');
        
        const hasBusRoutes = state.busRoutes[nextEvent.id] && state.busRoutes[nextEvent.id].length > 0;
        
        if (!hasBusRoutes) {
            busNotice.textContent = 'Outstation bus details and pickup selection will be available a few days before the journey.';
            busNotice.classList.remove('hidden');
            busSelect.classList.add('hidden');
        } else {
            busNotice.classList.add('hidden');
            busSelect.classList.remove('hidden');
            
            // Populate bus pickup options
            busSelect.innerHTML = '<option value="">Select your Bus Pickup Point</option>';
            state.busRoutes[nextEvent.id].forEach(route => {
                const option = document.createElement('option');
                option.value = route.id;
                option.textContent = `${route.point} - ${route.time}`;
                busSelect.appendChild(option);
            });
            
            // Set selected pickup point if exists
            if (userRsvp && userRsvp.pickupPoint) {
                busSelect.value = userRsvp.pickupPoint;
            }
        }
    } else {
        busPickupSection.classList.add('hidden');
    }
}

// Set RSVP status
function setRSVP(status) {
    const nextEvent = state.events[0];
    if (!nextEvent || !state.user) return;

    // Update button states
    document.getElementById('attending-btn').classList.toggle('selected', status === 'attending');
    document.getElementById('not-attending-btn').classList.toggle('selected', status === 'not-attending');

    // Save RSVP to Firestore
    const rsvpData = {
        ...state.rsvps[nextEvent.id],
        status: status
    };
    
    firebaseDb.collection('rsvps').doc(state.user.uid).set({
        [nextEvent.id]: rsvpData
    }, { merge: true });

    // Show confirmation
    showConfirmation(status);

    // If outstation and attending, show bus pickup section
    if (status === 'attending' && nextEvent.type === 'Outstation') {
        const busNotice = document.getElementById('bus-notice');
        const busSelect = document.getElementById('bus-pickup-select');
        const hasBusRoutes = state.busRoutes[nextEvent.id] && state.busRoutes[nextEvent.id].length > 0;
        
        if (hasBusRoutes) {
            document.getElementById('bus-pickup-section').classList.remove('hidden');
            busNotice.classList.add('hidden');
            busSelect.classList.remove('hidden');
        }
    }
}

// Set pickup point
function setPickupPoint(e) {
    const nextEvent = state.events[0];
    if (!nextEvent || !state.user) return;

    const pickupPointId = e.target.value;
    
    // Update RSVP with pickup point
    const rsvpData = {
        ...state.rsvps[nextEvent.id],
        pickupPoint: pickupPointId
    };
    
    firebaseDb.collection('rsvps').doc(state.user.uid).set({
        [nextEvent.id]: rsvpData
    }, { merge: true });
}

// Show confirmation message
function showConfirmation(status) {
    const confirmationSection = document.getElementById('confirmation-section');
    const confirmationText = document.getElementById('confirmation-text');
    
    confirmationText.textContent = `You have marked as ${status === 'attending' ? 'Attending' : 'Not Attending'}. Thank you!`;
    confirmationSection.classList.remove('hidden');
    
    // Hide after 3 seconds
    setTimeout(() => {
        confirmationSection.classList.add('hidden');
    }, 3000);
}

// Format date for display
function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}