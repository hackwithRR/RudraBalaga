        // State Management
        const state = {
            events: [],
            rsvps: {},
            busRoutes: {},
            user: null,
            selectedBusId: null,
            pointName: '',
            pointTime: ''
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

            // Find-users search box in the Members tab
            const membersSearchInput = document.getElementById('members-search-input');
            if (membersSearchInput) {
                membersSearchInput.addEventListener('input', () => {
                    renderMembersList();
                    const clearBtn = document.getElementById('members-search-clear');
                    if (clearBtn) clearBtn.classList.toggle('hidden', !membersSearchInput.value);
                });
            }
            const membersSearchClear = document.getElementById('members-search-clear');
            if (membersSearchClear) {
                membersSearchClear.addEventListener('click', () => {
                    const input = document.getElementById('members-search-input');
                    if (input) {
                        input.value = '';
                        input.focus();
                    }
                    membersSearchClear.classList.add('hidden');
                    renderMembersList();
                });
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
                    const eventEndDateSection = document.getElementById('event-end-date-section');
                    const eventEndDate = document.getElementById('event-end-date');
                    if (outstationDatesSection) {
                        if (e.target.value === 'Outstation') {
                            outstationDatesSection.classList.remove('hidden');
                            eventEndDateSection.classList.remove('hidden');
                            eventEndDate.required = true;
                        } else {
                            outstationDatesSection.classList.add('hidden');
                            eventEndDateSection.classList.add('hidden');
                            eventEndDate.required = false;
                            eventEndDate.value = '';
                        }
                    }
                    document.getElementById('event-is-outstation').checked = e.target.value === 'Outstation';
                });
            }

            const outstationToggle = document.getElementById('event-is-outstation');
            if (outstationToggle) {
                outstationToggle.addEventListener('change', function() {
                    eventTypeSelect.value = this.checked ? 'Outstation' : 'Bangalore';
                    eventTypeSelect.dispatchEvent(new Event('change'));
                });
            }

            const paymentSelect = document.getElementById('event-requires-payment');
            if (paymentSelect) {
                paymentSelect.addEventListener('change', function() {
                    document.getElementById('event-payment-fields').classList.toggle('hidden', this.value !== 'true');
                    document.getElementById('event-payment-amount').required = this.value === 'true';
                    document.getElementById('event-payment-description').required = this.value === 'true';
                });
            }

            const editEventType = document.getElementById('edit-event-type');
            if (editEventType) {
                editEventType.addEventListener('change', function(e) {
                    const eventEndDateSection = document.getElementById('edit-event-end-date-section');
                    const eventEndDate = document.getElementById('edit-event-end-date');
                    const outstationDatesSection = document.getElementById('edit-outstation-dates-section');
                    const isOutstation = e.target.value === 'Outstation';
                    eventEndDateSection.classList.toggle('hidden', !isOutstation);
                    outstationDatesSection.classList.toggle('hidden', !isOutstation);
                    eventEndDate.required = isOutstation;
                    if (!isOutstation) eventEndDate.value = '';
                    document.getElementById('edit-event-is-outstation').checked = isOutstation;
                });
            }

            const editOutstationToggle = document.getElementById('edit-event-is-outstation');
            if (editOutstationToggle) {
                editOutstationToggle.addEventListener('change', function() {
                    editEventType.value = this.checked ? 'Outstation' : 'Bangalore';
                    editEventType.dispatchEvent(new Event('change'));
                });
            }

            const editPaymentSelect = document.getElementById('edit-event-requires-payment');
            if (editPaymentSelect) {
                editPaymentSelect.addEventListener('change', function() {
                    document.getElementById('edit-event-payment-fields').classList.toggle('hidden', this.value !== 'true');
                    document.getElementById('edit-event-payment-amount').required = this.value === 'true';
                    document.getElementById('edit-event-payment-description').required = this.value === 'true';
                });
            }

            const eventPaymentsTab = document.getElementById('event-payments-tab');
            if (eventPaymentsTab) eventPaymentsTab.addEventListener('click', () => {
                switchTab('event-payments');
                loadPaymentReview();
            });
            const paymentsEventSelect = document.getElementById('payments-event-select');
            if (paymentsEventSelect) paymentsEventSelect.addEventListener('change', loadPaymentReview);

            const donationsTab = document.getElementById('donations-tab');
            if (donationsTab) donationsTab.addEventListener('click', () => {
                switchTab('donations');
            });

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
                    const busCard = e.target.closest('.bus-card');
                    if (busCard && !e.target.closest('.remove-bus') && !e.target.closest('.remove-route') && !e.target.closest('button')) {
                        const busId = busCard.dataset.busId;
                        if (busId) {
                            state.selectedBusId = busId;
                            displayBusRoutes();
                        }
                    }

                    if (e.target.classList.contains('remove-bus')) {
                        removeBus(e);
                    } else if (e.target.classList.contains('remove-route')) {
                        removeRoute(e);
                    }
                });

                busesContainer.addEventListener('submit', function(e) {
                    if (e.target.classList.contains('pickup-point-form')) {
                        e.preventDefault();
                        addBusRoute(e);
                    }
                });

                busesContainer.addEventListener('input', function(e) {
                    if (e.target.name === 'pointName') {
                        state.pointName = e.target.value;
                    }
                    if (e.target.name === 'pointTime') {
                        state.pointTime = e.target.value;
                    }
                });
            }
        }
        
        function formatOutstationDateRange(startDate, endDate) {
            if (!startDate && !endDate) return '';
            const validDates = [startDate, endDate].filter(Boolean);
            if (!validDates.length) return '';
            if (validDates.length === 1) return validDates[0];
            const sortedDates = [...validDates].sort();
            return `${sortedDates[0]} - ${sortedDates[1]}`;
        }

        function normalizeOutstationDateRange(startDate, endDate) {
            const validDates = [startDate, endDate].filter(Boolean);
            if (!validDates.length) {
                return { startDate: null, endDate: null, rangeDates: [] };
            }

            const sortedDates = [...validDates].sort();
            return {
                startDate: sortedDates[0],
                endDate: sortedDates[sortedDates.length - 1],
                rangeDates: sortedDates
            };
        }

        function validateOutstationDateRange(startDate, endDate) {
            if (!startDate || !endDate) return true;
            return new Date(endDate) >= new Date(startDate);
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
            
            const busName = document.getElementById('bus-name').value.trim();
            if (!busName) return;

            const existingBuses = state.busRoutes[eventId] || [];
            const newBus = {
                id: 'bus-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8),
                name: busName,
                routes: []
            };

            const updatedBuses = [...existingBuses, newBus];
            state.busRoutes[eventId] = updatedBuses;
            state.selectedBusId = newBus.id;
            state.pointName = '';
            state.pointTime = '';

            firebaseDb.collection('busRoutes').doc(eventId).set({
                buses: updatedBuses
            });

            e.target.reset();
            displayBusRoutes();
        }
        
        // Add pickup point to a bus (Admin)
        function addBusRoute(e) {
            e.preventDefault();
            
            const eventId = document.getElementById('bus-routes-users-event-select').value;
            if (!eventId) return;

            const busId = e.target.dataset.busId || state.selectedBusId;
            if (!busId) return;

            const point = (state.pointName || document.getElementById('pickup-point')?.value || '').trim();
            const time = (state.pointTime || document.getElementById('pickup-time')?.value || '').trim();

            if (!point || !time) return;

            const buses = state.busRoutes[eventId] || [];
            const busIndex = buses.findIndex(b => b.id === busId);
            
            if (busIndex === -1) return;
            
            const newRoute = {
                id: 'route-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8),
                point,
                time
            };
            
            const updatedBuses = buses.map((bus) => {
                if (bus.id !== busId) return bus;
                return {
                    ...bus,
                    routes: [...(bus.routes || []), newRoute]
                };
            });

            state.busRoutes[eventId] = updatedBuses;
            state.pointName = '';
            state.pointTime = '';

            firebaseDb.collection('busRoutes').doc(eventId).set({
                buses: updatedBuses
            });

            displayBusRoutes();
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

            const buses = state.busRoutes[eventId] || [];
            if (busSelect) {
                busSelect.innerHTML = '<option value="">Select a bus</option>';
                buses.forEach(bus => {
                    const option = document.createElement('option');
                    option.value = bus.id;
                    option.textContent = bus.name;
                    if (state.selectedBusId === bus.id) {
                        option.selected = true;
                    }
                    busSelect.appendChild(option);
                });
            }

            if (!state.selectedBusId || !buses.some(bus => bus.id === state.selectedBusId)) {
                state.selectedBusId = buses[0]?.id || null;
            }

            // Display buses and their routes
            if (buses.length > 0) {
                busRoutesList.classList.remove('hidden');
                busesContainer.innerHTML = '';
                
                buses.forEach(bus => {
                    const isSelected = state.selectedBusId === bus.id;
                    const busDiv = document.createElement('div');
                    busDiv.className = `bus-card border-2 rounded-xl p-4 cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary-container/10 shadow-sm' : 'border-outline-variant bg-surface-container-low'}`;
                    busDiv.dataset.busId = bus.id;
                    busDiv.innerHTML = `
                        <div class="flex justify-between items-center mb-3">
                            <h5 class="font-bold text-lg text-primary">${bus.name}</h5>
                            <button type="button" class="remove-bus text-error text-xl font-bold" data-bus-id="${bus.id}" data-event-id="${eventId}">×</button>
                        </div>
                        ${isSelected ? `
                            <div class="mt-3 border-t border-outline-variant pt-4">
                                <h6 class="font-bold text-secondary mb-3">Pickup Points for ${bus.name}</h6>
                                <form class="pickup-point-form space-y-3" data-bus-id="${bus.id}">
                                    <div>
                                        <label class="block font-label-lg text-label-lg text-on-surface mb-2">Pickup Location/Point Name</label>
                                        <input type="text" name="pointName" value="${state.pointName || ''}" required class="w-full h-[50px] px-3 rounded-xl border-2 border-primary-container bg-white text-on-surface font-body-lg" placeholder="Banashankari, MG Road...">
                                    </div>
                                    <div>
                                        <label class="block font-label-lg text-label-lg text-on-surface mb-2">Pickup Time</label>
                                        <input type="time" name="pointTime" value="${state.pointTime || ''}" required class="w-full h-[50px] px-3 rounded-xl border-2 border-primary-container bg-white text-on-surface font-body-lg">
                                    </div>
                                    <button type="submit" class="w-full h-[44px] bg-secondary-container text-on-secondary-container rounded-xl font-bold text-body-lg btn-active">Add Pickup Point</button>
                                </form>
                                <div class="mt-4">
                                    <h6 class="font-bold text-secondary mb-2">Existing Pickup Points</h6>
                                    ${bus.routes && bus.routes.length > 0 ? `
                                        <ul class="space-y-2">
                                            ${bus.routes.map(route => `
                                                <li class="flex justify-between items-center gap-3 p-2 bg-surface-container-high rounded-lg">
                                                    <div>
                                                        <span class="font-body-lg text-body-lg block">${route.point}</span>
                                                        <span class="text-on-surface-variant text-sm">${route.time}</span>
                                                    </div>
                                                    <button type="button" class="remove-route text-error font-bold" data-route-id="${route.id}" data-bus-id="${bus.id}" data-event-id="${eventId}">Remove</button>
                                                </li>
                                            `).join('')}
                                        </ul>
                                    ` : '<p class="text-on-surface-variant text-sm">No pickup points added yet.</p>'}
                                </div>
                            </div>
                        ` : `
                            <div class="mt-3 text-on-surface-variant text-sm">
                                ${bus.routes && bus.routes.length > 0 ? `${bus.routes.length} pickup point${bus.routes.length === 1 ? '' : 's'} saved` : 'No pickup points yet'}
                            </div>
                        `}
                    `;
                    busesContainer.appendChild(busDiv);
                });
            } else {
                busRoutesList.classList.add('hidden');
                state.selectedBusId = null;
            }
        }
        
        // Remove bus (Admin)
        function removeBus(e) {
            const busId = e.target.dataset.busId;
            const eventId = e.target.dataset.eventId;
            
            const updatedBuses = state.busRoutes[eventId].filter(bus => bus.id !== busId);
            state.busRoutes[eventId] = updatedBuses;
            if (state.selectedBusId === busId) {
                state.selectedBusId = updatedBuses[0]?.id || null;
            }
            state.pointName = '';
            state.pointTime = '';
            
            firebaseDb.collection('busRoutes').doc(eventId).set({
                buses: updatedBuses
            });

            displayBusRoutes();
        }
        
        // Remove route (Admin)
        function removeRoute(e) {
            const routeId = e.target.dataset.routeId;
            const busId = e.target.dataset.busId;
            const eventId = e.target.dataset.eventId;
            
            const buses = state.busRoutes[eventId];
            const busIndex = buses.findIndex(b => b.id === busId);
            
            if (busIndex === -1) return;
            
            const updatedBuses = buses.map((bus) => {
                if (bus.id !== busId) return bus;
                return {
                    ...bus,
                    routes: (bus.routes || []).filter(route => route.id !== routeId)
                };
            });

            state.busRoutes[eventId] = updatedBuses;
            firebaseDb.collection('busRoutes').doc(eventId).set({
                buses: updatedBuses
            });

            displayBusRoutes();
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
            document.getElementById('event-payments-tab').classList.remove('tab-active');
            document.getElementById('event-payments-tab').classList.add('tab-inactive');
            document.getElementById('donations-tab').classList.remove('tab-active');
            document.getElementById('donations-tab').classList.add('tab-inactive');
            
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
            } else if (tab === 'event-payments') {
                document.getElementById('event-payments-tab').classList.add('tab-active');
                document.getElementById('event-payments-tab').classList.remove('tab-inactive');
            } else if (tab === 'donations') {
                document.getElementById('donations-tab').classList.add('tab-active');
                document.getElementById('donations-tab').classList.remove('tab-inactive');
                loadDonations();
            }
            
            // Update tab content
            document.getElementById('add-event-content').classList.toggle('hidden', tab !== 'add-event');
            document.getElementById('bus-routes-users-content').classList.toggle('hidden', tab !== 'bus-routes-users');
            document.getElementById('bus-routes-selected-members-content').classList.toggle('hidden', tab !== 'bus-routes-selected-members');
            document.getElementById('attendance-content').classList.toggle('hidden', tab !== 'attendance');
            document.getElementById('members-content').classList.toggle('hidden', tab !== 'members');
            document.getElementById('announcements-content').classList.toggle('hidden', tab !== 'announcements');
            document.getElementById('event-history-content').classList.toggle('hidden', tab !== 'event-history');
            document.getElementById('event-payments-content').classList.toggle('hidden', tab !== 'event-payments');
            document.getElementById('donations-content').classList.toggle('hidden', tab !== 'donations');
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
            document.getElementById('edit-event-is-outstation').checked = event.type === 'Outstation' || event.isOutstation === true;
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
                document.getElementById('edit-event-end-date-section').classList.remove('hidden');
                document.getElementById('edit-event-end-date').required = true;
                document.getElementById('edit-event-end-date').value = event.eventEndDate || event.date || '';
                document.getElementById('edit-outstation-dates-section').classList.remove('hidden');
                document.getElementById('edit-departure-date').value = event.departureDate || '';
                document.getElementById('edit-return-date').value = event.returnDate || '';
                document.getElementById('edit-event-requires-payment').value = event.requiresPayment === true ? 'true' : 'false';
                document.getElementById('edit-event-payment-amount').value = event.amount || '';
                document.getElementById('edit-event-payment-description').value = event.paymentDescription || '';
                document.getElementById('edit-event-bank-name').value = event.bankTransfer?.bankName || '';
                document.getElementById('edit-event-account-name').value = event.bankTransfer?.accountName || '';
                document.getElementById('edit-event-account-number').value = event.bankTransfer?.accountNumber || '';
                document.getElementById('edit-event-ifsc-code').value = event.bankTransfer?.ifscCode || '';
                document.getElementById('edit-event-payment-fields').classList.toggle('hidden', event.requiresPayment !== true);
            } else {
                document.getElementById('edit-event-end-date-section').classList.add('hidden');
                document.getElementById('edit-event-end-date').required = false;
                document.getElementById('edit-event-end-date').value = '';
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
                limit: limit,
                isOutstation: type === 'Outstation',
                requiresPayment: false,
                amount: null,
                paymentDescription: null
            };

            // Add outstation dates if type is Outstation
            if (type === 'Outstation') {
                const eventStartDate = document.getElementById('edit-event-date').value || null;
                const eventEndDate = document.getElementById('edit-event-end-date').value || null;
                const departureDate = document.getElementById('edit-departure-date').value || null;
                const returnDate = document.getElementById('edit-return-date').value || null;

                if (!validateOutstationDateRange(eventStartDate, eventEndDate)) {
                    alert('Event end date must be on or after the event start date.');
                    return;
                }
                if (!validateOutstationDateRange(departureDate, returnDate)) {
                    alert('Arriving-back date must be on or after the departure date.');
                    return;
                }

                const { startDate, endDate, rangeDates } = normalizeOutstationDateRange(departureDate, returnDate);

                updateData.eventEndDate = eventEndDate;
                updateData.departureDate = startDate;
                updateData.returnDate = endDate;
                updateData.outstationDates = rangeDates.length ? rangeDates : [];
                updateData.isOutstation = true;
                updateData.requiresPayment = document.getElementById('edit-event-requires-payment').value === 'true';
                updateData.amount = updateData.requiresPayment ? Number(document.getElementById('edit-event-payment-amount').value) : null;
                updateData.paymentDescription = updateData.requiresPayment ? document.getElementById('edit-event-payment-description').value.trim() : null;
                updateData.bankTransfer = updateData.requiresPayment ? {
                    bankName: document.getElementById('edit-event-bank-name').value.trim(),
                    accountName: document.getElementById('edit-event-account-name').value.trim(),
                    accountNumber: document.getElementById('edit-event-account-number').value.trim(),
                    ifscCode: document.getElementById('edit-event-ifsc-code').value.trim().toUpperCase()
                } : null;
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
        let allMembersCache = [];

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
                        address: data.address || 'N/A',
                        emergencyContactName: data.emergencyContactName || 'N/A',
                        emergencyContact: data.emergencyContact || 'N/A',
                        emergencyContactRelation: data.emergencyContactRelation || 'N/A',
                        photoURL: data.photoURL || ''
                    });
                });
                
                // Sort alphabetically by name
                members.sort((a, b) => a.name.localeCompare(b.name));
                allMembersCache = members;
                renderMembersList();
            });
        }

        // Render the members list, filtered by the find-users search box
        function renderMembersList() {
            const membersList = document.getElementById('members-list');
            if (!membersList) return;

            const searchInput = document.getElementById('members-search-input');
            const filter = (searchInput?.value || '').trim().toLowerCase();
            const filterDigits = filter.replace(/\D/g, '');

            const filteredMembers = !filter ? allMembersCache : allMembersCache.filter(m => {
                const haystack = [m.name, m.email, m.phone, m.id].join(' ').toLowerCase();
                if (haystack.includes(filter)) return true;
                // Allow finding users by typing only part of their phone number
                if (filterDigits && String(m.phone).replace(/\D/g, '').includes(filterDigits)) return true;
                return false;
            });

            const countEl = document.getElementById('members-count');
            if (countEl) {
                countEl.textContent = filter
                    ? `Found ${filteredMembers.length} of ${allMembersCache.length} members for "${filter}"`
                    : `Showing all ${allMembersCache.length} members`;
            }

            if (!filteredMembers.length) {
                membersList.innerHTML = `<li class="p-6 text-center bg-surface-container-high rounded-lg"><span class="material-symbols-outlined text-on-surface-variant text-3xl">person_search</span><p class="text-on-surface-variant font-body-lg text-body-lg mt-2">No members found matching "<strong>${filter.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong>"</p></li>`;
                return;
            }

            membersList.innerHTML = filteredMembers.map((m, index) => {
                return `<li class="member-details-trigger p-3 bg-surface-container-high rounded-lg font-body-lg text-body-lg cursor-pointer hover:bg-primary-fixed" data-member='${JSON.stringify(m).replace(/'/g, '&apos;')}' tabindex="0" role="button">
                        <div class="flex justify-between items-center gap-3">
                            <div>
                                <span class="font-bold text-primary">${index + 1}.</span>
                                <span class="ml-2">${m.name}</span>
                                <p class="text-sm text-on-surface-variant ml-7">${m.email}</p>
                            </div>
                            <span class="material-symbols-outlined text-primary">arrow_forward</span>
                        </div>
                    </li>`;
            }).join('');

            membersList.querySelectorAll('.member-details-trigger').forEach(memberItem => {
                const openDetails = () => showMemberDetails(JSON.parse(memberItem.dataset.member.replace(/&apos;/g, "'")));
                memberItem.addEventListener('click', openDetails);
                memberItem.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openDetails();
                    }
                });
            });
        }

        function showMemberDetails(member) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4';
            const profileImage = member.photoURL ? `<img src="${member.photoURL}" alt="${member.name}" class="w-24 h-24 rounded-full object-cover border-4 border-primary-fixed mx-auto mb-3">` : `<div class="w-24 h-24 rounded-full bg-primary-fixed text-primary flex items-center justify-center text-3xl font-bold mx-auto mb-3">${member.name.charAt(0).toUpperCase()}</div>`;
            modal.innerHTML = `<div class="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"><div class="flex justify-between items-start gap-3 mb-4"><div class="w-full text-center">${profileImage}<h3 class="font-headline-sm text-headline-sm text-primary">${member.name}</h3><p class="text-sm text-on-surface-variant">Member ID: ${member.id}</p></div><button id="close-member-details" class="text-2xl text-on-surface-variant">&times;</button></div><div class="grid grid-cols-1 gap-3"><div class="p-3 rounded-lg bg-surface-container-high"><p class="text-xs uppercase tracking-wide text-on-surface-variant">Email</p><p class="font-body-lg text-body-lg break-all">${member.email}</p></div><div class="p-3 rounded-lg bg-surface-container-high"><p class="text-xs uppercase tracking-wide text-on-surface-variant">Phone</p><p class="font-body-lg text-body-lg">${member.phone}</p></div><div class="p-3 rounded-lg bg-surface-container-high"><p class="text-xs uppercase tracking-wide text-on-surface-variant">Date of birth</p><p class="font-body-lg text-body-lg">${member.dob}</p></div><div class="p-3 rounded-lg bg-surface-container-high"><p class="text-xs uppercase tracking-wide text-on-surface-variant">Address</p><p class="font-body-lg text-body-lg whitespace-pre-wrap">${member.address}</p></div><div class="p-3 rounded-lg bg-secondary-fixed border border-secondary-container"><p class="text-xs uppercase tracking-wide text-secondary">Emergency contact</p><p class="font-body-lg text-body-lg font-bold">${member.emergencyContactName}</p><p class="font-body-lg text-body-lg">${member.emergencyContact}</p><p class="text-sm text-on-surface-variant">${member.emergencyContactRelation}</p></div></div></div>`;
            document.body.appendChild(modal);
            document.getElementById('close-member-details').onclick = () => modal.remove();
            modal.addEventListener('click', event => {
                if (event.target === modal) modal.remove();
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
            const eventEndDate = document.getElementById('event-end-date').value;

            if (type === 'Outstation') {
                if (!validateOutstationDateRange(date, eventEndDate)) {
                    alert('Event end date must be on or after the event start date.');
                    return;
                }
                if (!validateOutstationDateRange(departureDate, returnDate)) {
                    alert('Arriving-back date must be on or after the departure date.');
                    return;
                }
            }
            
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
                isOutstation: type === 'Outstation',
                requiresPayment: false,
                amount: null,
                paymentDescription: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Add outstation dates if type is Outstation
            if (type === 'Outstation') {
                const { startDate, endDate, rangeDates } = normalizeOutstationDateRange(departureDate, returnDate);
                eventData.eventEndDate = eventEndDate || null;
                eventData.departureDate = startDate || null;
                eventData.returnDate = endDate || null;
                eventData.outstationDates = rangeDates.length ? rangeDates : [];
                eventData.isOutstation = true;
                eventData.requiresPayment = document.getElementById('event-requires-payment').value === 'true';
                eventData.amount = eventData.requiresPayment ? Number(document.getElementById('event-payment-amount').value) : null;
                eventData.paymentDescription = eventData.requiresPayment ? document.getElementById('event-payment-description').value.trim() : null;
                eventData.bankTransfer = eventData.requiresPayment ? {
                    bankName: document.getElementById('event-bank-name').value.trim(),
                    accountName: document.getElementById('event-account-name').value.trim(),
                    accountNumber: document.getElementById('event-account-number').value.trim(),
                    ifscCode: document.getElementById('event-ifsc-code').value.trim().toUpperCase()
                } : null;
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
                    // Check for both 'attending' and 'attended' statuses
                    if (rsvp && (rsvp.status === 'attending' || rsvp.status === 'attended')) {
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
                    } else if (rsvp && (rsvp.status === 'not-attending' || rsvp.status === 'not-attended')) {
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
            const paymentsEventSelect = document.getElementById('payments-event-select');

            rosterSelect.innerHTML = '<option value="">Select an event</option>';
            busRoutesUsersSelect.innerHTML = '<option value="">Select an outstation event</option>';
            busRoutesSelectedMembersSelect.innerHTML = '<option value="">Select an outstation event</option>';
            paymentsEventSelect.innerHTML = '<option value="">Select an event</option>';

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

                    if (event.requiresPayment === true) {
                        const paymentOption = document.createElement('option');
                        paymentOption.value = event.id;
                        paymentOption.textContent = `${event.title} (₹${event.amount || 0})`;
                        paymentsEventSelect.appendChild(paymentOption);
                    }
                }
            });
        }

        function loadPaymentReview() {
            const eventId = document.getElementById('payments-event-select').value;
            const list = document.getElementById('payments-list');
            const summary = document.getElementById('payments-summary');
            if (!eventId) {
                summary.innerHTML = '';
                list.innerHTML = '<p class="text-on-surface-variant">Select an event to review payments.</p>';
                return;
            }

            const event = state.events.find(item => item.id === eventId);
            Promise.all([firebaseDb.collection('users').get(), firebaseDb.collection('rsvps').get()]).then(([usersSnapshot, rsvpsSnapshot]) => {
                const users = {};
                usersSnapshot.forEach(doc => users[doc.id] = doc.data());
                const records = [];
                rsvpsSnapshot.forEach(doc => {
                    const rsvp = doc.data()[eventId];
                    if (rsvp && (rsvp.status === 'attending' || rsvp.payment)) {
                        records.push({ uid: doc.id, rsvp, user: users[doc.id] || {} });
                    }
                });

                const pending = records.filter(record => record.rsvp.payment?.paymentStatus === 'PENDING_APPROVAL');
                const approved = records.filter(record => record.rsvp.payment?.paymentStatus === 'APPROVED');
                const unpaid = records.filter(record => !record.rsvp.payment || record.rsvp.payment.paymentStatus === 'NONE' || record.rsvp.payment.paymentStatus === 'REJECTED');
                summary.innerHTML = [['Pending', pending.length], ['Approved', approved.length], ['Unpaid / Rejected', unpaid.length], ['Expected', `₹${event?.amount || 0}`]].map(([label, value]) => `<div class="p-3 rounded-xl bg-surface-container-high border border-outline-variant"><p class="text-xs uppercase tracking-wide text-on-surface-variant">${label}</p><p class="font-bold text-lg text-primary">${value}</p></div>`).join('');
                list.innerHTML = records.length ? records.map(record => {
                    const payment = record.rsvp.payment || {};
                    const name = record.user.name || record.user.email || record.uid;
                    const contact = record.user.email || record.user.phone || 'No contact';
                    const status = payment.paymentStatus || 'NONE';
                    return `<div class="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border border-outline-variant bg-white"><div><p class="font-bold text-on-surface">${name}</p><p class="text-sm text-on-surface-variant">${contact}</p><p class="text-sm text-on-surface-variant mt-1">${payment.submittedAt?.toDate ? payment.submittedAt.toDate().toLocaleString() : 'No proof submitted'}</p></div><div class="flex items-center gap-2"><span class="px-3 py-1 rounded-full text-xs font-bold ${status === 'APPROVED' ? 'bg-green-100 text-green-800' : status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' : 'bg-surface-container-high text-on-surface-variant'}">${status}</span>${payment.screenshotBase64 || payment.screenshotUrl ? `<button class="view-payment-proof touch-active px-3 py-2 rounded-lg bg-primary-container text-on-primary-container font-bold" data-event-id="${eventId}" data-user-id="${record.uid}">View Proof</button>` : ''}</div></div>`;
                }).join('') : '<p class="text-on-surface-variant">No registrations found for this event.</p>';

                list.querySelectorAll('.view-payment-proof').forEach(button => button.addEventListener('click', () => showPaymentReviewModal(eventId, button.dataset.userId, event, records.find(record => record.uid === button.dataset.userId))));
            });
        }

        // Load and display donations (who donated how much)
        function loadDonations() {
            const list = document.getElementById('donations-list');
            const summary = document.getElementById('donations-summary');
            if (!list) return;
            list.innerHTML = '<p class="text-on-surface-variant">Loading donations...</p>';
            firebaseDb.collection('donations').orderBy('submittedAt', 'desc').get().then(snapshot => {
                const donations = [];
                snapshot.forEach(doc => {
                    donations.push({ id: doc.id, ...doc.data() });
                });

                const pending = donations.filter(d => d.paymentStatus === 'PENDING_APPROVAL');
                const approved = donations.filter(d => d.paymentStatus === 'APPROVED');
                const totalApproved = approved.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
                const totalAll = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

                summary.innerHTML = [['Pending', pending.length], ['Approved', approved.length], ['Total Approved ₹', `₹${totalApproved}`], ['Total Donated ₹', `₹${totalAll}`]].map(([label, value]) => `<div class="p-3 rounded-xl bg-surface-container-high border border-outline-variant"><p class="text-xs uppercase tracking-wide text-on-surface-variant">${label}</p><p class="font-bold text-lg text-primary">${value}</p></div>`).join('');

                if (!donations.length) {
                    list.innerHTML = '<p class="text-on-surface-variant">No donations yet.</p>';
                    return;
                }

                list.innerHTML = donations.map(donation => {
                    const d = donation;
                    const name = d.name || d.email || d.uid || 'Anonymous';
                    const contact = d.phone || d.email || 'No contact';
                    const statusLabel = d.paymentStatus || 'NONE';
                    const statusClass = statusLabel === 'APPROVED' ? 'bg-green-100 text-green-800' : statusLabel === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' : statusLabel === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-surface-container-high text-on-surface-variant';
                    const amountText = `₹${Number(d.amount) || 0}`;
                    return `<div class="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border border-outline-variant bg-white">
                        <div>
                            <p class="font-bold text-on-surface">${name} <span class="text-primary">· ${amountText}</span></p>
                            <p class="text-sm text-on-surface-variant">${contact}</p>
                            <p class="text-sm text-on-surface-variant mt-1">${d.submittedAt?.toDate ? d.submittedAt.toDate().toLocaleString() : 'Date not available'}</p>
                            ${d.utrNumber ? `<p class="text-sm text-on-surface-variant mt-1">UTR: <span class="select-all">${d.utrNumber}</span></p>` : ''}
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="px-3 py-1 rounded-full text-xs font-bold ${statusClass}">${statusLabel === 'PENDING_APPROVAL' ? 'PENDING' : statusLabel}</span>
                            ${d.screenshotBase64 || d.screenshotUrl ? `<button class="view-donation-proof touch-active px-3 py-2 rounded-lg bg-primary-container text-on-primary-container font-bold" data-donation-id="${d.id}">View Proof</button>` : ''}
                        </div>
                    </div>`;
                }).join('');

                list.querySelectorAll('.view-donation-proof').forEach(button => button.addEventListener('click', () => {
                    const donation = donations.find(d => d.id === button.dataset.donationId);
                    if (donation) showDonationReviewModal(donation);
                }));
            }).catch(error => {
                console.error('Error loading donations:', error);
                list.innerHTML = '<p class="text-on-surface-variant">Failed to load donations. The donations collection may not exist yet.</p>';
            });
        }

        // Show donation proof review modal with approve/reject
        function showDonationReviewModal(donation) {
            const modal = document.createElement('div');
            modal.className = 'payment-review-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4';
            modal.innerHTML = `<div class="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"><div class="flex justify-between items-center gap-3 mb-4"><div><h3 class="font-headline-sm text-headline-sm text-primary">Donation Proof</h3><p class="text-on-surface-variant">${donation.name || donation.email || donation.uid || 'Anonymous'}</p></div><button id="close-donation-review" class="text-2xl text-on-surface-variant">&times;</button></div><img src="${donation.screenshotBase64 || donation.screenshotUrl}" alt="Donation transaction screenshot" class="w-full max-h-[55vh] object-contain rounded-lg border border-outline-variant bg-surface-container-high"><div class="grid grid-cols-2 gap-3 mt-4"><div class="p-3 rounded-lg bg-surface-container-high"><p class="text-xs text-on-surface-variant">Donation amount</p><p class="font-bold text-primary">₹${Number(donation.amount) || 0}</p></div><div class="p-3 rounded-lg bg-surface-container-high"><p class="text-xs text-on-surface-variant">UTR / reference</p><p class="font-bold break-all">${donation.utrNumber || 'Not provided'}</p></div></div><div class="grid gap-2 mt-4 p-3 rounded-lg bg-surface-container-high"><p class="text-xs text-on-surface-variant">Submitted at</p><p class="font-bold">${donation.submittedAt?.toDate ? donation.submittedAt.toDate().toLocaleString() : 'Not available'}</p></div><p class="text-sm text-on-surface-variant mt-4"><span class="px-3 py-1 rounded-full text-xs font-bold ${donation.paymentStatus === 'APPROVED' ? 'bg-green-100 text-green-800' : donation.paymentStatus === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'}">${donation.paymentStatus || 'NONE'}</span></p><div class="grid grid-cols-2 gap-3 mt-5"><button id="reject-donation" class="h-12 rounded-lg bg-error-container text-on-error-container font-bold">Reject Donation</button><button id="approve-donation" class="h-12 rounded-lg bg-primary-container text-on-primary-container font-bold">Approve Donation</button></div></div>`;
            document.body.appendChild(modal);
            document.getElementById('close-donation-review').onclick = () => modal.remove();
            const updateStatus = status => firebaseDb.collection('donations').doc(donation.id).update({
                paymentStatus: status,
                reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
                reviewedBy: state.user?.uid || null
            }).then(() => { modal.remove(); loadDonations(); });
            document.getElementById('approve-donation').onclick = () => updateStatus('APPROVED');
            document.getElementById('reject-donation').onclick = () => updateStatus('REJECTED');
        }

        function showPaymentReviewModal(eventId, userId, event, record) {
            if (!record) return;
            const payment = record.rsvp.payment || {};
            const modal = document.createElement('div');
            modal.className = 'payment-review-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4';
            modal.innerHTML = `<div class="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"><div class="flex justify-between items-center gap-3 mb-4"><div><h3 class="font-headline-sm text-headline-sm text-primary">Payment Proof</h3><p class="text-on-surface-variant">${record.user.name || record.user.email || userId}</p></div><button id="close-payment-review" class="text-2xl text-on-surface-variant">&times;</button></div><img src="${payment.screenshotBase64 || payment.screenshotUrl}" alt="Payment transaction screenshot" class="w-full max-h-[55vh] object-contain rounded-lg border border-outline-variant bg-surface-container-high"><div class="grid grid-cols-2 gap-3 mt-4"><div class="p-3 rounded-lg bg-surface-container-high"><p class="text-xs text-on-surface-variant">Amount expected</p><p class="font-bold">₹${event?.amount || payment.amount || 0}</p></div><div class="p-3 rounded-lg bg-surface-container-high"><p class="text-xs text-on-surface-variant">UTR / reference</p><p class="font-bold break-all">${payment.utrNumber || 'Not provided'}</p></div></div><p class="text-on-surface mt-4">${event?.paymentDescription || ''}</p><div class="grid grid-cols-2 gap-3 mt-5"><button id="reject-payment" class="h-12 rounded-lg bg-error-container text-on-error-container font-bold">Reject Payment</button><button id="approve-payment" class="h-12 rounded-lg bg-primary-container text-on-primary-container font-bold">Approve Payment</button></div></div>`;
            document.body.appendChild(modal);
            const reviewModal = modal.querySelector('div');
            reviewModal.classList.add('payment-review-modal');
            reviewModal.querySelector('h3')?.insertAdjacentHTML('beforebegin', '<span class="material-symbols-outlined text-2xl text-primary">fact_check</span>');
            reviewModal.querySelector('#approve-payment')?.insertAdjacentHTML('afterbegin', '<span class="material-symbols-outlined align-middle mr-1">check_circle</span>');
            reviewModal.querySelector('#reject-payment')?.insertAdjacentHTML('afterbegin', '<span class="material-symbols-outlined align-middle mr-1">cancel</span>');
            document.getElementById('close-payment-review').onclick = () => modal.remove();
            const updateStatus = status => firebaseDb.collection('rsvps').doc(userId).update({
                [`${eventId}.payment.paymentStatus`]: status,
                [`${eventId}.payment.reviewedAt`]: firebase.firestore.FieldValue.serverTimestamp(),
                [`${eventId}.payment.reviewedBy`]: state.user?.uid || null
            }).then(() => { modal.remove(); loadPaymentReview(); });
            document.getElementById('approve-payment').onclick = () => updateStatus('APPROVED');
            document.getElementById('reject-payment').onclick = () => updateStatus('REJECTED');
        }

        // Take attendance - opens a modal with Present/Absent checkboxes for all members of selected event
        function takeAttendance() {
            const eventId = document.getElementById('roster-event-select').value;
            if (!eventId) return;

            const event = state.events.find(e => e.id === eventId);
            if (!event) return;

            firebaseDb.collection('users').get().then(usersSnapshot => {
                const users = {};
                usersSnapshot.forEach(doc => {
                    users[doc.id] = doc.data();
                });

                // Build attending + not-attending lists from RSVP state, as your roster does
                // Include both 'attending'/'not-attending' (initial RSVP) and 'attended'/'not-attended' (after taking attendance)
                const memberUids = Object.keys(state.rsvps || {});
                const attendingUids = [];
                const notAttendingUids = [];

                memberUids.forEach(uid => {
                    const rsvpForEvent = state.rsvps[uid]?.[eventId];
                    if (!rsvpForEvent) return;
                    if (rsvpForEvent.status === 'attending' || rsvpForEvent.status === 'attended') attendingUids.push(uid);
                    if (rsvpForEvent.status === 'not-attending' || rsvpForEvent.status === 'not-attended') notAttendingUids.push(uid);
                });

                // Render modal UI
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4';

                const rowsHtml = [
                    ...attendingUids.map(uid => {
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
                    ...notAttendingUids.map(uid => {
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

                    // Update RSVP status to 'attended' for present members and 'not-attended' for absent
                    const rsvpUpdates = [];
                    present.forEach(uid => {
                        rsvpUpdates.push(
                            firebaseDb.collection('rsvps').doc(uid).set(
                                { [eventId]: { status: 'attended', pickupPoint: state.rsvps[uid]?.[eventId]?.pickupPoint || null } },
                                { merge: true }
                            )
                        );
                    });
                    absent.forEach(uid => {
                        rsvpUpdates.push(
                            firebaseDb.collection('rsvps').doc(uid).set(
                                { [eventId]: { status: 'not-attended', pickupPoint: state.rsvps[uid]?.[eventId]?.pickupPoint || null } },
                                { merge: true }
                            )
                        );
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

                    // Save to attendance collection and update RSVPs
                    Promise.all(rsvpUpdates).then(() => {
                        return firebaseDb.collection('attendance').doc(attendanceDocId).set(attendanceDoc, { merge: true });
                    }).then(() => {
                        document.body.removeChild(modal);
                        alert('Attendance saved successfully!');
                        loadRoster();
                    });
                });
            });
        }

        // ===================== Shared PDF export styling helpers =====================
        // Every PDF export renders a styled HTML document into a print window,
        // producing a consistent branded layout across all reports.

        function pdfEscape(value) {
            return String(value === null || value === undefined ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function pdfStatCards(stats) {
            const items = (stats || []).filter(stat => stat && stat[1] !== undefined && stat[1] !== null && stat[1] !== '');
            if (!items.length) return '';
            return `<div class="stats-row">${items.map(([label, value]) => `<div class="stat-card"><span class="stat-label">${pdfEscape(label)}</span><span class="stat-value">${pdfEscape(value)}</span></div>`).join('')}</div>`;
        }

        function pdfMetaChips(rows) {
            const visible = (rows || []).filter(row => row && row[1]);
            if (!visible.length) return '';
            return `<div class="meta-grid">${visible.map(([label, value]) => `<span class="meta-item">${pdfEscape(label)}: <strong>${pdfEscape(value)}</strong></span>`).join('')}</div>`;
        }

        function pdfMemberLine(index, name, phone) {
            return `<div class="member-line"><span class="member-name"><span class="idx">${index}.</span>${pdfEscape(name)}</span><span class="phone-chip">${pdfEscape(phone)}</span></div>`;
        }

        function buildPrintDocument({ title, subtitle, metaRows, stats, bodyHtml }) {
            const generatedAt = new Date().toLocaleString();
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${pdfEscape(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans+Kannada:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body { margin: 0; padding: 0; }
        body { font-family: 'Inter', 'Noto Sans Kannada', Arial, sans-serif; color: #241a00; font-size: 12px; line-height: 1.5; background: #f3ede7; }
        .sheet { max-width: 820px; margin: 0 auto; background: #ffffff; padding: 26px 30px 34px; }
        .report-band { background: linear-gradient(135deg, #6d3a00 0%, #8f4e00 55%, #b26a1a 100%); color: #ffffff; border-radius: 14px; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .band-brand { display: flex; align-items: center; gap: 14px; }
        .brand-mark { width: 46px; height: 46px; border-radius: 50%; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; flex-shrink: 0; }
        .report-band h1 { margin: 0; font-size: 19px; letter-spacing: 0.02em; }
        .org-sub { margin: 2px 0 0; font-size: 11px; opacity: 0.85; }
        .generated { margin: 0; font-size: 10px; text-align: right; opacity: 0.9; }
        .report-title { margin: 20px 0 2px; font-size: 18px; font-weight: 800; color: #6d3a00; }
        .report-subtitle { margin: 0 0 10px; font-size: 13px; color: #554336; }
        .meta-grid { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 4px; }
        .meta-item { font-size: 11px; color: #554336; background: #fdf6ee; border: 1px solid #e7d9ce; border-radius: 999px; padding: 4px 12px; }
        .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin: 12px 0 16px; }
        .stat-card { border: 1px solid #e7d9ce; border-radius: 10px; padding: 10px 12px; background: #fbf7f2; }
        .stat-label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #554336; }
        .stat-value { display: block; font-size: 20px; font-weight: 800; color: #8f4e00; margin-top: 2px; }
        section.card { border: 1px solid #e7d9ce; border-left: 5px solid #ff9933; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; background: #fffdfb; page-break-inside: avoid; break-inside: avoid; }
        .card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; border-bottom: 2px solid #f0e4d8; padding-bottom: 8px; margin-bottom: 10px; }
        .card-title { margin: 0; font-size: 14px; font-weight: 700; color: #6d3a00; }
        .chip { font-size: 10px; font-weight: 700; background: #ffe8cc; color: #8f4e00; border-radius: 999px; padding: 3px 10px; white-space: nowrap; }
        table.data { width: 100%; border-collapse: collapse; margin-top: 6px; }
        table.data th { background: #8f4e00; color: #ffffff; text-align: left; font-size: 11px; font-weight: 700; padding: 8px 10px; }
        table.data th:first-child { border-top-left-radius: 8px; }
        table.data th:last-child { border-top-right-radius: 8px; }
        table.data td { border-bottom: 1px solid #efe3d7; padding: 8px 10px; vertical-align: top; }
        table.data tbody tr:nth-child(even) td { background: #fbf6f0; }
        table.data td.name-cell { font-weight: 600; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; break-inside: avoid; }
        .subcard { border: 1px dashed #dbc2b0; border-radius: 10px; padding: 10px 12px; margin-top: 10px; background: #fffaf4; page-break-inside: avoid; break-inside: avoid; }
        .subcard-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
        .subcard-head h4 { margin: 0; font-size: 12.5px; font-weight: 700; color: #ad2c00; }
        .time-chip { font-size: 10px; font-weight: 700; color: #554336; background: #f0e4d8; border-radius: 999px; padding: 2px 9px; white-space: nowrap; }
        .member-line { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 6px 2px; border-bottom: 1px dotted #e7d9ce; font-size: 12px; }
        .member-line:last-child { border-bottom: none; }
        .member-name { font-weight: 500; }
        .idx { color: #8f4e00; font-weight: 800; margin-right: 6px; }
        .phone-chip { font-size: 11px; color: #554336; white-space: nowrap; }
        .empty { color: #8a7566; font-style: italic; margin: 6px 0 0; }
        .totals-row td { font-weight: 800; background: #fdf6ee !important; border-top: 2px solid #dbc2b0; }
        .report-footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e7d9ce; display: flex; justify-content: space-between; gap: 12px; font-size: 10px; color: #8a7566; }
        @media print {
            body { background: #ffffff; }
            .sheet { max-width: none; padding: 0; }
            .report-band { border-radius: 12px; }
        }
        @page { size: A4; margin: 11mm 10mm; }
    </style>
</head>
<body>
    <div class="sheet">
        <header class="report-band">
            <div class="band-brand">
                <span class="brand-mark">&#2384;</span>
                <div>
                    <h1>ರುದ್ರ ಬಲಗ · Rudra Parayana</h1>
                    <p class="org-sub">Admin report</p>
                </div>
            </div>
            <p class="generated">Generated<br>${pdfEscape(generatedAt)}</p>
        </header>
        <h2 class="report-title">${pdfEscape(title)}</h2>
        ${subtitle ? `<p class="report-subtitle">${subtitle}</p>` : ''}
        ${pdfMetaChips(metaRows)}
        ${pdfStatCards(stats)}
        <main>${bodyHtml}</main>
        <footer class="report-footer"><span>Generated by Rudra Balaga admin console</span><span>Auto-generated document</span></footer>
    </div>
</body></html>`;
        }

        function openPrintDocument(html) {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Please allow popups to download the PDF');
                return;
            }
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            // Give the document/fonts a moment to render before opening the print dialog
            setTimeout(() => { printWindow.print(); }, 450);
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
                    // Check for both 'attending' and 'attended' statuses
                    if (rsvp && (rsvp.status === 'attending' || rsvp.status === 'attended')) {
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

                const tableRows = attendingRows.map((row, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${pdfEscape(row.id)}</td>
                                <td class="name-cell">${pdfEscape(row.name)}</td>
                                <td>${pdfEscape(row.phone)}</td>
                                <td>${pdfEscape(row.email)}</td>
                                <td>${pdfEscape(row.dob)}</td>
                                <td>${pdfEscape(row.address)}</td>
                            </tr>`).join('');

                const bodyHtml = `
                    <section class="card">
                        <div class="card-head">
                            <h3 class="card-title">Attending members</h3>
                            <span class="chip">${attendingRows.length} members</span>
                        </div>
                        ${attendingRows.length ? `
                        <table class="data">
                            <thead>
                                <tr><th>#</th><th>Member ID</th><th>Name</th><th>Phone</th><th>Email</th><th>DOB</th><th>Address</th></tr>
                            </thead>
                            <tbody>${tableRows}</tbody>
                        </table>` : '<p class="empty">No attending members yet.</p>'}
                    </section>`;

                openPrintDocument(buildPrintDocument({
                    title: 'Attendance sheet',
                    subtitle: pdfEscape(event?.title || 'Unknown event'),
                    metaRows: [
                        ['Event date', event?.date ? formatDate(event.date) : ''],
                        ['Venue', event?.location || ''],
                        ['Report date', new Date().toLocaleDateString()]
                    ],
                    stats: [['Total attending', attendingRows.length]],
                    bodyHtml
                }));
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
                    // Check for both 'attending' and 'attended' statuses
                    if (rsvp && (rsvp.status === 'attending' || rsvp.status === 'attended')) {
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
                        // Check for both 'attending' and 'attended' statuses
                        if (rsvp && (rsvp.status === 'attending' || rsvp.status === 'attended') && rsvp.pickupPoint === route.id) {
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
                
                let bodyHtml = '';
                let totalAssigned = 0;

                buses.forEach(bus => {
                    let busTotal = 0;
                    const routeRows = [];
                    if (bus.routes) {
                        bus.routes.forEach(route => {
                            const routeUsers = [];
                            Object.entries(state.rsvps).forEach(([uid, rsvpData]) => {
                                const rsvp = rsvpData[eventId];
                                // Check for both 'attending' and 'attended' statuses
                                if (rsvp && (rsvp.status === 'attending' || rsvp.status === 'attended') && rsvp.pickupPoint === route.id) {
                                    const user = users[uid] || {};
                                    routeUsers.push(user.name || user.email || 'Unknown');
                                }
                            });
                            busTotal += routeUsers.length;
                            routeRows.push(`<tr><td class="name-cell">${pdfEscape(route.point)}</td><td>${pdfEscape(route.time)}</td><td>${routeUsers.length ? routeUsers.map(pdfEscape).join('<br>') : '<span class="empty">None</span>'}</td></tr>`);
                        });
                    }
                    totalAssigned += busTotal;
                    bodyHtml += `
                        <section class="card">
                            <div class="card-head">
                                <h3 class="card-title">${pdfEscape(bus.name)}</h3>
                                <span class="chip">${busTotal} members · ${(bus.routes || []).length} pickup points</span>
                            </div>
                            ${routeRows.length ? `<table class="data"><thead><tr><th>Pickup point</th><th>Time</th><th>Members</th></tr></thead><tbody>${routeRows.join('')}</tbody></table>` : '<p class="empty">No pickup points configured.</p>'}
                        </section>`;
                });
                
                openPrintDocument(buildPrintDocument({
                    title: 'Bus routes report',
                    subtitle: pdfEscape(event?.title || 'Unknown event'),
                    metaRows: [['Event date', event?.date ? formatDate(event.date) : '']],
                    stats: [['Buses', buses.length], ['Pickup assignments', totalAssigned]],
                    bodyHtml: bodyHtml || '<p class="empty">No bus routes configured for this event.</p>'
                }));
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
                // Check for both 'attending' and 'attended' statuses
                const pickupPointMembers = {}; // pickupPointId -> [{name, phone}]
                Object.entries(state.rsvps).forEach(([uid, rsvpData]) => {
                    const rsvp = rsvpData[eventId];
                    if (rsvp && (rsvp.status === 'attending' || rsvp.status === 'attended') && rsvp.pickupPoint) {
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

            const event = state.events.find(e => e.id === eventId);

            firebaseDb.collection('users').get().then(usersSnapshot => {
                const users = {};
                usersSnapshot.forEach(doc => {
                    users[doc.id] = doc.data();
                });

                let busMemberTotal = 0;
                const pickupBlocks = (bus.routes || []).map(route => {
                    const routeMembers = [];

                    Object.entries(state.rsvps).forEach(([uid, rsvpData]) => {
                        const rsvp = rsvpData[eventId];
                        // Check for both 'attending' and 'attended' statuses
                        if (rsvp && (rsvp.status === 'attending' || rsvp.status === 'attended') && rsvp.pickupPoint === route.id) {
                            const user = users[uid] || {};
                            routeMembers.push({
                                name: user.name || user.email || 'Unknown',
                                phone: user.phone || 'N/A'
                            });
                        }
                    });

                    busMemberTotal += routeMembers.length;
                    const memberLines = routeMembers.length
                        ? routeMembers.map((m, i) => pdfMemberLine(i + 1, m.name, m.phone)).join('')
                        : '<p class="empty">No members selected for this pickup point.</p>';

                    return `
                        <div class="subcard">
                            <div class="subcard-head">
                                <h4>${pdfEscape(route.point)}</h4>
                                <span class="time-chip">${pdfEscape(route.time)}</span>
                            </div>
                            ${memberLines}
                        </div>`;
                }).join('');

                const bodyHtml = `
                    <section class="card">
                        <div class="card-head">
                            <h3 class="card-title">${pdfEscape(bus.name)}</h3>
                            <span class="chip">${busMemberTotal} members · ${(bus.routes || []).length} pickup points</span>
                        </div>
                        ${pickupBlocks || '<p class="empty">No pickup points configured for this bus.</p>'}
                    </section>`;

                openPrintDocument(buildPrintDocument({
                    title: 'Bus-wise member list',
                    subtitle: `${pdfEscape(bus.name)} — ${pdfEscape(event?.title || 'Unknown event')}`,
                    metaRows: [['Event date', event?.date ? formatDate(event.date) : '']],
                    stats: [['Total members', busMemberTotal]],
                    bodyHtml
                }));
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

                let totalMembers = 0;
                const busBlocks = buses.map(bus => {
                    let busMemberCount = 0;
                    const pickupBlocks = (bus.routes || []).map(route => {
                        const members = pickupPointMembers[route.id] || [];
                        busMemberCount += members.length;
                        const memberLines = members.length
                            ? members.map((m, i) => pdfMemberLine(i + 1, m.name, m.phone)).join('')
                            : '<p class="empty">No members selected.</p>';
                        return `
                            <div class="subcard">
                                <div class="subcard-head">
                                    <h4>${pdfEscape(route.point)}</h4>
                                    <span class="time-chip">${pdfEscape(route.time)}</span>
                                </div>
                                ${memberLines}
                            </div>`;
                    }).join('');
                    totalMembers += busMemberCount;

                    return `
                        <section class="card">
                            <div class="card-head">
                                <h3 class="card-title">${pdfEscape(bus.name)}</h3>
                                <span class="chip">${busMemberCount} members · ${(bus.routes || []).length} pickup points</span>
                            </div>
                            ${pickupBlocks || '<p class="empty">No pickup points for this route.</p>'}
                        </section>`;
                }).join('');

                openPrintDocument(buildPrintDocument({
                    title: 'Route-wise members report',
                    subtitle: pdfEscape(event?.title || 'Unknown event'),
                    metaRows: [['Event date', event?.date ? formatDate(event.date) : '']],
                    stats: [['Buses', buses.length], ['Total members', totalMembers]],
                    bodyHtml: busBlocks || '<p class="empty">No bus routes configured for this event.</p>'
                }));
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

                let totalMembers = 0;
                const eventBlocks = selectedEvents.map(event => {
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

                    let eventMemberCount = 0;
                    const busBlocks = buses.map(bus => {
                        let busMemberCount = 0;
                        const pickupBlocks = (bus.routes || []).map(route => {
                            const members = pickupPointMembers[route.id] || [];
                            busMemberCount += members.length;
                            const memberLines = members.length
                                ? members.map((m, i) => pdfMemberLine(i + 1, m.name, m.phone)).join('')
                                : '<p class="empty">No members selected.</p>';
                            return `
                                <div class="subcard">
                                    <div class="subcard-head">
                                        <h4>${pdfEscape(route.point)}</h4>
                                        <span class="time-chip">${pdfEscape(route.time)}</span>
                                    </div>
                                    ${memberLines}
                                </div>`;
                        }).join('');
                        eventMemberCount += busMemberCount;

                        return `
                            <div class="subcard" style="background:#fffdfb;">
                                <div class="subcard-head">
                                    <h4 style="color:#6d3a00;">${pdfEscape(bus.name)}</h4>
                                    <span class="chip">${busMemberCount} members</span>
                                </div>
                                ${pickupBlocks || '<p class="empty">No pickup points for this route.</p>'}
                            </div>`;
                    }).join('');
                    totalMembers += eventMemberCount;

                    return `
                        <section class="card">
                            <div class="card-head">
                                <h3 class="card-title">${pdfEscape(event.title)}</h3>
                                <span class="chip">${formatDate(event.date)} · ${eventMemberCount} members</span>
                            </div>
                            ${busBlocks || '<p class="empty">No bus routes configured.</p>'}
                        </section>`;
                }).join('');

                openPrintDocument(buildPrintDocument({
                    title: 'Consolidated route-wise members',
                    metaRows: [['Outstation events', selectedEvents.length]],
                    stats: [['Events', selectedEvents.length], ['Total members', totalMembers]],
                    bodyHtml: eventBlocks || '<p class="empty">No attending members found for any outstation event.</p>'
                }));
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
                
                let totalAssignments = 0;
                const eventBlocks = outstationEvents.map(event => {
                    const buses = state.busRoutes[event.id] || [];
                    let eventAssignments = 0;
                    const rows = [];
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
                                eventAssignments += routeUsers.length;
                                rows.push(`<tr><td class="name-cell">${pdfEscape(bus.name)}</td><td>${pdfEscape(route.point)}</td><td>${pdfEscape(route.time)}</td><td>${routeUsers.length}</td></tr>`);
                            });
                        }
                    });
                    totalAssignments += eventAssignments;

                    return `
                        <section class="card">
                            <div class="card-head">
                                <h3 class="card-title">${pdfEscape(event.title)}</h3>
                                <span class="chip">${formatDate(event.date)} · ${eventAssignments} pickups</span>
                            </div>
                            ${rows.length ? `<table class="data"><thead><tr><th>Bus</th><th>Pickup point</th><th>Time</th><th>Members</th></tr></thead><tbody>${rows.join('')}</tbody></table>` : '<p class="empty">No bus routes configured.</p>'}
                        </section>`;
                }).join('');

                openPrintDocument(buildPrintDocument({
                    title: 'Consolidated bus routes report',
                    metaRows: [['Outstation events', outstationEvents.length]],
                    stats: [['Events', outstationEvents.length], ['Pickup assignments', totalAssignments]],
                    bodyHtml: eventBlocks || '<p class="empty">No outstation events found.</p>'
                }));
            });
        }