# Ideas Hub — All 150 Features (How Each Works)

Open in app: **Settings → Ideas Hub (All 150)**.

APIs live under `/api/v1/ideas150/*`. Every feature **persists** per institution in `extreme_feature_records` (`ideas150:<slug>`), returns JSON, and UI effects apply via `body.i150-*` CSS classes.

**QA:** click **Verify All 150** — must show `150/150 passed`.

---

## A) UI / Styling / Animation (1–40)

| # | Feature | How it works |
|---|---------|--------------|
| 1 | Cinematic Login Portal | Toggle enables aurora/particle body FX class for cinematic login atmosphere. |
| 2 | Magnetic Buttons | Enables button magnetic/hover motion styling across hub controls. |
| 3 | Success Scan Morph | On run: morph-glow card animation + confetti burst demo. |
| 4 | Page Flip Transitions | Category grid uses 3D flip-in transition when active. |
| 5 | Skeleton Shimmer 2.0 | Busy cards show branded shimmer loading wave. |
| 6 | Live Face Mesh Overlay | Laser/mesh scan line overlay animates over hub. |
| 7 | Confidence Ring Gauge | API returns match %; ring gauge animates to that percent. |
| 8 | Depth-parallax Dashboard | Hero elevates with parallax-style transform. |
| 9 | Glassmorphism Command Deck | Frosted glass blur applied to hub + cards. |
| 10 | Role Color DNA | Returns per-role accent palette (student/teacher/admin). |
| 11 | AMOLED + Burn Guard | True black + slow drift to reduce OLED burn-in. |
| 12 | Sound-reactive Theme | FX class ready for flash-on-beep theme pulse. |
| 13 | Haptic Storyboard | Returns vibration patterns; triggers `navigator.vibrate`. |
| 14 | Toast Theater | Spawns animated bottom toast with sample copy + timer. |
| 15 | Empty-state Mini Games | Returns mini face-match puzzle payload + score. |
| 16 | Custom Cursor HUD | Forces crosshair cursor for desktop HUD feel. |
| 17 | Gesture Nav | Enables overscroll containment on tab strip for swipe UX. |
| 18 | Stagger Cascade Lists | Cards cascade fade/slide in with delays. |
| 19 | Scroll-linked Timeline | Gradient left border “story timeline” on hub. |
| 20 | Reduced-motion Profile | Disables animations/transitions for a11y. |
| 21 | Theme Studio Live Preview | Saves color; applies `--ideas150-accent` / primary live. |
| 22 | Seasonal Skins | Sets Diwali/Holi/exam-week skin attribute + accent. |
| 23 | Kiosk Attract Loop | Hero title breathing attract animation (idle kiosk). |
| 24 | Split-screen War Room | Forces 2-column mosaic grid with hot borders. |
| 25 | Chart Morph Storytelling | Returns bar→line→pie sequence + sample series data. |
| 26 | Gesture Confetti Language | Active press brightens cards; confetti on run demos. |
| 27 | Onboarding Filmstrip | Tracks 5-scene walkthrough completion state. |
| 28 | Achievement Unlock Cinema | Toast cinema unlock for badge name. |
| 29 | Dark/Light Crossfade | Smooth 400ms theme transition class on body. |
| 30 | Kinetic Headlines | Letter-spacing kinetic title spring animation. |
| 31 | Scan Laser Sweep | Airport-style laser line sweeps hub. |
| 32 | 3D Digital ID Flip | Enabled cards flip on Y axis (wallet card). |
| 33 | Status Dot Orchestra | ON/OFF meta dots pulse differently. |
| 34 | Drag-to-Reorder Widgets | Grab cursor on cards (reorder-ready UX). |
| 35 | Floating Quick Dock | Sticky glass action island at bottom. |
| 36 | Blur-to-Focus Camera Gate | Grid starts blurred then focuses. |
| 37 | Error Shake Soft Recover | Shake then recover animation on demo run. |
| 38 | Progress River | Flowing gradient river on progress bar. |
| 39 | Ambient Campus Map Glow | Returns building density map for glow UI. |
| 40 | Voice Visualizer Bars | Active tab shows listening bar visualizer. |

## B) Camera / Face (41–55)

