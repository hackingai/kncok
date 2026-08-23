# Vanukuri Family — Housewarming Invitation Website

A premium, mobile-first digital housewarming invitation.  
Visitors arrive via QR code scan from the physical invitation.

---

## Project Structure

```
housewarming-invitation/
│
├── index.html              ← Main invitation page
│
├── css/
│   └── styles.css          ← All styles (design tokens, layout, animation)
│
├── js/
│   ├── app.js              ← Opening overlay, FAB, smooth scroll, photo handler
│   ├── animations.js       ← Scroll-triggered reveal animations (IntersectionObserver)
│   ├── calendar.js         ← Add to Calendar (Google, Apple ICS, Outlook ICS)
│   └── map.js              ← Provider-agnostic map abstraction
│
├── assets/
│   └── house/              ← Place house photo here (see Phase 2 below)
│
└── README.md
```

---

## Development Phases

### ✅ Phase 1 — Visual Invitation (complete)
Full invitation UI without map or real photo.

### Phase 2 — Add House Photo
1. Copy the house photo into `assets/house/`
2. Name it `house.jpg` (or update `src` in `index.html`)
3. Supports landscape and portrait — the frame adapts automatically

### Phase 3 — Map Placeholder (complete)
Elegant placeholder is already in place.

### Phase 4 — Test Mapbox
In `js/map.js`, set:
```js
var MAP_CONFIG = {
  provider: 'mapbox',
  coordinates: { lat: YOUR_LAT, lng: YOUR_LNG },
  apiKey: 'YOUR_MAPBOX_PUBLIC_TOKEN',
  directionsEnabled: true,
};
```
Restrict the token to your domain in the Mapbox dashboard.

### Phase 5 — Test Google Maps
In `js/map.js`, set:
```js
var MAP_CONFIG = {
  provider: 'google',
  coordinates: { lat: YOUR_LAT, lng: YOUR_LNG },
  apiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
  directionsEnabled: true,
};
```
Restrict the key to your domain in Google Cloud Console.

### Phase 6 — Compare Providers
Evaluate: visual quality, live location, route display, mobile UX, API cost.

### Phase 7 — Select Winner
Update `MAP_CONFIG.provider` to the chosen provider.

### Phase 8 — Deploy & QR Code
1. Push to GitHub Pages (or your hosting)
2. Generate a QR code pointing to the live URL
3. Add QR code to the physical invitation

---

## Event Details

| Field   | Value                    |
|---------|--------------------------|
| Event   | Housewarming Ceremony    |
| Family  | Vanukuri Family          |
| Date    | 31 August 2026           |
| Time    | 3:00 AM                  |

---

## Security Notes

- Never commit real API keys to this repository
- Use environment-based injection or restrict keys by domain/referrer
- Only browser-safe (public) keys should ever appear in frontend code

---

## Deployment — GitHub Pages

```bash
git init
git add .
git commit -m "Initial invitation build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/vanukuri-invitation.git
git push -u origin main
```

Then enable GitHub Pages in the repository Settings → Pages → Source: `main` branch.
