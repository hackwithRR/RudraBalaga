// State Management
        const state = {
            events: [],
            rsvps: {},
            busRoutes: {},
            user: null
        };

        // Loading animation
        const tl = gsap.timeline();

        // 1. Text activation
        tl.to("#app-title", { opacity: 1, translateY: 0, duration: 1, ease: "power4.out" })
          
          // 2. Stroke layout drawing orchestration
          .to(".neon-line", {
              strokeDashoffset: 0,
              duration: 3.2,
              ease: "power2.inOut",
              stagger: 0.08,
              onUpdate: function() {
                  let progress = Math.floor(this.progress() * 100);
                  document.getElementById("bar-meter").style.width = progress + "%";
                  
                  if(progress > 20 && progress < 65) {
                      document.getElementById("load-state").textContent = "MANIFESTING DIVINE MATRIX";
                  } else if(progress >= 65) {
                      document.getElementById("load-state").textContent = "LOCKING AXIAL RADIALS";
                  }
              }
          }, "-=0.8");
        
        // 3. Mount centered backplane graphics
        tl.to("#final-trishul", {
            opacity: 1,
            duration: 0.5,
            ease: "power2.out",
            onStart: () => {
                document.getElementById("load-state").textContent = "TRISHUL MOUNTED";
            }
        }, "-=0.4")
        .to("#bindu", {
            opacity: 1,
            scale: 1,
            duration: 0.3,
            ease: "back.out(3)"
        }, "-=0.2");

        // 4. Force emission pulses
        tl.to("#shockwave", {
            opacity: 0.6,
            scale: 18,
            duration: 0.8,
            ease: "expo.out"
        })
        .to("#shiva-svg", {
            scale: 0.96,
            duration: 0.15
        }, "-=0.8");

        // 5. Unveil core product view shell
        tl.to("#loader-panel", {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
            duration: 1.3,
            ease: "expo.inOut"
        })
        .to("#app-content", {
            opacity: 1,
            scale: 1,
            duration: 1.2,
            ease: "power3.out",
            onComplete: () => {
                document.getElementById("app-content").style.pointerEvents = "auto";
                document.getElementById("loader-panel").remove();
                initializeApp();
            }
        }, "-=1.0");

        // Initialize app
        function initializeApp() {
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
                                setupEventListeners();
                                populateEventSelectors();
                            } else {
                                // Not admin, redirect to member view
                                window.location.href = 'index.html';
                            }
                        })
                         .catch(error => {
                             console.error('Error checking admin status: ', error);
                             // Show error on page instead of redirecting to prevent login loop
                             const errorDiv = document.createElement('div');
                             errorDiv.className = 'fixed top-20 right-4 z-50 bg-error text-on-error px-6 py-4 rounded-xl shadow-lg max-w-sm';
                             errorDiv.innerHTML = '<p>Authentication error. Please try logging in again.</p>';
                             document.body.appendChild(errorDiv);
                             setTimeout(() => {
                                 firebaseAuth.signOut().then(() => {
                                     window.location.href = 'login.html';
                                 });
                             }, 2000);
                         });
                } else {
                    // Not logged in, redirect to login
                    window.location.href = 'login.html';
                }
            });
        }

        // Load events from Firestore
        function loadEvents() {
            firebaseDb.collection('events').orderBy('date', 'desc').onSnapshot(snapshot => {
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
                    state.busRoutes[doc.id] = doc.data().buses || [];
                });

                // Auto-refresh panels if an event is selected
                const manageEventId = document.getElementById('bus-routes-users-event-select')?.value;
                if (manageEventId) {
                    displayBusRoutes();
                }

                const selectedMembersEventId = document.getElementById('bus-routes-selected-members-event-select')?.value;
                if (selectedMembersEventId) {
                    displayBusRoutesSelectedMembers();
                }
            });
        }

        // Setup all event listeners
        function setupEventListeners() {
            // Create event form
            const createEventForm = document.getElementById('create-event-form');
            if (createEventForm) {
                createEventForm.addEventListener('submit', createEvent);
            }
            
            // Logout button
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', logout);
            }
            
            // Tab navigation
            const addEventTab = document.getElementById('add-event-tab');
            if (addEventTab) {
                addEventTab.addEventListener('click', () => switchTab('add-event'));
            }
            
            const busRoutesUsersTab = document.getElementById('bus-routes-users-tab');
            if (busRoutesUsersTab) {
                busRoutesUsersTab.addEventListener('click', () => switchTab('bus-routes-users'));
            }

            const busRoutesSelectedMembersTab = document.getElementById('bus-routes-selected-members-tab');
            if (busRoutesSelectedMembersTab) {
                busRoutesSelectedMembersTab.addEventListener('click', () => switchTab('bus-routes-selected-members'));
            }
            
            
            const attendanceTab = document.getElementById('attendance-tab');
            if (attendanceTab) {
                attendanceTab.addEventListener('click', () => switchTab('attendance'));
            }
            
            const membersTab = document.getElementById('members-tab');
            if (membersTab) {
                membersTab.addEventListener('click', () => switchTab('members'));
            }
            
            const announcementsTab = document.getElementById('announcements-tab');
            if (announcementsTab) {
                announcementsTab.addEventListener('click', () => switchTab('announcements'));
            }
            
            const eventHistoryTab = document.getElementById('event-history-tab');
            if (eventHistoryTab) {
                eventHistoryTab.addEventListener('click', () => {
                    switchTab('event-history');
                    loadEventHistory();
                });
            }
            
            // Announcement form
            const createAnnouncementForm = document.getElementById('create-announcement-form');
            if (createAnnouncementForm) {
                createAnnouncementForm.addEventListener('submit', createAnnouncement);
            }
            
            // Attendance buttons
            const takeAttendanceBtn = document.getElementById('take-attendance-btn');
            if (takeAttendanceBtn) {
                takeAttendanceBtn.addEventListener('click', takeAttendance);
            }
            
            const downloadPdfBtn = document.getElementById('download-pdf-btn');
            if (downloadPdfBtn) {
                downloadPdfBtn.addEventListener('click', downloadPDF);
            }
            
            const downloadExcelBtn = document.getElementById('download-excel-btn');
            if (downloadExcelBtn) {
                downloadExcelBtn.addEventListener('click', downloadExcel);
            }
            
            // Member limit dropdown
            const eventLimit = document.getElementById('event-limit');
            if (eventLimit) {
                eventLimit.addEventListener('change', function(e) {
                    const customLimitInput = document.getElementById('custom-limit-input');
                    if (customLimitInput) {
                        if (e.target.value === 'custom') {
                            customLimitInput.classList.remove('hidden');
                        } else {
                            customLimitInput.classList.add('hidden');
                        }
                    }
                });
            }
            
            // Event type change - show/hide outstation dates
            const eventTypeSelect = document.getElementById('event-type-select');
            if (eventTypeSelect) {
                eventTypeSelect.addEventListener('change', function(e) {
                    const outstationDatesSection = document.getElementById('outstation-dates-section');
                    if (outstationDatesSection) {
                        if (e.target.value === 'Outstation') {
                            outstationDatesSection.classList.remove('hidden');
                        } else {
                            outstationDatesSection.classList.add('hidden');
                        }
                    }
                });
            }
            
            // Event edit form
            const editEventForm = document.getElementById('edit-event-form');
            if (editEventForm) {
                editEventForm.addEventListener('submit', saveEditedEvent);
            }
            
            const cancelEditBtn = document.getElementById('cancel-edit-btn');
            if (cancelEditBtn) {
                cancelEditBtn.addEventListener('click', () => {
                    document.getElementById('event-edit-modal').classList.add('hidden');
                });
            }
            
            const editEventLimit = document.getElementById('edit-event-limit');
            if (editEventLimit) {
                editEventLimit.addEventListener('change', function(e) {
                    const customLimitInput = document.getElementById('edit-custom-limit-input');
                    if (customLimitInput) {
                        if (e.target.value === 'custom') {
                            customLimitInput.classList.remove('hidden');
                        } else {
                            customLimitInput.classList.add('hidden');
                        }
                    }
                });
            }
            
            // Event delegation for edit buttons
            const eventsHistoryList = document.getElementById('events-history-list');
            if (eventsHistoryList) {
                eventsHistoryList.addEventListener('click', function(e) {
                    if (e.target.classList.contains('edit-event-btn')) {
                        const eventId = e.target.dataset.eventId;
                        openEditEventModal(eventId);
                    }
                });
            }
            
            // Bus routes (manage) event selector
            const busRoutesUsersEventSelect = document.getElementById('bus-routes-users-event-select');
            if (busRoutesUsersEventSelect) {
                busRoutesUsersEventSelect.addEventListener('change', function() {
                    const eventId = this.value;
                    if (eventId) {
                        displayBusRoutes();
                    }
                });
            }

            // Route-wise members event selector
            const busRoutesSelectedMembersEventSelect = document.getElementById('bus-routes-selected-members-event-select');
            if (busRoutesSelectedMembersEventSelect) {
                busRoutesSelectedMembersEventSelect.addEventListener('change', function() {
                    const eventId = this.value;
                    if (eventId) {
                        displayBusRoutesSelectedMembers();
                    }
                });
            }
            
            // Add bus form
            const addBusForm = document.getElementById('add-bus-form');
            if (addBusForm) {
                addBusForm.addEventListener('submit', addBus);
            }
            
            // Add bus route form
            const busRouteForm = document.getElementById('bus-route-form');
            if (busRouteForm) {
                busRouteForm.addEventListener('submit', addBusRoute);
            }
            
            // Download buttons for bus routes manage
            const downloadBusRoutesUsersPdf = document.getElementById('download-bus-routes-users-pdf');
            if (downloadBusRoutesUsersPdf) {
                downloadBusRoutesUsersPdf.addEventListener('click', downloadBusRoutesUsersPDF);
            }
            
            const downloadConsolidatedBusRoutesPdf = document.getElementById('download-consolidated-bus-routes-pdf');
            if (downloadConsolidatedBusRoutesPdf) {
                downloadConsolidatedBusRoutesPdf.addEventListener('click', downloadConsolidatedBusRoutesPDF);
            }

            // Download buttons for route-wise members
            const downloadBusRoutesSelectedMembersPdf = document.getElementById('download-bus-routes-selected-members-pdf');
            if (downloadBusRoutesSelectedMembersPdf) {
                downloadBusRoutesSelectedMembersPdf.addEventListener('click', downloadBusRoutesSelectedMembersPDF);
            }

            const downloadConsolidatedSelectedMembersPdf = document.getElementById('download-consolidated-bus-routes-selected-members-pdf');
            if (downloadConsolidatedSelectedMembersPdf) {
                downloadConsolidatedSelectedMembersPdf.addEventListener('click', downloadConsolidatedBusRoutesSelectedMembersPDF);
            }
            
            // Roster event select
            const rosterEventSelect = document.getElementById('roster-event-select');
            if (rosterEventSelect) {
                rosterEventSelect.addEventListener('change', loadRoster);
            }
            
            // Event delegation for remove bus and remove route buttons
            const busesContainer = document.getElementById('buses-container');
            if (busesContainer) {
                busesContainer.addEventListener('click', function(e) {
                    if (e.target.classList.contains('remove-bus')) {
                        removeBus(e);
                    } else if (e.target.classList.contains('remove-route')) {
                        removeRoute(e);
                    }
                });
            }
        }
        
        // Format date for display
        function formatDate(dateString) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            return new Date(dateString).toLocaleDateString('en-US', options);
        }
        
        // Add new bus (Admin)
        function addBus(e) {
            e.preventDefault();
            
            const eventId = document.getElementById('bus-routes-users-event-select').value;
            if (!eventId) return;
            
            const busName = document.getElementById('bus-name').value;
            if (!busName) return;

            const existingBuses = state.busRoutes[eventId] || [];
            const newBus = {
                id: 'bus-' + Date.now(),
                name: busName,
                routes: []
            };

            firebaseDb.collection('busRoutes').doc(eventId).set({
                buses: [...existingBuses, newBus]
            });

            e.target.reset();
        }
        
        // Add pickup point to a bus (Admin)
        function addBusRoute(e) {
            e.preventDefault();
            
            const eventId = document.getElementById('bus-routes-users-event-select').value;
            const busId = document.getElementById('bus-select').value;
            if (!eventId || !busId) return;
            
            const point = document.getElementById('pickup-point').value;
            const time = document.getElementById('pickup-time').value;

            const buses = state.busRoutes[eventId] || [];
            const busIndex = buses.findIndex(b => b.id === busId);
            
            if (busIndex === -1) return;
            
            const newRoute = {
                id: 'route-' + Date.now(),
                point,
                time
            };
            
            buses[busIndex].routes.push(newRoute);

            firebaseDb.collection('busRoutes').doc(eventId).set({
                buses: buses
            });

            e.target.reset();
        }
        
        // Display buses and routes for selected event (Admin) - Manage
        function displayBusRoutes() {
            const eventId = document.getElementById('bus-routes-users-event-select').value;
            const busManagementSection = document.getElementById('bus-management-section');
            const busRoutesList = document.getElementById('bus-routes-list');
            const busesContainer = document.getElementById('buses-container');
            const busSelect = document.getElementById('bus-select');


            if (!eventId) {
                busManagementSection.classList.add('hidden');
                return;
            }

            busManagementSection.classList.remove('hidden');
            
            // Populate bus select
            busSelect.innerHTML = '<option value="">Select a bus</option>';
            const buses = state.busRoutes[eventId] || [];
            buses.forEach(bus => {
                const option = document.createElement('option');
                option.value = bus.id;
                option.textContent = bus.name;
                busSelect.appendChild(option);
            });
            
            // Display buses and their routes
            if (buses.length > 0) {
                busRoutesList.classList.remove('hidden');
                busesContainer.innerHTML = '';
                
                buses.forEach(bus => {
                    const busDiv = document.createElement('div');
                    busDiv.className = 'border-2 border-outline-variant rounded-xl p-4';
                    busDiv.innerHTML = `
                        <div class="flex justify-between items-center mb-3">
                            <h5 class="font-bold text-lg text-primary">${bus.name}</h5>
                            <button class="remove-bus text-error text-xl font-bold" data-bus-id="${bus.id}" data-event-id="${eventId}">×</button>
                        </div>
                        <ul class="space-y-2" id="bus-routes-${bus.id}"></ul>
                    `;
                    busesContainer.appendChild(busDiv);
                    
                    // Add routes to this bus
                    const routesList = document.getElementById(`bus-routes-${bus.id}`);
                    if (bus.routes && bus.routes.length > 0) {
                        bus.routes.forEach(route => {
                            const li = document.createElement('li');
                            li.className = 'flex justify-between items-center p-2 bg-surface-container-high rounded-lg';
                            li.innerHTML = `
                                <span class="font-body-lg text-body-lg">${route.point} - ${route.time}</span>
                                <button class="remove-route text-error text-xl font-bold" data-route-id="${route.id}" data-bus-id="${bus.id}" data-event-id="${eventId}">×</button>
                            `;
                            routesList.appendChild(li);
                        });
                    }
                });
            } else {
                busRoutesList.classList.add('hidden');
            }
        }
        
        // Remove bus (Admin)
        function removeBus(e) {
            const busId = e.target.dataset.busId;
            const eventId = e.target.dataset.eventId;
            
            const updatedBuses = state.busRoutes[eventId].filter(bus => bus.id !== busId);
            
            firebaseDb.collection('busRoutes').doc(eventId).set({
                buses: updatedBuses
            });
        }
        
        // Remove route (Admin)
        function removeRoute(e) {
            const routeId = e.target.dataset.routeId;
            const busId = e.target.dataset.busId;
            const eventId = e.target.dataset.eventId;
            
            const buses = state.busRoutes[eventId];
            const busIndex = buses.findIndex(b => b.id === busId);
            
            if (busIndex === -1) return;
            
            buses[busIndex].routes = buses[busIndex].routes.filter(route => route.id !== routeId);

            firebaseDb.collection('busRoutes').doc(eventId).set({
                buses: buses
            });
        }
        
        // Switch between tabs
        function switchTab(tab) {
            // Update tab buttons - remove all active classes first
            document.getElementById('add-event-tab').classList.remove('tab-active');
            document.getElementById('add-event-tab').classList.add('tab-inactive');
            document.getElementById('bus-routes-users-tab').classList.remove('tab-active');
            document.getElementById('bus-routes-users-tab').classList.add('tab-inactive');
            document.getElementById('attendance-tab').classList.remove('tab-active');
            document.getElementById('attendance-tab').classList.add('tab-inactive');
            document.getElementById('members-tab').classList.remove('tab-active');
            document.getElementById('members-tab').classList.add('tab-inactive');
            document.getElementById('announcements-tab').classList.remove('tab-active');
            document.getElementById('announcements-tab').classList.add('tab-inactive');
            document.getElementById('event-history-tab').classList.remove('tab-active');
            document.getElementById('event-history-tab').classList.add('tab-inactive');
            
            // Add active class to selected tab
            if (tab === 'add-event') {
                document.getElementById('add-event-tab').classList.add('tab-active');
                document.getElementById('add-event-tab').classList.remove('tab-inactive');
            } else if (tab === 'bus-routes-users') {
                document.getElementById('bus-routes-users-tab').classList.add('tab-active');
                document.getElementById('bus-routes-users-tab').classList.remove('tab-inactive');
            } else if (tab === 'bus-routes-selected-members') {
                document.getElementById('bus-routes-selected-members-tab').classList.add('tab-active');
                document.getElementById('bus-routes-selected-members-tab').classList.remove('tab-inactive');
            } else if (tab === 'attendance') {
                document.getElementById('attendance-tab').classList.add('tab-active');
                document.getElementById('attendance-tab').classList.remove('tab-inactive');
            } else if (tab === 'members') {
                document.getElementById('members-tab').classList.add('tab-active');
                document.getElementById('members-tab').classList.remove('tab-inactive');
                loadMembers();
            } else if (tab === 'announcements') {
                document.getElementById('announcements-tab').classList.add('tab-active');
                document.getElementById('announcements-tab').classList.remove('tab-inactive');
            } else if (tab === 'event-history') {
                document.getElementById('event-history-tab').classList.add('tab-active');
                document.getElementById('event-history-tab').classList.remove('tab-inactive');
            }
            
            // Update tab content
            document.getElementById('add-event-content').classList.toggle('hidden', tab !== 'add-event');
            document.getElementById('bus-routes-users-content').classList.toggle('hidden', tab !== 'bus-routes-users');
            document.getElementById('bus-routes-selected-members-content').classList.toggle('hidden', tab !== 'bus-routes-selected-members');
            document.getElementById('attendance-content').classList.toggle('hidden', tab !== 'attendance');
            document.getElementById('members-content').classList.toggle('hidden', tab !== 'members');
            document.getElementById('announcements-content').classList.toggle('hidden', tab !== 'announcements');
            document.getElementById('event-history-content').classList.toggle('hidden', tab !== 'event-history');
        }
        
        // Load and display event history
        function loadEventHistory() {
            const eventsList = document.getElementById('events-history-list');
            eventsList.innerHTML = state.events.map(event => {
                const attendingCount = Object.values(state.rsvps).filter(r => r[event.id]?.status === 'attending').length;
                const limitText = event.limit ? ` (Limit: ${event.limit})` : '';
                const buses = state.busRoutes[event.id] || [];
                const busInfo = buses.length > 0 ? `<br><span class="text-secondary">Buses: ${buses.map(b => b.name).join(', ')}</span>` : '';
                
                return `
                    <li class="p-4 bg-surface-container-high rounded-lg">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h4 class="font-bold text-primary text-lg">${event.title}</h4>
                                <p class="text-on-surface-variant font-body-lg text-body-lg">${formatDate(event.date)} at ${event.time}</p>
                                <p class="text-on-surface-variant font-body-lg text-body-lg">${event.type} - ${event.location}</p>
                                <p class="text-secondary font-body-lg text-body-lg">Attending: ${attendingCount}${limitText}${busInfo}</p>
                            </div>
                            <button class="edit-event-btn touch-active bg-primary-container text-on-primary-container px-4 py-2 rounded-lg font-bold text-body-lg" data-event-id="${event.id}">
                                Edit
                            </button>
                        </div>
                    </li>
                `;
            }).join('');
        }
        
        // Open edit event modal
        function openEditEventModal(eventId) {
            const event = state.events.find(e => e.id === eventId);
            if (!event) return;
            
            document.getElementById('edit-event-id').value = event.id;
            document.getElementById('edit-event-title').value = event.title;
            document.getElementById('edit-event-date').value = event.date;
            document.getElementById('edit-event-time').value = event.time;
            document.getElementById('edit-event-type').value = event.type;
            document.getElementById('edit-event-location').value = event.location;
            document.getElementById('edit-event-map-link').value = event.mapLink || '';
            
            // Set limit
            if (event.limit) {
                if ([50, 100, 150, 200].includes(event.limit)) {
                    document.getElementById('edit-event-limit').value = event.limit;
                } else {
                    document.getElementById('edit-event-limit').value = 'custom';
                    document.getElementById('edit-custom-limit-input').classList.remove('hidden');
                    document.getElementById('edit-event-custom-limit').value = event.limit;
                }
            } else {
                document.getElementById('edit-event-limit').value = '';
            }
            
            // Set outstation dates
            if (event.type === 'Outstation') {
                document.getElementById('edit-outstation-dates-section').classList.remove('hidden');
                document.getElementById('edit-departure-date').value = event.departureDate || '';
                document.getElementById('edit-return-date').value = event.returnDate || '';
            } else {
                document.getElementById('edit-outstation-dates-section').classList.add('hidden');
            }
            
            document.getElementById('event-edit-modal').classList.remove('hidden');
        }
        
        // Save edited event
        function saveEditedEvent(e) {
            e.preventDefault();
            
            const eventId = document.getElementById('edit-event-id').value;
            const limitSelect = document.getElementById('edit-event-limit').value;
            const customLimit = document.getElementById('edit-event-custom-limit').value;
            const type = document.getElementById('edit-event-type').value;
            
            // Determine the limit value
            let limit = null;
            if (limitSelect === 'custom' && customLimit) {
                limit = parseInt(customLimit);
            } else if (limitSelect) {
                limit = parseInt(limitSelect);
            }
            
            const updateData = {
                title: document.getElementById('edit-event-title').value,
                date: document.getElementById('edit-event-date').value,
                time: document.getElementById('edit-event-time').value,
                type: type,
                location: document.getElementById('edit-event-location').value,
                mapLink: document.getElementById('edit-event-map-link').value || null,
                limit: limit
            };

            // Add outstation dates if type is Outstation
            if (type === 'Outstation') {
                updateData.departureDate = document.getElementById('edit-departure-date').value || null;
                updateData.returnDate = document.getElementById('edit-return-date').value || null;
            }
            
            firebaseDb.collection('events').doc(eventId).update(updateData).then(() => {
                alert('Event updated successfully!');
                document.getElementById('event-edit-modal').classList.add('hidden');
            });
        }

        // Create announcement (Admin)
        function createAnnouncement(e) {
            e.preventDefault();
            
            const title = document.getElementById('announcement-title').value;
            const content = document.getElementById('announcement-content').value;
            const imageFile = document.getElementById('announcement-image').files[0];

            if (imageFile) {
                // Convert image to base64
                const reader = new FileReader();
                reader.onload = function(event) {
                    const base64Image = event.target.result;
                    firebaseDb.collection('announcements').add({
                        title,
                        content,
                        image: base64Image,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(() => {
                        alert('Announcement sent successfully!');
                        e.target.reset();
                    });
                };
                reader.readAsDataURL(imageFile);
            } else {
                firebaseDb.collection('announcements').add({
                    title,
                    content,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    alert('Announcement sent successfully!');
                    e.target.reset();
                });
            }
        }

        // Load and display all members
        function loadMembers() {
            firebaseDb.collection('users').get().then(usersSnapshot => {
                const members = [];
                usersSnapshot.forEach(doc => {
                    const data = doc.data();
                    members.push({
                        id: data.userId || 'N/A',
                        name: data.name || data.email || 'Unknown',
                        phone: data.phone || 'N/A',
                        email: data.email || 'N/A',
                        dob: data.dob || 'N/A',
                        address: data.address || 'N/A'
                    });
                });
                
                // Sort alphabetically by name
                members.sort((a, b) => a.name.localeCompare(b.name));
                
                const membersList = document.getElementById('members-list');
                membersList.innerHTML = members.map((m, index) => {
                    const phoneLink = m.phone ? `<a href="tel:${m.phone}" class="text-primary underline">Call: ${m.phone}</a>` : '';
                    return `<li class="p-3 bg-surface-container-high rounded-lg font-body-lg text-body-lg">
                        <div class="flex justify-between items-center">
                            <div>
                                <span class="font-bold text-primary">${index + 1}.</span>
                                <span class="ml-2">${m.name}</span>
                            </div>
                            ${phoneLink}
                        </div>
                    </li>`;
                }).join('');
            });
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
            const mapLink = document.getElementById('event-map-link').value;
            const limitSelect = document.getElementById('event-limit').value;
            const customLimit = document.getElementById('event-custom-limit').value;
            const departureDate = document.getElementById('departure-date').value;
            const returnDate = document.getElementById('return-date').value;
            
            // Determine the limit value
            let limit = null;
            if (limitSelect === 'custom' && customLimit) {
                limit = parseInt(customLimit);
            } else if (limitSelect) {
                limit = parseInt(limitSelect);
            }

            const eventData = {
                title,
                date,
                time,
                type,
                location,
                mapLink: mapLink || null,
                limit: limit,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Add outstation dates if type is Outstation
            if (type === 'Outstation') {
                eventData.departureDate = departureDate || null;
                eventData.returnDate = returnDate || null;
            }

            firebaseDb.collection('events').add(eventData);

            e.target.reset();
            document.getElementById('custom-limit-input').classList.add('hidden');
            document.getElementById('outstation-dates-section').classList.add('hidden');
            alert('Event created successfully!');
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

            let attendingCount = 0;
            let notAttendingCount = 0;
            const attendingMembers = [];
            const notAttendingMembers = [];
            const busBreakdown = {};

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
                        
                        if (rsvp.pickupPoint) {
                            // Find the route in the new structure (buses with routes)
                            const buses = state.busRoutes[eventId] || [];
                            let foundRoute = null;
                            for (const bus of buses) {
                                if (bus.routes) {
                                    foundRoute = bus.routes.find(r => r.id === rsvp.pickupPoint);
                                    if (foundRoute) {
                                        foundRoute.busName = bus.name;
                                        break;
                                    }
                                }
                            }
                            if (foundRoute) {
                                if (!busBreakdown[foundRoute.point]) {
                                    busBreakdown[foundRoute.point] = { count: 0, time: foundRoute.time, busName: foundRoute.busName };
                                }
                                busBreakdown[foundRoute.point].count++;
                            }
                        }
                    } else if (rsvp && rsvp.status === 'not-attending') {
                        notAttendingCount++;
                        const member = users[uid] || { name: 'Unknown Member' };
                        notAttendingMembers.push(member);
                    }
                });

                document.getElementById('total-attending').textContent = attendingCount;
                document.getElementById('total-not-attending').textContent = notAttendingCount;

                const attendingList = document.getElementById('attending-list');
                attendingList.innerHTML = attendingMembers.map(m => `<li class="p-3 bg-surface-container-high rounded-lg font-body-lg text-body-lg">${m.name || m.email}</li>`).join('');

                const notAttendingList = document.getElementById('not-attending-list');
                notAttendingList.innerHTML = notAttendingMembers.map(m => `<li class="p-3 bg-surface-container-high rounded-lg font-body-lg text-body-lg">${m.name || m.email}</li>`).join('');

                if (event.type === 'Outstation' && Object.keys(busBreakdown).length > 0) {
                    busBreakdownSection.classList.remove('hidden');
                    busBreakdownList.innerHTML = Object.entries(busBreakdown)
                        .map(([point, data]) => `<li class="flex justify-between p-3 bg-secondary-fixed rounded-lg font-body-lg text-body-lg"><span>${point}</span><span>${data.count} members at ${data.time}</span></li>`)
                        .join('');
                } else {
                    busBreakdownSection.classList.add('hidden');
                }

                rosterContent.classList.remove('hidden');
            });
        }

        // Populate event selectors (Admin)
        function populateEventSelectors() {
            const rosterSelect = document.getElementById('roster-event-select');
            const busRoutesUsersSelect = document.getElementById('bus-routes-users-event-select');
            const busRoutesSelectedMembersSelect = document.getElementById('bus-routes-selected-members-event-select');

            rosterSelect.innerHTML = '<option value="">Select an event</option>';
            busRoutesUsersSelect.innerHTML = '<option value="">Select an outstation event</option>';
            busRoutesSelectedMembersSelect.innerHTML = '<option value="">Select an outstation event</option>';

            state.events.forEach(event => {
                const option2 = document.createElement('option');
                option2.value = event.id;
                option2.textContent = `${event.title} (${event.type})`;
                rosterSelect.appendChild(option2);
                
                // Only add outstation events to bus routes manage + selected members selectors
                if (event.type === 'Outstation') {
                    const option3 = document.createElement('option');
                    option3.value = event.id;
                    option3.textContent = `${event.title} (${formatDate(event.date)})`;
                    busRoutesUsersSelect.appendChild(option3);

                    const option4 = document.createElement('option');
                    option4.value = event.id;
                    option4.textContent = `${event.title} (${formatDate(event.date)})`;
                    busRoutesSelectedMembersSelect.appendChild(option4);
                }
            });
        }

        // Take attendance - opens a modal with Present/Absent checkboxes for all members of selected event
        function takeAttendance() {
            const eventId = document.getElementById('roster-event-select').value;
            if (!eventId) return;

            const event = state.events.find(e => e.id === eventId);
            if (!event) return;

            const attendanceDocId = `event-${eventId}`;

            firebaseDb.collection('users').get().then(usersSnapshot => {
                const users = {};
                usersSnapshot.forEach(doc => {
                    users[doc.id] = doc.data();
                });

                // Fallback lists from RSVP
                const memberUids = Object.keys(state.rsvps || {});
                const attendingUids = [];
                const notAttendingUids = [];

                memberUids.forEach(uid => {
                    const rsvpForEvent = state.rsvps[uid]?.[eventId];
                    if (!rsvpForEvent) return;
                    if (rsvpForEvent.status === 'attending') attendingUids.push(uid);
                    if (rsvpForEvent.status === 'not-attending') notAttendingUids.push(uid);
                });

                // Load saved attendance from Firestore to preserve Present/Absent
                firebaseDb.collection('attendance').doc(attendanceDocId).get().then(attDoc => {
                    const saved = attDoc.exists ? (attDoc.data() || {}) : {};
                    const savedPresent = Array.isArray(saved.presentUids) ? saved.presentUids : null;
                    const savedAbsent = Array.isArray(saved.absentUids) ? saved.absentUids : null;

                    // If saved exists, use it; else use RSVP fallback
                    const finalPresentUids = savedPresent ? savedPresent : attendingUids;
                    const finalAbsentUids = savedAbsent ? savedAbsent : notAttendingUids;

                    // Render modal UI
                    const modal = document.createElement('div');
                    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4';

                    const rowsHtml = [
                        ...finalPresentUids.map(uid => {
                            const u = users[uid] || {};
                            const name = u.name || u.email || 'Unknown';
                            return `
                                <div class="flex items-center justify-between gap-3 p-3 bg-surface-container-high rounded-xl">
                                    <div class="min-w-0">
                                        <div class="font-bold text-primary truncate">${name}</div>
                                    </div>
                                    <div class="flex items-center gap-4">
                                        <label class="flex items-center gap-2">
                                            <input type="checkbox" class="attendance-present" data-uid="${uid}" checked>
                                            <span>Present</span>
                                        </label>
                                        <label class="flex items-center gap-2">
                                            <input type="checkbox" class="attendance-absent" data-uid="${uid}">
                                            <span>Absent</span>
                                        </label>
                                    </div>
                                </div>
                            `;
                        }),
                        ...finalAbsentUids.map(uid => {
                            const u = users[uid] || {};
                            const name = u.name || u.email || 'Unknown';
                            return `
                                <div class="flex items-center justify-between gap-3 p-3 bg-surface-container-high rounded-xl">
                                    <div class="min-w-0">
                                        <div class="font-bold text-primary truncate">${name}</div>
                                    </div>
                                    <div class="flex items-center gap-4">
                                        <label class="flex items-center gap-2">
                                            <input type="checkbox" class="attendance-present" data-uid="${uid}">
                                            <span>Present</span>
                                        </label>
                                        <label class="flex items-center gap-2">
                                            <input type="checkbox" class="attendance-absent" data-uid="${uid}" checked>
                                            <span>Absent</span>
                                        </label>
                                    </div>
                                </div>
                            `;
                        })
                    ].join('');

                    modal.innerHTML = `
                    <div class="bg-white rounded-xl p-5 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="font-headline-sm text-headline-sm text-primary">Attendance - ${event.title}</h3>
                                <p class="text-on-surface-variant font-body-lg text-body-lg">Select Present/Absent and save.</p>
                            </div>
                            <button class="text-2xl text-on-surface-variant" id="close-attendance-modal">&times;</button>
                        </div>

                        <div class="space-y-3" id="attendance-checkbox-list">
                            ${rowsHtml || '<div class="text-on-surface-variant">No members found for this event.</div>'}
                        </div>

                        <div class="grid grid-cols-2 gap-3 mt-5">
                            <button id="cancel-attendance-modal" type="button" class="w-full h-[56px] bg-surface-container-high text-on-surface-variant rounded-xl font-bold text-body-lg">
                                Cancel
                            </button>
                            <button id="save-attendance-modal" type="button" class="w-full h-[56px] bg-primary-container text-on-primary-container rounded-xl font-bold text-body-lg">
                                Save Attendance
                            </button>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);

                // Make Present/Absent mutually exclusive per user
                modal.querySelectorAll('.attendance-present, .attendance-absent').forEach(input => {
                    input.addEventListener('change', e => {
                        const uid = e.target.dataset.uid;
                        if (e.target.classList.contains('attendance-present') && e.target.checked) {
                            modal.querySelectorAll(`.attendance-absent[data-uid="${uid}"]`).forEach(cb => cb.checked = false);
                        }
                        if (e.target.classList.contains('attendance-absent') && e.target.checked) {
                            modal.querySelectorAll(`.attendance-present[data-uid="${uid}"]`).forEach(cb => cb.checked = false);
                        }
                    });
                });

                const closeBtn = document.getElementById('close-attendance-modal');
                const cancelBtn = document.getElementById('cancel-attendance-modal');
                closeBtn.addEventListener('click', () => document.body.removeChild(modal));
                cancelBtn.addEventListener('click', () => document.body.removeChild(modal));

                document.getElementById('save-attendance-modal').addEventListener('click', () => {
                    const present = [];
                    const absent = [];

                    modal.querySelectorAll('.attendance-present').forEach(cb => {
                        if (cb.checked) present.push(cb.dataset.uid);
                    });
                    modal.querySelectorAll('.attendance-absent').forEach(cb => {
                        if (cb.checked) absent.push(cb.dataset.uid);
                    });

                    // Store as userId list; your existing roster download expects names.
                    // We'll also store present/absent as names for backward compatibility.
                    const presentNames = present.map(uid => (users[uid]?.name || users[uid]?.email || 'Unknown'));
                    const absentNames = absent.map(uid => (users[uid]?.name || users[uid]?.email || 'Unknown'));

                    // IMPORTANT: Use deterministic doc id so saving twice for same event updates instead of creating new docs.
                    // This prevents your UI from resetting when you open modal again.
                    const attendanceDocId = `event-${eventId}`;

                    const attendanceDoc = {
                        eventId,
                        eventTitle: event.title,
                        date: new Date().toISOString(),
                        present: presentNames,
                        absent: absentNames,
                        presentUids: present,
                        absentUids: absent,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    firebaseDb.collection('attendance').doc(attendanceDocId).set(attendanceDoc, { merge: true }).then(() => {
                        document.body.removeChild(modal);
                        alert('Attendance saved successfully!');
                        loadRoster();
                    });
                });
            });
        }

        // Download attendance as PDF
        function downloadPDF() {
            const eventId = document.getElementById('roster-event-select').value;
            if (!eventId) return;

            const event = state.events.find(e => e.id === eventId);

            // Get all member data
            firebaseDb.collection('users').get().then(usersSnapshot => {
                const users = {};
                usersSnapshot.forEach(doc => {
                    users[doc.id] = doc.data();
                });

                const attendingRows = [];

                Object.entries(state.rsvps).forEach(([uid, rsvpData]) => {
                    const rsvp = rsvpData[eventId];
                    const user = users[uid] || {};
                    if (rsvp && rsvp.status === 'attending') {
                        attendingRows.push({
                            id: user.userId || 'N/A',
                            name: user.name || user.email || 'Unknown',
                            phone: user.phone || 'N/A',
                            email: user.email || 'N/A',
                            dob: user.dob || 'N/A',
                            address: user.address || 'N/A'
                        });
                    }
                });

                // Create HTML content for PDF
                let html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Attendance - ${event?.title || 'Event'}</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            h1 { color: #ff5722; text-align: center; }
                            h2 { color: #333; border-bottom: 2px solid #ff5722; padding-bottom: 5px; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                            th { background-color: #ff5722; color: white; }
                            tr:nth-child(even) { background-color: #f9f9f9; }
                            .header { text-align: center; margin-bottom: 20px; }
                            .date { text-align: center; color: #666; margin-bottom: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>ರುದ್ರ ಬಲಗ - Rudra Parayana</h1>
                            <h2>Attendance Sheet</h2>
                            <p class="date">Event: ${event?.title || 'Unknown'} | Date: ${new Date().toLocaleDateString()}</p>
                        </div>
                        
                        <h2>Attending Members (${attendingRows.length})</h2>
                        <table>
                            <tr><th>ID</th><th>Name</th><th>Phone</th><th>Email</th><th>DOB</th><th>Address</th></tr>
                `;
                
                attendingRows.forEach(row => {
                    html += `<tr><td>${row.id}</td><td>${row.name}</td><td>${row.phone}</td><td>${row.email}</td><td>${row.dob}</td><td>${row.address}</td></tr>`;
                });
                
                html += `
                        </table>
                    </body>
                    </html>
                `;

                // Create a new window and print as PDF
                const printWindow = window.open('', '_blank');
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            });
        }

        // Download attendance as Excel
        function downloadExcel() {
            const eventId = document.getElementById('roster-event-select').value;
            if (!eventId) return;

            const event = state.events.find(e => e.id === eventId);

            // Get all member data
            firebaseDb.collection('users').get().then(usersSnapshot => {
                const users = {};
                usersSnapshot.forEach(doc => {
                    users[doc.id] = doc.data();
                });

                const attendingRows = [];

                Object.entries(state.rsvps).forEach(([uid, rsvpData]) => {
                    const rsvp = rsvpData[eventId];
                    const user = users[uid] || {};
                    if (rsvp && rsvp.status === 'attending') {
                        attendingRows.push([
                            user.userId || 'N/A',
                            user.name || user.email || 'Unknown',
                            user.phone || 'N/A',
                            user.email || 'N/A',
                            user.dob || 'N/A',
                            user.address || 'N/A'
                        ]);
                    }
                });

                // Create Excel XML content
                let excel = '<?xml version="1.0" encoding="UTF-8"?>\n';
                excel += '<?mso-application progid="Excel.Sheet"?>\n';
                excel += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
                excel += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
                excel += ' <Worksheet ss:ss:name="Attending">\n';
                excel += '  <Table>\n';
                excel += '   <Row><Cell><Data ss:Type="String">ID</Data></Cell><Cell><Data ss:Type="String">Name</Data></Cell><Cell><Data ss:Type="String">Phone</Data></Cell><Cell><Data ss:Type="String">Email</Data></Cell><Cell><Data ss:Type="String">DOB</Data></Cell><Cell><Data ss:Type="String">Address</Data></Cell></Row>\n';
                attendingRows.forEach(row => {
                    excel += '   <Row>';
                    row.forEach(cell => {
                        excel += `<Cell><Data ss:Type="String">${cell}</Data></Cell>`;
                    });
                    excel += '</Row>\n';
                });
                excel += '  </Table>\n';
                excel += ' </Worksheet>\n';
                excel += '</Workbook>';

                // Download as XML (Excel format)
                const blob = new Blob([excel], { type: 'application/xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `attendance-${event?.title || 'event'}.xml`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }

        // Show help modal
        function showHelpModal() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4';
            modal.innerHTML = `
                <div class="bg-white rounded-xl p-6 w-full max-w-lg">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-headline-sm text-headline-sm text-primary">Help & Support</h3>
                        <button id="close-help-modal" class="text-2xl text-on-surface-variant">&times;</button>
                    </div>
                    <div class="space-y-4">
                        <div class="p-4 bg-surface-container-high rounded-lg">
                            <h4 class="font-bold text-primary mb-2">Admin Help</h4>
                            <p class="text-on-surface font-body-lg text-body-lg">For admin-specific issues, contact an admin:</p>
                            <ul class="list-disc list-inside text-on-surface font-body-lg text-body-lg mt-2 space-y-1">
                                <li>Event creation problems</li>
                                <li>Bus route management</li>
                                <li>Attendance tracking issues</li>
                                <li>Member data access</li>
                            </ul>
                        </div>
                        <div id="admins-list" class="space-y-2">
                            <p class="text-center text-on-surface-variant">Loading admins...</p>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('close-help-modal').addEventListener('click', () => {
                document.body.removeChild(modal);
            });
            
            // Fetch admin users from Firestore
            if (typeof firebaseDb !== 'undefined' && firebaseDb) {
                try {
                    firebaseDb.collection('users').where('role', '==', 'admin').onSnapshot(snapshot => {
                        const adminsList = document.getElementById('admins-list');
                        if (snapshot.empty) {
                            adminsList.innerHTML = '<p class="text-center text-on-surface-variant">No admins available</p>';
                            return;
                        }
                        
                        let html = '<p class="font-label-lg text-label-lg text-on-surface mb-2">Contact an Admin:</p>';
                        snapshot.forEach(doc => {
                            const admin = doc.data();
                            const phone = admin.phone || admin.email || 'N/A';
                            const name = admin.name || 'Admin';
                            html += `
                                <div class="p-3 bg-primary-fixed rounded-lg flex justify-between items-center">
                                    <span class="font-body-lg text-body-lg text-on-primary-fixed">${name}</span>
                                    <a href="tel:${phone}" class="text-primary font-bold text-body-lg">${phone}</a>
                                </div>
                            `;
                        });
                        adminsList.innerHTML = html;
                    });
                } catch (error) {
                    document.getElementById('admins-list').innerHTML = '<p class="text-center text-on-surface-variant">Unable to load admin contacts</p>';
                }
            }
        }

        // Add help button click handler
        document.getElementById('help-btn').addEventListener('click', showHelpModal);
        
        // Display bus routes with users for selected event
        function displayBusRoutesUsers() {
            const eventId = document.getElementById('bus-routes-users-event-select').value;
            const routesContainer = document.getElementById('bus-routes-users-container');
            
            if (!eventId) {
                routesContainer.innerHTML = '<p class="text-on-surface-variant">Select an event to view bus routes and users.</p>';
                return;
            }
            
            const buses = state.busRoutes[eventId] || [];
            const allRoutes = [];
            buses.forEach(bus => {
                if (bus.routes) {
                    bus.routes.forEach(route => {
                        allRoutes.push({ ...route, busName: bus.name });
                    });
                }
            });
            
            if (allRoutes.length === 0) {
                routesContainer.innerHTML = '<p class="text-on-surface-variant">No bus routes configured for this event.</p>';
                return;
            }
            
            // Get users for each route
            firebaseDb.collection('users').get().then(usersSnapshot => {
                const users = {};
                usersSnapshot.forEach(doc => {
                    users[doc.id] = doc.data();
                });
                
                let html = '';
                allRoutes.forEach(route => {
                    const routeUsers = [];
                    Object.entries(state.rsvps).forEach(([uid, rsvpData]) => {
                        const rsvp = rsvpData[eventId];
                        if (rsvp && rsvp.status === 'attending' && rsvp.pickupPoint === route.id) {
                            const user = users[uid] || {};
                            routeUsers.push({
                                name: user.name || user.email || 'Unknown',
                                phone: user.phone || 'N/A'
                            });
                        }
                    });
                    
                    html += `
                        <div class="border-2 border-outline-variant rounded-xl p-4 mb-4">
                            <div class="flex justify-between items-center mb-2">
                                <h5 class="font-bold text-primary text-lg">${route.point}</h5>
                                <span class="text-on-surface-variant font-body-lg text-body-lg">${route.time} (${route.busName})</span>
                            </div>
                            <p class="text-on-surface-variant font-body-lg text-body-lg mb-2">Members: ${routeUsers.length}</p>
                            ${routeUsers.length > 0 ? `
                                <ul class="space-y-1 mb-3">
                                    ${routeUsers.map(u => `<li class="p-2 bg-surface-container-high rounded-lg font-body-lg text-body-lg">${u.name} - ${u.phone}</li>`).join('')}
                                </ul>
                            ` : ''}
                        </div>
                    `;
                });
                
                routesContainer.innerHTML = html;
            });
        }
        
        // Download bus routes users as PDF
        function downloadBusRoutesUsersPDF() {
            const eventId = document.getElementById('bus-routes-users-event-select').value;
            if (!eventId) return;
            
            const event = state.events.find(e => e.id === eventId);
            const buses = state.busRoutes[eventId] || [];
            
            firebaseDb.collection('users').get().then(usersSnapshot => {
                const users = {};
                usersSnapshot.forEach(doc => {
                    users[doc.id] = doc.data();
                });
                
                let html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Bus Routes - ${event?.title || 'Event'}</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            h1 { color: #ff5722; text-align: center; }
                            h2 { color: #333; border-bottom: 2px solid #ff5722; padding-bottom: 5px; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                            th { background-color: #ff5722; color: white; }
                            tr:nth-child(even) { background-color: #f9f9f9; }
                            .header { text-align: center; margin-bottom: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>ರುದ್ರ ಬಲಗ - Rudra Parayana</h1>
                            <h2>Bus Routes Report</h2>
                            <p>Event: ${event?.title || 'Unknown'}</p>
                        </div>
                `;
                
                buses.forEach(bus => {
                    html += `<h3>${bus.name}</h3><table><tr><th>Pickup Point</th><th>Time</th><th>Members</th></tr>`;
                    if (bus.routes) {
                        bus.routes.forEach(route => {
                            const routeUsers = [];
                            Object.entries(state.rsvps).forEach(([uid, rsvpData]) => {
                                const rsvp = rsvpData[eventId];
                                if (rsvp && rsvp.status === 'attending' && rsvp.pickupPoint === route.id) {
                                    const user = users[uid] || {};
                                    routeUsers.push(user.name || user.email || 'Unknown');
                                }
                            });
                            html += `<tr><td>${route.point}</td><td>${route.time}</td><td>${routeUsers.join(', ') || 'None'}</td></tr>`;
                        });
                    }
                    html += '</table>';
                });
                
                html += '</body></html>';
                
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(html);
                    printWindow.document.close();
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                } else {
                    alert('Please allow popups to download the PDF');
                }
            });
        }
        
        // Route-wise members (new tab)
        function displayBusRoutesSelectedMembers() {
            const eventId = document.getElementById('bus-routes-selected-members-event-select').value;
            const routesContainer = document.getElementById('bus-routes-selected-members-container');

            if (!eventId) {
                routesContainer.innerHTML = '<p class="text-on-surface-variant">Select an outstation event.</p>';
                return;
            }

            const buses = state.busRoutes[eventId] || [];
            if (!buses.length) {
                routesContainer.innerHTML = '<p class="text-on-surface-variant">No bus routes configured for this event.</p>';
                return;
            }

            firebaseDb.collection('users').get().then(usersSnapshot => {
                const users = {};
                usersSnapshot.forEach(doc => {
                    users[doc.id] = doc.data();
                });

                // Precompute member lists by pickupPoint
                const pickupPointMembers = {}; // pickupPointId -> [{name, phone}]
                Object.entries(state.rsvps).forEach(([uid, rsvpData]) => {
                    const rsvp = rsvpData[eventId];
                    if (rsvp && rsvp.status === 'attending' && rsvp.pickupPoint) {
                        if (!pickupPointMembers[rsvp.pickupPoint]) pickupPointMembers[rsvp.pickupPoint] = [];
                        const user = users[uid] || {};
                        pickupPointMembers[rsvp.pickupPoint].push({
                            name: user.name || user.email || 'Unknown',
                            phone: user.phone || 'N/A'
                        });
                    }
                });

                let html = '';

                // Format requested:
                // event
                // --> route (bus)
                //     --> pickup point
                //         --> members
                buses.forEach(bus => {
                    // compute total members for this bus across all pickup points
                    let busMemberCount = 0;
                    if (bus.routes && bus.routes.length) {
                        bus.routes.forEach(route => {
                            const members = pickupPointMembers[route.id] || [];
                            busMemberCount += members.length;
                        });
                    }

                    html += `
                        <div class="border-2 border-outline-variant rounded-xl p-4 mb-4">
                            <div class="flex items-start justify-between gap-3 mb-2">
                                <div>
                                    <h5 class="font-bold text-primary text-lg">${bus.name}</h5>
                                    <p class="text-on-surface-variant font-body-lg text-body-lg">--> route</p>
                                </div>
                                <button
                                    class="touch-active bg-primary-container text-on-primary-container rounded-xl font-bold text-body-lg px-4 py-2"
                                    data-download-bus-id="${bus.id}"
                                    data-download-event-id="${eventId}"
                                    onclick="downloadRouteWiseBusMembersPDF('${eventId}', '${bus.id}')"
                                >
                                    Download Bus
                                </button>
                            </div>
                    `;

                    if (bus.routes && bus.routes.length) {
                        bus.routes.forEach(route => {
                            const members = pickupPointMembers[route.id] || [];
                            html += `
                                <div class="ml-3 mt-3">
                                    <div class="font-bold text-secondary">--> ${route.point}</div>
                                    <div class="text-on-surface-variant font-body-lg text-body-lg">${route.time}</div>
                                    <div class="ml-3 mt-2">
                                        ${members.length ? `
                                            ${members.map(m => `
                                                <div class="p-2 bg-surface-container-high rounded-lg font-body-lg text-body-lg mb-2">--> ${m.name} - ${m.phone}</div>
                                            `).join('')}
                                        ` : `<div class="text-on-surface-variant font-body-lg text-body-lg">--> No members selected</div>`}
                                    </div>
                                </div>
                            `;
                        });
                    } else {
                        html += `<p class="text-on-surface-variant">No pickup points for this route.</p>`;
                    }

                    html += `</div>`;
                });

                routesContainer.innerHTML = html;
            });
        }


        function downloadRouteWiseBusMembersPDF(eventId, busId) {
            if (!eventId || !busId) return;

            const buses = state.busRoutes[eventId] || [];
            const bus = buses.find(b => b.id === busId);
            if (!bus) return;

            firebaseDb.collection('users').get().then(usersSnapshot => {
                const users = {};
                usersSnapshot.forEach(doc => {
                    users[doc.id] = doc.data();
                });

                // Collect members per route pickup id for this bus
                let html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Bus Members - ${bus.name}</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            h1 { color: #ff5722; text-align: center; }
                            h2 { color: #333; border-bottom: 2px solid #ff5722; padding-bottom: 5px; }
                            .bus { font-weight: 800; margin: 10px 0 18px 0; }
                            .pickup { margin-top: 10px; font-weight: 800; }
                            .members { margin-left: 18px; margin-top: 6px; }
                            .member { margin: 4px 0; }
                        </style>
                    </head>
                    <body>
                        <h1>ರುದ್ರ ಬಲಗ - Rudra Parayana</h1>
                        <h2>Bus: ${bus.name}</h2>
                        <div class="bus">Pickup points & selected members</div>
                `;

                (bus.routes || []).forEach(route => {
                    const routeMembers = [];

                    Object.entries(state.rsvps).forEach(([uid, rsvpData]) => {
                        const rsvp = rsvpData[eventId];
                        if (rsvp && rsvp.status === 'attending' && rsvp.pickupPoint === route.id) {
                            const user = users[uid] || {};
                            routeMembers.push({
                                name: user.name || user.email || 'Unknown',
                                phone: user.phone || 'N/A'
                            });
                        }
                    });

                    html += `
                        <div class="pickup">${route.point} - ${route.time}</div>
                        <div class="members">
                            ${routeMembers.length ? routeMembers.map(m => `<div class="member">--> ${m.name} - ${m.phone}</div>`).join('') : '<div class="member">--> No members selected</div>'}
                        </div>
                    `;
                });

                html += '</body></html>';

                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(html);
                    printWindow.document.close();
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                } else {
                    alert('Please allow popups to download the PDF');
                }
            });
        }

        function downloadBusRoutesSelectedMembersPDF() {
            const eventId = document.getElementById('bus-routes-selected-members-event-select').value;
            if (!eventId) return;

            const event = state.events.find(e => e.id === eventId);
            const buses = state.busRoutes[eventId] || [];

            firebaseDb.collection('users').get().then(usersSnapshot => {
                const users = {};
                usersSnapshot.forEach(doc => {
                    users[doc.id] = doc.data();
                });

                // Precompute members by pickup point for quick rendering
                const pickupPointMembers = {}; // pickupPointId -> [{name, phone}]
                Object.entries(state.rsvps).forEach(([uid, rsvpData]) => {
                    const rsvp = rsvpData[eventId];
                    if (rsvp && rsvp.status === 'attending' && rsvp.pickupPoint) {
                        if (!pickupPointMembers[rsvp.pickupPoint]) pickupPointMembers[rsvp.pickupPoint] = [];
                        const user = users[uid] || {};
                        pickupPointMembers[rsvp.pickupPoint].push({
                            name: user.name || user.email || 'Unknown',
                            phone: user.phone || 'N/A'
                        });
                    }
                });

                let html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Route-wise Members - ${event?.title || 'Event'}</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            h1 { color: #ff5722; text-align: center; }
                            h2 { color: #333; border-bottom: 2px solid #ff5722; padding-bottom: 5px; }
                            .header { text-align: center; margin-bottom: 20px; }
                            .block { margin-bottom: 18px; }
                            .route { font-weight: 700; margin-top: 10px; }
                            .pickup { margin-left: 18px; font-weight: 700; }
                            .members { margin-left: 36px; white-space: pre-wrap; }
                            .meta { color: #444; font-size: 12px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>ರುದ್ರ ಬಲಗ - Rudra Parayana</h1>
                            <h2>Route-wise Members Report</h2>
                            <p>Event: ${event?.title || 'Unknown'}</p>
                        </div>
                `;

                html += `<div class="block"><div>event</div></div>`;

                buses.forEach(bus => {
                    html += `
                        <div class="block">
                            <div class="route">--> ${bus.name}</div>
                    `;

                    if (bus.routes) {
                        bus.routes.forEach(route => {
                            const members = pickupPointMembers[route.id] || [];
                            html += `
                                <div class="pickup">&nbsp;&nbsp;--> ${route.point}</div>
                                <div class="meta" style="margin-left:36px;">${route.time}</div>
                                <div class="members">
                                    ${members.length ? members.map(m => `&nbsp;&nbsp;&nbsp;&nbsp;--> ${m.name} - ${m.phone}`).join('<br>') : '&nbsp;&nbsp;&nbsp;&nbsp;--> No members selected'}
                                </div>
                            `;
                        });
                    }

                    html += `</div>`;
                });

                html += '</body></html>';

                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(html);
                    printWindow.document.close();
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                } else {
                    alert('Please allow popups to download the PDF');
                }
            });
        }

        function downloadConsolidatedBusRoutesSelectedMembersPDF() {
            const outstationEvents = state.events.filter(e => e.type === 'Outstation');

            // Only include events that actually have attending members
            const attendingEventIds = new Set(
                Object.values(state.rsvps || {})
                    .map(r => r && r ? Object.entries(r).filter(([eventId, data]) => data && data.status === 'attending') : [])
                    .flat()
                    .map(([eventId]) => eventId)
            );
            const selectedEvents = outstationEvents.filter(e => attendingEventIds.has(e.id));

            firebaseDb.collection('users').get().then(usersSnapshot => {
                const users = {};
                usersSnapshot.forEach(doc => {
                    users[doc.id] = doc.data();
                });

                let html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Consolidated Route-wise Members</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            h1 { color: #ff5722; text-align: center; }
                            h2 { color: #333; border-bottom: 2px solid #ff5722; padding-bottom: 5px; }
                            .header { text-align: center; margin-bottom: 20px; }
                            .eventBlock { margin-bottom: 22px; }
                            .route { font-weight: 700; }
                            .pickup { margin-left: 18px; font-weight: 700; }
                            .meta { color: #444; font-size: 12px; }
                            .members { margin-left: 36px; white-space: pre-wrap; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>ರುದ್ರ ಬಲಗ - Rudra Parayana</h1>
                            <h2>Consolidated Route-wise Members Report</h2>
                        </div>
                `;

                outstationEvents.forEach(event => {
                    const buses = state.busRoutes[event.id] || [];

                    // Build pickup point -> members for this event
                    const pickupPointMembers = {};
                    Object.entries(state.rsvps).forEach(([uid, rsvpData]) => {
                        const rsvp = rsvpData[event.id];
                        if (rsvp && rsvp.status === 'attending' && rsvp.pickupPoint) {
                            if (!pickupPointMembers[rsvp.pickupPoint]) pickupPointMembers[rsvp.pickupPoint] = [];
                            const user = users[uid] || {};
                            pickupPointMembers[rsvp.pickupPoint].push({
                                name: user.name || user.email || 'Unknown',
                                phone: user.phone || 'N/A'
                            });
                        }
                    });

                    html += `
                        <div class="eventBlock">
                            <h3>${event.title} - ${formatDate(event.date)}</h3>
                            <div>event</div>
                    `;

                    buses.forEach(bus => {
                        html += `
                            <div style="margin-top:10px;">
                                <div class="route">--> ${bus.name}</div>
                        `;

                        if (bus.routes) {
                            bus.routes.forEach(route => {
                                const members = pickupPointMembers[route.id] || [];
                                html += `
                                    <div class="pickup">&nbsp;&nbsp;--> ${route.point}</div>
                                    <div class="meta" style="margin-left:36px;">${route.time}</div>
                                    <div class="members">
                                        ${members.length ? members.map(m => `&nbsp;&nbsp;&nbsp;&nbsp;--> ${m.name} - ${m.phone}`).join('<br>') : '&nbsp;&nbsp;&nbsp;&nbsp;--> No members selected'}
                                    </div>
                                `;
                            });
                        }

                        html += `</div>`;
                    });

                    html += `</div>`;
                });

                html += '</body></html>';

                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(html);
                    printWindow.document.close();
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                } else {
                    alert('Please allow popups to download the PDF');
                }
            });
        }

        // Download consolidated bus routes as PDF
        function downloadConsolidatedBusRoutesPDF() {
            const outstationEvents = state.events.filter(e => e.type === 'Outstation');
            
            firebaseDb.collection('users').get().then(usersSnapshot => {
                const users = {};
                usersSnapshot.forEach(doc => {
                    users[doc.id] = doc.data();
                });
                
                let html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Consolidated Bus Routes</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            h1 { color: #ff5722; text-align: center; }
                            h2 { color: #333; border-bottom: 2px solid #ff5722; padding-bottom: 5px; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                            th { background-color: #ff5722; color: white; }
                            tr:nth-child(even) { background-color: #f9f9f9; }
                            .header { text-align: center; margin-bottom: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>ರುದ್ರ ಬಲಗ - Rudra Parayana</h1>
                            <h2>Consolidated Bus Routes Report</h2>
                        </div>
                `;
                
                outstationEvents.forEach(event => {
                    const buses = state.busRoutes[event.id] || [];
                    html += `<h3>${event.title} - ${formatDate(event.date)}</h3><table><tr><th>Bus</th><th>Pickup Point</th><th>Time</th><th>Members</th></tr>`;
                    buses.forEach(bus => {
                        if (bus.routes) {
                            bus.routes.forEach(route => {
                                const routeUsers = [];
                                Object.entries(state.rsvps).forEach(([uid, rsvpData]) => {
                                    const rsvp = rsvpData[event.id];
                                    if (rsvp && rsvp.status === 'attending' && rsvp.pickupPoint === route.id) {
                                        const user = users[uid] || {};
                                        routeUsers.push(user.name || user.email || 'Unknown');
                                    }
                                });
                                html += `<tr><td>${bus.name}</td><td>${route.point}</td><td>${route.time}</td><td>${routeUsers.length}</td></tr>`;
                            });
                        }
                    });
                    html += '</table>';
                });
                
                html += '</body></html>';
                
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(html);
                    printWindow.document.close();
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                } else {
                    alert('Please allow popups to download the PDF');
                }
            });
        }