| # | Feature | How it works |
|---|---------|--------------|
| 41 | Multi-angle Enrollment | Tracks front/left/right/up/down wizard progress %. |
| 42 | Mask/Glasses Mode | Toggle occlusion-robust matching mode (persisted). |
| 43 | Twin Warning | Finds lookalike pairs from roster; requires confirm. |
| 44 | Quality Gate HUD | Scores blur/exposure/face-size; pass if ≥70. |
| 45 | Classroom Gallery | Builds batch present list from real students. |
| 46 | Soft Biometric Fallback | Arms face→OTP→PIN→override chain. |
| 47 | Temporal Consistency | Toggle multi-frame same-person check. |
| 48 | Depth/Stereo Estimate | Toggle dual-cam anti-spoof estimate mode. |
| 49 | Low-light Helper | Contrast boost FX + night helper toggle. |
| 50 | Face Watchlist Alert | Returns unauthorized-person alert candidates. |
| 51 | Replay Attack Timeline | Builds frame-hash timeline; flags duplicates. |
| 52 | Enrollment Drift | Drift score + re-enroll candidates from DB. |
| 53 | Fairness Tuning | Cohort match-rate fairness dashboard. |
| 54 | Edge Model Switcher | Switches lite/full model profiles (latency/accuracy). |
| 55 | Offline On-device Match | Toggle local match + later sync mode. |

## C) Attendance Core (56–70)

| # | Feature | How it works |
|---|---------|--------------|
| 56 | Period Auto Session | Computes open/close window from clock/period. |
| 57 | Late/Excused/Medical | Extends statuses; samples today’s real marks. |
| 58 | Buddy Verify | Builds 2-student same-room verify packet. |
| 59 | Exam Hall Strict | Geofence + liveness + single-device rules toggle. |
| 60 | Zone Policies | Saves lab/library/hostel policy map. |
| 61 | Substitute Hand-off | Audits session transfer from→to email. |
| 62 | Seating Heat | Builds seat grid glowing from today’s present. |
| 63 | Grace Countdown | Returns remaining seconds in grace window. |
| 64 | Mass Override | Staff bulk override with mandatory reason/note. |
| 65 | Conflict Resolver | Scans duplicate roll/date marks today. |
| 66 | QR + Face Hybrid | Issues rotating QR token then face step. |
| 67 | BLE Roll Call | Toggle BLE presence assist + beacon count. |
| 68 | Attendance Draft | Draft from today’s rows; optional publish. |
| 69 | Retro Correction | Queues student correction for teacher decision. |
| 70 | Holiday Calendar Sync | Saves holidays that skip attendance. |

## D) AI / Analytics (71–80)

| # | Feature | How it works |
|---|---------|--------------|
| 71 | At-risk Story Cards | Builds story cards for low-% students. |
| 72 | What-if Simulator | Computes new % if N more presents. |
| 73 | Anomaly Timeline | Week filmstrip with spike flags. |
| 74 | Class Energy Index | Energy from present/roster ratio. |
| 75 | Predictive Heatmap | Hourly campus busy prediction series. |
| 76 | Report Narration | Hinglish narration script from live counts. |
| 77 | Hinglish Rule Builder | Saves IF/THEN chips (e.g. absent→WhatsApp). |
| 78 | Subject Ranking | Ranks weak subjects by weakness score. |
| 79 | Peer Privacy Mode | Anonymous percentile-only comparison toggle. |
| 80 | Counselor Triage | Merges absence/mood risk queue. |

## E) Student / Parent / Teacher (81–90)

| # | Feature | How it works |
|---|---------|--------------|
| 81 | Streak Calendar Heat | 28-day GitHub-style heat cells. |
| 82 | Parent Live Ping | Privacy-safe campus ping from last mark. |
| 83 | Push Quiet Hours | Persists mute window start/end. |
| 84 | Family Switcher | Carousel snap tabs FX for multi-child. |
| 85 | One-thumb Mark | Large outdoor-friendly buttons FX. |
| 86 | Live Presence Grid | Fills cells from today’s attendance. |
| 87 | Badge Shop | Catalog + owned badges purchase flow. |
| 88 | Study Challenges | Team challenge progress race payload. |
| 89 | Leave Magic Crop | Crop box + OCR fields for medical cert. |
| 90 | Excuse Voice Dictate | Transcript → ready-to-submit leave note. |

## F) Enterprise (91–100)

| # | Feature | How it works |
|---|---------|--------------|
| 91 | White-label Motion | Links institution logo motion pack URL. |
| 92 | TV Lobby Mode | Large landscape lobby typography FX. |
| 93 | Auditor Ghost Mode | Read-only auditor viewing toggle. |
| 94 | Consent Timeline Reel | Appends DPDP consent version filmstrip. |
| 95 | Retention Rings | Biometric retention days + purge timer. |
| 96 | Disaster Drill | Staff failover RPO/RTO theater (green/red). |
| 97 | Franchise Globe | Multi-campus hop list with live student count. |
| 98 | Webhook Playground | Emits event + curl preview; stores stream. |
| 99 | SLA Status Page | Uptime % + heartbeat strip. |
| 100 | Plugin Marketplace | Install/list motion/theme plugin packs. |

## G) Futuristic (101–110)

