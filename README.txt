================================================================================
QOARC — Portfolio & Case Study Design System Builder
================================================================================

1. PROJECT OVERVIEW
-------------------
QOARC is a high-precision, client-side Design System & Case Study Builder 
engineered for presentation-grade portfolio artifacts, 3D device framing, 
tokenized color palettes, and multi-format document exporting.


2. PROBLEM STATEMENT
--------------------
Presenting digital design systems, software architecture, and UX case studies 
effectively to clients and engineering leaders is notoriously difficult:
  * Generic Screenshots Fail: Plain static images fail to demonstrate 
    responsive behavior, elevation hierarchies, or design tokens.
  * High Friction in Design Tools: Traditional design software (Figma, 
    Illustrator) requires manual layout tweaking for every new project.
  * Lack of Design System Consistency: Case studies often decouple visual 
    assets from actual system rules (color contrast compliance, design tokens).
  * Fragile Export Pipelines: Exporting web case studies to presentation-ready 
    documents often breaks layout rhythm or distorts viewports.


3. SOLUTION PROPOSAL
--------------------
QOARC resolves this gap by providing an end-to-end, browser-native Case Study 
& Design System Engine. It transforms portfolio documentation into a paged, 
fixed-aspect landscape presentation suite. Designers and engineers can 
instantly author, customize, inspect, and export high-fidelity case studies 
built on authoritative design tokens—without touching heavy design tools or 
setting up backend build pipelines.


4. METHODOLOGY & APPLICATION ARCHITECTURE
-----------------------------------------
The system operates as a unified client-side application built around five core 
architectural pillars:

  A. Fixed-Aspect Paged Sheet Engine (pages.css)
     Replaces traditional scrolling web pages with fixed-size landscape sheets 
     (A4 297mm x 210mm default, customizable to 16:9 widescreen).

  B. Token-Driven Design System (tokens.css, token-derive.js)
     Single source of truth for brand colors, automated WCAG contrast checks, 
     and derived interaction states (hover/active/glow).

  C. Interactive Device & 3D Specimen Rendering (devices.css)
     CSS-driven device viewports (Mobile, Tablet, Desktop) supporting flat, 
     3D extruded edges, ambient backdrop shadows, and custom finishes.

  D. Real-Time Inspector & Layout State Engine (panel.js)
     Floating toolbar allowing instant page re-ordering, theme switching 
     (Light/Dark mode), element positioning, and alignment grid overlays.

  E. Client-Side Persistence & Multi-Format Exporter
     Full session state persisted via localStorage; direct export support 
     for clean standalone HTML and JSON backup/restore.


5. TECH STACK
-------------
  * Core Structure: HTML5 Semantic Markup (W3C compliant)
  * Styling & Layout: Vanilla CSS3 (CSS Custom Properties, Grid Subgrid, 
    CSS Container Queries, aspect-ratio, color-mix color math)
  * Application Logic: Vanilla JavaScript (ES6+ Modules, DOM API, Canvas API)
  * Data & Storage: Client-side localStorage API & JSON Serialization
  * Runtime Dependencies: Zero External Dependencies


6. FINALIZATION & DEPLOYMENT
----------------------------
  * Status: Production Ready
  * Git Repository: Integrated with clean .gitignore (local launcher untracked).
  * License: Copyright (c) 2026. All Rights Reserved.
================================================================================
