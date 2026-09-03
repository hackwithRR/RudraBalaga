/* Shared unified Help & Support modal (Rudra Balaga)
   Used by: index.html, essentials.html, bus-routes.html, profile.html */
(function () {
    'use strict';

    // Inject the modal shell CSS once (pages may or may not already define it)
    function ensureStyles() {
        if (document.getElementById('rb-help-style')) return;
        const st = document.createElement('style');
        st.id = 'rb-help-style';
        st.textContent = `
        .payment-modal-backdrop { background: rgba(36, 27, 22, 0.68) !important; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); overscroll-behavior: contain; padding: 0.75rem; }
        @media (min-width: 480px) { .payment-modal-backdrop { padding: 1.25rem; } }
        .payment-modal { border: 1px solid #e7d9ce; border-radius: 1.25rem !important; box-shadow: 0 28px 80px rgba(36, 27, 22, 0.28); max-height: calc(100vh - 1.5rem); }
        @supports (height: 100dvh) { .payment-modal { max-height: calc(100dvh - 1.5rem); } }
        .payment-modal::-webkit-scrollbar { width: 6px; }
        .payment-modal::-webkit-scrollbar-thumb { background: #dbc2b0; border-radius: 999px; }
        .payment-modal-header { position: sticky; top: 0; z-index: 10; background: rgba(255, 255, 255, 0.96); backdrop-filter: blur(6px); padding: 1rem 1.25rem 0.85rem; border-bottom: 1px solid #e7d9ce; }
        @media (min-width: 480px) { .payment-modal-header { padding: 1.25rem 1.5rem 1rem; } }
        .payment-modal-body { padding: 1rem 1.25rem 1.25rem; overflow-y: auto; }
        @media (min-width: 480px) { .payment-modal-body { padding: 1.25rem 1.5rem 1.5rem; } }
        .payment-method-icon { display: inline-flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; border-radius: 0.7rem; background: #ffe8cc; color: #8f4e00; flex-shrink: 0; }`;
        document.head.appendChild(st);
    }

    function rbT(en, kn) {
        return (window.RBLang && typeof RBLang.language === 'function' && RBLang.language() === 'en') ? en : kn;
    }
    window.showHelpModal = function () {
        ensureStyles();
        const modal = document.createElement('div');
        modal.className = 'payment-modal-backdrop fixed inset-0 z-50 flex items-center justify-center';
        modal.innerHTML = `
            <div class="payment-modal bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-full">
                <div class="payment-modal-header flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                        <span class="payment-method-icon material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">support_agent</span>
                        <div class="min-w-0">
                            <h3 class="font-headline-sm text-headline-sm text-primary leading-tight">${rbT('Help & Support','ಸಹಾಯ ಮತ್ತು ಬೆಂಬಲ')}</h3>
                            <p class="text-sm text-on-surface-variant truncate">${rbT('We are here to help you','ನಾವು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇವೆ')}</p>
                        </div>
                    </div>
                    <button id="close-help-modal" aria-label="Close" class="shrink-0 w-9 h-9 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center text-xl leading-none">&times;</button>
                </div>
                <div class="payment-modal-body space-y-4">
                    <div class="p-4 rounded-xl bg-surface-container-high border border-outline-variant">
                        <h4 class="font-bold text-primary mb-1.5 flex items-center gap-2"><span class="material-symbols-outlined" style="font-size:20px;">quiz</span>${rbT('Need help?','ಸಹಾಯ ಬೇಕೇ?')}</h4>
                        <p class="text-on-surface-variant text-sm">${rbT('For help with any of the following, contact an admin:','ಈ ಕೆಳಗಿನ ವಿಷಯಗಳಿಗೆ ಸಹಾಯ ಬೇಕಾದರೆ ಅಡ್ಮಿನ್ ಅವರನ್ನು ಸಂಪರ್ಕಿಸಿ:')}</p>
                        <ul class="mt-2.5 space-y-1.5 text-on-surface text-sm">
                            <li class="flex items-center gap-2"><span class="material-symbols-outlined text-primary" style="font-size:18px;">event</span>${rbT('Events & attendance','ಇವೆಂಟ್‌ಗಳು ಮತ್ತು ಹಾಜರಾತಿ')}</li>
                            <li class="flex items-center gap-2"><span class="material-symbols-outlined text-primary" style="font-size:18px;">account_circle</span>${rbT('Profile update issues','ಪ್ರೊಫೈಲ್ ಅಪ್ಡೇಟ್ ಸಮಸ್ಯೆಗಳು')}</li>
                            <li class="flex items-center gap-2"><span class="material-symbols-outlined text-primary" style="font-size:18px;">directions_bus</span>${rbT('Bus / Rail pickup point selection','ಬಸ್ / ರೈಲು ಪಿಕಪ್ ಪಾಯಿಂಟ್ ಆಯ್ಕೆ')}</li>
                            <li class="flex items-center gap-2"><span class="material-symbols-outlined text-primary" style="font-size:18px;">build</span>${rbT('Technical help','ತಾಂತ್ರಿಕ ಸಹಾಯ')}</li>
                        </ul>
                    </div>
                    <div id="admins-list" class="space-y-2">
                        <p class="text-center text-on-surface-variant text-sm">${rbT('Loading admins...','ಅಡ್ಮಿನ್‌ಗಳು ಲೋಡ್ ಆಗುತ್ತಿದ್ದಾರೆ...')}</p>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
        document.getElementById('close-help-modal').onclick = () => modal.remove();
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        if (typeof firebaseDb !== 'undefined' && firebaseDb) {
            try {
                firebaseDb.collection('users').where('role', '==', 'admin').onSnapshot(snapshot => {
                    const adminsList = document.getElementById('admins-list');
                    if (!adminsList) return;
                    if (snapshot.empty) {
                        adminsList.innerHTML = `<p class="text-center text-on-surface-variant text-sm">${rbT('No admins available','ಯಾವ ಅಡ್ಮಿನ್ ಲಭ್ಯವಿಲ್ಲ')}</p>`;
                        return;
                    }
                    let html = `<p class="font-label-lg text-label-lg text-on-surface mb-2">${rbT('Contact an admin:','ಅಡ್ಮಿನ್ ಸಂಪರ್ಕಿಸಿ:')}</p>`;
                    snapshot.forEach(doc => {
                        const admin = doc.data();
                        const contact = admin.phone || admin.email || '';
                        const name = admin.name || rbT('Admin','ಅಡ್ಮಿನ್');
                        const href = contact.includes('@') ? `mailto:${contact}` : `tel:${contact}`;
                        const icon = contact.includes('@') ? 'mail' : 'call';
                        html += `
                            <a href="${href}" class="p-3 bg-primary-fixed rounded-xl flex justify-between items-center gap-2 touch-active">
                                <span class="min-w-0">
                                    <span class="block font-bold text-on-primary-fixed truncate">${name}</span>
                                    <span class="block text-xs text-on-primary-fixed opacity-80 truncate">${contact || rbT('No contact info','ಸಂಪರ್ಕ ವಿವರವಿಲ್ಲ')}</span>
                                </span>
                                <span class="material-symbols-outlined text-on-primary-fixed shrink-0">${icon}</span>
                            </a>`;
                    });
                    adminsList.innerHTML = html;
                });
            } catch (error) {
                const adminsList = document.getElementById('admins-list');
                if (adminsList) adminsList.innerHTML = `<p class="text-center text-on-surface-variant text-sm">${rbT('Could not load admin contacts','ಅಡ್ಮಿನ್ ಸಂಪರ್ಕವನ್ನು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ')}</p>`;
            }
        } else {
            const adminsList = document.getElementById('admins-list');
            if (adminsList) adminsList.innerHTML = `<p class="text-center text-on-surface-variant text-sm">${rbT('Could not load admin contacts','ಅಡ್ಮಿನ್ ಸಂಪರ್ಕವನ್ನು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ')}</p>`;
        }
    };
})();
