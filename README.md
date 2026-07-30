# 🎨 QOARC Portfolio & Case Study Design System Builder

> An interactive, browser-based visual builder and design system for creating high-impact portfolio case studies, 3D device mockups, color design systems, and exportable PDF presentations. Zero dependencies required.

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Try_Online-2DD4BF?style=for-the-badge)](https://YOUR_GITHUB_USERNAME.github.io/Portfolio-Design-System/projects.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Built with Vanilla JS](https://img.shields.io/badge/Built_with-HTML5_|_CSS3_|_JS-orange?style=for-the-badge)](#tech-stack)

---

## 🌟 Overview

**QOARC Design System** is a complete client-side portfolio creation suite. It enables designers and developers to showcase web/mobile projects through structured case study templates, interactive 3D device mockups, customizable color palettes, and typographic scales.

Anyone can use it **100% online** directly in the browser—no installation, build step, or server configuration needed!

---

## ✨ Features

- 📱 **Interactive 3D Device Mockups**: Display mobile, tablet, and desktop screen mockups with flat, 3D tilt, shadow, and custom finish options.
- 🎨 **Design Language & Color System**: Dynamic token-derived palettes (solids, gradients, derived hover/active states) with automatic contrast checks.
- 📐 **Visual Folio Builder**: Real-time layout controls, page ordering, background patterns, themes (Light/Dark mode), and live axis/grid alignment tools.
- 📑 **Pre-built Case Study Templates**: Start immediately from multiple curated templates for web, mobile, and agency portfolios.
- 💾 **Local Persistence**: Save, duplicate, import, and export projects seamlessly via `localStorage` or JSON files.
- 📄 **Export Options**: Export clean production HTML, high-quality PDFs, or raw JSON project data.

---

## 🚀 Quick Start (Use Online)

You can launch and use the tool directly in your web browser:

👉 **[Launch Online Builder](https://YOUR_GITHUB_USERNAME.github.io/Portfolio-Design-System/projects.html)**

---

## 🛠️ Local Development & Running Locally

If you prefer to run it locally on your computer:

### Prerequisites
- Python 3.x (or Node.js `npx serve` / any static file server)

### Running locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_GITHUB_USERNAME/Portfolio-Design-System.git
   cd Portfolio-Design-System
   ```

2. **Launch server:**
   - On Windows: Double-click `OPEN-BUILDER.cmd`
   - Or run via Python command:
     ```bash
     python -m http.server 8731
     ```

3. **Open browser:**
   Navigate to `http://localhost:8731/projects.html`

---

## 📂 Project Structure

```
Portfolio-Design-System/
├── index.html               # Design System overview & specimen viewer
├── projects.html            # Template picker & project management dashboard
├── case-study.html          # Interactive visual builder & case study editor
├── ai-portfolio.html        # AI-tailored case study layout specimen
├── hybrid-portfolio.html    # Hybrid showcase specimen
├── short-case-study.html    # Concise case study format
├── OPEN-BUILDER.cmd         # One-click Windows launch script
├── css/                     # Design tokens, components, devices, and layout styles
├── js/                      # Core visual builder engine, project manager, and inspector
├── assets/                  # Fonts, icons, and image assets
└── sites/                   # Sample project screenshots & assets
```

---

## 🛠️ Tech Stack

- **HTML5 & CSS3**: Native CSS custom properties, grid subgrid, aspect ratios, and modern container layouts.
- **Vanilla JavaScript**: Zero heavy external dependencies for ultra-fast, lightweight performance.
- **LocalStorage API**: For local data persistence without requiring a database.

---

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information. Anyone is free to use, modify, and distribute this software.
