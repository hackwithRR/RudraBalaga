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
            // Check if user is admin
            firebaseDb.collection('users').doc(user.uid).get()
                .then(doc => {
                    if (doc.exists && doc.data().role === 'admin') {
                        state.user = user;
                        loadEvents();
                        loadRsvps();
                        loadBusRoutesFromDb();
                        hideLoadingScreen();
                        setupEventListeners();
                        populateEventSelectors();
                    } else {
                        // Not admin, redirect to member view
                        window.location.href = 'index.html';
                    }
                })
                .catch(error => {
                    console.error('Error checking admin status: ', error);
                    window.location.href = 'login.html';
                });
        } else {
            // Not logged in, redirect to login
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
    firebaseDb.collection('events').orderBy('date').onSnapshot(snapshot => {
        state.events = [];
        snapshot.forEach(doc => {
            state.events.push({ id: doc.id, ...doc.data() });
        });
        populateEventSelectors();
    });
}

// Load RSVPs from Firestore
function loadRsvps() {
    firebaseDb.collection('rsvps').onSnapshot(snapshot => {
        state.rsvps = {};
        snapshot.forEach(doc => {
            state.rsvps[doc.id] = doc.data();
        });
    });
}

// Load bus routes from Firestore
function loadBusRoutesFromDb() {
    firebaseDb.collection('busRoutes').onSnapshot(snapshot => {
        state.busRoutes = {};
        snapshot.forEach(doc => {
            state.busRoutes[doc.id] = doc.data().routes || [];
        });
    });
}

// Setup all event listeners
function setupEventListeners() {
    // Create event form
    document.getElementById('create-event-form').addEventListener('submit', createEvent);

    // Bus route form
    document.getElementById('bus-route-form').addEventListener('submit', addBusRoute);

    // Event selectors
    document.getElementById('outstation-event-select').addEventListener('change', displayBusRoutes);
    document.getElementById('roster-event-select').addEventListener('change', loadRoster);

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', logout);
}

// Initialize app after loading
function initializeApp() {
    hideLoadingScreen();
    loadBusRoutesFromDb();
    setupEventListeners();
    populateEventSelectors();
}

// Logout function
function logout() {
    firebaseAuth.signOut().then(() => {
        window.location.href = 'login.html';
    });
}

