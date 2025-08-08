# MyTriage+ (MTS 2022 Full)
- Complete **Malaysian Triage Scale (Revised 2022)** complaint set (Adult + Paeds).
- Added **L5 non-emergency/administrative** items (dressing change, medical checkup, repeat Rx, suture removal, vaccination, medical report).
- Physiological discriminator escalation to reduce under-triage.

## Local
npm install
npm run dev

## Build
npm run build

## Deploy — GitHub Pages
$env:VITE_BASE='/mytriage-plus/'
npm run deploy
Settings → Pages → Branch: gh-pages / (root)

## Deploy — Vercel (recommended)
Import repo → Framework: Vite → Build: vite build → Output: dist → Deploy.
