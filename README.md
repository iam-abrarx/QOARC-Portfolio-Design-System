# QOARC — Portfolio & Case Study Design System Builder

> A high-precision, client-side Design System & Case Study Builder engineered for presentation-grade portfolio artifacts, 3D device framing, tokenized color palettes, and multi-format document exporting.

---

## 📌 Problem Statement

Presenting digital design systems, software architecture, and UX case studies effectively to clients and engineering leaders is notoriously difficult:
- **Generic Screenshots Fail**: Plain static images fail to demonstrate responsive behavior, elevation hierarchies, or design tokens.
- **High Friction in Design Tools**: Traditional design software (Figma, Illustrator) requires manual layout tweaking for every new portfolio project, slowing down documentation.
- **Lack of Design System Consistency**: Case studies often decouple visual assets from actual system rules (color contrast compliance, fluid typography scales, design tokens).
- **Fragile Export Pipelines**: Exporting web case studies to presentation-ready documents often breaks layout rhythm, clipping content or distorting device viewports.

---

## 💡 Solution Proposal

**QOARC** resolves this gap by providing an end-to-end, browser-native **Case Study & Design System Engine**. 

It transforms portfolio documentation into a paged, fixed-aspect landscape presentation suite. Designers and engineers can instantly author, customize, inspect, and export high-fidelity case studies built on authoritative design tokens—without touching heavy design tools or setting up backend build pipelines.

---

## ⚙️ Methodology & Application Architecture

The system operates as a unified client-side application built around five core architectural pillars:

### 1. Fixed-Aspect Paged Sheet Engine (`pages.css`)
- Replaces traditional scrolling web pages with fixed-size landscape sheets (A4 297mm × 210mm default, customizable to 16:9 widescreen).
- Maintains strict vertical rhythm, running headers, folios, and print boundaries so every sheet reads like a printed design system specification.

### 2. Token-Driven Design System (`tokens.css`, `token-derive.js`)
- Single source of truth for brand colors (`--qo-deep-space`, `--qo-navy`, `--qo-slate`, `--qo-paper`, `--qo-teal`).
- Automated contrast auditing (WCAG AA/AAA) and derived interaction state generation (hover/active/glow) calculated dynamically via CSS `color-mix()` and JavaScript.

### 3. Interactive Device & 3D Specimen Rendering (`devices.css`)
- CSS-driven device viewports (Mobile, Tablet, Desktop) supporting flat, 3D extruded edges, ambient backdrop shadows, glare layers, and custom finish materials (Graphite, Silver, Space Gray).

### 4. Real-Time Inspector & Layout State Engine (`panel.js`)
- Floating toolbar and inspector popover that allows instant page re-ordering, theme switching (Light/Dark mode), element positioning, background pattern selection, and live axis/grid alignment overlay.

### 5. Client-Side Persistence & Multi-Format Exporter
- Full session state (added pages, deleted elements, custom text edits, token overrides) persisted via `localStorage`.
- Direct export support for clean standalone HTML, JSON backup/restore, and presentation PDFs.

---

## 🛠️ Tech Stack

- **Core Structure**: HTML5 Semantic Markup (W3C compliant)
- **Styling & Layout**: Vanilla CSS3 (CSS Custom Properties, Grid Subgrid, CSS Container Queries, `aspect-ratio`, HSL & `color-mix()` color math)
- **Application Logic**: Vanilla JavaScript (ES6+ Modules, DOM API, IntersectionObserver, Canvas API)
- **Data & Storage**: Client-side `localStorage` API & JSON Serialization
- **Zero External Runtime Dependencies**: Lightweight, instant load times, no build scripts required.

---

## 🎯 Key Application Features

| Feature | Description |
| :--- | :--- |
| **Visual Case Study Builder** | Drag, inspect, nudge, and edit text blocks and device mockups live on the sheet. |
| **Token Swatch Grid** | Grid-aligned swatch capsules and gradient pairings with zero column drift or overflow. |
| **Dual Theme Support** | Seamless per-page theme swapping (`qo-page--light` / dark mode) re-contrasting all tokens instantly. |
| **Template Manager** | Pre-built showcase templates for web apps, mobile products, and client case studies. |
| **Export Engine** | One-click export to clean, self-contained HTML files or JSON project archives. |

---

## 🏁 Finalization & Deployment Status

- **Status**: Production Ready & Fully Prepared
- **Git Repository**: Integrated with clean `.gitignore` (local launcher script untracked).
- **Public Showcase**: Hosted static assets compatible with GitHub Pages, Vercel, or Netlify.

---

## 📜 License

**Copyright (c) 2026. All Rights Reserved.**  
This repository and its source code are personal portfolio work.