// Create new event (Admin)
function createEvent(e) {
    e.preventDefault();
    
    const title = document.getElementById('event-title-input').value;
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const type = document.getElementById('event-type-select').value;
    const location = document.getElementById('event-location').value;

    firebaseDb.collection('events').add({
        title,
        date,
        time,
        type,
        location,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Reset form
    e.target.reset();
    
    // Show success message
    alert('Event created successfully!');
}

// Add bus route (Admin)
function addBusRoute(e) {
    e.preventDefault();
    
    const eventId = document.getElementById('outstation-event-select').value;
    if (!eventId) return;
    
    const point = document.getElementById('pickup-point').value;
    const time = document.getElementById('pickup-time').value;

    // Get existing routes or create new array
    const existingRoutes = state.busRoutes[eventId] || [];
    const newRoute = {
        id: 'route-' + Date.now(),
        point,
        time
    };

    firebaseDb.collection('busRoutes').doc(eventId).set({
        routes: [...existingRoutes, newRoute]
    });

    // Reset form
    e.target.reset();
}

// Display bus routes for selected event (Admin)
function displayBusRoutes() {
    const eventId = document.getElementById('outstation-event-select').value;
    const busRouteForm = document.getElementById('bus-route-form');
    const busRoutesList = document.getElementById('bus-routes-list');
    const pickupPointsList = document.getElementById('pickup-points-list');

    if (!eventId) {
        busRouteForm.classList.add('hidden');
        busRoutesList.classList.add('hidden');
        return;
    }

    busRouteForm.classList.remove('hidden');
    
    if (state.busRoutes[eventId] && state.busRoutes[eventId].length > 0) {
        busRoutesList.classList.remove('hidden');
        pickupPointsList.innerHTML = '';
        
        state.busRoutes[eventId].forEach(route => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${route.point} - ${route.time}</span>
                <button class="remove-pickup" data-route-id="${route.id}" data-event-id="${eventId}">×</button>
            `;
            pickupPointsList.appendChild(li);
        });

        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-pickup').forEach(btn => {
            btn.addEventListener('click', removeBusRoute);
        });
    } else {
        busRoutesList.classList.add('hidden');
    }
}

// Remove bus route (Admin)
function removeBusRoute(e) {
    const routeId = e.target.dataset.routeId;
    const eventId = e.target.dataset.eventId;
    
    const updatedRoutes = state.busRoutes[eventId].filter(route => route.id !== routeId);
    
    firebaseDb.collection('busRoutes').doc(eventId).set({
        routes: updatedRoutes
    });
}

// Load attendance roster (Admin)
function loadRoster() {
    const eventId = document.getElementById('roster-event-select').value;
    const rosterContent = document.getElementById('roster-content');
    const busBreakdownSection = document.getElementById('bus-breakdown-section');
    const busBreakdownList = document.getElementById('bus-breakdown-list');

    if (!eventId) {
        rosterContent.classList.add('hidden');
        return;
    }

    const event = state.events.find(e => e.id === eventId);
    if (!event) return;

    // Calculate attendance
    let attendingCount = 0;
    let notAttendingCount = 0;
    const attendingMembers = [];
    const notAttendingMembers = [];
    const busBreakdown = {};

    // Get all users for member names
    firebaseDb.collection('users').get().then(usersSnapshot => {
        const users = {};
        usersSnapshot.forEach(doc => {
            users[doc.id] = doc.data();
        });

        Object.entries(state.rsvps).forEach(([uid, rsvpData]) => {
            const rsvp = rsvpData[eventId];
            if (rsvp && rsvp.status === 'attending') {
                attendingCount++;
                const member = users[uid] || { name: 'Unknown Member' };
                attendingMembers.push({ ...member, pickupPoint: rsvp.pickupPoint });
                
                // Track bus breakdown
                if (rsvp.pickupPoint) {
                    const route = state.busRoutes[eventId]?.find(r => r.id === rsvp.pickupPoint);
                    if (route) {
                        if (!busBreakdown[route.point]) {
                            busBreakdown[route.point] = { count: 0, time: route.time };
                        }
                        busBreakdown[route.point].count++;
                    }
                }
            } else if (rsvp && rsvp.status === 'not-attending') {
                notAttendingCount++;
                const member = users[uid] || { name: 'Unknown Member' };
                notAttendingMembers.push(member);
            }
        });

        // Update UI
        document.getElementById('total-attending').textContent = attendingCount;
        document.getElementById('total-not-attending').textContent = notAttendingCount;

        // Update attending list
        const attendingList = document.getElementById('attending-list');
        attendingList.innerHTML = attendingMembers.map(m => `<li>${m.name || m.email}</li>`).join('');

        // Update not attending list
        const notAttendingList = document.getElementById('not-attending-list');
        notAttendingList.innerHTML = notAttendingMembers.map(m => `<li>${m.name || m.email}</li>`).join('');

        // Update bus breakdown for outstation events
        if (event.type === 'Outstation' && Object.keys(busBreakdown).length > 0) {
            busBreakdownSection.classList.remove('hidden');
            busBreakdownList.innerHTML = Object.entries(busBreakdown)
                .map(([point, data]) => `<li><span>${point}</span><span>${data.count} members at ${data.time}</span></li>`)
                .join('');
        } else {
            busBreakdownSection.classList.add('hidden');
        }

        rosterContent.classList.remove('hidden');
    });
}

// Populate event selectors (Admin)
function populateEventSelectors() {
    const outstationSelect = document.getElementById('outstation-event-select');
    const rosterSelect = document.getElementById('roster-event-select');

    // Clear existing options
    outstationSelect.innerHTML = '<option value="">Select an event</option>';
    rosterSelect.innerHTML = '<option value="">Select an event</option>';

    // Add events
    state.events.forEach(event => {
        const option1 = document.createElement('option');
        option1.value = event.id;
        option1.textContent = `${event.title} (${event.type})`;
        outstationSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = event.id;
        option2.textContent = `${event.title} (${event.type})`;
        rosterSelect.appendChild(option2);
    });
}