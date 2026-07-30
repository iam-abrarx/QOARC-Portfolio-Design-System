/* ============================================================
   PROJECTS — landing screen
   Lists, creates, duplicates, renames and deletes projects, each
   one a template document with its own color palette, fonts, and
   starting screenshots. Creating a project seeds a builder layout
   (localStorage['qoarc.builder.v1::<slug>']) the exact same shape
   panel.js already reads, so opening the project drops straight
   into the familiar editor with the assigned mockups already in
   place — no code changes needed on that side.
   ============================================================ */

(() => {
  const PROJECTS_KEY = 'qoarc.projects.v1';
  const BUILDER_PREFIX = 'qoarc.builder.v1::';
  const SAVES_PREFIX = 'qoarc.builder.saves.v1::';

  const D = window.QOTokenDerive;

  const COLOR_FIELDS = [
    { key: 'deepSpace', label: 'Deep Space' },
    { key: 'navy', label: 'Navy' },
    { key: 'slate', label: 'Slate' },
    { key: 'paper', label: 'Paper' },
    { key: 'teal', label: 'Teal (accent)' },
  ];

  const FONT_ROLE_DEFS = [
    { role: 'brand', label: 'Brand (UI &amp; headings)' },
    { role: 'technical', label: 'Technical (labels &amp; signature)' },
    { role: 'editorial', label: 'Editorial (reading only)' },
  ];

  /* Curated, hand-picked list — not exhaustive, just enough real family
     names that typing a few letters turns up something. Free text beyond
     this list is always accepted too (see makeFontEntry). */
  const GOOGLE_FONTS = [
    // Sans
    'Inter', 'Roboto', 'Open Sans', 'Poppins', 'Montserrat', 'Lato', 'Work Sans',
    'Manrope', 'DM Sans', 'Nunito', 'Nunito Sans', 'Rubik', 'Karla', 'Mulish',
    'Sora', 'Outfit', 'Plus Jakarta Sans', 'Figtree', 'Urbanist', 'Lexend',
    'Space Grotesk', 'Hanken Grotesk', 'Hanken Grotesk', 'Public Sans', 'Epilogue',
    'IBM Plex Sans', 'Barlow', 'Archivo', 'Red Hat Display', 'Sen', 'Jost',
    'Onest', 'Instrument Sans', 'General Sans', 'Geist', 'Schibsted Grotesk',
    'Albert Sans', 'Bricolage Grotesque', 'Hind', 'Cabin', 'Assistant',
    // Serif
    'Fraunces', 'Playfair Display', 'Merriweather', 'Lora', 'Newsreader',
    'Source Serif 4', 'PT Serif', 'Libre Baskerville', 'Crimson Pro',
    'Cormorant', 'Cormorant Garamond', 'EB Garamond', 'Spectral', 'Bitter',
    'Noto Serif', 'Domine', 'Literata', 'Petrona', 'Vollkorn', 'Zilla Slab',
    'DM Serif Display', 'DM Serif Text', 'Young Serif', 'Fraunces 72pt',
    // Mono
    'JetBrains Mono', 'IBM Plex Mono', 'Space Mono', 'Fira Code', 'Roboto Mono',
    'Source Code Pro', 'Ubuntu Mono', 'DM Mono', 'Red Hat Mono', 'Spline Sans Mono',
    'Overpass Mono', 'PT Mono', 'Martian Mono', 'Azeret Mono',
    // Display / distinctive
    'Bebas Neue', 'Anton', 'Oswald', 'Archivo Black', 'Righteous', 'Syne',
    'Unbounded', 'Clash Display', 'Fraunces Display', 'Big Shoulders Display',
    'Passion One', 'Alfa Slab One', 'Abril Fatface', 'Fjalla One', 'Staatliches',
    'League Spartan', 'Bungee', 'Chivo', 'Sarabun', 'Prompt', 'Kanit',
    // Rounded / friendly
    'Comfortaa', 'Quicksand', 'Baloo 2', 'Fredoka', 'Varela Round', 'Nunito',
  ];

  function slugify(name) {
    return (name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'project';
  }
  function uniqueSlug(base, taken) {
    let slug = base, i = 2;
    while (taken.has(slug)) slug = `${base}-${i++}`;
    return slug;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---- font entries ---------------------------------------------------
     Every font field — the 3 base roles and any number of extras — holds
     the same shape: a real family name, a ready CSS value, and (unless
     it's a locally-installed font) a Google Fonts query segment. */

  function genericFallback(roleKey) {
    if (roleKey === 'technical') return 'monospace';
    if (roleKey === 'editorial') return 'serif';
    return 'sans-serif';
  }
  function fontWeights(roleKey) {
    return roleKey === 'technical' ? ':wght@400;500;600' : ':wght@400;500;600;700';
  }
  function makeFontEntry(name, roleKey) {
    return {
      name,
      css: `'${name}', ${genericFallback(roleKey)}`,
      google: `${name}${fontWeights(roleKey)}`,
      local: false,
    };
  }

  /* ---- device slot map -------------------------------------------------
     Positional keys match panel.js's own indexSlots() (pN-dM, N = page
     index across the whole document, M = device index on that page).
     Page 13 of the Web template's three devices are undressed style demos
     (data-spec="—") with no baseline image, so they're left out on
     purpose — same as the document's own shipped state. */
  const SLOT_MAP_WEB = [
    { key: 'p1-d1', kind: 'tablet', prefer: 'mobile', fit: 'cover' },
    { key: 'p1-d2', kind: 'laptop', prefer: 'desktop', fit: 'cover' },
    { key: 'p1-d3', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p5-d1', kind: 'laptop', prefer: 'desktop', fit: 'fit-width' },
    { key: 'p10-d1', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p10-d2', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p10-d3', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p10-d4', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p11-d1', kind: 'tablet', prefer: 'mobile', fit: 'fit-width' },
    { key: 'p11-d2', kind: 'tablet', prefer: 'desktop', fit: 'fit-width' },
    { key: 'p11-d3', kind: 'laptop', prefer: 'desktop', fit: 'fit-width' },
    { key: 'p12-d1', kind: 'desktop', prefer: 'desktop', fit: 'fit-width' },
    { key: 'p12-d2', kind: 'laptop', prefer: 'desktop', fit: 'fit-width' },
    { key: 'p12-d3', kind: 'phone', prefer: 'mobile', fit: 'cover' },
  ];

  /* Short Case Study — six pages, so every screenshot has to earn its place:
     two big desktop frames and three phones, plus the cover scene. Nothing
     on the overview, design-language or results pages. */
  const SLOT_MAP_SHORT = [
    { key: 'p1-d1', kind: 'tablet', prefer: 'mobile', fit: 'cover' },
    { key: 'p1-d2', kind: 'laptop', prefer: 'desktop', fit: 'cover' },
    { key: 'p1-d3', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p3-d1', kind: 'desktop', prefer: 'desktop', fit: 'fit-width' },
    { key: 'p3-d2', kind: 'laptop', prefer: 'desktop', fit: 'fit-width' },
    { key: 'p4-d1', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p4-d2', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p4-d3', kind: 'phone', prefer: 'mobile', fit: 'cover' },
  ];

  /* Case Study template — a longer narrative document, so screenshots carry
     four pages rather than three: the shipped screens (11/12), the signature
     interaction taken apart state by state (13), and the admin side the
     client actually operates (14). */
  const SLOT_MAP_CASE = [
    { key: 'p1-d1', kind: 'tablet', prefer: 'mobile', fit: 'cover' },
    { key: 'p1-d2', kind: 'laptop', prefer: 'desktop', fit: 'cover' },
    { key: 'p1-d3', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p11-d1', kind: 'desktop', prefer: 'desktop', fit: 'fit-width' },
    { key: 'p11-d2', kind: 'laptop', prefer: 'desktop', fit: 'fit-width' },
    { key: 'p11-d3', kind: 'tablet', prefer: 'desktop', fit: 'fit-width' },
    { key: 'p12-d1', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p12-d2', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p12-d3', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p12-d4', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p13-d1', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p13-d2', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p13-d3', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p14-d1', kind: 'desktop', prefer: 'desktop', fit: 'fit-width' },
    { key: 'p14-d2', kind: 'laptop', prefer: 'desktop', fit: 'fit-width' },
  ];

  /* AI Projects template — only the Bot/Agent Dashboard page (p12) ships
     with empty device slots; the Conversation page's chat mockups are
     authored placeholder content, not screenshot targets, so they're
     intentionally left out of auto-assign. */
  const SLOT_MAP_AI = [
    { key: 'p12-d1', kind: 'desktop', prefer: 'desktop', fit: 'fit-width' },
    { key: 'p12-d2', kind: 'phone', prefer: 'mobile', fit: 'cover' },
  ];

  /* AI + Software template — same device page shapes as SLOT_MAP_WEB, just
     shifted one page earlier (11/12/13 instead of 12/13/14) since this
     template drops the Accent Rule page that used to sit before them. */
  const SLOT_MAP_HYBRID = [
    { key: 'p1-d1', kind: 'tablet', prefer: 'mobile', fit: 'cover' },
    { key: 'p1-d2', kind: 'laptop', prefer: 'desktop', fit: 'cover' },
    { key: 'p1-d3', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p11-d1', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p11-d2', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p11-d3', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p11-d4', kind: 'phone', prefer: 'mobile', fit: 'cover' },
    { key: 'p12-d1', kind: 'tablet', prefer: 'mobile', fit: 'fit-width' },
    { key: 'p12-d2', kind: 'tablet', prefer: 'desktop', fit: 'fit-width' },
    { key: 'p12-d3', kind: 'laptop', prefer: 'desktop', fit: 'fit-width' },
    { key: 'p13-d1', kind: 'desktop', prefer: 'desktop', fit: 'fit-width' },
    { key: 'p13-d2', kind: 'laptop', prefer: 'desktop', fit: 'fit-width' },
    { key: 'p13-d3', kind: 'phone', prefer: 'mobile', fit: 'cover' },
  ];

  /* Template registry — the single source of truth for what "Template"
     means in the New Project modal: which document to open, its default
     palette/fonts, and which device slots auto-assign fills on create. */
  /* Section lists mirror each template's own Contents page exactly — same
     labels, same grouping of multi-page sections (e.g. Device Mockups) into
     one selectable unit. `pages` are 1-indexed physical positions across
     the whole document, matching panel.js's own ensurePageIds() ('page-N'
     assigned by DOM order) — that's what makes seeding state.pagesDeleted
     with those same ids work with zero panel.js changes. Cover, Contents,
     and Colophon aren't listed here — they're always included. */
  const SECTIONS_WEB = [
    { id: 'overview', label: 'Overview', pages: [2] },
    { id: 'brief', label: 'The Brief', pages: [4] },
    { id: 'solution', label: 'The Solution', pages: [5] },
    { id: 'color', label: 'Color', pages: [6] },
    { id: 'typography', label: 'Typography', pages: [7] },
    { id: 'buttons', label: 'Buttons', pages: [8] },
    { id: 'project-card', label: 'Project Card', pages: [9] },
    { id: 'device-mockups', label: 'Device Mockups', pages: [10, 11, 12, 13] },
    { id: 'results', label: 'Results', pages: [14] },
  ];
  /* Short Case Study has no Contents page — at six pages it would cost more
     than it earns — so only the cover (1) and the results/close page (6) sit
     outside the toggleable set. */
  const SECTIONS_SHORT = [
    { id: 'overview', label: 'Overview', pages: [2] },
    { id: 'screens-desktop', label: 'Screens — Desktop', pages: [3] },
    { id: 'screens-mobile', label: 'Screens — Mobile', pages: [4] },
    { id: 'design', label: 'Design Language', pages: [5] },
  ];
  const SECTIONS_CASE = [
    { id: 'at-a-glance', label: 'At a Glance', pages: [2] },
    { id: 'problem', label: 'Problem & Context', pages: [4] },
    { id: 'research', label: 'Research & Discovery', pages: [5] },
    { id: 'ia', label: 'Information Architecture', pages: [6] },
    { id: 'flows', label: 'User Flows', pages: [7] },
    { id: 'palette', label: 'Palette', pages: [8] },
    { id: 'typography', label: 'Typography', pages: [9] },
    { id: 'components', label: 'Components', pages: [10] },
    { id: 'screens-desktop', label: 'Key Screens — Desktop', pages: [11] },
    { id: 'screens-mobile', label: 'Key Screens — Mobile', pages: [12] },
    { id: 'interaction', label: 'Interaction Deep-Dive', pages: [13] },
    { id: 'admin', label: 'Admin & Backend', pages: [14] },
    { id: 'a11y-perf', label: 'Accessibility & Performance', pages: [15] },
    { id: 'results', label: 'Results & Impact', pages: [16] },
    { id: 'reflection', label: 'Reflection', pages: [17] },
  ];
  const SECTIONS_AI = [
    { id: 'overview', label: 'Overview', pages: [2] },
    { id: 'problem-approach', label: 'Problem & Approach', pages: [4] },
    { id: 'architecture', label: 'System Architecture', pages: [5] },
    { id: 'model-method', label: 'Model & Method', pages: [6] },
    { id: 'dataset-training', label: 'Dataset & Training', pages: [7] },
    { id: 'evaluation', label: 'Evaluation Metrics', pages: [8] },
    { id: 'deployment', label: 'Deployment Pipeline', pages: [9] },
    { id: 'automation', label: 'Automation & Monitoring', pages: [10] },
    { id: 'bot-agent', label: 'Bot & Agent Interaction', pages: [11, 12] },
    { id: 'results', label: 'Results — Before & After', pages: [13] },
    { id: 'impact', label: 'Impact & Outcomes', pages: [14] },
    { id: 'usage', label: 'Usage', pages: [15] },
  ];
  const SECTIONS_HYBRID = [
    { id: 'overview', label: 'Overview', pages: [2] },
    { id: 'color', label: 'Color', pages: [4] },
    { id: 'typography', label: 'Typography', pages: [5, 6] },
    { id: 'space-grid', label: 'Space & Grid', pages: [7] },
    { id: 'elevation', label: 'Elevation', pages: [8] },
    { id: 'buttons', label: 'Buttons', pages: [9] },
    { id: 'project-card', label: 'Project Card', pages: [10] },
    { id: 'device-mockups', label: 'Device Mockups', pages: [11, 12, 13] },
    { id: 'ai-integration', label: 'AI Integration', pages: [14, 15] },
  ];

  const TEMPLATES = {
    web: {
      id: 'web', label: 'Web Portfolio', file: 'index.html',
      colors: { deepSpace: '#0A1830', navy: '#0F2244', slate: '#6B7A94', paper: '#F7F7F9', teal: '#2DD4BF' },
      fonts: { brand: 'Hanken Grotesk', technical: 'JetBrains Mono', editorial: 'Fraunces' },
      slotMap: SLOT_MAP_WEB,
      sections: SECTIONS_WEB,
    },
    short: {
      id: 'short', label: 'Short Case Study', file: 'short-case-study.html',
      colors: { deepSpace: '#0A1830', navy: '#0F2244', slate: '#6B7A94', paper: '#F7F7F9', teal: '#2DD4BF' },
      fonts: { brand: 'Hanken Grotesk', technical: 'JetBrains Mono', editorial: 'Fraunces' },
      slotMap: SLOT_MAP_SHORT,
      sections: SECTIONS_SHORT,
    },
    casestudy: {
      id: 'casestudy', label: 'Case Study', file: 'case-study.html',
      colors: { deepSpace: '#0A1830', navy: '#0F2244', slate: '#6B7A94', paper: '#F7F7F9', teal: '#2DD4BF' },
      fonts: { brand: 'Hanken Grotesk', technical: 'JetBrains Mono', editorial: 'Fraunces' },
      slotMap: SLOT_MAP_CASE,
      sections: SECTIONS_CASE,
    },
    ai: {
      id: 'ai', label: 'AI Projects', file: 'ai-portfolio.html',
      colors: { deepSpace: '#0B0B1E', navy: '#1B1440', slate: '#7A7A9E', paper: '#F5F4FA', teal: '#8B5CF6' },
      fonts: { brand: 'Space Grotesk', technical: 'JetBrains Mono', editorial: 'Fraunces' },
      slotMap: SLOT_MAP_AI,
      sections: SECTIONS_AI,
    },
    hybrid: {
      id: 'hybrid', label: 'AI + Software', file: 'hybrid-portfolio.html',
      colors: { deepSpace: '#0A1830', navy: '#0F2244', slate: '#6B7A94', paper: '#F7F7F9', teal: '#F5A623' },
      fonts: { brand: 'Hanken Grotesk', technical: 'JetBrains Mono', editorial: 'Fraunces' },
      slotMap: SLOT_MAP_HYBRID,
      sections: SECTIONS_HYBRID,
    },
  };

  /* ---- storage ---------------------------------------------------------- */

  function loadProjects() {
    try { return JSON.parse(localStorage.getItem(PROJECTS_KEY)) || []; }
    catch { return []; }
  }
  function saveProjects(list) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
  }

  /* ---- material auto-assign ---------------------------------------------- */

  function normalizeGroup(g) {
    const s = (g || '').toLowerCase();
    if (s.includes('mobile')) return 'mobile';
    if (s.includes('desktop')) return 'desktop';
    return 'other';
  }

  function seedStateForSite(siteName, templateId) {
    const state = {};
    if (!siteName) return state;
    const items = (window.QO_MANIFEST || []).filter(m => m.site === siteName);
    if (!items.length) return state;

    const pools = { mobile: [], desktop: [], other: [] };
    items.forEach(m => pools[normalizeGroup(m.group)].push(m.path));

    const used = new Set();
    const takeFrom = prefer => {
      const order = prefer === 'mobile' ? ['mobile', 'other', 'desktop']
        : prefer === 'desktop' ? ['desktop', 'other', 'mobile']
        : ['other', 'mobile', 'desktop'];
      for (const g of order) {
        const path = pools[g].find(p => !used.has(p));
        if (path) { used.add(path); return path; }
      }
      return null;
    };

    const slotMap = (TEMPLATES[templateId] || TEMPLATES.web).slotMap;
    slotMap.forEach(slot => {
      const path = takeFrom(slot.prefer);
      if (!path) return;
      state[slot.key] = { src: path, kind: slot.kind, fit: slot.fit, x: 0, y: 0, z: 1 };
    });

    return state;
  }

  /* ---- grid rendering ------------------------------------------------------ */

  const grid = document.getElementById('qp-grid');

  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function renderGrid() {
    const projects = loadProjects().sort((a, b) => b.createdAt - a.createdAt);

    if (!projects.length) {
      grid.innerHTML = `<div class="qp-empty">
        No projects yet. Click <strong>+ New Project</strong> to spin one up from a template —
        pick its colors, fonts, and starting screenshots, then fine-tune it in the same builder as always.
      </div>`;
      return;
    }

    grid.innerHTML = projects.map(p => {
      const tpl = TEMPLATES[p.template] || TEMPLATES.web;
      const c = { ...tpl.colors, ...(p.colors || {}) };
      const swatches = [c.deepSpace, c.navy, c.slate, c.paper, c.teal, ...(p.extraColors || []).map(x => x.hex)]
        .map(hex => `<span class="qp-card__swatch" style="background:${hex}"></span>`).join('');
      const fontNames = ['brand', 'technical', 'editorial']
        .map(role => (p.fonts && p.fonts[role] && p.fonts[role].name) || '').filter(Boolean).join(' · ');

      return `
        <article class="qp-card" data-id="${p.id}">
          <a class="qp-card__open" href="${tpl.file}?project=${encodeURIComponent(p.slug)}">
            <div class="qp-card__swatches">${swatches}</div>
            <span class="qp-card__template">${escapeHtml(tpl.label)}</span>
            <h3 class="qp-card__title">${escapeHtml(p.name)}</h3>
            <p class="qp-card__meta">${p.material ? escapeHtml(p.material.site) : 'No materials assigned'}</p>
            <p class="qp-card__fonts">${escapeHtml(fontNames)}</p>
            <p class="qp-card__date">Created ${fmtDate(p.createdAt)}</p>
          </a>
          <div class="qp-card__actions">
            <button data-act="duplicate" title="Duplicate">⧉</button>
            <button data-act="rename" title="Rename">✎</button>
            <button data-act="delete" title="Delete">🗑</button>
          </div>
        </article>`;
    }).join('');

    grid.querySelectorAll('.qp-card').forEach(card => {
      const id = card.dataset.id;
      card.querySelector('[data-act="duplicate"]').onclick = () => duplicateProject(id);
      card.querySelector('[data-act="rename"]').onclick = () => renameProject(id);
      card.querySelector('[data-act="delete"]').onclick = () => deleteProject(id);
    });
  }

  function duplicateProject(id) {
    const projects = loadProjects();
    const src = projects.find(p => p.id === id);
    if (!src) return;

    const taken = new Set(projects.map(p => p.slug));
    const name = `${src.name} copy`;
    const slug = uniqueSlug(slugify(name), taken);
    const copy = { ...src, id: 'proj_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), slug, name, createdAt: Date.now(), updatedAt: Date.now() };
    projects.push(copy);
    saveProjects(projects);

    const state = localStorage.getItem(BUILDER_PREFIX + src.slug);
    if (state) localStorage.setItem(BUILDER_PREFIX + copy.slug, state);
    const saves = localStorage.getItem(SAVES_PREFIX + src.slug);
    if (saves) localStorage.setItem(SAVES_PREFIX + copy.slug, saves);

    renderGrid();
  }

  function renameProject(id) {
    const projects = loadProjects();
    const p = projects.find(x => x.id === id);
    if (!p) return;
    const name = prompt('Rename project:', p.name);
    if (name === null) return;
    p.name = name.trim() || p.name;
    p.updatedAt = Date.now();
    saveProjects(projects);
    renderGrid();
  }

  function deleteProject(id) {
    const projects = loadProjects();
    const p = projects.find(x => x.id === id);
    if (!p) return;
    if (!confirm(`Delete "${p.name}"? Its layout and saves are removed too. This cannot be undone.`)) return;
    saveProjects(projects.filter(x => x.id !== id));
    localStorage.removeItem(BUILDER_PREFIX + p.slug);
    localStorage.removeItem(SAVES_PREFIX + p.slug);
    renderGrid();
  }

  /* ---- new project modal ---------------------------------------------------- */

  const backdrop = document.getElementById('qp-modal-backdrop');
  const templateSelect = document.getElementById('qp-f-template');
  const siteSelect = document.getElementById('qp-f-site');
  const colorsBox = document.getElementById('qp-colors');
  const colorsExtraBox = document.getElementById('qp-colors-extra');
  const fontsBox = document.getElementById('qp-fonts');
  const fontsExtraBox = document.getElementById('qp-fonts-extra');
  const nameInput = document.getElementById('qp-f-name');
  const previewSwatches = document.getElementById('qp-preview-swatches');
  const previewFrame = document.getElementById('qp-preview-frame');
  const previewFrameWrap = previewFrame.parentElement;
  const previewPrevBtn = document.getElementById('qp-preview-prev');
  const previewNextBtn = document.getElementById('qp-preview-next');
  const previewPageLabel = document.getElementById('qp-preview-page-label');
  const googleFontsDatalist = document.getElementById('qp-google-fonts');
  const pagesListBox = document.getElementById('qp-pages-list');

  const draft = {
    template: 'web',
    colors: { ...TEMPLATES.web.colors },
    fonts: {
      brand: makeFontEntry(TEMPLATES.web.fonts.brand, 'brand'),
      technical: makeFontEntry(TEMPLATES.web.fonts.technical, 'technical'),
      editorial: makeFontEntry(TEMPLATES.web.fonts.editorial, 'editorial'),
    },
    extraColors: [],
    extraFonts: [],
    excludedSections: [],
  };

  /* ---- form tabs --------------------------------------------------------- */

  document.querySelectorAll('.qp-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.qp-tab').forEach(b => b.classList.toggle('is-active', b === btn));
      document.querySelectorAll('.qp-tab-panel').forEach(p => { p.hidden = p.dataset.tabPanel !== btn.dataset.tab; });
    });
  });

  let extraIdCounter = 0;
  function newExtraId() { return 'extra' + (++extraIdCounter) + '_' + Math.random().toString(36).slice(2, 6); }

  /* ---- font preview-in-field --------------------------------------------
     Every font input renders its own value in the actual selected face,
     not just the big iframe preview — pick a font and see it immediately
     in the field itself. Loads the Google Font into THIS page (projects.html),
     separate from the iframe's own copy, deduped so re-picking the same
     face doesn't re-request it. */
  const loadedGoogleFamilies = new Set();
  function applyFontPreviewToElement(el, entry) {
    if (!entry) return;
    el.style.fontFamily = entry.css;
    if (entry.google && !entry.local && !loadedGoogleFamilies.has(entry.google)) {
      loadedGoogleFamilies.add(entry.google);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=' + entry.google.replace(/ /g, '+') + '&display=swap';
      document.head.appendChild(link);
    }
  }

  function populateGoogleFontsDatalist() {
    googleFontsDatalist.innerHTML = [...new Set(GOOGLE_FONTS)].sort()
      .map(name => `<option value="${escapeHtml(name)}"></option>`).join('');
  }

  /* ---- Local Font Access (opt-in, Chrome only) ------------------------------
     Feature-detected — the "detect" button is hidden entirely on browsers
     without it. Fetched once per session and merged into the shared
     datalist so local names are searchable the same way Google ones are. */
  let localFontsCache = null;

  async function detectLocalFonts() {
    if (!('queryLocalFonts' in window)) return null;
    if (localFontsCache) return localFontsCache;
    try {
      const fonts = await window.queryLocalFonts();
      const names = [...new Set(fonts.map(f => f.family))].sort();
      localFontsCache = names;
      const existing = new Set([...googleFontsDatalist.options].map(o => o.value));
      names.forEach(n => {
        if (existing.has(n)) return;
        const opt = document.createElement('option');
        opt.value = n;
        googleFontsDatalist.appendChild(opt);
      });
      return names;
    } catch {
      return null; // permission declined, or the API errored
    }
  }

  async function handleDetectClick(input) {
    const names = await detectLocalFonts();
    if (!names) {
      alert("Couldn't access fonts on this PC — this needs Chrome, and you'll be asked to allow access.");
      return;
    }
    input.focus();
  }

  /* Wires one font search input (base role or extra row) to a get/set pair
     on the draft, resolving whatever is typed into a font entry and
     refreshing the preview. `roleKey` only affects the generic CSS
     fallback (monospace for technical, serif for editorial) and the
     weight list requested from Google — extras default to sans-serif. */
  function wireFontInput(input, badge, getEntry, setEntry, roleKey) {
    input.addEventListener('input', () => {
      const name = input.value.trim();
      if (!name) return;
      const isLocal = !!(localFontsCache && localFontsCache.includes(name));
      const entry = makeFontEntry(name, roleKey);
      if (isLocal) { entry.local = true; entry.google = null; }
      setEntry(entry);
      badge.hidden = !isLocal;
      applyFontPreviewToElement(input, entry);
      updatePreview();
    });
  }

  function templateOptions() {
    templateSelect.innerHTML = Object.values(TEMPLATES)
      .map(t => `<option value="${t.id}">${escapeHtml(t.label)}</option>`).join('');
  }

  function siteOptions() {
    const sites = [...new Set((window.QO_MANIFEST || []).map(m => m.site))].sort();
    siteSelect.innerHTML = `<option value="">Start empty — assign screenshots later</option>` +
      sites.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  }

  /* ---- base color fields (fixed 5 — everything deriveTokens() keys off) ---- */

  function buildColorFields() {
    colorsBox.innerHTML = COLOR_FIELDS.map(f => `
      <div class="qp-color">
        <input type="color" data-color="${f.key}" value="${draft.colors[f.key]}">
        <span>${f.label}</span>
        <input type="text" class="qp-color__hex" data-color-hex="${f.key}" value="${draft.colors[f.key]}" maxlength="7">
        <button type="button" class="qp-row-reset" data-color-reset="${f.key}" title="Reset to template default">↺</button>
      </div>`).join('');

    colorsBox.querySelectorAll('[data-color]').forEach(inp => {
      inp.addEventListener('input', () => {
        draft.colors[inp.dataset.color] = inp.value;
        colorsBox.querySelector(`[data-color-hex="${inp.dataset.color}"]`).value = inp.value;
        updatePreview();
      });
    });
    colorsBox.querySelectorAll('[data-color-hex]').forEach(inp => {
      inp.addEventListener('change', () => {
        const key = inp.dataset.colorHex;
        if (/^#[0-9a-f]{6}$/i.test(inp.value)) {
          draft.colors[key] = inp.value;
          colorsBox.querySelector(`[data-color="${key}"]`).value = inp.value;
        } else {
          inp.value = draft.colors[key];
        }
        updatePreview();
      });
    });
    colorsBox.querySelectorAll('[data-color-reset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.colorReset;
        const tpl = TEMPLATES[draft.template] || TEMPLATES.web;
        draft.colors[key] = tpl.colors[key];
        buildColorFields();
        updatePreview();
      });
    });
  }

  /* ---- extra colors (add/remove) --------------------------------------------
     Named custom tokens (--qo-custom-<slug>) that ride alongside the fixed
     5 — not wired into deriveTokens()'s role math, just extra CSS variables
     available on the project for hand-editing/future use. */

  function addExtraColor() {
    draft.extraColors.push({ id: newExtraId(), name: '', hex: draft.colors.teal });
    buildExtraColorFields();
    updatePreview();
  }
  function removeExtraColor(id) {
    draft.extraColors = draft.extraColors.filter(c => c.id !== id);
    buildExtraColorFields();
    updatePreview();
  }

  function buildExtraColorFields() {
    colorsExtraBox.innerHTML = draft.extraColors.map(c => `
      <div class="qp-color qp-color--extra">
        <input type="color" data-extra-color-swatch="${c.id}" value="${c.hex}">
        <input type="text" class="qp-color__name" data-extra-color-name="${c.id}" placeholder="Name (e.g. Highlight)" value="${escapeHtml(c.name)}">
        <input type="text" class="qp-color__hex" data-extra-color-hex="${c.id}" value="${c.hex}" maxlength="7">
        <button type="button" class="qp-row-remove" data-extra-color-remove="${c.id}" title="Remove">×</button>
      </div>`).join('');

    draft.extraColors.forEach(c => {
      const swatch = colorsExtraBox.querySelector(`[data-extra-color-swatch="${c.id}"]`);
      const name = colorsExtraBox.querySelector(`[data-extra-color-name="${c.id}"]`);
      const hex = colorsExtraBox.querySelector(`[data-extra-color-hex="${c.id}"]`);
      const remove = colorsExtraBox.querySelector(`[data-extra-color-remove="${c.id}"]`);

      swatch.addEventListener('input', () => { c.hex = swatch.value; hex.value = swatch.value; updatePreview(); });
      hex.addEventListener('change', () => {
        if (/^#[0-9a-f]{6}$/i.test(hex.value)) { c.hex = hex.value; swatch.value = hex.value; }
        else hex.value = c.hex;
        updatePreview();
      });
      name.addEventListener('input', () => { c.name = name.value; updatePreview(); });
      remove.addEventListener('click', () => removeExtraColor(c.id));
    });
  }

  /* ---- base font fields (fixed 3 roles) -------------------------------------- */

  function buildFontFields() {
    const hasLocalFonts = 'queryLocalFonts' in window;
    fontsBox.innerHTML = FONT_ROLE_DEFS.map(r => `
      <div class="qp-font-role">
        <label class="qp-field qp-field--tight"><span>${r.label}</span></label>
        <div class="qp-font-role__row">
          <input type="text" list="qp-google-fonts" data-font-input="${r.role}" value="${escapeHtml(draft.fonts[r.role]?.name || '')}" placeholder="Search fonts…">
          <button type="button" class="qp-font-detect" data-font-detect="${r.role}" title="Use a font installed on this PC" ${hasLocalFonts ? '' : 'hidden'}>🖥</button>
          <button type="button" class="qp-row-reset" data-font-reset="${r.role}" title="Reset to template default">↺</button>
        </div>
        <span class="qp-font-local-badge" data-font-badge="${r.role}" ${draft.fonts[r.role]?.local ? '' : 'hidden'}>Local font — won't render for others</span>
      </div>`).join('');

    FONT_ROLE_DEFS.forEach(r => {
      const input = fontsBox.querySelector(`[data-font-input="${r.role}"]`);
      const badge = fontsBox.querySelector(`[data-font-badge="${r.role}"]`);
      const detectBtn = fontsBox.querySelector(`[data-font-detect="${r.role}"]`);
      const resetBtn = fontsBox.querySelector(`[data-font-reset="${r.role}"]`);
      wireFontInput(input, badge, () => draft.fonts[r.role], entry => { draft.fonts[r.role] = entry; }, r.role);
      applyFontPreviewToElement(input, draft.fonts[r.role]);
      if (detectBtn) detectBtn.addEventListener('click', () => handleDetectClick(input));
      resetBtn.addEventListener('click', () => {
        const tpl = TEMPLATES[draft.template] || TEMPLATES.web;
        draft.fonts[r.role] = makeFontEntry(tpl.fonts[r.role], r.role);
        buildFontFields();
        updatePreview();
      });
    });
  }

  /* ---- extra font roles (add/remove) ------------------------------------------ */

  function addExtraFont() {
    draft.extraFonts.push({ id: newExtraId(), name: '', font: makeFontEntry('Inter', '') });
    buildExtraFontFields();
    updatePreview();
  }
  function removeExtraFont(id) {
    draft.extraFonts = draft.extraFonts.filter(f => f.id !== id);
    buildExtraFontFields();
    updatePreview();
  }

  function buildExtraFontFields() {
    const hasLocalFonts = 'queryLocalFonts' in window;
    fontsExtraBox.innerHTML = draft.extraFonts.map(f => `
      <div class="qp-font-role qp-font-role--extra">
        <div class="qp-font-role__row">
          <input type="text" class="qp-color__name" data-extra-font-name="${f.id}" placeholder="Role name (e.g. Numerals)" value="${escapeHtml(f.name)}" style="flex:1;">
          <button type="button" class="qp-row-remove" data-extra-font-remove="${f.id}" title="Remove">×</button>
        </div>
        <div class="qp-font-role__row">
          <input type="text" list="qp-google-fonts" data-extra-font-input="${f.id}" value="${escapeHtml(f.font?.name || '')}" placeholder="Search fonts…">
          <button type="button" class="qp-font-detect" data-extra-font-detect="${f.id}" title="Use a font installed on this PC" ${hasLocalFonts ? '' : 'hidden'}>🖥</button>
        </div>
        <span class="qp-font-local-badge" data-extra-font-badge="${f.id}" ${f.font?.local ? '' : 'hidden'}>Local font — won't render for others</span>
      </div>`).join('');

    draft.extraFonts.forEach(f => {
      const nameField = fontsExtraBox.querySelector(`[data-extra-font-name="${f.id}"]`);
      const fontInput = fontsExtraBox.querySelector(`[data-extra-font-input="${f.id}"]`);
      const badge = fontsExtraBox.querySelector(`[data-extra-font-badge="${f.id}"]`);
      const detectBtn = fontsExtraBox.querySelector(`[data-extra-font-detect="${f.id}"]`);
      const remove = fontsExtraBox.querySelector(`[data-extra-font-remove="${f.id}"]`);

      nameField.addEventListener('input', () => { f.name = nameField.value; updatePreview(); });
      wireFontInput(fontInput, badge, () => f.font, entry => { f.font = entry; }, '');
      applyFontPreviewToElement(fontInput, f.font);
      if (detectBtn) detectBtn.addEventListener('click', () => handleDetectClick(fontInput));
      remove.addEventListener('click', () => removeExtraFont(f.id));
    });
  }

  /* ---- live preview: an iframe of the real template, not a mockup ------------ */

  let previewLoadedFile = null;
  let previewPageIndex = 0;

  function scalePreviewFrame() {
    const wrapWidth = previewFrameWrap.clientWidth;
    if (!wrapWidth) return;
    previewFrame.style.transform = `scale(${wrapWidth / 1122})`;
  }

  function goToPreviewPage(index) {
    const doc = previewFrame.contentDocument;
    if (!doc) return;
    const pages = [...doc.querySelectorAll('.qo-page')].filter(p => p.style.display !== 'none');
    if (!pages.length) return;
    previewPageIndex = Math.max(0, Math.min(index, pages.length - 1));
    pages[previewPageIndex].scrollIntoView({ block: 'start' });
    previewPageLabel.textContent = `Page ${previewPageIndex + 1} of ${pages.length}`;
    previewPrevBtn.disabled = previewPageIndex === 0;
    previewNextBtn.disabled = previewPageIndex === pages.length - 1;
  }

  /* Physical (1-indexed, whole-document) page numbers covered by the
     currently unchecked sections — the same numbering panel.js's own
     ensurePageIds() assigns by DOM order ('page-N'), which is what lets
     seeding state.pagesDeleted with those ids work with no panel.js
     changes at all. */
  function computeExcludedPageNumbers() {
    const tpl = TEMPLATES[draft.template] || TEMPLATES.web;
    const numbers = new Set();
    draft.excludedSections.forEach(id => {
      const section = tpl.sections.find(s => s.id === id);
      if (section) section.pages.forEach(n => numbers.add(n));
    });
    return numbers;
  }

  function syncPreviewPageVisibility() {
    const doc = previewFrame.contentDocument;
    if (!doc) return;
    const excluded = computeExcludedPageNumbers();
    doc.querySelectorAll('.qo-page').forEach((page, i) => {
      page.style.display = excluded.has(i + 1) ? 'none' : '';
    });
    goToPreviewPage(0);
  }

  function collectGoogleFamilies() {
    const families = [];
    ['brand', 'technical', 'editorial'].forEach(role => {
      const f = draft.fonts[role];
      if (f && !f.local && f.google) families.push(f.google);
    });
    draft.extraFonts.forEach(f => {
      if (f.font && !f.font.local && f.font.google) families.push(f.font.google);
    });
    return families;
  }

  function buildRootOverrides() {
    const tokens = D.deriveTokens(draft.colors);
    const root = { ...tokens.root };
    ['brand', 'technical', 'editorial'].forEach(role => {
      const f = draft.fonts[role];
      if (f) root[`--qo-font-${role === 'technical' ? 'mono' : role}`] = f.css;
    });
    draft.extraColors.forEach(c => {
      if (c.name && c.hex) root[`--qo-custom-${slugify(c.name)}`] = c.hex;
    });
    draft.extraFonts.forEach(f => {
      if (f.name && f.font?.name) root[`--qo-font-${slugify(f.name)}`] = f.font.css;
    });
    return { root, light: tokens.light };
  }

  function syncPreviewTokens() {
    const doc = previewFrame.contentDocument;
    if (!doc || !doc.head) return;

    const families = collectGoogleFamilies();
    if (families.length) {
      let link = doc.getElementById('qp-preview-fontlink');
      if (!link) {
        link = doc.createElement('link');
        link.id = 'qp-preview-fontlink';
        link.rel = 'stylesheet';
        doc.head.appendChild(link);
      }
      link.href = 'https://fonts.googleapis.com/css2?' +
        families.map(f => `family=${f.replace(/ /g, '+')}`).join('&') + '&display=swap';
    }

    const { root, light } = buildRootOverrides();
    let style = doc.getElementById('qp-preview-tokens');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'qp-preview-tokens';
      doc.head.appendChild(style);
    }
    const rootRules = Object.entries(root).map(([k, v]) => `${k}: ${v};`).join(' ');
    const lightRules = Object.entries(light).map(([k, v]) => `${k}: ${v};`).join(' ');
    style.textContent = `:root { ${rootRules} }\n.qo-page--light { ${lightRules} }`;
  }

  function loadPreviewTemplate(templateId) {
    const tpl = TEMPLATES[templateId] || TEMPLATES.web;
    previewPageIndex = 0;
    if (previewLoadedFile === tpl.file) {
      syncPreviewTokens();
      syncPreviewPageVisibility();
      return;
    }
    previewLoadedFile = tpl.file;
    previewFrame.onload = () => {
      syncPreviewTokens();
      scalePreviewFrame();
      syncPreviewPageVisibility();
    };
    previewFrame.src = tpl.file;
  }

  function updatePreview() {
    previewSwatches.innerHTML = [
      ...COLOR_FIELDS.map(f => ({ hex: draft.colors[f.key], title: f.label })),
      ...draft.extraColors.filter(c => c.hex).map(c => ({ hex: c.hex, title: c.name || 'Custom color' })),
    ].map(s => `<div class="qp-preview__swatch" style="background:${s.hex}" title="${escapeHtml(s.title)}"></div>`).join('');
    syncPreviewTokens();
  }

  /* ---- page selection (Pages tab) --------------------------------------------- */

  function buildPageFields() {
    const tpl = TEMPLATES[draft.template] || TEMPLATES.web;
    pagesListBox.innerHTML = tpl.sections.map(s => `
      <label class="qp-page-row">
        <input type="checkbox" data-page-section="${s.id}" ${draft.excludedSections.includes(s.id) ? '' : 'checked'}>
        <span>${escapeHtml(s.label)}</span>
        <span class="qp-page-row__count">${s.pages.length} page${s.pages.length > 1 ? 's' : ''}</span>
      </label>`).join('');

    pagesListBox.querySelectorAll('[data-page-section]').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.pageSection;
        draft.excludedSections = cb.checked
          ? draft.excludedSections.filter(x => x !== id)
          : [...draft.excludedSections, id];
        syncPreviewPageVisibility();
      });
    });
  }

  /* ---- template switching ---------------------------------------------------- */

  /* Switching templates resets colors/fonts/extras to that template's own
     defaults — the same "start clean, then customize" flow as opening
     the modal fresh. */
  function applyTemplateDefaults(id) {
    const tpl = TEMPLATES[id] || TEMPLATES.web;
    draft.template = tpl.id;
    draft.colors = { ...tpl.colors };
    draft.fonts = {
      brand: makeFontEntry(tpl.fonts.brand, 'brand'),
      technical: makeFontEntry(tpl.fonts.technical, 'technical'),
      editorial: makeFontEntry(tpl.fonts.editorial, 'editorial'),
    };
    draft.extraColors = [];
    draft.extraFonts = [];
    draft.excludedSections = [];
    buildColorFields();
    buildExtraColorFields();
    buildFontFields();
    buildExtraFontFields();
    buildPageFields();
    loadPreviewTemplate(id);
    updatePreview();
  }

  function resetDraft() {
    nameInput.value = '';
    siteSelect.value = '';
    templateSelect.value = 'web';
    applyTemplateDefaults('web');
  }

  function openModal() {
    resetDraft();
    document.querySelectorAll('.qp-tab').forEach(b => b.classList.toggle('is-active', b.dataset.tab === 'style'));
    document.querySelectorAll('.qp-tab-panel').forEach(p => { p.hidden = p.dataset.tabPanel !== 'style'; });
    backdrop.hidden = false;
    requestAnimationFrame(scalePreviewFrame);
    nameInput.focus();
  }
  function closeModal() { backdrop.hidden = true; }

  function createProject() {
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }

    const projects = loadProjects();
    const taken = new Set(projects.map(p => p.slug));
    const slug = uniqueSlug(slugify(name), taken);
    const site = siteSelect.value || null;
    const templateId = TEMPLATES[templateSelect.value] ? templateSelect.value : 'web';
    const tpl = TEMPLATES[templateId];

    const record = {
      id: 'proj_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      slug, name,
      createdAt: Date.now(), updatedAt: Date.now(),
      template: templateId,
      material: site ? { site } : null,
      colors: { ...draft.colors },
      fonts: {
        brand: { ...draft.fonts.brand },
        technical: { ...draft.fonts.technical },
        editorial: { ...draft.fonts.editorial },
      },
      extraColors: draft.extraColors.filter(c => c.name.trim() && c.hex).map(c => ({ name: c.name.trim(), hex: c.hex })),
      extraFonts: draft.extraFonts.filter(f => f.name.trim() && f.font?.name).map(f => ({ name: f.name.trim(), font: { ...f.font } })),
    };

    projects.push(record);
    saveProjects(projects);

    // Excluded sections become panel.js's own pagesDeleted mechanism —
    // page-N ids are assigned by DOM position the first time the document
    // loads (ensurePageIds() in panel.js), which is exactly what
    // computeExcludedPageNumbers() already numbers by.
    const seeded = seedStateForSite(site, templateId);
    const excludedPages = [...computeExcludedPageNumbers()];
    if (excludedPages.length) seeded.pagesDeleted = excludedPages.map(n => 'page-' + n);
    localStorage.setItem(BUILDER_PREFIX + slug, JSON.stringify(seeded));

    location.href = tpl.file + '?project=' + encodeURIComponent(slug);
  }

  document.getElementById('qp-new').onclick = openModal;
  document.getElementById('qp-modal-close').onclick = closeModal;
  document.getElementById('qp-cancel').onclick = closeModal;
  document.getElementById('qp-create').onclick = createProject;
  document.getElementById('qp-color-add').onclick = addExtraColor;
  document.getElementById('qp-font-add').onclick = addExtraFont;
  previewPrevBtn.onclick = () => goToPreviewPage(previewPageIndex - 1);
  previewNextBtn.onclick = () => goToPreviewPage(previewPageIndex + 1);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !backdrop.hidden) closeModal(); });
  nameInput.addEventListener('input', () => updatePreview());
  templateSelect.addEventListener('change', () => applyTemplateDefaults(templateSelect.value));
  window.addEventListener('resize', () => { if (!backdrop.hidden) scalePreviewFrame(); });

  templateOptions();
  siteOptions();
  populateGoogleFontsDatalist();
  buildColorFields();
  buildExtraColorFields();
  buildFontFields();
  buildExtraFontFields();
  buildPageFields();
  loadPreviewTemplate('web');
  updatePreview();
  renderGrid();
})();
