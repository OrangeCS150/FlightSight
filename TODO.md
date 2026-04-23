# Price Alerts Surgical Integration TODO

## Scope lock (approved)
Only these files will be touched:

### New files
- frontend/html/priceAlerts.html
- frontend/css/priceAlerts.css
- frontend/js/priceAlerts.js

### Existing files to patch
- frontend/js/booking.js
- frontend/html/homePage.html
- frontend/html/savedFlights.html
- frontend/js/homePage.js
- frontend/js/savedFlights.js
- frontend/css/savedFlights.css (only if tiny additive style is truly needed)

No other files will be modified.

## Steps
- [ ] Create `frontend/html/priceAlerts.html` with integrated navbar/header/layout matching existing site.
- [ ] Create `frontend/css/priceAlerts.css` reusing visual identity from saved flights/home styles.
- [ ] Create `frontend/js/priceAlerts.js` to load alerts, map to saved flights context, and support update/delete actions.
- [ ] Patch `frontend/html/homePage.html` Price Alerts nav href -> `priceAlerts.html`.
- [ ] Patch `frontend/html/savedFlights.html` Price Alerts nav href -> `priceAlerts.html`.
- [ ] Patch `frontend/js/booking.js` to replace fixed `$100` flow with user-controlled threshold input + submit while preserving existing logic/status.
- [ ] Patch `frontend/js/homePage.js` badge logic to evaluate triggered alerts per saved flight fare (more accurate count).
- [ ] Patch `frontend/js/savedFlights.js` with narrow alert-related extension:
  - per-flight threshold lookup
  - per-flight triggered determination
  - threshold/status details on card
- [ ] Patch `frontend/css/savedFlights.css` only if one tiny additive class is required for threshold/status text.
- [ ] Validate no unrelated behavior changed and summarize surgical implementation + test checklist results.
