const fs = require('fs');
const vm = require('vm');
const root = '/Users/jslap018/Documents/RudraBalaga-main 2/';
const html = fs.readFileSync(root + 'events.html', 'utf8');
const script = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.includes('function updateRsvp(eventId, status)'))[0];
if (!script) { console.log('FAIL: updateRsvp script not found'); process.exit(1); }
const start = script.indexOf('const rsvpEditMode = {};');
const updEnd = script.indexOf('function showPaymentModal(event)');
const slice = script.slice(start, updEnd);

let failures = 0;
const check = (name, cond) => { console.log((cond ? '  PASS  ' : '  FAIL  ') + name); if (!cond) failures++; };

const calls = { toasts: [], paymentModals: [] };
const sandbox = {
  console,
  state: { events: [], rsvps: {}, user: { uid: 'u1' } },
  rsvpEditMode: {},
  showEventsToast: (msg) => calls.toasts.push(msg),
  renderEvents: () => {},
  isRegistrationClosed: () => false,
  showPaymentModal: (ev) => calls.paymentModals.push(ev.id),
  formatDate: (d) => d,
  alert: () => {},
  firebaseDb: { collection: () => ({ doc: () => ({ set: () => Promise.resolve() }) }) }
};
vm.createContext(sandbox);
vm.runInContext(slice + '\nthis.updateRsvp = updateRsvp;', sandbox);

sandbox.state.events = [{ id: 'A', title: 'Trip A', type: 'Outstation', requiresPayment: true }];
sandbox.state.rsvps = { u1: { A: { status: 'attending', payment: { paymentStatus: 'REJECTED' } } } };

// Tap Attending directly from the rejection block (no edit-mode involved)
sandbox.updateRsvp('A', 'attending');
check('events: REJECTED + tap Attending -> payment modal REOPENS', calls.paymentModals.length === 1);
check('events: REJECTED + tap Attending -> no already toast', !calls.toasts.some(t => t.includes('\u0C88\u0C17\u0CBE\u0C17\u0CB2\u0CC7')));

// Edit-mode still detects same-choice correctly (attending + APPROVED)
sandbox.state.rsvps.u1.A = { status: 'attending', payment: { paymentStatus: 'APPROVED' } };
calls.paymentModals.length = 0; calls.toasts.length = 0;
sandbox.updateRsvp('A', 'edit');
sandbox.updateRsvp('A', 'attending');
check('events: APPROVED + edit + tap Attending -> already toast', calls.toasts.length > 0 && calls.paymentModals.length === 0);

console.log(failures === 0 ? '\nALL EVENTS CHECKS PASSED' : '\n' + failures + ' EVENTS CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);