| # | Feature | How it works |
|---|---------|--------------|
| 101 | AR Name Tags | Floating AR tags from today’s present + FX. |
| 102 | Watch Complication | Issues short-lived wear OS mark token. |
| 103 | Exam Proctor HUD | Split HUD styling for face/tab/audio. |
| 104 | Digital Twin Floor | Rooms fill with present vs capacity dots. |
| 105 | Satellite Camp Mode | Outdoor GPS polygon + offline toggle. |
| 106 | Watch Late Haptic | Toggle late-reminder haptic schedule. |
| 107 | Voice Dark Room | Near-black voice-only UI mode. |
| 108 | Metaverse Booth | Toggle VR avatar check-in mode. |
| 109 | Drone Crowd Sim | Estimates heads from density. |
| 110 | Emotion Soft Coach | Toggle tired-face soft counsel prompts. |

## H) Extra UI Micro (111–150)

| # | Feature | How it works |
|---|---------|--------------|
| 111 | Button Press Depth | Press-in shadow on buttons. |
| 112 | Ripple Ink | Ripple-ready chip/button styling. |
| 113 | Hover Tilt Cards | 3° perspective tilt on hover. |
| 114 | Sticky Blur Headers | Sticky blurred category tabs. |
| 115 | Soft Aurora BG | Infinite aurora background animation. |
| 116 | Noise Grain Overlay | Cinema film grain overlay. |
| 117 | Cursor Spotlight | Radial spotlight background class. |
| 118 | Sliding Tab Pill | Active tab underline pill. |
| 119 | Ticking Counters | ID/stat tick-in animation. |
| 120 | Branded PTR | Pill-shaped branded control styling. |
| 121 | Bottom Sheet Snaps | Verify panel acts as mid-height sheet. |
| 122 | Modal Scale-in | Verify/modal scale-in entrance. |
| 123 | Avatar LQIP | Title blur-up sharpen demo. |
| 124 | Badge Glow Unread | Kind pill pulse glow. |
| 125 | Cmd+K Fuzzy | Run indexes shortcut search payload. |
| 126 | Shortcut Cheatsheet | Returns overlay shortcut list payload. |
| 127 | PDF Preview Animate | Report preview action payload. |
| 128 | Chart Brush Zoom | Hover zoom on result charts. |
| 129 | Map Pin Bounce | Bounce animation on ids/pins. |
| 130 | Offline Retry Rocket | Offline message rocket cue. |
| 131 | Sync Caterpillar | Caterpillar-progress sync bar. |
| 132 | Changelog Drawer | Version changelog payload action. |
| 133 | Feature Flag Lab | Spark feedback toggle lab state. |
| 134 | A/B Theme Vote | Workflow stores skin vote choice. |
| 135 | Dyslexia Preview | Applies OpenDyslexic-style font stack. |
| 136 | High-contrast Exam | High contrast exam HUD filter. |
| 137 | Colorblind-safe | Safe palette accents for CVD. |
| 138 | Hindi/RTL Layout | `direction: rtl` layout flip. |
| 139 | Large Text Mode | Enlarged parent/senior typography. |
| 140 | Icon Morph States | Kind badges morph by state. |
| 141 | Loading Mascot | Busy cards show breathing mascot. |
| 142 | Konami Skin | Easter-egg skin unlock action. |
| 143 | First-scan Fireworks | One-shot fireworks/confetti demo. |
| 144 | Stadium Cheer | 100% class cheer confetti+toast. |
| 145 | Rainy Day Soft UI | Soft rain ambient overlay. |
| 146 | Exam Week Red-line | Urgency red theme accents. |
| 147 | Night Shift Blue | Blue-light friendly night filter. |
| 148 | OG Attendance Card | Shareable card payload action. |
| 149 | Embed Widget | iframe embed snippet payload. |
| 150 | PWA Icon Dance | Install banner icon dance FX. |

---

## API Cheat Sheet

- `GET /api/v1/ideas150/catalog` — full 150 catalog  
- `GET /api/v1/ideas150/states` — enabled/run state for all  
- `GET /api/v1/ideas150/feature/{id|slug}` — one feature  
- `POST /api/v1/ideas150/feature/{id|slug}/run` — execute  
- `POST /api/v1/ideas150/feature/{id|slug}/toggle` — enable/disable  
- `POST /api/v1/ideas150/verify-all` — QA run all 150  
- `GET /api/v1/ideas150/summary` — category summary  

## Files

- `backend/app/ideas150.py` — workable handlers  
- `backend/app/ideas150_catalog.py` — catalog source  
- `frontend/src/utils/ideas150Catalog.js` — UI catalog  
- `frontend/src/utils/ideas150Effects.js` — FX engine  
- `frontend/src/components/Ideas150Hub.jsx` — hub UI  
- `frontend/src/styles/ideas150.css` — animations/styles  
