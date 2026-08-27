const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('/Users/jslap018/Documents/RudraBalaga-main 2/index.html', 'utf8');
const script = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.includes('function getDisplayedEvents'))[0];
if (!script) { console.log('FAIL: getDisplayedEvents script not found'); process.exit(1); }
const start = script.indexOf('function getDisplayedEvents');
const end = script.indexOf('function getEventBusRoutes');
const slice = script.slice(start, end);

const sandbox = { state: { events: [], rsvps: {}, user: { uid: 'u1' } }, console };
vm.createContext(sandbox);
vm.runInContext(slice + '\nthis.getDisplayedEvents = getDisplayedEvents; this.getEventAttendingCount = getEventAttendingCount;', sandbox);

let failures = 0;
const check = (name, cond) => { console.log((cond ? '  PASS  ' : '  FAIL  ') + name); if (!cond) failures++; };
const d = (offset) => { const t = new Date(); t.setDate(t.getDate() + offset); return t.toISOString().slice(0, 10); };

// Scenario 1: admin accepted then REJECTED payment on event A
sandbox.state.events = [
  { id: 'A', title: 'Trip A', date: d(10), requiresPayment: true },
  { id: 'B', title: 'Satsang B', date: d(20), requiresPayment: false }
];
sandbox.state.rsvps = { u1: { A: { status: 'attending', payment: { paymentStatus: 'REJECTED' } } } };
let shown = sandbox.getDisplayedEvents();
check('REJECTED-after-accepted event re-appears on home tab', shown.length === 1 && shown[0].id === 'A');
check('rejected member NOT counted in attending count', sandbox.getEventAttendingCount('A') === 0);

// Scenario 2: rejected event + separate new unresponded event -> both surface
sandbox.state.rsvps.u1.B = { status: 'not-attending' };
sandbox.state.rsvps.u1.C = undefined;
sandbox.state.events.push({ id: 'C', title: 'New C', date: d(30) });
shown = sandbox.getDisplayedEvents();
check('rejected event shows together with unresponded events', shown.length >= 2 && shown.some(e => e.id === 'A') && shown.some(e => e.id === 'C'));

// Scenario 3: member re-attends & re-pays (PENDING) -> no longer needs response
sandbox.state.rsvps.u1.A = { status: 'attending', payment: { paymentStatus: 'PENDING_APPROVAL' } };
sandbox.state.rsvps.u1.C = { status: 'not-attending' };
shown = sandbox.getDisplayedEvents();
check('PENDING re-payment treated as responded (attending event shown)', shown.length === 1 && shown[0].id === 'A');

// Scenario 4: admin approves -> attending fallback + counted
sandbox.state.rsvps.u1.A.payment.paymentStatus = 'APPROVED';
shown = sandbox.getDisplayedEvents();
check('APPROVED event shows via attending fallback', shown.length === 1 && shown[0].id === 'A');
check('APPROVED member counted in attending count', sandbox.getEventAttendingCount('A') === 1);

// Scenario 5: REJECTED on a not-attending RSVP is not a needs-response trigger
sandbox.state.rsvps.u1.A = { status: 'not-attending', payment: { paymentStatus: 'REJECTED' } };
sandbox.state.rsvps.u1.C = undefined;
shown = sandbox.getDisplayedEvents();
check('not-attending RSVP with rejected payment falls through to fallback', shown.length === 1 && shown[0].id === 'A');

// Scenario 6: past/inactive events never show
sandbox.state.events = [{ id: 'PAST', title: 'Old', date: d(-5) }];
sandbox.state.rsvps = { u1: {} };
shown = sandbox.getDisplayedEvents();
check('past/inactive events are never shown', shown.length === 0);

console.log(failures === 0 ? '\nALL SCENARIOS PASSED' : '\n' + failures + ' SCENARIO(S) FAILED');
process.exit(failures === 0 ? 0 : 1);