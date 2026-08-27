const fs = require('fs');
const vm = require('vm');

// ---------- extract last inline <script> block (same approach as _extract_scripts.js) ----------
function extractLastInlineScript(content) {
    const lines = content.split('\n');
    let lastScriptStart = null;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/<script(?![^>]*\bsrc=)/i)) lastScriptStart = i;
    }
    if (lastScriptStart === null) return null;
    let lastScriptEnd = null;
    for (let j = lastScriptStart + 1; j < lines.length; j++) {
        if (lines[j].match(/<\/script>/i)) { lastScriptEnd = j; break; }
    }
    return { text: lines.slice(lastScriptStart + 1, lastScriptEnd).join('\n') };
}

const html = fs.readFileSync('admin.html', 'utf8');
const script = extractLastInlineScript(html).text;

// Slice the self-contained export helper region: shared PDF helpers -> downloadExcel
const startIdx = script.indexOf('Shared PDF export styling helpers');
const endMarker = '// Show help modal';
const endIdx = script.indexOf(endMarker, startIdx);
if (startIdx === -1 || endIdx === -1) throw new Error('slice markers not found');
const sliceStart = script.lastIndexOf('\n', startIdx) + 1; // back up to start of the comment line
const slice = script.slice(sliceStart, endIdx);

// ---------- test data ----------
const users = {
    uid1: { userId: 'RB001', name: 'Ravi Kumar', phone: '9845000001', email: 'ravi@example.com', dob: '1990-01-01', address: '12 MG Road, Bangalore', emergencyContactName: 'Suresh Rao', emergencyContact: '+91-9845000000', emergencyContactRelation: 'Brother' },
    uid2: { userId: 'RB002', name: 'Meena & Co', phone: '9845000002', emergencyContactName: "D'Costa <Junior>", emergencyContact: '+91-9845111111', emergencyContactRelation: 'Father' },
    uid3: { userId: 'RB003', name: 'Anita Rao', phone: '9845000003', emergencyContactName: 'Vijay Rao', emergencyContact: '+91-9845222222', emergencyContactRelation: 'Husband' },
    uid4: { userId: 'RB004', name: 'Not Attending Person', phone: '9845000004' },
    uid5: { userId: 'RB005', name: 'Rejected Payment', phone: '9845000005', emergencyContactName: 'Latha', emergencyContact: '+91-9845333333', emergencyContactRelation: 'Mother' }
};
const userDocs = Object.keys(users).map(id => ({ id, data: () => users[id] }));

const events = {
    ev1: { id: 'ev1', title: 'Tirupati Trip', type: 'Outstation', isOutstation: true, requiresPayment: true, amount: 2500, date: '2026-09-10', location: 'Tirupati', departureDate: '2026-09-10', returnDate: '2026-09-12' },
    ev2: { id: 'ev2', title: 'Monthly Satsang', type: 'Bangalore', isOutstation: false, requiresPayment: false, date: '2026-09-20', location: 'Bangalore Temple' }
};

const rsvps = {
    uid1: { ev1: { status: 'attending', payment: { paymentStatus: 'APPROVED' } }, ev2: { status: 'attending' } },
    uid2: { ev1: { status: 'attended', payment: { paymentStatus: 'PENDING_APPROVAL' } } },
    uid3: { ev1: { status: 'attending' }, ev2: { status: 'attending' } },
    uid4: { ev1: { status: 'not-attending' } },
    uid5: { ev1: { status: 'attending', payment: { paymentStatus: 'REJECTED' } } }
};

// ---------- sandbox ----------
let currentEventId = 'ev1';
let capturedPrint = null;
const capturedBlobs = [];
const printWindow = {
    document: { open() {}, write(h) { capturedPrint = h; }, close() {} },
    focus() {}, print() {}
};

const sandbox = {
    console,
    setTimeout: () => {},
    alert: () => {},
    window: { open: () => printWindow },
    document: {
        getElementById: () => ({ value: currentEventId }),
        createElement: () => ({ click() {}, href: '', download: '' })
    },
    URL: {
        createObjectURL: (blob) => { capturedBlobs.push(blob); return 'blob:test'; },
        revokeObjectURL: () => {}
    },
    Blob: typeof Blob !== 'undefined' ? Blob : class { constructor(parts) { this._t = parts.join(''); } text() { return Promise.resolve(this._t); } },
    state: { events: [], rsvps: {} },
    firebaseDb: {
        collection: () => ({ get: () => Promise.resolve({ forEach: cb => userDocs.forEach(cb) }) })
    },
    formatDate: (d) => String(d).split('-').reverse().join('/')
};
vm.createContext(sandbox);
vm.runInContext(slice, sandbox, { filename: 'attendance-export-slice.js' });

