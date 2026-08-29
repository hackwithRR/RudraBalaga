const fs = require('fs');
const vm = require('vm');
const root = '/Users/jslap018/Documents/RudraBalaga-main 2/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
const script = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.includes('function setRSVP(status, eventId)'))[0];
if (!script) { console.log('FAIL: setRSVP script not found'); process.exit(1); }
const start = script.indexOf('function showRsvpToast');
const setEnd = script.indexOf('function showPaymentModal(event)');
const slice = script.slice(start, setEnd);

let failures = 0;
const check = (name, cond) => { console.log((cond ? '  PASS  ' : '  FAIL  ') + name); if (!cond) failures++; };

const calls = { toasts: [], paymentModals: [] };
const sandbox = {
  console,
  state: { events: [], rsvps: {}, user: { uid: 'u1' } },
  showRsvpToast: (msg) => calls.toasts.push(msg),
  renderEvents: () => {},
  isRegistrationClosed: () => false,
  showPaymentModal: (ev) => calls.paymentModals.push(ev.id),
  getEventAttendingCount: () => 0,
  formatDate: (d) => d,
  alert: () => {},
  firebaseDb: { collection: () => ({ doc: () => ({ set: () => Promise.resolve() }) }) }
};
vm.createContext(sandbox);
vm.runInContext(slice + '\nthis.setRSVP = setRSVP;', sandbox);

// Event A requires payment (outstation)
sandbox.state.events = [{ id: 'A', title: 'Trip A', type: 'Outstation', requiresPayment: true, amount: 2500 }];

// 1) attending + APPROVED, tap Attending -> "already attending" toast, no payment modal
sandbox.state.rsvps = { u1: { A: { status: 'attending', payment: { paymentStatus: 'APPROVED' } } } };
sandbox.setRSVP('attending', 'A');
check('APPROVED + tap Attending -> already-attending toast', calls.toasts.some(t => t.includes('already attending')));
check('APPROVED + tap Attending -> payment modal NOT opened', calls.paymentModals.length === 0);

// 2) attending + REJECTED (accepted then rejected), tap Attending -> payment modal reopens
sandbox.state.rsvps.u1.A = { status: 'attending', payment: { paymentStatus: 'REJECTED' } };
calls.toasts.length = 0; calls.paymentModals.length = 0;
sandbox.setRSVP('attending', 'A');
check('REJECTED + tap Attending -> NO already-attending toast', !calls.toasts.some(t => t.includes('already')));
check('REJECTED + tap Attending -> payment modal REOPENS for re-payment', calls.paymentModals.length === 1);

// 3) attending + REJECTED, tap Not attending -> switches normally
calls.paymentModals.length = 0;
sandbox.setRSVP('not-attending', 'A');
check('REJECTED + tap Not attending -> switches to not-attending (no payment modal)', calls.paymentModals.length === 0 && sandbox.state.rsvps.u1.A.status === 'not-attending');
check('REJECTED payment dropped when switching to not-attending', !sandbox.state.rsvps.u1.A.payment);

// 4) not-attending, tap Not attending -> already toast
calls.toasts.length = 0;
sandbox.setRSVP('not-attending', 'A');
check('not-attending + tap Not attending -> already toast', calls.toasts.some(t => t.includes('already not attending')));

// 5) no response yet, tap Attending -> payment modal (normal first registration)
sandbox.state.rsvps = { u1: {} };
calls.paymentModals.length = 0; calls.toasts.length = 0;
sandbox.setRSVP('attending', 'A');
check('fresh member + tap Attending -> payment modal opens', calls.paymentModals.length === 1 && calls.toasts.length === 0);

// 6) attending + PENDING_APPROVAL, tap Attending -> already toast (awaiting admin)
sandbox.state.rsvps.u1.A = { status: 'attending', payment: { paymentStatus: 'PENDING_APPROVAL' } };
calls.toasts.length = 0; calls.paymentModals.length = 0;
sandbox.setRSVP('attending', 'A');
check('PENDING + tap Attending -> already-attending toast (not re-pay prompt)', calls.toasts.some(t => t.includes('already attending')) && calls.paymentModals.length === 0);

console.log(failures === 0 ? '\nALL INDEX CHECKS PASSED' : '\n' + failures + ' INDEX CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);