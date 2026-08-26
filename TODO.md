# TODO - Admin tabs split (Bus Routes manage vs Route-wise Members)

- [ ] Inspect `admin.html` tab wiring and bus routes/users content blocks
- [ ] Split UI: keep current bus management in “Bus Routes” tab only
- [ ] Add new tab button: “Route-wise Members”
- [ ] Add new tab content container for route-wise member listing
- [ ] Wire `switchTab()` to toggle the new content block
- [ ] Ensure route-wise member rendering uses existing `displayBusRoutesUsers()` logic but only for the new tab
- [ ] Ensure event selector + download buttons are placed in the correct (members) tab
- [x] Verify delete bus/route actions still work in manage tab
- [ ] Quick manual test in browser (login as admin)


