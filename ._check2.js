function X(){
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
}