// ---------- assertions ----------
let failures = 0;
function check(name, cond) {
    if (cond) console.log('  PASS  ' + name);
    else { console.log('  FAIL  ' + name); failures++; }
}
function count(haystack, needle) { return haystack.split(needle).length - 1; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    console.log('\n=== Outstation event PDF (payments required) ===');
    sandbox.state.events = [events.ev1];
    sandbox.state.rsvps = rsvps;
    currentEventId = 'ev1';
    capturedPrint = null; capturedBlobs.length = 0;
    sandbox.downloadPDF();
    await sleep(25);
    const pdf = capturedPrint || '';
    check('document generated as full HTML', pdf.startsWith('<!DOCTYPE html>') && pdf.includes('</html>'));
    check('emergency contact columns present', ['<th>Emergency contact</th>', '<th>Emergency phone</th>', '<th>Relationship</th>'].every(h => pdf.includes(h)));
    check('payment column present for outstation', pdf.includes('<th>Payment</th>'));
    check('emergency values rendered (name/phone/relation)', ['Suresh Rao', '+91-9845000000', 'Brother', 'Vijay Rao', 'Husband', 'Latha', 'Mother'].every(v => pdf.includes(v)));
    check('HTML-escaped values', pdf.includes('Meena &amp; Co') && pdf.includes("D&#39;Costa &lt;Junior&gt;") && !pdf.includes('Meena & Co<'));
    check('paid badge x1', count(pdf, 'badge badge-paid') === 1 && pdf.includes('>Paid</span>'));
    check('pending badge x1', count(pdf, 'badge badge-pending') === 1 && pdf.includes('Pending approval</span>'));
    check('not-paid badge x2', count(pdf, 'badge badge-unpaid') === 2 && count(pdf, '>Not paid</span>') === 2);
    check('attending/paid/pending/not-paid stat chips', pdf.includes('<span class="stat-value">4</span>') && /stat-label">Paid<\/span><span class="stat-value">1<\/span>/.test(pdf) && /stat-label">Pending review<\/span><span class="stat-value">1<\/span>/.test(pdf) && /stat-label">Not paid<\/span><span class="stat-value">2<\/span>/.test(pdf));
    check('outstation meta (type/fee/trip dates)', pdf.includes('Event type: <strong>Outstation</strong>') && pdf.includes('Fee: <strong>₹2500</strong>') && pdf.includes('Trip dates: <strong>10/09/2026 – 12/09/2026</strong>'));
    check('not-attending member excluded', !pdf.includes('Not Attending Person'));

    console.log('\n=== Bangalore event PDF (no payments) ===');
    currentEventId = 'ev2';
    capturedPrint = null;
    sandbox.downloadPDF();
    await sleep(25);
    const pdf2 = capturedPrint || '';
    check('emergency contact columns still present', ['<th>Emergency contact</th>', '<th>Emergency phone</th>', '<th>Relationship</th>'].every(h => pdf2.includes(h)));
    check('no payment column/badges for Bangalore', !pdf2.includes('<th>Payment</th>') && !pdf2.includes('badge badge-'));
    check('only attending members (2)', pdf2.includes('<span class="stat-value">2</span>'));
    check('Bangalore meta, no fee/trip chips', pdf2.includes('Event type: <strong>Bangalore</strong>') && !pdf2.includes('Fee:') && !pdf2.includes('Trip dates:'));

    console.log('\n=== Outstation event Excel ===');
    currentEventId = 'ev1';
    capturedBlobs.length = 0;
    sandbox.downloadExcel();
    await sleep(25);
    const xls = capturedBlobs.length ? await capturedBlobs[0].text() : '';
    check('excel generated', xls.includes('<?xml version="1.0"') && xls.includes('</Workbook>'));
    check('emergency + payment headers', ['Emergency Contact Name', 'Emergency Contact Phone', 'Relationship', 'Payment Status'].every(h => xls.includes(`<Data ss:Type="String">${h}</Data>`)));
    check('payment labels in rows (paid x1, pending x1, not paid x2)', count(xls, '>Paid</Data>') === 1 && count(xls, '>Pending approval</Data>') === 1 && count(xls, '>Not paid</Data>') === 2);
    check('xml-escaped member data', xls.includes('Meena &amp; Co') && xls.includes('D&apos;Costa &lt;Junior&gt;'));
    check('not-attending member excluded from excel', !xls.includes('Not Attending Person'));

    console.log('\n=== Bangalore event Excel ===');
    currentEventId = 'ev2';
    capturedBlobs.length = 0;
    sandbox.downloadExcel();
    await sleep(25);
    const xls2 = capturedBlobs.length ? await capturedBlobs[0].text() : '';
    check('emergency headers still present', ['Emergency Contact Name', 'Emergency Contact Phone', 'Relationship'].every(h => xls2.includes(`<Data ss:Type="String">${h}</Data>`)));
    check('no Payment Status column for Bangalore', !xls2.includes('Payment Status'));

    console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
    process.exit(failures === 0 ? 0 : 1);
})();

