/* ============================================================
   VISUAL BUILDER
   Assigns screenshots to device slots and adjusts them in place.

   Interaction model:
     click a device      -> select it
     drag on its screen  -> pan the image
     wheel on its screen -> zoom the image
     drag a thumbnail    -> drop it on any device to assign
     click a thumbnail   -> assigns to the current selection

   State is keyed by slot id (pN-dM, assigned in document order) and
   persisted to localStorage. Export/Import JSON moves a layout between
   machines, or hands it back for baking into index.html.
   ============================================================ */

(() => {
  // Opened with ?project=<slug> (via projects.html), js/project.js sets
  // window.QO_PROJECT before this runs — namespace this project's storage
  // so its edits never mix with another project's or the base template's.
  // No active project means these are byte-identical to the original keys,
  // so any in-progress work already sitting under them keeps working.
  const PROJECT_ID = window.QO_PROJECT?.slug;
  const STORE = PROJECT_ID ? `qoarc.builder.v1::${PROJECT_ID}` : 'qoarc.builder.v1';
  const SAVES_STORE = PROJECT_ID ? `qoarc.builder.saves.v1::${PROJECT_ID}` : 'qoarc.builder.saves.v1';
  // Uploaded screenshots ("Your uploads" in the Images tab) — kept out of
  // `state` on purpose: `state` is snapshotted on every undo step, and a
  // handful of image data URLs would bloat that history fast. Persisted
  // separately, namespaced per-project the same way, so each project keeps
  // its own uploads as more projects are added.
  const IMAGES_STORE = PROJECT_ID ? `qoarc.builder.images.v1::${PROJECT_ID}` : 'qoarc.builder.images.v1';
  // Typefaces added from the Font picker — uploaded files (stored as data
  // URLs) and Windows-installed families (stored by name only). Out of
  // `state` for the same reason the images are: an embedded .ttf would be
  // copied into every undo snapshot.
  const FONTS_STORE = PROJECT_ID ? `qoarc.builder.fonts.v1::${PROJECT_ID}` : 'qoarc.builder.fonts.v1';

  const VIEWS = [
    ['qo-view--front',    'Front'],
    ['qo-view--left',     'Left'],
    ['qo-view--right',    'Right'],
    ['qo-view--tilt',     'Tilt'],
    ['qo-view--recline',  'Recline'],
    ['qo-view--iso',      'Iso'],
    ['qo-view--3d-left',  '3D Left'],
    ['qo-view--3d-right', '3D Right'],
    ['qo-view--3d-float', '3D Float'],
  ];

  /* Device kinds the "Change mockup" popover can swap between. The third
     column is the empty-slot spec label; the fourth the icon aspect ratio. */
  const KINDS = [
    ['phone',            'Phone',       '393 × 852',   '393/852'],
    ['tablet',           'Tablet',      '820 × 1180',  '820/1180'],
    ['tablet-landscape', 'Tablet wide', '1180 × 820',  '1180/820'],
    ['laptop',           'Laptop',      '1440 × 900',  '16/10'],
    ['desktop',          'Desktop',     '1920 × 1080', '16/9'],
    ['browser',          'Browser',     '—',           '16/10'],
  ];

  const ALL_KINDS = KINDS.map(([k]) => k);

  /* Depth effects — one at a time per device (presets keep the CSS sane). */
  const EFFECTS = [
    ['',                  'None'],
    ['qo-fx-soft',        'Soft shadow'],
    ['qo-fx-deep',        'Deep shadow'],
    ['qo-fx-glow',        'Glow'],
    ['qo-fx-glow-shadow', 'Glow + shadow'],
    ['qo-fx-stroke',      'Stroke'],
    ['qo-fx-reflect',     'Reflection'],
  ];

  const ALL_FX = EFFECTS.map(([c]) => c).filter(Boolean);

  /* Shared color palette for adjustable effects — device Depth glow AND the
     text/block Style popover's glow + stroke both pick from this. RGB
     triples so JS can bake an alpha (from the Strength slider) straight
     into an rgba() string rather than fighting CSS over it. */
  const EFFECT_COLORS = [
    ['teal',  'Teal',  '45,212,191'],
    ['white', 'White', '247,247,249'],
    ['blue',  'Blue',  '110,140,174'],
    ['pink',  'Pink',  '227,184,196'],
  ];

  /* Background wash options for the text/block Style popover. */
  const BG_WASHES = [
    ['teal',  'Teal',  '45,212,191'],
    ['navy',  'Navy',  '15,34,68'],
    ['warm',  'Warm',  '214,163,102'],
    ['frost', 'Frost', '247,247,249'],
  ];

  /* Shadow color palette for the manual shadow behind device mockups. */
  const SHADOW_COLORS = [
    ['black', 'Black', '0,0,0'],
    ['navy',  'Navy',  '15,34,68'],
    ['teal',  'Teal',  '45,212,191'],
    ['warm',  'Warm',  '80,50,20'],
  ];

  /* Ink palette for the text/block colour picker — the design system's own
     text roles first (tokens.css --qo-paper/--qo-slate/--qo-navy), then the
     accents, so the common case is picking a role rather than a hex. */
  const TEXT_COLORS = [
    ['paper', 'Paper', '247,247,249'],
    ['slate', 'Slate', '107,122,148'],
    ['navy',  'Navy',  '15,34,68'],
    ['ink',   'Ink',   '10,24,48'],
    ['teal',  'Teal',  '45,212,191'],
    ['warm',  'Warm',  '214,163,102'],
  ];

  function effectRgb(name) {
    return (EFFECT_COLORS.find(([c]) => c === name) || EFFECT_COLORS[0])[2];
  }
  function washRgb(name) {
    return (BG_WASHES.find(([c]) => c === name) || BG_WASHES[0])[2];
  }
  function shadowRgb(name) {
    return (SHADOW_COLORS.find(([c]) => c === name) || SHADOW_COLORS[0])[2];
  }
  function textRgb(name) {
    return (TEXT_COLORS.find(([c]) => c === name) || TEXT_COLORS[0])[2];
  }

  /* #RGB or #RRGGBB -> "r,g,b", for feeding a typed hex straight into the
     same rgba() strings the preset swatches produce. Returns null for
     anything unparseable so callers can fall back to a preset. */
  function hexToRgbTriple(hex) {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || '').trim());
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = [...h].map(c => c + c).join('');
    const n = parseInt(h, 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }

  /* "r,g,b" -> #rrggbb. The inverse of hexToRgbTriple(), needed because an
     <input type="color"> has no concept of "unset" — handed nothing it reads
     #000000, which looks like a mistake rather than a starting point. Seeding
     it from the palette gives "Custom" something sane to open on. */
  function rgbTripleToHex(rgb) {
    const parts = String(rgb || '').split(',').map(n => parseInt(n, 10));
    if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return '#000000';
    return '#' + parts.map(n => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('');
  }

  /* #RGB shorthand -> #RRGGBB, or null if unparseable. <input type="color">
     only accepts the long form, so a typed "#abc" has to be expanded before
     it can be pushed back into the wheel. */
  function normalizeHex(hex) {
    const triple = hexToRgbTriple(hex);
    return triple ? rgbTripleToHex(triple) : null;
  }

  /* Every adjustable color control (device Depth color, Style popover
     glow/stroke/background) shares this: a preset name resolves through
     the given palette lookup, "custom" resolves through the paired hex
     field instead, with an invalid/empty hex quietly falling back to the
     palette's first entry rather than breaking the effect. */
  function resolveColorRgb(value, hex, paletteFn) {
    if (value === 'custom') return hexToRgbTriple(hex) || paletteFn(null);
    return paletteFn(value);
  }

  /* Shared markup for a swatch row with a trailing "Custom" option and,
     when that's active, a colour wheel + hex field beneath it. The two are
     kept in step by wireColorRow(), so a colour can come from either the
     system picker or a pasted brand hex. `includeNone` prepends a None
     button (used by the background wash and the text ink, neither of which
     has a separate on/off checkbox of its own — unlike glow/stroke/shadow).
     The wheel opens on the current hex, or on the palette's first entry when
     "Custom" has only just been picked — which is also what resolveColorRgb()
     falls back to, so what the swatch shows is what renders. */
  function renderColorRow(list, group, current, hex, includeNone) {
    const isCustom = current === 'custom';
    const seed = normalizeHex(hex) || rgbTripleToHex(list[0][2]);
    const noneBtn = includeNone
      ? `<button data-color="${group}:none" class="${(!current || current === 'none') ? 'qb-on' : ''}">None</button>`
      : '';
    return `
      <div class="qb-pop__seg qb-pop__seg--wrap">
        ${noneBtn}
        ${list.map(([c, label, rgb]) => `
          <button data-color="${group}:${c}" class="${current === c ? 'qb-on' : ''}">
            <span class="qb-pop__chip" style="background:rgb(${rgb});"></span>${label}
          </button>`).join('')}
        <button data-color="${group}:custom" class="${isCustom ? 'qb-on' : ''}">
          <span class="qb-pop__chip ${isCustom && normalizeHex(hex) ? '' : 'qb-pop__chip--custom'}" style="${isCustom && normalizeHex(hex) ? `background:${seed};` : ''}"></span>Custom
        </button>
      </div>
      ${isCustom ? `
        <div class="qb-color-custom">
          <input type="color" data-color-wheel="${group}" value="${seed}" title="Pick any colour">
          <input type="text" class="qb-hex-input" data-hex-for="${group}" placeholder="${seed}" value="${escapeHtml(hex || '')}" maxlength="7">
        </div>` : ''}`;
  }

  /* Wires a row rendered by renderColorRow(): onColor(value) fires for any
     swatch click (including "custom" and "none"); onHex(value) fires as the
     wheel is dragged or the hex field typed into. The commit (and the undo
     step that comes with it) waits for `change`, so sweeping a colour wheel
     doesn't land fifty entries in the history. */
  function wireColorRow(pop, group, onColor, onHex) {
    pop.querySelectorAll(`[data-color^="${group}:"]`).forEach(b => b.onclick = () => {
      onColor(b.dataset.color.split(':')[1]);
    });

    const wheel = pop.querySelector(`[data-color-wheel="${group}"]`);
    const hexInput = pop.querySelector(`[data-hex-for="${group}"]`);

    if (wheel) {
      wheel.addEventListener('input', () => {
        onHex(wheel.value);
        if (hexInput) hexInput.value = wheel.value;
      });
      wheel.addEventListener('change', save);
    }
    if (hexInput) {
      hexInput.addEventListener('input', () => {
        onHex(hexInput.value);
        // Half-typed values ("#2D") still reach onHex — resolveColorRgb falls
        // back on its own — but must not be forced into the wheel, which would
        // silently rewrite them to its own last valid colour.
        const full = normalizeHex(hexInput.value);
        if (wheel && full) wheel.value = full;
      });
      hexInput.addEventListener('change', save);
    }
  }

  /* Body finishes — graphite is the default (no class, matches the
     authored bezel), everything else is a class swap. Chip is the little
     color swatch shown next to each option in the Mockup popover. */
  const FINISHES = [
    ['graphite', 'Graphite', 'linear-gradient(135deg, #2B303A, #0C0E11)'],
    ['silver',   'Silver',   'linear-gradient(135deg, #EEF1F5, #9AA1AC)'],
    ['blue',     'Blue',     'linear-gradient(135deg, #A9C2D9, #4A637C)'],
    ['pink',     'Pink',     'linear-gradient(135deg, #F5DCE3, #C68DA0)'],
  ];

  const ALL_FINISHES = FINISHES.map(([f]) => f).filter(f => f !== 'graphite');

  const BLOCK_SELECTOR = [
    '.qo-principle', '.qo-contents__row', '.qo-spec__row', '.qo-swatch',
    '.qo-space__item', '.qo-space__row', '.qo-elevation__item', '.qo-btn',
    '.qo-card', '.qo-badge', '.qo-editorial', '.qo-type__row',
    '.qo-cover__rule', '.qo-stack__item',
  ].join(', ');

  function kindOf(el) {
    if (el.classList.contains('qo-device--tablet-landscape')) return 'tablet-landscape';
    return ALL_KINDS.find(k => el.classList.contains('qo-device--' + k)) || 'phone';
  }

  /* Swap a device's kind in place: classes, the furniture around the frame
     (laptop base, desktop neck + foot, browser chrome) and the spec label.
     Pure DOM-in / DOM-out so the HTML exporter can reuse it on a clone. */
  function setKind(el, kind) {
    ALL_KINDS.forEach(k => el.classList.remove('qo-device--' + k));
    if (kind === 'tablet-landscape') el.classList.add('qo-device--tablet', 'qo-device--tablet-landscape');
    else el.classList.add('qo-device--' + kind);

    el.querySelectorAll('.qo-device__base, .qo-device__neck, .qo-device__foot, .qo-device__chrome')
      .forEach(n => n.remove());

    const frame = el.querySelector('.qo-device__frame');
    if (frame) {
      if (kind === 'laptop') {
        const base = document.createElement('div');
        base.className = 'qo-device__base';
        frame.after(base);
      }
      if (kind === 'desktop') {
        const neck = document.createElement('div'); neck.className = 'qo-device__neck';
        const foot = document.createElement('div'); foot.className = 'qo-device__foot';
        frame.after(neck); neck.after(foot);
      }
      if (kind === 'browser') {
        const chrome = document.createElement('div');
        chrome.className = 'qo-device__chrome';
        chrome.innerHTML = '<span class="qo-device__dots"><i></i><i></i><i></i></span><span class="qo-device__url"></span>';
        frame.prepend(chrome);
      }
    }

    const screen = el.querySelector('.qo-screen');
    const spec = KINDS.find(([k]) => k === kind)?.[2];
    if (screen && spec) screen.setAttribute('data-spec', spec);
  }

  const FITS = [
    ['cover',     'Cover'],
    ['fit-width', 'Fit width'],
    ['auto',      'Auto'],
  ];

  // The only three typefaces actually loaded (see index.html's Google Fonts
  // link + tokens.css var(--qo-font-*)) — offering anything else would just
  // fall back to the browser default, so the picker stays limited to these.
  const FONTS = [
    ['',           'Default'],
    ['brand',      'Grotesk'],
    ['mono',       'Mono'],
    ['editorial',  'Fraunces'],
  ];

  const ALIGNS = [
    ['left',    '⟵'],
    ['center',  '↔'],
    ['right',   '⟶'],
    ['justify', '≣'],
  ];

  let state = {};
  let baseline = {};       // the layout as authored in index.html
  let textBaseline = {};   // the text content as authored in index.html
  let sel = null;          // selected .qo-device element
  let selText = null;      // selected editable text element
  let selPage = null;      // selected .qo-page element (background click, no device/text hit)
  let slots = [];          // [{ key, el, label, sub }]
  let textSlots = [];      // [{ key, el, tag, label, sub }]
  let blockSlots = [];     // [{ key, el }] — repeatable component wrappers, hover-removable
  let originalPageIds = []; // page ids captured once, before any dynamic pages exist
  let originalBlockIds = []; // block ids the document itself ships with
  let textFilter = '';     // current search string in the text editor tray
  let imgFilter = '';      // current search string in the screenshots library
  let customFonts = [];    // [{ id, label, family, kind: 'file'|'local', src? }]
  let localFamilies = [];  // Windows-installed family names, once queried
  let localFontRowOpen = false; // "Windows fonts" picker showing in the Font field

  /* ---- persistence & history --------------------------------------------- */

  let undoStack = [];
  let redoStack = [];
  let isUndoRedoing = false;

  /* One gesture should be one undo step. A slider drag fires save() on every
     frame and typing fires it on every keystroke, so appending a snapshot per
     call packed the 50-entry history with fragments of a single gesture and
     evicted everything older — undo could only ever step back through the
     last few pixels of a drag, and anything done before that was gone.
     A snapshot continuing the gesture that produced the last one replaces it
     instead of stacking on top: the entry underneath is still the state from
     before the gesture started, which is what undo should return to. */
  const SNAPSHOT_MERGE_MS = 400;
  let lastSnapshotAt = 0;
  let lastSignature = null;
  let prevShadow = {};

  /* Time alone can't say whether two saves belong to the same gesture, and
     assuming they did was a real bug: type into a text element within 400ms
     of nudging a mockup and the text snapshot overwrote the mockup's entry,
     so one Ctrl+Z threw away both. What actually distinguishes a gesture is
     WHICH part of the state it writes to — the same path over and over is a
     drag or a keystroke run; a different path is a new thing to undo. These
     maps are keyed per element, so they get split a level deeper: editing
     two different text elements must not look like one gesture. */
  const NESTED_STATE = new Set(['texts', 'styles', 'offsets', 'pageThemes', 'pageTones', 'pageBackgrounds']);

  function stateShadow() {
    const shadow = {};
    for (const k of Object.keys(state)) {
      const v = state[k];
      if (NESTED_STATE.has(k) && v && typeof v === 'object' && !Array.isArray(v)) {
        for (const k2 of Object.keys(v)) shadow[`${k}.${k2}`] = JSON.stringify(v[k2]);
      } else {
        shadow[k] = JSON.stringify(v);
      }
    }
    return shadow;
  }

  function signatureOf(shadow) {
    const touched = [];
    for (const k of new Set([...Object.keys(prevShadow), ...Object.keys(shadow)])) {
      if (prevShadow[k] !== shadow[k]) touched.push(k);
    }
    return touched.sort().join('|');
  }

  function pushSnapshot() {
    if (isUndoRedoing) return;
    const snap = JSON.stringify(state);
    if (undoStack.length && undoStack[undoStack.length - 1] === snap) return;

    const shadow = stateShadow();
    const signature = signatureOf(shadow);
    const now = Date.now();

    // Never merge into the first entry — that one is the state as opened.
    const continuesGesture = undoStack.length > 1
      && signature === lastSignature
      && now - lastSnapshotAt < SNAPSHOT_MERGE_MS;

    if (continuesGesture) {
      undoStack[undoStack.length - 1] = snap;
    } else {
      undoStack.push(snap);
      if (undoStack.length > 50) undoStack.shift();
      // Only a genuinely new step moves the comparison point forward. A merge
      // keeps it where the gesture started, so every later frame of that same
      // gesture still reports the same signature and keeps merging.
      prevShadow = shadow;
    }
    lastSignature = signature;
    lastSnapshotAt = now;
    redoStack = [];
    updateUndoRedoButtons();
  }

  /* Undo/redo and any full state swap move the comparison point wholesale —
     without this the next edit would be diffed against a state that is no
     longer on screen and land in the wrong history entry. */
  function resyncShadow() {
    prevShadow = stateShadow();
    lastSignature = null;
    lastSnapshotAt = 0;
  }

  function applyOffsets() {
    state.offsets ||= {};
    document.querySelectorAll('[data-text-id], [data-block-id], [data-slot]').forEach(el => {
      const key = elementKey(el);
      const off = key ? state.offsets[key] : null;
      if (off && (off.dx || off.dy)) {
        el.style.translate = `${off.dx || 0}px ${off.dy || 0}px`;
      } else {
        el.style.translate = '';
      }
    });
  }

  function applyLocks() {
    const lockedKeys = new Set(state.locked || []);
    document.querySelectorAll('[data-text-id], [data-block-id], [data-slot]').forEach(el => {
      const key = elementKey(el);
      const isLocked = key && lockedKeys.has(key);
      if (isLocked) {
        el.setAttribute('data-locked', 'true');
        if (el.dataset.editable === 'true') el.setAttribute('contenteditable', 'false');
      } else {
        el.removeAttribute('data-locked');
        if (el.dataset.editable === 'true') el.setAttribute('contenteditable', 'true');
      }
    });
  }

  function undo() {
    if (undoStack.length <= 1) return;
    isUndoRedoing = true;
    // The next edit must start a fresh entry rather than merging into the one
    // being restored here — otherwise an edit made straight after an undo
    // would overwrite it instead of stacking on top.
    redoStack.push(undoStack.pop());
    const prevSnap = undoStack[undoStack.length - 1];
    state = JSON.parse(prevSnap);
    resyncShadow();
    applyAll();
    applyAllText();
    applyBlocks();
    applyStyles();
    applyPageVisibility();
    applyOffsets();
    applyLocks();
    applyFreeImages();
    applyLogos();
    applyPageOrder();
    applyPageThemes();
    applyPageTones();
    applyPageBackgrounds();
    saveStorageOnly();
    renderInspector();
    renderPop();
    buildTextTray();
    updateUndoRedoButtons();
    isUndoRedoing = false;
    status('Undo performed');
  }

  function redo() {
    if (redoStack.length === 0) return;
    isUndoRedoing = true;
    const nextSnap = redoStack.pop();
    undoStack.push(nextSnap);
    state = JSON.parse(nextSnap);
    resyncShadow();
    applyAll();
    applyAllText();
    applyBlocks();
    applyStyles();
    applyPageVisibility();
    applyOffsets();
    applyLocks();
    applyFreeImages();
    applyLogos();
    applyPageOrder();
    applyPageThemes();
    applyPageTones();
    applyPageBackgrounds();
    saveStorageOnly();
    renderInspector();
    renderPop();
    buildTextTray();
    updateUndoRedoButtons();
    isUndoRedoing = false;
    status('Redo performed');
  }

  /* Structural changes (add device, add page) shift positional keys for
     everything after the insertion point. Undo/redo only ever replays
     `state` snapshots — it can't re-run the DOM insertion — so crossing a
     structural boundary would leave stale keys pointing at elements that
     moved. Simplest safe rule: a structural op starts a fresh history
     instead of extending the old one. "Reset all" and per-item Delete
     remain the way back; undo/redo works normally on either side of the
     boundary, just not across it. */
  function resetHistory() {
    undoStack = [JSON.stringify(state)];
    redoStack = [];
    resyncShadow();
    updateUndoRedoButtons();
  }

  function saveStructural() {
    clearTimeout(saveTimer);
    saveStorageOnly();
    resetHistory();
  }

  function updateUndoRedoButtons() {
    document.querySelectorAll('.qb-btn-undo').forEach(btn => {
      btn.disabled = undoStack.length <= 1;
      btn.style.opacity = undoStack.length <= 1 ? '0.4' : '1';
      btn.style.cursor = undoStack.length <= 1 ? 'default' : 'pointer';
    });
    document.querySelectorAll('.qb-btn-redo').forEach(btn => {
      btn.disabled = redoStack.length === 0;
      btn.style.opacity = redoStack.length === 0 ? '0.4' : '1';
      btn.style.cursor = redoStack.length === 0 ? 'default' : 'pointer';
    });
  }

  function togglePdfPreview(enable) {
    if (enable) {
      document.body.classList.remove('qb-open', 'qb-text-open');
      document.body.classList.add('qb-pdf-preview');
      select(null); selectText(null);

      let bar = document.querySelector('.qb-pdf-bar');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'qb-pdf-bar';
        bar.innerHTML = `
          <div class="qb-pdf-bar__title">
            <span>📄 PDF Output Preview</span>
            <span class="qb-pdf-bar__badge">A4 Landscape</span>
          </div>
          <div class="qb-pdf-bar__actions">
            <button class="qb-pdf-bar__btn qb-pdf-bar__btn--primary" data-pdf-act="print">🖨 Print / Save as PDF</button>
            <button class="qb-pdf-bar__btn" data-pdf-act="exit">Exit Preview</button>
          </div>`;
        document.body.appendChild(bar);

        bar.querySelector('[data-pdf-act="print"]').onclick = () => window.print();
        bar.querySelector('[data-pdf-act="exit"]').onclick = () => togglePdfPreview(false);
      }
      status('PDF Preview active');
    } else {
      document.body.classList.remove('qb-pdf-preview');
      document.querySelector('.qb-pdf-bar')?.remove();
      status('Exited PDF Preview');
    }
  }

  const load = () => {
    try { state = JSON.parse(localStorage.getItem(STORE)) || {}; }
    catch { state = {}; }
    pushSnapshot();
  };

  function saveStorageOnly() {
    try {
      localStorage.setItem(STORE, JSON.stringify(state));
      status('Saved');
    } catch (err) {
      status('Save failed — storage full');
    }
  }

  let saveTimer;
  const save = () => {
    pushSnapshot();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveStorageOnly, 250);
  };

  const status = (msg) => {
    const el = document.querySelector('.qb-status');
    if (el) el.textContent = msg;
  };

  /* ---- slot discovery ----------------------------------------------------
     Keys are positional. They stay stable as long as devices aren't
     inserted before existing ones on the same page. */

  function indexSlots() {
    slots = [];
    document.querySelectorAll('.qo-page').forEach((page, pi) => {
      const folio = page.querySelector('.qo-page__num')?.textContent
                 || (pi === 0 ? 'cover' : String(pi + 1));
      page.querySelectorAll('.qo-device').forEach((el, di) => {
        const key = `p${pi + 1}-d${di + 1}`;
        const kind = [...el.classList]
          .find(c => c.startsWith('qo-device--'))?.replace('qo-device--', '') || 'device';
        const label = el.querySelector('.qo-device__label')?.textContent?.trim() || kind;
        el.dataset.slot = key;
        slots.push({ key, el, label, sub: `Page ${folio} · ${kind}` });
      });
    });
  }

  /* ---- text element discovery ------------------------------------------- */

  /* Positional ids (p3-t7) are scoped per page, and moving a page changes
     which index that page answers to — so "one past the highest on this page"
     can name an id another page is already using. Every new id is checked
     against the whole document before it's handed out. */
  function nextFreeId(attr, prefix, from) {
    let n = from;
    let key;
    do { n += 1; key = prefix + n; } while (document.querySelector(`[${attr}="${key}"]`));
    return { key, n };
  }

  /* A paragraph that only breaks its lines with <br> is still plain text:
     innerText round-trips it losslessly (the newlines come back out as <br>
     on assignment), so it can be edited like any leaf. Elements carrying real
     markup children (a, strong, nested spans) stay out — writing innerText
     over those would flatten the markup, and each of those children is its
     own editable candidate anyway. */
  function isLeafText(el) {
    for (const child of el.children) {
      if (child.tagName !== 'BR') return false;
    }
    return true;
  }

  /* ---- palette swatches -------------------------------------------------- */

  /* On the Palette page the hex label under a swatch IS the control: type a
     new code and the chip above it repaints. Nothing extra is persisted —
     the colour is re-derived from the label text, which the text layer
     already saves, so undo/redo/load/export all stay in step for free. */
  const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

  function readColor(raw) {
    const val = (raw || '').trim();
    const m = HEX_RE.exec(val);
    if (m) {
      let h = m[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return '#' + h.toUpperCase();
    }
    // A leading # means a hex code is being typed, so the rule above is the
    // only judge of it. CSS itself would accept "#FF55" as a four-digit code
    // with alpha — and repaint the chip half-transparent on the way to
    // "#FF5533", flashing on nearly every keystroke.
    if (val.startsWith('#')) return null;

    // rgb()/hsl()/named colours are legitimate too — let CSS be the judge
    // rather than growing a parser for each notation.
    if (val && window.CSS?.supports?.('color', val)) return val;
    return null;
  }

  function syncSwatch(el) {
    if (!el || !el.closest) return;
    const swatch = el.closest('.qo-swatch');
    if (!swatch || !el.hasAttribute('data-copy-label')) return;

    // A half-typed code ("#0A18") is not an error, just unfinished — leave the
    // chip on its last good colour instead of flashing to black mid-keystroke.
    const color = readColor(el.innerText);
    if (!color) return;

    const fill = swatch.querySelector('.qo-swatch__fill');
    if (fill) fill.style.background = color;
    swatch.setAttribute('data-copy', color);   // click-to-copy hands out the new value
    swatch.style.setProperty('--qo-swatch-ink', color);   // the hex caption wears its own colour
    syncBlends(swatch.closest('.qo-page'));
    syncPaletteTokens();
  }

  /* The palette page is the document's control surface, not a picture of it.
     The five hexes are the brand colours every token in the system derives
     from, so changing one repaints the buttons, cards, rules, borders and
     type across every page — the Components sheet included.

     The derivation is js/token-derive.js, the same module the project loader
     uses, so a palette typed here and one chosen at project creation produce
     an identical token set rather than two implementations drifting apart. */
  const PALETTE_ROLES = ['deepSpace', 'navy', 'slate', 'paper', 'teal'];

  function syncPaletteTokens() {
    const derive = window.QOTokenDerive;
    const page = document.querySelector('.qo-swatches')?.closest('.qo-page');
    if (!derive || !page) return;

    const colors = {};
    let edited = false;

    [...page.querySelectorAll('.qo-swatch')].slice(0, PALETTE_ROLES.length).forEach((sw, i) => {
      const label = sw.querySelector('[data-copy-label]');
      const c = readColor(label?.innerText);
      // The derivation does hex arithmetic to build hover/active/elevation
      // steps. A named colour or an rgb() would fall through to its default
      // and silently reset that role, so only real hex drives the theme —
      // the chip itself still shows whatever was typed.
      if (!c || !/^#[0-9A-F]{6}$/i.test(c)) return;
      colors[PALETTE_ROLES[i]] = c;

      const authored = readColor(textBaseline[label.dataset.textId]);
      if (!authored || authored.toLowerCase() !== c.toLowerCase()) edited = true;
    });

    const el = document.getElementById('qb-palette-tokens');

    /* Derivation is close to tokens.css but not identical to it — the light
       theme's accent, for one, is hand-tuned there. Regenerating on an
       untouched palette would therefore restyle the document just for having
       opened the builder, so the override only exists once a hex has actually
       been changed from what the file ships. */
    if (!edited || !Object.keys(colors).length) {
      if (el) el.remove();
      return;
    }

    const { root, light } = derive.deriveTokens(colors);
    let style = el;
    if (!style) {
      style = document.createElement('style');
      style.id = 'qb-palette-tokens';
      // Last in <head>, so it wins on cascade order against tokens.css and
      // the project's own block at equal specificity. It rides into an HTML
      // export with the rest of the head.
      document.head.appendChild(style);
    }
    const decl = obj => Object.entries(obj).map(([k, v]) => `${k}: ${v};`).join(' ');
    style.textContent = `:root { ${decl(root)} }\n.qo-page--light { ${decl(light)} }`;
  }

  /* The circles under the palette are pairings, not colours of their own:
     data-blend names two swatches by their position on the page, and the
     gradient is rebuilt from whatever those two hex labels currently say. */
  function syncBlends(page) {
    if (!page) return;
    const blends = page.querySelectorAll('.qo-blend');
    if (!blends.length) return;

    const colors = [...page.querySelectorAll('.qo-swatch')].map(sw =>
      readColor(sw.querySelector('[data-copy-label]')?.innerText) || sw.getAttribute('data-copy') || ''
    );

    blends.forEach(dot => {
      const [a, b] = (dot.dataset.blend || '').split(',').map(n => colors[+n - 1]);
      if (a && b) dot.style.background = `linear-gradient(135deg, ${a}, ${b})`;
    });
  }

  function indexTexts() {
    textSlots = [];

    document.querySelectorAll('.qo-page').forEach((page, pi) => {
      const pageKey = `p${pi + 1}`;
      const pageLabel = page.querySelector('.qo-page__title, .qo-cover__title')?.textContent?.trim().slice(0, 40)
                      || (pi === 0 ? 'Cover' : `Page ${pi + 1}`);

      const candidates = page.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, dt, dd, td, th, label, figcaption, cite, span, a, b, strong, em, small, div, .qo-eyebrow, .qo-badge, .qo-editorial');

      // Find the highest number already in use anywhere on this page —
      // scanned up front across the WHOLE page, not just "so far" during
      // the walk below. A freshly-inserted element (pasted ahead of
      // others, or newly promoted to editable) walks in document order,
      // so if the counter only tracked existing ids it had already passed,
      // a new element could still be handed a number that a later,
      // not-yet-visited existing element already owns — two elements
      // fighting over one key, one of them silently losing its content.
      // "p4-t" is itself a prefix of "p4-tb1", so membership is matched on the
      // whole id — prefix plus digits to the end — not with startsWith, which
      // would file every -tb element under the -t pass as well.
      const idRe = (prefix) => new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d+)$');

      const highestUsed = (prefix) => {
        let max = 0;
        const re = idRe(prefix);
        page.querySelectorAll(`[data-text-id^="${prefix}"]`).forEach(el => {
          const n = +(re.exec(el.dataset.textId)?.[1] || 0);
          if (n > max) max = n;
        });
        return max;
      };

      let ti = highestUsed(`${pageKey}-t`);
      let tbi = highestUsed(`${pageKey}-tb`);
      let tci = highestUsed(`${pageKey}-tc`);

      /* The running header, the running footer and the cover wordmark. These
         carry the client's name and the section label, so they get edited on
         every project — but they're numbered apart from the body text, under
         -tc, for the same reason -tb exists (see below). The header is the
         FIRST thing in a page's markup, so folding it into the -t sequence
         would push every existing id on the page down by two and land saved
         text on the wrong elements.

         The page number is the one piece of chrome that stays locked:
         renumberPages() rewrites it whenever a page is added, deleted or
         moved, so a hand-typed folio would be silently overwritten — and
         worse, state.texts would keep the typed value and fight the
         renumbering on every reload. */
      const CHROME_SEL = '.qo-page__head, .qo-page__foot, .qo-cover__mark';
      const isChrome = el => !!el.closest(CHROME_SEL);

      /* Ids are positional and handed out fresh on every load — the document
         itself stores none — so the ORDER elements are numbered in is part of
         the save format. Paragraphs that use <br> for their line breaks were
         only made editable later; numbering them inline would have inserted a
         new id into the middle of that sequence and shifted every element
         after it on the page, landing saved text and styles on the wrong
         elements. They're numbered in a second pass under their own -tb
         prefix instead, so every id that existed before still resolves. */
      const passes = [
        { pick: el => !isChrome(el) && el.children.length === 0, prefix: `${pageKey}-t`,  next: () => ti,  set: n => { ti = n; } },
        { pick: el => !isChrome(el) && el.children.length > 0,   prefix: `${pageKey}-tb`, next: () => tbi, set: n => { tbi = n; } },
        { pick: el => isChrome(el),                              prefix: `${pageKey}-tc`, next: () => tci, set: n => { tci = n; } },
      ].map(p => ({ ...p, re: idRe(p.prefix) }));

      // The folio is machine-written; make sure it never holds a stale id from
      // a build where the chrome was locked wholesale.
      page.querySelectorAll('.qo-page__num').forEach(el => {
        el.removeAttribute('data-text-id');
        el.removeAttribute('data-editable');
        el.removeAttribute('contenteditable');
      });

      passes.forEach(pass => candidates.forEach((el) => {
        if (el.closest('.qo-device__frame, .qb-drawer, .qb-pop, .qb-navbar, code, pre')) return;
        if (el.classList.contains('qo-page__num')) return;

        // CRITICAL FIX: Only target LEAF elements (<br> aside).
        // Container divs/rows like .qo-contents__row have child elements.
        // Applying innerText or contenteditable to a container destroys its child layout!
        if (!isLeafText(el)) return;

        // Each element belongs to exactly one pass, decided by the same test
        // that split them: no children at all, or <br>-only children.
        if (el.dataset.textId ? !pass.re.test(el.dataset.textId) : !pass.pick(el)) return;

        const textVal = el.innerText ? el.innerText.trim() : '';
        if (!textVal) return;

        if (el.querySelector('h1, h2, h3, h4, h5, h6, p') && !['H1','H2','H3','H4','H5','H6','P'].includes(el.tagName)) return;

        if (!el.dataset.textId) {
          const next = nextFreeId('data-text-id', pass.prefix, pass.next());
          pass.set(next.n);
          el.dataset.textId = next.key;
          el.dataset.editable = 'true';
          // Inline elements (span, a, em…) ignore an explicit width unless
          // switched to inline-block — remember which ones need that so a
          // persisted resize width can be re-applied after reload/undo.
          el.dataset.qbInlineText = getComputedStyle(el).display === 'inline' ? 'true' : 'false';
          if (!isElementLocked(el)) {
            el.setAttribute('contenteditable', 'true');
          }
        }

        // Wiring is tracked separately from id assignment: a block recreated
        // from storage arrives with its id already baked into the markup, so
        // keying the listeners off "has no id yet" would leave it editable on
        // screen but silent — typing in it would never reach state.texts.
        if (!el.dataset.qbWired) {
          const key = el.dataset.textId;
          el.dataset.qbWired = 'true';

          if (textBaseline[key] === undefined) {
            textBaseline[key] = textVal;
          }

          el.addEventListener('input', () => {
            state.texts ||= {};
            state.texts[key] = el.innerText;
            syncSwatch(el);
            save();
            if (selText === el) {
              const txtarea = document.querySelector('.qb-text-input');
              if (txtarea && txtarea !== document.activeElement) {
                txtarea.value = el.innerText;
              }
            }
          });

          el.addEventListener('focus', () => {
            if (selText !== el) selectText(el);
          });
        }

        const key = el.dataset.textId;
        const tag = el.tagName.toLowerCase();
        const preview = textVal.length > 28 ? textVal.slice(0, 28) + '…' : (textVal || tag);
        textSlots.push({
          key,
          el,
          tag,
          pageKey,
          pageLabel,
          label: `${tag.toUpperCase()} — "${preview}"`,
          sub: `${pageLabel} · Text element`
        });
      }));
    });
  }

  function applyText(key) {
    const slot = textSlots.find(s => s.key === key);
    if (!slot) return;

    if (isLeafText(slot.el)) {
      // Falls back to the authored baseline when the current state has no
      // edit for this key — without this, "Reset all" and Load never
      // actually restored text, only ever left whatever was already on
      // screen (state.texts is edits-only; textBaseline holds the original).
      const val = state.texts?.[key] !== undefined ? state.texts[key] : textBaseline[key];
      if (val !== undefined) {
        slot.el.innerText = val;
      }
      syncSwatch(slot.el);
    }
    slot.el.style.display = (state.removedTexts || []).includes(key) ? 'none' : '';
  }

  const applyAllText = () => textSlots.forEach(s => applyText(s.key));

  /* Structural removal of a text block — distinct from "Reset text" (which
     restores content) and from state.texts (which holds edited content).
     Tracked as a flat list of keys so it survives undo/redo/import/load the
     same way everything else in `state` does. */
  function removeTextBlock(key) {
    state.removedTexts = [...new Set([...(state.removedTexts || []), key])];
    applyText(key);
    save();
    buildTextTray();
    if (selText?.dataset.textId === key) selectText(null);
  }

  function restoreTextBlock(key) {
    state.removedTexts = (state.removedTexts || []).filter(k => k !== key);
    applyText(key);
    save();
    buildTextTray();
  }

  /* ---- component block discovery ------------------------------------------
     Repeatable wrappers (principle items, contents rows, spec rows,
     swatches) — one step up from individual text nodes. Positional keys
     (pN-bM), same convention as devices/text, own removal state so it
     doesn't collide with either. */

  function indexBlocks() {
    blockSlots = [];
    document.querySelectorAll('.qo-page').forEach((page, pi) => {
      const pageKey = `p${pi + 1}`;

      // Existing blocks keep their key instead of being renumbered by
      // position on every call — this used to be harmless because blocks
      // were only ever hidden in place (display:none), never actually
      // inserted, so a full re-scan always found the same elements in the
      // same order. Paste changes that: a block dropped in ahead of others
      // would otherwise shift every later block's key and detach it from
      // its own state.styles/removedBlocks entry. The max is scanned
      // across the WHOLE page up front (see indexTexts() for why a
      // scan-as-you-go counter isn't enough) so a new block can't be
      // handed a number a later, not-yet-visited block already owns.
      let bi = 0;
      page.querySelectorAll(`[data-block-id^="${pageKey}-b"]`).forEach(el => {
        const n = +(/-b(\d+)$/.exec(el.dataset.blockId)?.[1] || 0);
        if (n > bi) bi = n;
      });

      page.querySelectorAll('[data-block-id]').forEach(el => {
        if (!el.matches(BLOCK_SELECTOR)) el.removeAttribute('data-block-id');
      });

      page.querySelectorAll(BLOCK_SELECTOR).forEach((el) => {
        if (el.closest('.qo-device__frame, .qb-drawer, .qb-pop')) return;
        if (!el.dataset.blockId) {
          const next = nextFreeId('data-block-id', `${pageKey}-b`, bi);
          bi = next.n;
          el.dataset.blockId = next.key;
        }
        blockSlots.push({ key: el.dataset.blockId, el });
      });
    });
  }

  function applyBlocks() {
    blockSlots.forEach(({ key, el }) => {
      el.style.display = (state.removedBlocks || []).includes(key) ? 'none' : '';
    });
  }

  function removeBlock(key) {
    state.removedBlocks = [...new Set([...(state.removedBlocks || []), key])];
    applyBlocks();
    save();
    hideBlockTools();
  }

  /* ---- text/block style effects ---------------------------------------------
     Glow, stroke, shadow and a gradient background — the non-device
     equivalent of device Depth, but independently combinable (any mix of
     the four at once) rather than one preset at a time. Keyed by whatever
     identity the target already has (text id or block id), stored apart
     from removedTexts/removedBlocks so removing something and styling it
     are unrelated operations. text-shadow and -webkit-text-stroke inherit
     to nested text, so styling a wrapper block colors its contents too. */

  function styleKeyOf(el) {
    return el?.dataset.textId || el?.dataset.blockId || null;
  }

  function styleStateOf(key) {
    state.styles ||= {};
    return state.styles[key] || (state.styles[key] = {});
  }

  function computeStyleVars(st) {
    const vars = {};
    const classes = [];

    if (st.glow) {
      classes.push('qo-style-glow');
      const rgb = resolveColorRgb(st.glowColor || 'teal', st.glowColorHex, effectRgb);
      const strength = (st.glowIntensity ?? 100) / 100;
      vars['--qo-style-glow-blur'] = (8 * strength).toFixed(1) + 'px';
      vars['--qo-style-glow-color'] = `rgba(${rgb}, ${Math.min(0.9, 0.65 * strength).toFixed(2)})`;
      vars['--qo-style-glow-color-soft'] = `rgba(${rgb}, ${Math.min(0.6, 0.32 * strength).toFixed(2)})`;
    }
    if (st.stroke) {
      classes.push('qo-style-stroke');
      const rgb = resolveColorRgb(st.strokeColor || 'teal', st.strokeColorHex, effectRgb);
      const w = (st.strokeWidth ?? 100) / 100;
      vars['--qo-style-stroke-w'] = (0.6 * w).toFixed(2) + 'px';
      vars['--qo-style-stroke-color'] = `rgba(${rgb}, 0.85)`;
    }
    if (st.shadow) {
      classes.push('qo-style-shadow');
      const strength = (st.shadowIntensity ?? 100) / 100;
      vars['--qo-style-shadow-dist'] = (4 * strength).toFixed(1) + 'px';
      vars['--qo-style-shadow-blur'] = (8 * strength).toFixed(1) + 'px';
      vars['--qo-style-shadow-color'] = `rgba(0, 0, 0, ${Math.min(0.85, 0.4 * strength).toFixed(2)})`;
    }
    if (st.bg && st.bg !== 'none') {
      classes.push('qo-style-bg');
      const rgb = resolveColorRgb(st.bg, st.bgHex, washRgb);
      const strength = (st.bgIntensity ?? 100) / 100;
      vars['--qo-style-bg-grad'] =
        `linear-gradient(135deg, rgba(${rgb}, ${Math.min(0.5, 0.18 * strength).toFixed(2)}), rgba(${rgb}, ${Math.min(0.2, 0.04 * strength).toFixed(2)}))`;
    }

    return { classes, vars };
  }

  const ALL_STYLE_CLASSES = ['qo-style-glow', 'qo-style-stroke', 'qo-style-shadow', 'qo-style-bg'];
  const ALL_STYLE_VARS = [
    '--qo-style-glow-blur', '--qo-style-glow-color', '--qo-style-glow-color-soft',
    '--qo-style-stroke-w', '--qo-style-stroke-color',
    '--qo-style-shadow-dist', '--qo-style-shadow-blur', '--qo-style-shadow-color',
    '--qo-style-bg-grad',
  ];

  function applyStyleTo(el, key) {
    const st = state.styles?.[key];
    ALL_STYLE_CLASSES.forEach(c => el.classList.remove(c));
    ALL_STYLE_VARS.forEach(v => el.style.removeProperty(v));

    // Manually-resized width (drag-to-resize on the text block's edge).
    // Inline elements need inline-block for width to take effect at all;
    // only flip that on elements that were natively inline, so block-level
    // text (h1-h6, p, li…) isn't put into a different flow than authored.
    if (el.dataset.qbInlineText === 'true') {
      el.style.display = st?.width ? 'inline-block' : '';
    }
    if (st?.width) {
      el.style.width = st.width + 'px';
      el.style.marginLeft = st.marginLeft ? st.marginLeft + 'px' : '';
      el.style.maxWidth = 'none'; // override any authored measure cap (e.g. cover titles' max-width: 16ch)
    } else {
      el.style.width = '';
      el.style.marginLeft = '';
      el.style.maxWidth = '';
    }

    // Typography overrides from the Edit Text tray's font controls. A stock
    // family rides the same tokens the rest of the system uses
    // (var(--qo-font-*)) so it always matches what's actually loaded; an
    // uploaded or Windows font resolves through the custom-font registry.
    el.style.fontFamily = fontCssFor(st?.fontFamily);
    el.style.fontWeight = st?.bold === undefined ? '' : (st.bold ? '700' : '400');
    el.style.fontStyle = st?.italic === undefined ? '' : (st.italic ? 'italic' : 'normal');
    el.style.textDecoration = st?.underline ? 'underline' : '';
    el.style.fontSize = st?.fontSize ? st.fontSize + 'pt' : '';
    el.style.textAlign = st?.align || '';

    // Ink colour. No entry means "inherit", i.e. leave the page's own theme
    // tokens in charge — which is why the picker's None button deletes the
    // key rather than writing a colour of its own. On a wrapper block this
    // cascades to the text inside it, the same way glow and stroke do.
    el.style.color = st?.color && st.color !== 'none'
      ? `rgb(${resolveColorRgb(st.color, st.colorHex, textRgb)})`
      : '';

    if (!st) return;
    const { classes, vars } = computeStyleVars(st);
    classes.forEach(c => el.classList.add(c));
    Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
  }

  function applyStyles() {
    textSlots.forEach(({ key, el }) => applyStyleTo(el, key));
    blockSlots.forEach(({ key, el }) => applyStyleTo(el, key));
  }

  /* ---- baseline -----------------------------------------------------------
     Read what index.html actually ships before touching anything. Without
     this, a first run with empty storage would treat every slot as "no
     image" and strip the authored screenshots off the page. It also gives
     "Reset all" something meaningful to restore to. */

  function readDOM() {
    const snap = {};
    slots.forEach(({ key, el }) => {
      const screen = el.querySelector('.qo-screen');
      const img = screen?.querySelector('img');
      const s = {};
      if (img) s.src = img.getAttribute('src');
      s.fit = screen?.classList.contains('qo-screen--fit-width') ? 'fit-width'
            : screen?.classList.contains('qo-screen--auto') ? 'auto'
            : 'cover';
      const view = VIEWS.find(([c]) => el.classList.contains(c));
      if (view) s.view = view[0];
      s.kind = kindOf(el);
      const finishCls = ALL_FINISHES.find(f => el.classList.contains('qo-device--' + f));
      if (finishCls) s.finish = finishCls;
      const fx = ALL_FX.find(c => el.classList.contains(c));
      if (fx) s.fx = fx;
      const w = parseFloat(el.style.width);
      if (w) s.w = w;
      snap[key] = s;
    });
    return snap;
  }

  /* ---- applying state to the DOM ------------------------------------------ */

  function slotState(key) {
    return state[key] || (state[key] = {});
  }

  function apply(key) {
    const slot = slots.find(s => s.key === key);
    if (!slot) return;
    const el = slot.el;
    const s = state[key] || {};
    const screen = el.querySelector('.qo-screen');
    const frame = el.querySelector('.qo-device__frame');
    if (!screen) return;

    // deleted — hide the whole device, restore on reset/undo
    el.style.display = s.deleted ? 'none' : '';

    // device kind
    if (s.kind && s.kind !== kindOf(el)) setKind(el, s.kind);

    // finish
    ALL_FINISHES.forEach(f => el.classList.remove('qo-device--' + f));
    if (s.finish && ALL_FINISHES.includes(s.finish)) el.classList.add('qo-device--' + s.finish);

    // depth effect — Color + Strength are baked into rgba()/scale custom
    // properties the CSS reads with a fallback, so a device that never
    // touched those controls still renders the original fixed look.
    ALL_FX.forEach(c => el.classList.remove(c));
    if (s.fx) {
      el.classList.add(s.fx);
      const rgb = resolveColorRgb(s.fxColor || 'teal', s.fxColorHex, effectRgb);
      const strength = (s.fxIntensity ?? 100) / 100;
      el.style.setProperty('--qo-fx-glow', `rgba(${rgb}, ${Math.min(0.95, 0.5 * strength).toFixed(2)})`);
      el.style.setProperty('--qo-fx-shadow', `rgba(0, 0, 0, ${Math.min(0.95, 0.45 * strength).toFixed(2)})`);
      el.style.setProperty('--qo-fx-stroke', `rgba(${rgb}, ${Math.min(0.95, 0.85 * strength).toFixed(2)})`);
      el.style.setProperty('--qo-fx-scale', strength.toFixed(2));
    } else {
      el.style.removeProperty('--qo-fx-glow');
      el.style.removeProperty('--qo-fx-shadow');
      el.style.removeProperty('--qo-fx-stroke');
      el.style.removeProperty('--qo-fx-scale');
    }

    // 3D backdrop shadow — only visible on qo-view--3d-*, but harmless to
    // set regardless of angle. Untouched (100%) matches the original fixed
    // look via the CSS fallback, so this only kicks in once adjusted.
    const shadow3d = (s.shadow3dIntensity ?? 100) / 100;
    if (shadow3d !== 1) {
      el.style.setProperty('--qo-3d-shadow', `rgba(0, 0, 0, ${Math.min(0.95, 0.8 * shadow3d).toFixed(2)})`);
      el.style.setProperty('--qo-3d-shadow-scale', shadow3d.toFixed(2));
    } else {
      el.style.removeProperty('--qo-3d-shadow');
      el.style.removeProperty('--qo-3d-shadow-scale');
    }

    // Manual shadow — independent ::after ellipse behind the device.
    const sh = s.shadow || {};
    if (sh.on) {
      el.classList.add('qo-manual-shadow');
      const rgb = resolveColorRgb(sh.color || 'black', sh.colorHex, shadowRgb);
      el.style.setProperty('--qo-ms-x', (sh.x ?? 0) + 'mm');
      el.style.setProperty('--qo-ms-y', (sh.y ?? 8) + 'mm');
      el.style.setProperty('--qo-ms-blur', (sh.blur ?? 20) + 'mm');
      el.style.setProperty('--qo-ms-spread', (sh.spread ?? 0) + 'mm');
      el.style.setProperty('--qo-ms-opacity', ((sh.opacity ?? 50) / 100).toFixed(2));
      el.style.setProperty('--qo-ms-sx', ((sh.sx ?? 100) / 100).toFixed(2));
      el.style.setProperty('--qo-ms-sy', ((sh.sy ?? 40) / 100).toFixed(2));
      el.style.setProperty('--qo-ms-color', rgb);
    } else {
      el.classList.remove('qo-manual-shadow');
      ['--qo-ms-x','--qo-ms-y','--qo-ms-blur','--qo-ms-spread','--qo-ms-opacity','--qo-ms-sx','--qo-ms-sy','--qo-ms-color'].forEach(p => el.style.removeProperty(p));
    }

    // device offset (moves the whole assembly, not the image)
    if (s.dx || s.dy) el.style.translate = `${s.dx || 0}px ${s.dy || 0}px`;
    else el.style.translate = '';

    // image
    let img = screen.querySelector('img');
    if (s.src) {
      if (!img) { img = document.createElement('img'); img.alt = ''; screen.appendChild(img); }
      if (img.getAttribute('src') !== s.src) img.setAttribute('src', s.src);
    } else if (img) {
      img.remove();
    }

    // fit mode
    screen.classList.remove('qo-screen--fit-width', 'qo-screen--auto');
    if (s.fit === 'fit-width') screen.classList.add('qo-screen--fit-width');
    if (s.fit === 'auto') screen.classList.add('qo-screen--auto');

    // angle
    if (s.view) {
      VIEWS.forEach(([cls]) => el.classList.remove(cls));
      el.classList.add(s.view);
    }

    // width
    if (s.w) el.style.width = s.w + 'mm';

    // pan / zoom
    if (img) {
      img.style.setProperty('--sx', (s.x || 0) + 'px');
      img.style.setProperty('--sy', (s.y || 0) + 'px');
      img.style.setProperty('--sz', zoomOf(s));
    }
    if (frame) frame.dataset.hasImg = s.src ? '1' : '';
  }

  const applyAll = () => slots.forEach(s => apply(s.key));

  /* ---- pan clamping ---------------------------------------------------------
     Keep the nudge inside the image's real slack so panning can never open a
     gap of empty screen.

     Cover slots pan the crop itself (object-position), so the slack is how
     much of the SCALED image overhangs the frame: cover factor c =
     max(sw/nw, sh/nh), rendered size (nw·c, nh·c). Zooming (transform scale
     about center) hides an extra (1−1/z)/2 of the frame per edge, which
     widens the range.

     Fit-width/auto slots translate the element box instead, so the slack is
     the box overflow. Runs on every interactive change, never on load —
     before the image has decoded, its dimensions aren't trustworthy and
     clamping then would wipe a saved pan. */

  /* ---- Zoom range ----------------------------------------------------------
     Zoom is a transform: scale() on the artwork itself. Scale it under 1 and
     the image shrinks *inside* its frame, uncovering the screen's placeholder
     fill behind it — which reads as a dark border drawn around the shot. A
     cover-fit image already fills the frame exactly at 1, so there is nothing
     for zooming out to reveal except that background: 1 is the floor the
     geometry imposes, not a preference.

     Enforced on read as well as on write, so a slot saved by an earlier build
     at 0.5 heals itself the next time it renders instead of keeping the
     border until someone touches the slider. */
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;
  const zoomOf = s => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s?.z || 1));

  function clampPan(key) {
    const el = slots.find(s => s.key === key)?.el;
    const s = state[key];
    if (!el || !s) return;
    const screen = el.querySelector('.qo-screen');
    const img = screen?.querySelector('img');
    if (!img || !img.complete || !img.naturalWidth) return;

    const z = zoomOf(s);
    const sw = screen.clientWidth, sh = screen.clientHeight;
    const fit = s.fit || 'cover';

    const ax = (sw / 2) * (1 - 1 / z);     // frame margin hidden by zoom
    const ay = (sh / 2) * (1 - 1 / z);

    if (fit === 'auto') {
      // element box holds the whole image; pan translates the box
      const iw = img.offsetWidth * z, ih = img.offsetHeight * z;

      const maxX = Math.max(0, (iw - sw) / 2);
      s.x = Math.min(maxX, Math.max(-maxX, s.x || 0));

      const minY = Math.min(0, sh - ih);   // top pinned; slack hangs below
      s.y = Math.min(0, Math.max(minY, s.y || 0));
      return;
    }

    // cover and fit-width both crop horizontally — X pans the crop.
    // (For a tall shot in fit-width, rw === sw, so X correctly locks.)
    const c = Math.max(sw / img.naturalWidth, sh / img.naturalHeight);
    const rw = img.naturalWidth * c, rh = img.naturalHeight * c;

    const maxX = Math.max(0, (rw - sw) / 2 + ax);
    s.x = Math.min(maxX, Math.max(-maxX, s.x || 0));

    if (fit === 'cover') {
      // Y pans the crop too (element box = frame)
      const maxY = Math.max(0, ay);
      const minY = Math.min(0, sh - rh - ay);
      s.y = Math.min(maxY, Math.max(minY, s.y || 0));
    } else {
      // fit-width: Y translates the element box (tall shots overflow below)
      const ih = img.offsetHeight * z;
      const minY = Math.min(0, sh - ih);
      s.y = Math.min(0, Math.max(minY, s.y || 0));
    }
  }

  /* ---- adding a device --------------------------------------------------------
     Inserts a fresh phone mockup right after the given device. Slot keys are
     positional, so inserting shifts every later key on the page — the state
     and baseline maps are re-keyed by element identity so nothing loses its
     saved edits. The new device's baseline is `deleted`, so "Reset all"
     restores the document as shipped (added mockups disappear). */

  function addDevice(afterEl) {
    const ref = afterEl || slots[slots.length - 1]?.el;
    if (!ref) { status('Nothing to add next to'); return; }

    const oldKeys = new Map(slots.map(({ key, el }) => [el, key]));

    const dev = document.createElement('div');
    dev.className = 'qo-device qo-device--phone qo-view--front';
    dev.innerHTML = '<div class="qo-device__frame"><div class="qo-screen" data-spec="393 × 852"></div></div>';
    ref.after(dev);

    indexSlots();

    // Only device slot keys shift here — text and block ids are stamped onto
    // their elements and kept, so everything else in `state` (styles, removed
    // text/blocks, placed images, added pages, view toggles) carries straight
    // over. Starting from a copy rather than an empty object is what keeps it
    // that way: rebuilding `state` from a whitelist silently dropped every
    // key the list forgot, so adding a mockup used to discard the rest of the
    // document's edits.
    const next = { ...state }, nextBase = {}, keyMap = {};
    [...oldKeys.values()].forEach(k => delete next[k]);

    let newKey = null;
    slots.forEach(({ key, el }) => {
      const old = oldKeys.get(el);
      if (old !== undefined) {
        keyMap[old] = key;
        if (state[old]) next[key] = state[old];
        if (baseline[old]) nextBase[key] = baseline[old];
      } else {
        newKey = key;
        next[key] = { kind: 'phone', view: 'qo-view--front', fit: 'cover', w: 32 };
        nextBase[key] = { deleted: true };
      }
    });

    // remember added devices (re-keyed along with everything else) so a
    // reload can re-create them before the stored layout is applied
    next.added = (state.added || []).map(k => keyMap[k] || k);
    if (newKey) next.added.push(newKey);

    // Move & Position offsets and locks are filed under whatever identity the
    // element has — a device's is its slot key, so those need the same re-key.
    if (next.offsets) {
      next.offsets = Object.fromEntries(
        Object.entries(next.offsets).map(([k, v]) => [keyMap[k] || k, v]));
    }
    if (next.locked) next.locked = next.locked.map(k => keyMap[k] || k);

    state = next;
    baseline = nextBase;

    applyAll();
    saveStructural();
    select(dev, true);
    status('Mockup added');
  }

  /* Re-create devices added in a previous session. Runs at init, after the
     stored state is loaded but before the baseline snapshot — the stored
     slot keys were saved against a DOM that included these devices, so they
     must exist again before anything is keyed. Ascending order re-plays the
     inserts exactly as they happened. */
  function recreateAdded() {
    const added = (state.added || []).slice().sort((a, b) => {
      const [, ap, ad] = a.match(/^p(\d+)-d(\d+)$/) || [];
      const [, bp, bd] = b.match(/^p(\d+)-d(\d+)$/) || [];
      return (+ap - +bp) || (+ad - +bd);
    });
    if (!added.length) return;

    added.forEach(key => {
      const m = key.match(/^p(\d+)-d(\d+)$/);
      if (!m) return;
      const page = document.querySelectorAll('.qo-page')[+m[1] - 1];
      const ref = page?.querySelectorAll('.qo-device')[+m[2] - 2];
      if (!ref) return;
      const dev = document.createElement('div');
      dev.className = 'qo-device qo-device--phone qo-view--front';
      dev.innerHTML = '<div class="qo-device__frame"><div class="qo-screen" data-spec="393 × 852"></div></div>';
      ref.after(dev);
    });
    indexSlots();
  }

  /* ---- pages ------------------------------------------------------------------
     A page is a `.qo-page` section, identified by a stable `data-page-id`
     (assigned once, never reused). Deleting one never removes it from the
     DOM — it's hidden, exactly like device delete — so no positional key
     (pN-dM, pN-tM) ever shifts and nothing needs remapping. Adding one DOES
     shift every later page's keys, so it gets the same identity-based remap
     addDevice() uses, one level up. */

  function ensurePageIds() {
    document.querySelectorAll('.qo-page').forEach((p, i) => {
      if (!p.dataset.pageId) p.dataset.pageId = 'page-' + (i + 1);
    });
    // Only ever recorded once, at the very first call — by then the DOM
    // holds exactly the pages index.html shipped, before any are recreated.
    if (!originalPageIds.length) {
      originalPageIds = [...document.querySelectorAll('.qo-page')].map(p => p.dataset.pageId);
    }
  }

  function renumberPages() {
    let n = 0;
    document.querySelectorAll('.qo-page').forEach(p => {
      if (p.style.display === 'none') return;
      n++;
      const numEl = p.querySelector('.qo-page__num');
      if (numEl) numEl.textContent = String(n).padStart(2, '0');
    });
  }

  function applyPageVisibility() {
    const deleted = state.pagesDeleted || [];
    document.querySelectorAll('.qo-page').forEach(p => {
      p.style.display = deleted.includes(p.dataset.pageId) ? 'none' : '';
    });
    renumberPages();
  }

  /* ---- page order ---------------------------------------------------------
     Sheets are reorderable, so the document's running order lives in state
     rather than in the markup: a list of page ids, replayed onto the DOM at
     load. Device slot keys are positional (pN-dM) and therefore shift when a
     page moves — applyPageOrder() runs before indexSlots() so keys are always
     derived from the order the state was saved against. */

  const capturePageOrder = () =>
    [...document.querySelectorAll('.qo-page')].map(p => p.dataset.pageId);

  function applyPageOrder() {
    // No stored order means "as the template ships" — which after a Reset All
    // is a real instruction, not a no-op: the sheets on screen are still in
    // whatever order the discarded state left them in.
    const order = state.pageOrder?.length ? state.pageOrder : originalPageIds;
    if (!order?.length) return;
    const byId = new Map([...document.querySelectorAll('.qo-page')].map(p => [p.dataset.pageId, p]));
    const first = document.querySelector('.qo-page');
    let anchor = null;
    order.forEach(id => {
      const page = byId.get(id);
      if (!page) return;                       // a page this state never knew
      if (anchor) anchor.after(page);
      else if (page !== first) first.before(page);
      anchor = page;
    });
  }

  /* Moves the selected sheet one place earlier or later. Slot keys shift for
     every device on both sheets, so state is re-keyed by element identity —
     the same remap addDevice() and addPage() do, one level up. */
  function movePage(pageEl, dir) {
    if (!pageEl) return;
    const pages = [...document.querySelectorAll('.qo-page')].filter(p => p.style.display !== 'none');
    const target = pages[pages.indexOf(pageEl) + dir];
    if (!target) { status(dir < 0 ? 'Already the first page' : 'Already the last page'); return; }

    const oldKeys = new Map(slots.map(({ key, el }) => [el, key]));
    if (dir < 0) target.before(pageEl); else target.after(pageEl);
    indexSlots();

    const next = { ...state }, nextBase = {}, keyMap = {};
    [...oldKeys.values()].forEach(k => delete next[k]);
    slots.forEach(({ key, el }) => {
      const old = oldKeys.get(el);
      if (old === undefined) return;
      keyMap[old] = key;
      if (state[old]) next[key] = state[old];
      if (baseline[old]) nextBase[key] = baseline[old];
    });
    next.added = (state.added || []).map(k => keyMap[k] || k);
    if (next.offsets) {
      next.offsets = Object.fromEntries(
        Object.entries(next.offsets).map(([k, v]) => [keyMap[k] || k, v]));
    }
    if (next.locked) next.locked = next.locked.map(k => keyMap[k] || k);

    state = next;
    baseline = nextBase;
    state.pageOrder = capturePageOrder();

    renumberPages();
    applyAll();
    saveStructural();
    selectPage(pageEl, true);
    renderPop();
    status(dir < 0 ? 'Page moved earlier' : 'Page moved later');
  }

  /* ---- per-page theme -----------------------------------------------------
     Light and dark are one class apart: .qo-page--light repoints the semantic
     tokens (surface, text, accent, border, elevation) that every component
     reads, so flipping a sheet re-contrasts its whole contents rather than
     just its background. The authored value is captured once so a page can be
     put back the way the template shipped it. */

  let pageThemeBaseline = {};

  /* ---- page backgrounds ---------------------------------------------------
     Treatments for a single sheet, defined in css/backgrounds.css and applied
     as one class. "As authored" adds nothing, which is what leaves the cover
     with its own gradient. Grouped for the popover so related looks sit
     together instead of reading as a wall of twelve buttons. */
  const PAGE_BGS = [
    ['Plain', [
      ['',          'None',      'As the template ships it'],
      ['tint',      'Tint',      'One flat wash of the accent'],
      ['frame',     'Frame',     'Hairline inset frame'],
    ]],
    ['Lighting', [
      ['aurora',    'Aurora',    'Blooms from both top corners'],
      ['spotlight', 'Spotlight', 'One soft source, centred above'],
      ['halo',      'Halo',      'Corner glow bleeding off the edge'],
      ['dusk',      'Dusk',      'Glow rising from the bottom'],
      ['bloom',     'Bloom',     'Light pooling in the middle'],
      ['mesh',      'Mesh',      'Four overlapping blooms'],
      ['sweep',     'Sweep',     'Diagonal wash, corner to corner'],
      ['vignette',  'Vignette',  'Edges settle, centre stays clear'],
      ['frost',     'Frost',     'Soft diagonal sheen over a tint'],
    ]],
    ['Shape', [
      ['panel',     'Panel',     'Raised block down the outer third'],
      ['split',     'Split',     'Hard duotone across the middle'],
      ['band',      'Band',      'Masthead band across the top third'],
      ['arc',       'Arc',       'One oversized disc off the corner'],
      ['corner',    'Corner',    'Triangular wedge, top-left'],
      ['edge',      'Edge',      'Accent rule on the binding edge'],
    ]],
    ['Texture', [
      ['grid',      'Grid',      'Drafting grid on the 10mm rhythm'],
      ['dots',      'Dots',      'Fine dot field'],
      ['beams',     'Beams',     'Raking light through a blind'],
      ['stripe',    'Stripe',    'Wide, low-contrast vertical stripes'],
      ['orbit',     'Orbit',     'Concentric rings from the top-left'],
      ['contour',   'Contour',   'Topographic contours off the corner'],
    ]],
    // Tints rather than added light — these are the ones that actually read
    // on paper, and they resolve on a dark sheet too.
    ['For paper', [
      ['paper',     'Paper',     'Warm stock with a suggestion of grain'],
      ['sunrise',   'Sunrise',   'Warm corner meeting a cool one'],
      ['duotone',   'Duotone',   'Two tints in a soft diagonal'],
      ['blueprint', 'Blueprint', 'Engineering grid, every fifth line heavier'],
      ['ruled',     'Ruled',     'Writing paper with an accent margin'],
    ]],
  ];

  const ALL_PAGE_BGS = PAGE_BGS.flatMap(([, items]) => items);

  const ALL_BG_CLASSES = ALL_PAGE_BGS.map(([v]) => v).filter(Boolean).map(v => 'qo-bg--' + v);

  const pageBg = pageEl => state.pageBgs?.[pageEl?.dataset.pageId] || '';

  function applyPageBackgrounds() {
    document.querySelectorAll('.qo-page').forEach(p => {
      const bg = pageBg(p);
      ALL_BG_CLASSES.forEach(c => p.classList.remove(c));
      if (bg) p.classList.add('qo-bg--' + bg);
    });
  }

  function setPageBg(pageEl, bg) {
    if (!pageEl) return;
    state.pageBgs ||= {};
    if (bg) state.pageBgs[pageEl.dataset.pageId] = bg;
    else delete state.pageBgs[pageEl.dataset.pageId];
    applyPageBackgrounds();
    save();
    renderPop();
    status(bg ? `Background: ${ALL_PAGE_BGS.find(([v]) => v === bg)?.[1]}` : 'Background cleared');
  }

  function capturePageThemes() {
    document.querySelectorAll('.qo-page').forEach(p => {
      if (pageThemeBaseline[p.dataset.pageId] === undefined) {
        pageThemeBaseline[p.dataset.pageId] = p.classList.contains('qo-page--light') ? 'light' : 'dark';
      }
    });
  }

  const pageTheme = pageEl =>
    state.pageThemes?.[pageEl?.dataset.pageId]
    || pageThemeBaseline[pageEl?.dataset.pageId]
    || 'dark';

  function applyPageThemes() {
    document.querySelectorAll('.qo-page').forEach(p => {
      p.classList.toggle('qo-page--light', pageTheme(p) === 'light');
    });
  }

  function setPageTheme(pageEl, theme) {
    if (!pageEl) return;
    state.pageThemes ||= {};
    state.pageThemes[pageEl.dataset.pageId] = theme;
    applyPageThemes();
    applyPageTones();   // surfaces are per-theme; re-resolve against the new one
    save();
    renderPop();
    status(theme === 'light' ? 'Page set to light' : 'Page set to dark');
  }

  /* ---- page surface -------------------------------------------------------
     The theme decides which way the page reads (ink on paper, or the
     reverse); the surface decides what colour it reads on. Deep space navy
     is only the default — any of these, or a custom value, can carry a
     single sheet.

     Everything downstream is derived rather than listed: the elevation ladder
     steps away from whatever base is chosen, and the ambient layers the
     background presets use are tinted from it, so a plum sheet gets plum
     depth rather than navy depth sitting on plum. */

  const DARK_TONES = [
    ['',         'Navy',     '#0A1830'],
    ['ink',      'Ink',      '#08090D'],
    ['graphite', 'Graphite', '#15171C'],
    ['slate',    'Slate',    '#172029'],
    ['ocean',    'Ocean',    '#06202E'],
    ['teal',     'Deep teal','#05201E'],
    ['forest',   'Forest',   '#0A1F17'],
    ['indigo',   'Indigo',   '#151233'],
    ['plum',     'Plum',     '#20122A'],
    ['wine',     'Wine',     '#26101B'],
    ['espresso', 'Espresso', '#1D1510'],
  ];

  const LIGHT_TONES = [
    ['',         'Paper',    '#F7F7F9'],
    ['ivory',    'Ivory',    '#FBF7EF'],
    ['sand',     'Sand',     '#F6F1E7'],
    ['warm',     'Warm grey','#F4F1EC'],
    ['cool',     'Cool grey','#EDF1F6'],
    ['mint',     'Mint',     '#EEF7F3'],
    ['blush',    'Blush',    '#FBF1F2'],
    ['sky',      'Sky',      '#EEF3FA'],
  ];

  const toneList = theme => (theme === 'light' ? LIGHT_TONES : DARK_TONES);

  const pageToneName = pageEl => state.pageTones?.[pageEl?.dataset.pageId] || '';
  const pageToneHex  = pageEl => state.pageToneHex?.[pageEl?.dataset.pageId] || '';

  /* The surface hex actually in force, resolving a preset name through the
     list for this page's theme. A name from the other theme's list simply
     doesn't resolve, which leaves the sheet on its theme default until the
     page is switched back. */
  function resolvedTone(pageEl) {
    const name = pageToneName(pageEl);
    if (!name) return '';
    if (name === 'custom') return pageToneHex(pageEl);
    return toneList(pageTheme(pageEl)).find(([v]) => v === name)?.[2] || '';
  }

  const hexRgb = hex => {
    const triple = hexToRgbTriple(hex);
    return triple ? triple.split(',').map(Number) : null;
  };
  const mixRgb = (rgb, target, amt) => rgb.map((c, i) => Math.round(c + (target[i] - c) * amt));
  const rgbCss = a => `rgb(${a.join(', ')})`;
  const rgbaCss = (a, alpha) => `rgba(${a.join(', ')}, ${alpha})`;
  // Rough relative luminance — enough to answer "is this surface light?".
  const lumOf = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  const TONE_PROPS = [
    '--qo-bg', '--qo-elev-0', '--qo-elev-1', '--qo-elev-2', '--qo-elev-3',
    '--qo-surface', '--qo-surface-raised', '--qo-surface-high',
    '--qo-bgfx-cool-strong', '--qo-bgfx-cool-soft', '--qo-bgfx-shade', '--qo-bgfx-block',
    '--qo-text', '--qo-text-muted', '--qo-accent',
    '--qo-border', '--qo-border-subtle', '--qo-border-strong',
  ];

  function applyPageTones() {
    document.querySelectorAll('.qo-page').forEach(p => {
      TONE_PROPS.forEach(prop => p.style.removeProperty(prop));
      const rgb = hexRgb(resolvedTone(p));
      if (!rgb) return;

      const WHITE = [255, 255, 255], BLACK = [0, 0, 0];
      const pale = lumOf(rgb) > 0.5;
      const away = pale ? BLACK : WHITE;   // elevation always steps off the surface

      p.style.setProperty('--qo-bg', rgbCss(rgb));
      p.style.setProperty('--qo-elev-0', rgbCss(rgb));
      p.style.setProperty('--qo-elev-1', rgbCss(mixRgb(rgb, away, 0.05)));
      p.style.setProperty('--qo-elev-2', rgbCss(mixRgb(rgb, away, 0.10)));
      p.style.setProperty('--qo-elev-3', rgbCss(mixRgb(rgb, away, 0.16)));
      p.style.setProperty('--qo-surface', rgbCss(mixRgb(rgb, away, 0.05)));
      p.style.setProperty('--qo-surface-raised', rgbCss(mixRgb(rgb, away, 0.10)));
      p.style.setProperty('--qo-surface-high', rgbCss(mixRgb(rgb, away, 0.16)));

      const ambient = mixRgb(rgb, away, 0.24);
      p.style.setProperty('--qo-bgfx-cool-strong', rgbaCss(ambient, pale ? 0.17 : 0.70));
      p.style.setProperty('--qo-bgfx-cool-soft', rgbaCss(ambient, pale ? 0.09 : 0.38));
      p.style.setProperty('--qo-bgfx-shade', rgbaCss(mixRgb(rgb, BLACK, 0.6), pale ? 0.14 : 0.55));
      p.style.setProperty('--qo-bgfx-block',
        pale ? 'rgba(15, 34, 68, 0.065)' : 'rgba(247, 247, 249, 0.055)');

      // Legibility guard. A custom value can land on the wrong side of the
      // midpoint for its theme — pale grey on a "dark" page, say — which
      // would leave white type on a white sheet. The ink follows the surface
      // it actually has to sit on, not the theme's assumption about it.
      if (pale !== (pageTheme(p) === 'light')) {
        if (pale) {
          p.style.setProperty('--qo-text', '#0F2244');
          p.style.setProperty('--qo-text-muted', '#5C6B85');
          p.style.setProperty('--qo-accent', '#0E9E8B');
          p.style.setProperty('--qo-border-subtle', 'rgba(15, 34, 68, 0.12)');
          p.style.setProperty('--qo-border-strong', 'rgba(15, 34, 68, 0.26)');
          p.style.setProperty('--qo-border', 'rgba(15, 34, 68, 0.12)');
        } else {
          p.style.setProperty('--qo-text', '#F7F7F9');
          p.style.setProperty('--qo-text-muted', '#6B7A94');
          p.style.setProperty('--qo-accent', '#2DD4BF');
          p.style.setProperty('--qo-border-subtle', 'rgba(247, 247, 249, 0.12)');
          p.style.setProperty('--qo-border-strong', 'rgba(247, 247, 249, 0.24)');
          p.style.setProperty('--qo-border', 'rgba(247, 247, 249, 0.12)');
        }
      }
    });
  }

  function setPageTone(pageEl, tone) {
    if (!pageEl) return;
    state.pageTones ||= {};
    if (tone) state.pageTones[pageEl.dataset.pageId] = tone;
    else delete state.pageTones[pageEl.dataset.pageId];

    // Custom starts from whatever is on screen, so the picker opens on the
    // current surface rather than on black.
    if (tone === 'custom' && !pageToneHex(pageEl)) {
      state.pageToneHex ||= {};
      state.pageToneHex[pageEl.dataset.pageId] =
        toneList(pageTheme(pageEl))[0][2];
    }
    applyPageTones();
    save();
    renderPop();
    const label = tone === 'custom' ? 'Custom'
      : toneList(pageTheme(pageEl)).find(([v]) => v === tone)?.[1];
    status(tone ? `Surface: ${label}` : 'Surface reset');
  }

  function setPageToneHex(pageEl, hex, commit) {
    if (!pageEl) return;
    state.pageToneHex ||= {};
    state.pageToneHex[pageEl.dataset.pageId] = hex;
    state.pageTones ||= {};
    state.pageTones[pageEl.dataset.pageId] = 'custom';
    applyPageTones();
    if (commit) save();
  }

  function newPageTemplate(pageId) {
    const page = document.createElement('section');
    page.className = 'qo-page qo-page--light';
    page.dataset.pageId = pageId;
    page.innerHTML = `
      <div class="qo-page__body">
        <div>
          <p class="qo-eyebrow">New section</p>
          <h2 class="qo-page__title" style="margin-top: var(--qo-space-xs);">New page title</h2>
          <p class="qo-page__lede" style="margin-top: var(--qo-space-sm);">Click any text to edit it. Click the mockup below to bring in a screenshot, change its device, or add more.</p>
        </div>
        <div class="qo-device-row" style="gap: var(--qo-space-xl); flex:1; align-items:center; justify-content:flex-start;">
          <div class="qo-device qo-device--phone qo-view--front">
            <div class="qo-device__frame"><div class="qo-screen" data-spec="393 × 852"></div></div>
          </div>
        </div>
      </div>
      <footer class="qo-page__foot">
        <span>Custom page</span>
        <span class="qo-page__num">00</span>
      </footer>`;
    return page;
  }

  /* Inserts a fresh page right after the given one (or at the end). Devices
     and text elements on every LATER page shift their pN-* keys by one page
     index — state, baseline and textBaseline are all re-keyed by element
     identity, exactly like addDevice(), just running over both key schemes
     at once instead of one. */

  function addPage(afterPageEl) {
    const pages = [...document.querySelectorAll('.qo-page')];
    const ref = afterPageEl || pages[pages.length - 1];
    if (!ref) return;

    const oldDeviceKeyToEl = new Map(slots.map(({ key, el }) => [key, el]));
    const oldDeviceStateByEl = new Map(slots.map(({ key, el }) => [el, state[key]]));
    const oldDeviceBaselineByEl = new Map(slots.map(({ key, el }) => [el, baseline[key]]));
    const oldTextValByEl = new Map(textSlots.map(({ key, el }) => [el, state.texts?.[key]]));
    const oldTextBaselineByEl = new Map(textSlots.map(({ key, el }) => [el, textBaseline[key]]));
    const oldTextRemovedByEl = new Map(textSlots.map(({ key, el }) => [el, (state.removedTexts || []).includes(key)]));
    const oldBlockRemovedByEl = new Map(blockSlots.map(({ key, el }) => [el, (state.removedBlocks || []).includes(key)]));
    const oldTextStyleByEl = new Map(textSlots.map(({ key, el }) => [el, state.styles?.[key]]));
    const oldBlockStyleByEl = new Map(blockSlots.map(({ key, el }) => [el, state.styles?.[key]]));
    const oldAddedEls = new Set((state.added || []).map(k => oldDeviceKeyToEl.get(k)).filter(Boolean));

    const pageId = 'pg-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const page = newPageTemplate(pageId);
    ref.after(page);
    const storedHtml = page.outerHTML;   // before indexSlots/indexTexts stamp builder attributes on it

    indexSlots();
    textBaseline = {};   // rebuilt below by element identity — avoids stale-key collisions after the shift
    indexTexts();
    indexBlocks();

    const nextState = {}, nextBaseline = {}, nextTexts = {};
    slots.forEach(({ key, el }) => {
      if (oldDeviceStateByEl.has(el)) {
        if (oldDeviceStateByEl.get(el)) nextState[key] = oldDeviceStateByEl.get(el);
        if (oldDeviceBaselineByEl.get(el)) nextBaseline[key] = oldDeviceBaselineByEl.get(el);
      }
    });
    textSlots.forEach(({ key, el }) => {
      if (oldTextValByEl.has(el) && oldTextValByEl.get(el) !== undefined) nextTexts[key] = oldTextValByEl.get(el);
      if (oldTextBaselineByEl.has(el)) textBaseline[key] = oldTextBaselineByEl.get(el);
    });

    const nextStyles = {};
    textSlots.forEach(({ key, el }) => { if (oldTextStyleByEl.get(el)) nextStyles[key] = oldTextStyleByEl.get(el); });
    blockSlots.forEach(({ key, el }) => { if (oldBlockStyleByEl.get(el)) nextStyles[key] = oldBlockStyleByEl.get(el); });

    nextState.texts = nextTexts;
    nextState.styles = nextStyles;
    nextState.removedTexts = textSlots.filter(({ el }) => oldTextRemovedByEl.get(el)).map(({ key }) => key);
    nextState.removedBlocks = blockSlots.filter(({ el }) => oldBlockRemovedByEl.get(el)).map(({ key }) => key);
    nextState.added = [...oldAddedEls].map(el => slots.find(s => s.el === el)?.key).filter(Boolean);
    nextState.pagesAdded = [...(state.pagesAdded || []), { id: pageId, afterId: ref.dataset.pageId, html: storedHtml }];
    nextState.pagesDeleted = state.pagesDeleted || [];
    // Placed images ride on stable page ids, so inserting a page never
    // disturbs them — they only need carrying across the state swap.
    nextState.freeImages = state.freeImages || [];
    nextState.logos = state.logos || {};
    nextState.blocksAdded = state.blocksAdded || [];
    nextState.pageThemes = state.pageThemes || {};
    nextState.pageBgs = state.pageBgs || {};
    nextState.pageTones = state.pageTones || {};
    nextState.pageToneHex = state.pageToneHex || {};

    // Move & Position offsets and locks are filed under whatever identity the
    // element has. Text and block ids are stamped on their elements and stay
    // put; a device's identity is its positional slot key, which the insert
    // above just shifted — so only those need re-keying, by element, like
    // everything else here. The view toggles are plain preferences and simply
    // ride along; rebuilding `state` without them used to switch the grid and
    // axis overlays off every time a page was added.
    const newDeviceKeyByEl = new Map(slots.map(({ key, el }) => [el, key]));
    const deviceKeyMap = {};
    oldDeviceKeyToEl.forEach((el, oldKey) => {
      const moved = newDeviceKeyByEl.get(el);
      if (moved) deviceKeyMap[oldKey] = moved;
    });
    nextState.offsets = Object.fromEntries(
      Object.entries(state.offsets || {}).map(([k, v]) => [deviceKeyMap[k] || k, v]));
    nextState.locked = (state.locked || []).map(k => deviceKeyMap[k] || k);
    nextState.showGrid = state.showGrid;
    nextState.showAxis = state.showAxis;

    state = nextState;
    baseline = nextBaseline;

    nextState.pageOrder = capturePageOrder();

    renumberPages();
    applyAllText();
    applyBlocks();
    applyStyles();
    capturePageThemes();
    applyPageThemes();
    applyPageTones();
    applyPageBackgrounds();
    saveStructural();
    selectPage(page, true);
    buildTextTray();
    status('Page added');
  }

  function deletePage(pageEl) {
    if (!pageEl) return;
    const visible = [...document.querySelectorAll('.qo-page')].filter(p => p.style.display !== 'none');
    if (visible.length <= 1) { status('Cannot delete the only page'); return; }
    if (!confirm('Delete this page? Its mockups and text go with it. "Reset all" brings it back.')) return;

    const id = pageEl.dataset.pageId;
    state.pagesDeleted = [...new Set([...(state.pagesDeleted || []), id])];
    applyPageVisibility();
    save();
    selectPage(null);
    status('Page deleted');
  }

  /* Re-create pages added in a previous session. Runs at init, right after
     load() and ensurePageIds(), before indexSlots()/baseline capture — the
     stored device/text keys were saved against a DOM that already included
     these pages. Resolves the afterId chain iteratively so pages added
     back-to-back come back in the right order regardless of storage order. */

  function recreatePagesAdded() {
    const list = (state.pagesAdded || []).slice();
    if (!list.length) return;
    const remaining = new Map(list.map(p => [p.id, p]));
    let progress = true;
    while (progress && remaining.size) {
      progress = false;
      for (const [id, p] of [...remaining]) {
        if (document.querySelector(`[data-page-id="${id}"]`)) { remaining.delete(id); progress = true; continue; }
        const anchor = p.afterId ? document.querySelector(`[data-page-id="${p.afterId}"]`) : null;
        if (p.afterId && !anchor) continue;   // wait for its anchor to exist first
        const tmp = document.createElement('div');
        tmp.innerHTML = p.html;
        const pageEl = tmp.firstElementChild;
        if (pageEl) { if (anchor) anchor.after(pageEl); else document.body.append(pageEl); }
        remaining.delete(id);
        progress = true;
      }
    }
  }

  /* ---- named saves ----------------------------------------------------------
     The auto-persisted draft in STORE keeps working exactly as before —
     every edit still resumes automatically. This is a separate, explicit
     layer on top: "Save" snapshots the current state under a name without
     touching Default or any other save; "Load" swaps in Default or any
     named save, and that becomes the new auto-resumed draft going forward. */

  function loadSavesFromStorage() {
    try { return JSON.parse(localStorage.getItem(SAVES_STORE)) || []; }
    catch { return []; }
  }

  function persistSaves(saves) {
    try { localStorage.setItem(SAVES_STORE, JSON.stringify(saves)); }
    catch { status('Could not store save — storage full'); }
  }

  function defaultSaveName() {
    return new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  /* A save recorded before some later page existed has nothing to say about
     it — absent from both pagesDeleted and pagesAdded. Left alone, that
     reads as "not deleted" and the page would wrongly stay visible. Any
     dynamic page the incoming state doesn't explicitly know how to
     recreate gets folded into its pagesDeleted before it's applied. */
  function reconcilePagesForLoad(st) {
    const knownAddedIds = new Set((st.pagesAdded || []).map(p => p.id));
    const dynamicIdsInDom = [...document.querySelectorAll('.qo-page')]
      .map(p => p.dataset.pageId)
      .filter(id => !originalPageIds.includes(id));
    const mustHide = dynamicIdsInDom.filter(id => !knownAddedIds.has(id));
    st.pagesDeleted = [...new Set([...(st.pagesDeleted || []), ...mustHide])];
  }

  /* A block this state has nothing to say about — added in some other save,
     or during a session before "Reset all" — is left in the DOM by the load
     (blocks are only ever hidden, never removed). Folding it into the
     incoming removedBlocks hides it, so loading a state really does show
     what that state described. Same shape as reconcilePagesForLoad(). */
  function reconcileBlocksForLoad(st) {
    const known = new Set((st.blocksAdded || []).map(b => b.id));
    const orphans = blockSlots
      .map(b => b.key)
      .filter(k => !originalBlockIds.includes(k) && !known.has(k));
    st.removedBlocks = [...new Set([...(st.removedBlocks || []), ...orphans])];
  }

  /* Same gap, one level down: a device slot key the incoming state has
     nothing to say about falls back to baseline (which flags anything
     dynamically added as deleted), rather than silently rendering blank
     as an authored-looking default. */
  function fillMissingFromBaseline() {
    slots.forEach(({ key }) => {
      if (state[key] === undefined) state[key] = JSON.parse(JSON.stringify(baseline[key] || {}));
    });
  }

  /* The single path for "swap in a different document state": Reset all,
     Load > Default, and Load > a named save are all this same operation,
     just with a different starting blob (`{}` for the first two). Device
     and page DOM nodes are permanent once created (never removed, only
     hidden) — recreating and re-indexing here is always safe: anything
     already present is a no-op, anything this state actually references
     but doesn't yet exist gets built. */
  function loadState(newState, label) {
    // apply() only ever SETS an inline width/offset when the incoming state
    // has one — it never clears a stale one left over from whatever was
    // showing before. Clearing first means every slot starts from the
    // authored default, exactly as if this were a fresh page load.
    slots.forEach(s => { s.el.style.width = ''; s.el.style.translate = ''; });

    state = newState;
    recreatePagesAdded();
    applyPageOrder();
    recreateAdded();
    indexSlots();
    indexTexts();
    indexBlocks();
    recreateBlocksAdded();
    indexTexts();
    indexBlocks();
    reconcilePagesForLoad(state);
    reconcileBlocksForLoad(state);
    fillMissingFromBaseline();
    applyAll();
    applyAllText();
    applyBlocks();
    applyStyles();
    applyFreeImages();
    indexLogos();
    applyLogos();
    applyPageThemes();
    applyPageTones();
    applyPageBackgrounds();
    applyPageVisibility();
    resetHistory();
    saveStorageOnly();
    select(null);
    buildTextTray();
    renderInspector();
    status(label);
  }

  function saveCurrentAs() {
    const name = prompt('Name this save:', defaultSaveName());
    if (name === null) return;
    const saves = loadSavesFromStorage();
    saves.push({
      id: 'sv-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name.trim() || defaultSaveName(),
      savedAt: Date.now(),
      state: JSON.parse(JSON.stringify(state)),
    });
    persistSaves(saves);
    status('Saved as "' + (name.trim() || defaultSaveName()) + '"');
    renderSavesList();
  }

  function loadDefault() {
    if (!confirm('Load the Default layout? Your current in-progress edits will be replaced (anything you already Saved is unaffected and still listed under Load).')) return;
    loadState({}, 'Loaded Default');
    document.querySelector('.qb-saves-list')?.setAttribute('hidden', '');
  }

  function loadNamedSave(id) {
    const found = loadSavesFromStorage().find(s => s.id === id);
    if (!found) return;
    if (!confirm(`Load "${found.name}"? Your current in-progress edits will be replaced.`)) return;
    loadState(JSON.parse(JSON.stringify(found.state)), 'Loaded "' + found.name + '"');
    document.querySelector('.qb-saves-list')?.setAttribute('hidden', '');
  }

  function deleteNamedSave(id) {
    if (!confirm('Delete this save? This cannot be undone.')) return;
    persistSaves(loadSavesFromStorage().filter(s => s.id !== id));
    renderSavesList();
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderSavesList() {
    const box = document.querySelector('.qb-saves-list');
    if (!box) return;
    const saves = loadSavesFromStorage().sort((a, b) => b.savedAt - a.savedAt);
    box.innerHTML = `
      <div class="qb-save-item" data-load-default>
        <span>Default <span class="qb-save-item__sub">shipped layout</span></span>
      </div>
      ${saves.map(s => `
        <div class="qb-save-item" data-load-save="${s.id}">
          <span>${escapeHtml(s.name)} <span class="qb-save-item__sub">${new Date(s.savedAt).toLocaleString()}</span></span>
          <button class="qb-save-item__del" data-del-save="${s.id}" title="Delete this save">×</button>
        </div>`).join('') || '<div class="qb-empty" style="margin-top:6px;">No saves yet — click Save to create one.</div>'}`;

    box.querySelector('[data-load-default]').onclick = () => loadDefault();
    box.querySelectorAll('[data-load-save]').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('[data-del-save]')) return;
        loadNamedSave(item.dataset.loadSave);
      });
    });
    box.querySelectorAll('[data-del-save]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); deleteNamedSave(btn.dataset.delSave); });
    });
  }

  /* ---- selection ----------------------------------------------------------- */

  function clearSelection() {
    document.querySelectorAll('.qo-device.qb-sel').forEach(d => d.classList.remove('qb-sel'));
    document.querySelectorAll('[data-editable].qb-text-sel').forEach(d => d.classList.remove('qb-text-sel'));
    document.querySelectorAll('.qo-page.qb-page-sel').forEach(d => d.classList.remove('qb-page-sel'));
    document.querySelectorAll('.qo-free-img.qb-fi-sel').forEach(d => d.classList.remove('qb-fi-sel'));
    // Close whichever drawer was open *because of* the selection being
    // cleared here — checked before nulling, so a drawer someone opened by
    // hand (nav toggle, nothing selected) is left alone. select()/
    // selectText() re-add the class immediately after if they're about to
    // select something new, so switching between two elements of the same
    // kind never visibly flickers shut — this only ever reads as "close"
    // when a click, Escape, or reset genuinely lands on nothing.
    popAnchor = null;   // the next selection anchors its popover afresh
    popDetached = false;
    popCollapsed = false;
    if (sel) document.body.classList.remove('qb-open');
    if (selText || selImg) document.body.classList.remove('qb-text-open');
    sel = null; selText = null; selPage = null; selImg = null;
    updateFreeImgOverlay();
  }

  /* The left drawer holds two editors — text and placed images — on tabs,
     the same way the right drawer splits its library from its controls. */
  function switchLeftTab(tabId) {
    const drawer = document.querySelector('.qb-drawer--left');
    if (!drawer) return;
    drawer.querySelectorAll('[data-left-tab]').forEach(b => {
      b.classList.toggle('qb-on', b.dataset.leftTab === tabId);
    });
    drawer.querySelectorAll('[data-left-panel]').forEach(p => {
      p.hidden = p.dataset.leftPanel !== tabId;
    });
    const title = drawer.querySelector('.qb-title');
    if (title) title.textContent = tabId === 'image' ? 'Image Editor' : 'Text Editor';
  }

  function leftTab() {
    return document.querySelector('.qb-drawer--left [data-left-tab].qb-on')?.dataset.leftTab || 'text';
  }

  function switchDrawerTab(tabId) {
    const rightDrawer = document.querySelector('.qb-drawer--right');
    if (!rightDrawer) return;
    rightDrawer.querySelectorAll('[data-drawer-tab]').forEach(x => {
      x.classList.toggle('qb-on', x.dataset.drawerTab === tabId);
    });
    rightDrawer.querySelectorAll('[data-drawer-panel]').forEach(p => {
      p.hidden = p.dataset.drawerPanel !== tabId;
    });
  }

  function select(el, scroll) {
    clearSelection();
    sel = el || null;
    if (sel) {
      sel.classList.add('qb-sel');
      if (scroll) sel.scrollIntoView({ block: 'center', behavior: 'smooth' });
      document.body.classList.add('qb-open');
      switchDrawerTab('mockup');
    } else {
      switchDrawerTab('images');
    }
    renderInspector();
    markUsedThumbs();
    renderPop();
    positionPop();
  }

  function selectText(el, scroll) {
    clearSelection();
    selText = el || null;
    if (selText) {
      selText.classList.add('qb-text-sel');
      if (scroll) selText.scrollIntoView({ block: 'center', behavior: 'smooth' });
      document.body.classList.add('qb-text-open');
      switchLeftTab('text');
    }
    renderInspector();
    buildTextTray();
    renderPop();
  }

  function selectPage(el, scroll) {
    clearSelection();
    selPage = el || null;
    if (selPage) {
      selPage.classList.add('qb-page-sel');
      if (scroll) selPage.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    renderInspector();
    renderPop();
    positionPop();
  }

  /* ---- UI construction ------------------------------------------------------ */

  function buildUI() {
    // Top Navigation Bar
    const navbar = document.createElement('header');
    navbar.className = 'qb-navbar';
    const brandHtml = window.QO_PROJECT
      ? `<a href="projects.html" style="color:#6B7A94;font-size:12px;text-decoration:none;" title="Back to Projects">← Projects</a>
         <span style="width:1px;height:16px;background:rgba(247,247,249,0.15);"></span>
         <span>${escapeHtml(window.QO_PROJECT.name)}</span>`
      : `<span>Folio Builder</span>`;

    navbar.innerHTML = `
      <div class="qb-navbar__brand">
        <span style="color:#2DD4BF;font-size:16px;">◧</span>
        ${brandHtml}
      </div>

      <div class="qb-navbar__group">
        <button class="qb-nav-btn qb-nav-toggle-text" title="Toggle Text & Image Editor (Left Panel)">◀</button>
        <button class="qb-nav-btn qb-nav-toggle-builder" title="Toggle Device Inspector (Right Panel)">▶</button>
        <div style="width:1px;height:16px;background:rgba(247,247,249,0.15);margin:0 4px;"></div>
        <button class="qb-nav-btn qb-toggle-grid" title="Toggle 10mm Alignment Grid Boxes">▦ Grid</button>
        <button class="qb-nav-btn qb-toggle-axis" title="Toggle X-Y Axis Point Coordinates">✛ Axis</button>
        <div style="width:1px;height:16px;background:rgba(247,247,249,0.15);margin:0 4px;"></div>
        <button class="qb-nav-btn qb-btn-undo" title="Undo (Ctrl+Z)">↶ Undo</button>
        <button class="qb-nav-btn qb-btn-redo" title="Redo (Ctrl+Y)">↷ Redo</button>
        <div style="width:1px;height:16px;background:rgba(247,247,249,0.15);margin:0 4px;"></div>
        <button class="qb-nav-btn qb-nav-btn--accent" data-act="add-page">+ Page</button>
        <button class="qb-nav-btn qb-nav-btn--accent" data-act="add-mockup">+ Mockup</button>
      </div>

      <div class="qb-navbar__group">
        <div class="qb-dropdown">
          <button class="qb-nav-btn qb-dropdown__trigger">File ▾</button>
          <div class="qb-dropdown__menu" hidden>
            <button data-act="save-new">💾 Save</button>
            <button data-act="load-toggle">📂 Load</button>
            <div class="qb-dropdown__sep"></div>
            <button data-act="import">JSON Import</button>
            <div class="qb-dropdown__sep"></div>
            <button data-act="reset" style="color:#FF6B6B;">Reset All</button>
          </div>
        </div>
        <div class="qb-dropdown">
          <button class="qb-nav-btn qb-dropdown__trigger">Export ▾</button>
          <div class="qb-dropdown__menu" hidden>
            <button data-act="preview-pdf">👁 Preview PDF</button>
            <button data-act="pdf" class="qb-dropdown__primary">Export PDF</button>
            <div class="qb-dropdown__sep"></div>
            <button data-act="export-html">Export Clean HTML</button>
            <button data-act="export">JSON Export</button>
          </div>
        </div>
        <div class="qb-status" style="font-family:monospace;font-size:10px;color:#2DD4BF;margin-left:6px;">Ready</div>
      </div>`;

    document.body.prepend(navbar);
    navbar.addEventListener('click', onAction);

    // Left panel toggle — single button opens/closes the left drawer.
    // When opening, it shows whichever tab was last active.
    navbar.querySelector('.qb-nav-toggle-text').onclick = () => {
      const open = document.body.classList.contains('qb-text-open');
      if (open) {
        document.body.classList.remove('qb-text-open');
        navbar.querySelector('.qb-nav-toggle-text').classList.remove('qb-on');
      } else {
        document.body.classList.add('qb-text-open');
        navbar.querySelector('.qb-nav-toggle-text').classList.add('qb-on');
      }
    };

    // The drawers wire their own copies of these, and updateUndoRedoButtons()
    // has always kept all three pairs enabled/greyed in step — but the navbar
    // pair had no handler at all, so clicking it did nothing (Ctrl+Z still
    // worked, which is why it read as a dead button rather than a dead feature).
    navbar.querySelector('.qb-btn-undo').onclick = undo;
    navbar.querySelector('.qb-btn-redo').onclick = redo;
    navbar.querySelector('.qb-nav-toggle-builder').onclick = () => {
      const opening = !document.body.classList.contains('qb-open');
      document.body.classList.toggle('qb-open');
      navbar.querySelector('.qb-nav-toggle-builder').classList.toggle('qb-on', opening);
    };

    // Dropdown menus — clicking a trigger toggles its sibling menu;
    // clicking anywhere else dismisses all open menus.
    navbar.querySelectorAll('.qb-dropdown__trigger').forEach(trigger => {
      trigger.onclick = e => {
        e.stopPropagation();
        const menu = trigger.nextElementSibling;
        const wasOpen = !menu.hidden;
        // close all menus first
        navbar.querySelectorAll('.qb-dropdown__menu').forEach(m => m.hidden = true);
        menu.hidden = wasOpen;
      };
    });
    // Close dropdown when any menu item is clicked
    navbar.querySelectorAll('.qb-dropdown__menu button').forEach(btn => {
      btn.addEventListener('click', () => {
        navbar.querySelectorAll('.qb-dropdown__menu').forEach(m => m.hidden = true);
      });
    });
    // Close dropdowns on outside click
    document.addEventListener('click', () => {
      navbar.querySelectorAll('.qb-dropdown__menu').forEach(m => m.hidden = true);
    });

    // Keep navbar toggle buttons (◀ and ▶) in sync with body classes automatically
    const syncNavToggles = () => {
      const leftBtn = navbar.querySelector('.qb-nav-toggle-text');
      const rightBtn = navbar.querySelector('.qb-nav-toggle-builder');
      if (leftBtn) {
        leftBtn.classList.toggle('qb-on', document.body.classList.contains('qb-text-open'));
      }
      if (rightBtn) {
        rightBtn.classList.toggle('qb-on', document.body.classList.contains('qb-open'));
      }
    };
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          syncNavToggles();
        }
      });
    });
    observer.observe(document.body, { attributes: true });
    syncNavToggles();

    const gridBtn = navbar.querySelector('.qb-toggle-grid');
    gridBtn.onclick = () => {
      const active = document.body.classList.toggle('qb-show-grid');
      gridBtn.classList.toggle('qb-on', active);
      state.showGrid = active;
      save();
      status(active ? 'Grid View enabled' : 'Grid View disabled');
    };

    const axisBtn = navbar.querySelector('.qb-toggle-axis');
    axisBtn.onclick = () => {
      const active = document.body.classList.toggle('qb-show-axis');
      axisBtn.classList.toggle('qb-on', active);
      state.showAxis = active;
      save();
      status(active ? 'X-Y Axis Overlay enabled' : 'X-Y Axis Overlay disabled');
    };

    // Left Drawer (Text Editor + Image Editor)
    const leftDrawer = document.createElement('aside');
    leftDrawer.className = 'qb-drawer--left';
    leftDrawer.innerHTML = `
      <div class="qb-head">
        <span class="qb-title">Text Editor</span>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="qb-btn-undo" title="Undo (Ctrl+Z)" style="background:none;border:1px solid rgba(247,247,249,0.2);color:#F7F7F9;font-size:12px;border-radius:4px;padding:2px 6px;">↶</button>
          <button class="qb-btn-redo" title="Redo (Ctrl+Y)" style="background:none;border:1px solid rgba(247,247,249,0.2);color:#F7F7F9;font-size:12px;border-radius:4px;padding:2px 6px;">↷</button>
          <button class="qb-x-left" style="background:none;border:none;color:#6B7A94;font-size:20px;cursor:pointer;line-height:1;margin-left:4px;" title="Close">×</button>
        </div>
      </div>
      <div class="qb-body" style="padding:0;overflow:hidden;">
        <div class="qb-drawer-tabs">
          <button class="qb-drawer-tab qb-on" data-left-tab="text">✎ Text</button>
          <button class="qb-drawer-tab" data-left-tab="image">🖼 Image</button>
        </div>
        <div class="qb-drawer-panel" data-left-panel="text">
          <div class="qb-section">
            <div class="qb-text-inspector"></div>
          </div>
        </div>
        <div class="qb-drawer-panel" data-left-panel="image" hidden>
          <div class="qb-section">
            <div class="qb-section__head">
              <h4>Place an image</h4>
              <label class="qb-btn-add-img">＋ Upload
                <input type="file" accept="image/*" multiple style="display:none;" class="qb-fi-input">
              </label>
            </div>
            <input type="text" class="qb-img-search qb-fi-search" placeholder="Search images…">
            <div class="qb-fi-picker"></div>
            <div class="qb-hint" style="margin-top:10px;">Click a thumbnail to drop it on the current page, or drag one straight onto any spot. Then drag it around, pull its handles to resize, and use the controls below.</div>
          </div>
          <div class="qb-section">
            <h4>Placed images</h4>
            <div class="qb-fi-list"></div>
          </div>
          <div class="qb-section">
            <div class="qb-fi-inspector"></div>
          </div>
        </div>
      </div>`;

    document.body.append(leftDrawer);
    // The document-level click handler in bindCanvas() decides whether to
    // deselect by walking up from e.target with closest('.qb-drawer--left…') —
    // but any in-drawer button whose own onclick re-renders its container
    // (as the typography controls below do) detaches e.target from the live
    // tree before that later listener runs, so closest() no longer finds
    // this drawer and the click falls through as a deselect/dismiss click.
    // Stopping propagation here (registered on the drawer itself, which
    // stays in the event's path regardless of what the target's handler
    // mutated) sidesteps that instead of relying on closest().
    leftDrawer.addEventListener('click', e => e.stopPropagation());
    leftDrawer.querySelector('.qb-x-left').onclick = () => document.body.classList.remove('qb-text-open');
    leftDrawer.querySelector('.qb-btn-undo').onclick = undo;
    leftDrawer.querySelector('.qb-btn-redo').onclick = redo;

    leftDrawer.querySelectorAll('[data-left-tab]').forEach(b => b.onclick = () => {
      switchLeftTab(b.dataset.leftTab);
    });

    // Upload straight into the Image Editor: the file lands in the same
    // "Your uploads" library the device tray reads from, then goes onto the
    // current page immediately — one step instead of upload-then-place.
    const fiInput = leftDrawer.querySelector('.qb-fi-input');
    const fiAddLabel = leftDrawer.querySelector('.qb-btn-add-img');
    if (fiInput && fiAddLabel) {
      fiAddLabel.addEventListener('click', e => {
        if (e.target !== fiInput) { e.preventDefault(); fiInput.click(); }
      });
      fiInput.addEventListener('change', async e => {
        const ids = await addCustomImages(e.target.files);
        e.target.value = '';
        ids.forEach(id => placeFreeImage({ srcId: id }));
      });
    }

    leftDrawer.querySelector('.qb-fi-search').addEventListener('input', e => {
      freeImgFilter = e.target.value.trim().toLowerCase();
      buildImagePicker();
    });

    // Right Drawer (Device Mockup Controls Only)
    const rightDrawer = document.createElement('aside');
    rightDrawer.className = 'qb-drawer--right';
    rightDrawer.innerHTML = `
      <div class="qb-head">
        <span class="qb-title">Device Mockup Inspector</span>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="qb-btn-undo" title="Undo (Ctrl+Z)" style="background:none;border:1px solid rgba(247,247,249,0.2);color:#F7F7F9;font-size:12px;border-radius:4px;padding:2px 6px;">↶</button>
          <button class="qb-btn-redo" title="Redo (Ctrl+Y)" style="background:none;border:1px solid rgba(247,247,249,0.2);color:#F7F7F9;font-size:12px;border-radius:4px;padding:2px 6px;">↷</button>
          <button class="qb-x-right" style="background:none;border:none;color:#6B7A94;font-size:20px;cursor:pointer;line-height:1;margin-left:4px;" title="Close">×</button>
        </div>
      </div>
      <div class="qb-body" style="padding:0;overflow:hidden;">
        <div class="qb-drawer-tabs">
          <button class="qb-drawer-tab qb-on" data-drawer-tab="images">Images</button>
          <button class="qb-drawer-tab" data-drawer-tab="mockup">Mockup Settings</button>
        </div>
        <div class="qb-drawer-panel" data-drawer-panel="images">
          <div class="qb-section">
            <div class="qb-section__head">
              <h4>Screenshots Library</h4>
              <label class="qb-btn-add-img">＋ Add
                <input type="file" accept="image/*" multiple style="display:none;" class="qb-img-input">
              </label>
            </div>
            <input type="text" class="qb-img-search" placeholder="Search screenshots…">
            <div class="qb-tray"></div>
          </div>
        </div>
        <div class="qb-drawer-panel" data-drawer-panel="mockup" hidden>
          <div class="qb-section">
            <h4>Device Controls & Inspector</h4>
            <div class="qb-inspector"></div>
          </div>
        </div>
      </div>`;

    document.body.append(rightDrawer);
    rightDrawer.addEventListener('click', e => e.stopPropagation()); // see matching note on leftDrawer above
    rightDrawer.querySelector('.qb-x-right').onclick = () => document.body.classList.remove('qb-open');
    rightDrawer.querySelector('.qb-btn-undo').onclick = undo;
    rightDrawer.querySelector('.qb-btn-redo').onclick = redo;
    
    // Wire tab switching to switchDrawerTab
    rightDrawer.querySelectorAll('[data-drawer-tab]').forEach(b => b.onclick = () => {
      switchDrawerTab(b.dataset.drawerTab);
    });

    // Make drawer resizable — width is a workspace preference rather than
    // project content, so it's kept in its own localStorage key and applies
    // regardless of which project is open, rather than living in `state`.
    const DRAWER_WIDTH_STORE = 'qoarc.builder.drawerWidth.v1';
    const savedDrawerWidth = parseInt(localStorage.getItem(DRAWER_WIDTH_STORE), 10);
    if (savedDrawerWidth) {
      document.body.style.setProperty('--qb-drawer-width', `${Math.max(260, Math.min(600, savedDrawerWidth))}px`);
    }

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'qb-drawer-resize-handle';
    rightDrawer.appendChild(resizeHandle);

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizeHandle.addEventListener('mousedown', e => {
      isResizing = true;
      startX = e.clientX;
      const computedWidth = rightDrawer.getBoundingClientRect().width;
      startWidth = computedWidth || 340;
      resizeHandle.classList.add('is-resizing');
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!isResizing) return;
      const dx = startX - e.clientX; // Dragging left increases width
      const newWidth = Math.max(260, Math.min(600, startWidth + dx));
      document.body.style.setProperty('--qb-drawer-width', `${newWidth}px`);
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizeHandle.classList.remove('is-resizing');
        document.body.style.userSelect = '';
        const w = getComputedStyle(document.body).getPropertyValue('--qb-drawer-width').trim();
        if (w) localStorage.setItem(DRAWER_WIDTH_STORE, parseInt(w, 10));
      }
    });

    // Wire file input change
    const imgInput = rightDrawer.querySelector('.qb-img-input');
    const addImgLabel = rightDrawer.querySelector('.qb-btn-add-img');
    if (addImgLabel && imgInput) {
      addImgLabel.addEventListener('click', e => {
        if (e.target !== imgInput) {
          e.preventDefault();
          imgInput.click();
        }
      });
      imgInput.addEventListener('change', e => {
        addCustomImages(e.target.files);
        e.target.value = '';
      });
    }

    rightDrawer.querySelector('.qb-img-search').addEventListener('input', e => {
      imgFilter = e.target.value.trim().toLowerCase();
      filterTray();
    });

    // Support drag and drop files onto the Screenshots Library tray to upload
    const trayEl = rightDrawer.querySelector('.qb-tray');
    if (trayEl) {
      trayEl.addEventListener('dragover', e => {
        e.preventDefault();
        trayEl.classList.add('qb-dragover');
      });
      trayEl.addEventListener('dragleave', () => {
        trayEl.classList.remove('qb-dragover');
      });
      trayEl.addEventListener('drop', async e => {
        trayEl.classList.remove('qb-dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          e.preventDefault();
          e.stopPropagation();
          addCustomImages(e.dataTransfer.files);
        }
      });
    }
    // All the action buttons (Save/Load/Export/Reset/…) live in the top
    // navbar now, wired via navbar.addEventListener('click', onAction)
    // above — this drawer has no .qb-foot of its own anymore.

    loadCustomImages();
    buildTray();
    buildImagePicker();
    buildTextTray();
    renderInspector();
    buildPop();
  }

  function buildTextTray() {
    const textTray = document.querySelector('.qb-text-tray');
    if (!textTray) return;
    if (!textSlots.length) {
      textTray.innerHTML = `<div class="qb-empty">No text elements found.</div>`;
      return;
    }

    const removed = state.removedTexts || [];
    const matches = t => {
      if (!textFilter) return true;
      const val = state.texts?.[t.key] !== undefined ? state.texts[t.key] : t.el.innerText.trim();
      return val.toLowerCase().includes(textFilter) || t.tag.includes(textFilter);
    };

    // Group in document order, but keep each page's items together even
    // though textSlots is already page-ordered — groups only need a stable
    // key to collect into, order falls out of the source array for free.
    const groups = new Map();
    textSlots.filter(matches).forEach(t => {
      if (!groups.has(t.pageKey)) groups.set(t.pageKey, { label: t.pageLabel, items: [] });
      groups.get(t.pageKey).items.push(t);
    });

    if (!groups.size) {
      textTray.innerHTML = `<div class="qb-empty">No text matches "${escapeHtml(textFilter)}".</div>`;
      return;
    }

    textTray.innerHTML = [...groups.values()].map(g => `
      <div class="qb-text-group">
        <div class="qb-text-group__label">${escapeHtml(g.label)}</div>
        ${g.items.map(t => {
          const val = state.texts?.[t.key] !== undefined ? state.texts[t.key] : t.el.innerText.trim();
          const preview = val.length > 24 ? val.slice(0, 24) + '…' : (val || t.tag);
          const isSel = selText === t.el;
          const isRemoved = removed.includes(t.key);
          return `<div class="qb-text-item ${isSel ? 'qb-text-sel' : ''} ${isRemoved ? 'qb-text-removed' : ''}" data-text-key="${t.key}" title="${escapeHtml(val)}">
            <span><strong>${t.tag.toUpperCase()}</strong>: ${escapeHtml(preview)}</span>
            ${isRemoved
              ? `<button class="qb-text-item__restore" data-restore-key="${t.key}" title="Restore">↺</button>`
              : `<button class="qb-text-item__restore" data-remove-key="${t.key}" title="Remove">🗑</button>`}
          </div>`;
        }).join('')}
      </div>`).join('');

    textTray.querySelectorAll('[data-text-key]').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('[data-remove-key], [data-restore-key]')) return;
        const slot = textSlots.find(s => s.key === item.dataset.textKey);
        if (slot) {
          selectText(slot.el, true);
          slot.el.focus();
        }
      });
    });
    textTray.querySelectorAll('[data-remove-key]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm('Remove this text block from the page? Undo or "Reset all" brings it back.')) return;
        removeTextBlock(btn.dataset.removeKey);
      });
    });
    textTray.querySelectorAll('[data-restore-key]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        restoreTextBlock(btn.dataset.restoreKey);
      });
    });
  }

  /* ---- custom typefaces ------------------------------------------------------
     Two ways in, one list out. An uploaded file is embedded as a data URL and
     declared with @font-face, so it travels with an exported HTML file and
     renders on a machine that has never seen it. A Windows font is referenced
     by name only — nothing to embed, but it renders only where it's installed,
     which is why the two are labelled differently in the picker. */

  const FONT_FILE_TYPES = '.ttf,.otf,.woff,.woff2,.ttc';

  function loadCustomFonts() {
    try { customFonts = JSON.parse(localStorage.getItem(FONTS_STORE)) || []; }
    catch { customFonts = []; }
  }

  function saveCustomFonts() {
    try { localStorage.setItem(FONTS_STORE, JSON.stringify(customFonts)); }
    catch { status('Font not saved — storage full'); }
  }

  // Family names go into a style attribute and into CSS text, so they get
  // quoted rather than pasted raw — a name with a space, a quote or a
  // backslash in it would otherwise break the declaration it lands in.
  function cssFamily(name) {
    return '"' + String(name).replace(/["\\]/g, '\\$&') + '"';
  }

  function fontEntry(id) {
    return customFonts.find(f => f.id === id) || null;
  }

  /* Resolves what goes in `font-family` for a stored style value: '' (none),
     one of the three document tokens, or custom:<id>. A custom family keeps
     the brand stack behind it so a Windows font that isn't installed on the
     next machine degrades to the document's own typeface instead of Times. */
  function fontCssFor(v) {
    if (!v) return '';
    if (v.startsWith('custom:')) {
      const f = fontEntry(v.slice(7));
      return f ? `${cssFamily(f.family)}, var(--qo-font-brand)` : '';
    }
    return `var(--qo-font-${v})`;
  }

  // One <style> element rewritten wholesale rather than appended to — it is
  // rebuilt after every add/remove, and it rides along in the HTML export
  // (which clones documentElement), so embedded fonts survive the export.
  function refreshFontFaces() {
    let styleEl = document.getElementById('qb-font-faces');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'qb-font-faces';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = customFonts
      .filter(f => f.kind === 'file' && f.src)
      .map(f => `@font-face { font-family: ${cssFamily(f.family)}; src: url("${f.src}"); font-display: swap; }`)
      .join('\n');
  }

  function addFontFile(file) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => {
        const id = 'fnt-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const label = file.name.replace(/\.(ttf|otf|woff2?|ttc)$/i, '');
        customFonts.push({
          id,
          label,
          // The CSS family is generated, not taken from the file name: an
          // upload called "Arial.ttf" must not quietly win over — or lose to —
          // the Arial the machine already has installed.
          family: 'qb-' + id,
          kind: 'file',
          src: r.result
        });
        saveCustomFonts();
        refreshFontFaces();
        resolve(id);
      };
      r.onerror = () => resolve(null);
      r.readAsDataURL(file);
    });
  }

  function addLocalFont(family) {
    const name = (family || '').trim();
    if (!name) return null;
    const existing = customFonts.find(f => f.kind === 'local' && f.family.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const id = 'fnt-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    customFonts.push({ id, label: name, family: name, kind: 'local' });
    saveCustomFonts();
    return id;
  }

  /* Local Font Access — Chromium on Windows/macOS only, needs a real click
     and a permission grant. Everywhere else the picker still works, it just
     can't offer suggestions: the name typed in by hand resolves the same way,
     as long as the font is installed. */
  async function loadLocalFamilies() {
    if (!window.queryLocalFonts) return false;
    try {
      const fonts = await window.queryLocalFonts();
      localFamilies = [...new Set(fonts.map(f => f.family))].sort((a, b) => a.localeCompare(b));
      return true;
    } catch {
      return false;   // permission denied, or the user dismissed the prompt
    }
  }

  function removeCustomFont(id) {
    const f = fontEntry(id);
    if (!f) return;
    // Every text element still pointing at this font would silently fall back
    // to the document default, so the count goes in the question.
    const used = Object.values(state.styles || {}).filter(s => s?.fontFamily === `custom:${id}`).length;
    const warning = used ? `\n\n${used} text element${used === 1 ? '' : 's'} using it will go back to the default typeface.` : '';
    if (!confirm(`Remove "${f.label}" from this project's fonts?${warning}`)) return;

    customFonts = customFonts.filter(x => x.id !== id);
    Object.values(state.styles || {}).forEach(s => {
      if (s?.fontFamily === `custom:${id}`) delete s.fontFamily;
    });
    saveCustomFonts();
    refreshFontFaces();
    applyStyles();
    save();
    renderInspector();
    status(`Removed ${f.label}`);
  }

  /* ---- uploaded screenshots ("Your uploads") --------------------------------- */

  let customImages = [];

  function loadCustomImages() {
    try { customImages = JSON.parse(localStorage.getItem(IMAGES_STORE)) || []; }
    catch { customImages = []; }
  }

  function saveCustomImages() {
    try { localStorage.setItem(IMAGES_STORE, JSON.stringify(customImages)); }
    catch { status('Save failed — storage full'); }
  }

  // Screenshots dropped in at full resolution would bloat localStorage fast
  // (base64 inflates size ~33%) — cap the longest edge and re-encode as a
  // JPEG before it ever touches storage.
  function downscaleImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const maxEdge = 1600;
        let { width, height } = img;
        if (width > maxEdge || height > maxEdge) {
          const scale = maxEdge / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
      img.src = url;
    });
  }

  // Resolves to the ids of everything it actually stored, so a caller that
  // needs to act on the uploads (the Image Editor places them on the page)
  // doesn't have to guess which library entries are new.
  async function addCustomImages(fileList) {
    const files = [...fileList].filter(f => f.type.startsWith('image/'));
    if (!files.length) return [];
    const ids = [];
    for (const f of files) {
      try {
        const dataUrl = await downscaleImage(f);
        const id = 'up-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        customImages.push({ id, name: f.name, path: dataUrl });
        ids.push(id);
      } catch { /* skip a file the browser can't decode as an image */ }
    }
    saveCustomImages();
    buildTray();
    buildImagePicker();
    status(ids.length ? `${ids.length} image${ids.length === 1 ? '' : 's'} added` : 'Could not read that file');
    return ids;
  }

  function removeCustomImage(id) {
    // Mockups hold a copy of the image data, so they survive this; images
    // placed on a page reference the library entry by id, so they can't —
    // say so up front rather than leaving blank frames behind.
    const placed = (state.freeImages || []).filter(e => e.srcId === id).length;
    const warning = placed
      ? `\n\n${placed} placed image${placed === 1 ? '' : 's'} using it will be removed from the page too.`
      : '';
    if (!confirm(`Remove this image from your uploads? Any mockup already using it keeps showing it until you assign something else.${warning}`)) return;
    customImages = customImages.filter(img => img.id !== id);
    if (placed) {
      state.freeImages = (state.freeImages || []).filter(e => e.srcId !== id);
      applyFreeImages();
      save();
      renderImageEditor();
    }
    saveCustomImages();
    buildTray();
    buildImagePicker();
  }

  function buildTray() {
    const tray = document.querySelector('.qb-tray');
    if (!tray) return;
    const manifest = window.QO_MANIFEST || [];
    const bySite = {};
    manifest.forEach(m => (bySite[m.site] ||= []).push(m));

    const uploadsHtml = `
      <div class="qb-site qb-site--uploads" data-site="Your uploads">
        <h5>Your uploads <span class="qb-count">${customImages.length}</span></h5>
        ${customImages.length ? `
          <div class="qb-thumbs">
            ${customImages.map(i => `
              <div class="qb-thumb qb-thumb--upload" draggable="true" data-path="${i.path}" data-name="${escapeHtml(i.name)}" title="${escapeHtml(i.name)}">
                <img src="${i.path}" alt="">
                <span class="qb-thumb__used-badge">✓</span>
                <span class="qb-thumb__label">${escapeHtml(i.name)}</span>
                <button class="qb-thumb__remove" data-remove-img="${i.id}" title="Remove from uploads">🗑</button>
              </div>`).join('')}
          </div>
        ` : `
          <div class="qb-upload-dropzone">
            <div class="qb-upload-dropzone__icon">＋</div>
            <div class="qb-upload-dropzone__text">Drag & drop files here</div>
            <div class="qb-upload-dropzone__sub">or click to browse</div>
          </div>
        `}
      </div>`;

    const manifestHtml = Object.entries(bySite).map(([site, items]) => `
      <div class="qb-site" data-site="${escapeHtml(site)}">
        <h5>${site} <span class="qb-count">${items.length}</span></h5>
        <div class="qb-thumbs">
          ${items.map(i => `
            <div class="qb-thumb" draggable="true" data-path="${i.path}" data-name="${escapeHtml(i.name)}" title="${i.name}">
              <img src="${i.path}" alt="">
              <span class="qb-thumb__used-badge">✓</span>
              <span class="qb-thumb__label">${escapeHtml(i.name)}</span>
            </div>`).join('')}
        </div>
      </div>`).join('');

    tray.innerHTML = uploadsHtml + (manifestHtml || `<div class="qb-empty" style="margin-top:12px;">No site images found. Add files under
        <code>sites/</code> then run <code>python tools/build-manifest.py</code>.</div>`);

    tray.querySelectorAll('.qb-thumb').forEach(t => {
      t.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/qo-path', t.dataset.path);
        e.dataTransfer.effectAllowed = 'copy';
      });
      t.addEventListener('click', e => {
        if (e.target.closest('[data-remove-img]')) return;
        if (!sel) {
          const target = slots.find(s => !state[s.key]?.src)?.el || slots[0]?.el;
          if (target) {
            select(target, true);
            assign(target.dataset.slot, t.dataset.path);
          } else {
            status('Select a device first');
          }
          return;
        }
        assign(sel.dataset.slot, t.dataset.path);
      });
    });

    tray.querySelectorAll('[data-remove-img]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        removeCustomImage(btn.dataset.removeImg);
      });
    });

    const dropzone = tray.querySelector('.qb-upload-dropzone');
    if (dropzone) {
      dropzone.addEventListener('click', () => {
        const input = document.querySelector('.qb-img-input');
        if (input) input.click();
      });
    }

    markUsedThumbs();
    filterTray();
  }

  // Hides thumbnails (and whole site groups once every thumbnail in them is
  // hidden) that don't match imgFilter, rather than rebuilding the tray —
  // buildTray() already ran once for this content, no need to re-diff it.
  function filterTray() {
    const tray = document.querySelector('.qb-tray');
    if (!tray) return;
    let anyVisible = false;
    tray.querySelectorAll('.qb-site').forEach(site => {
      let visible = 0;
      site.querySelectorAll('.qb-thumb').forEach(t => {
        const hit = !imgFilter || t.dataset.name.toLowerCase().includes(imgFilter);
        t.classList.toggle('qb-thumb--hidden', !hit);
        if (hit) visible++;
      });
      const hasThumbs = !!site.querySelector('.qb-thumb');
      const hide = hasThumbs && visible === 0;
      site.classList.toggle('qb-site--hidden', hide);
      if (!hide) anyVisible = true;
    });

    let noMatch = tray.querySelector('.qb-tray-no-match');
    if (imgFilter && !anyVisible) {
      if (!noMatch) {
        noMatch = document.createElement('div');
        noMatch.className = 'qb-empty qb-tray-no-match';
        noMatch.style.marginTop = '12px';
        tray.append(noMatch);
      }
      noMatch.textContent = `No screenshots match "${imgFilter}".`;
    } else if (noMatch) {
      noMatch.remove();
    }
  }

  function assign(key, path) {
    const s = slotState(key);
    s.src = path;
    if (!s.fit) s.fit = guessFit(key, path);
    s.x = 0; s.y = 0; s.z = 1;
    apply(key); save(); renderInspector(); markUsedThumbs();
    status('Image assigned');
  }

  /* A wide crop in a fixed-ratio screen looks wrong under `cover`, which
     slices the sides off. Default those to fit-width instead. */
  function guessFit(key, path) {
    const el = slots.find(s => s.key === key)?.el;
    if (!el) return 'cover';
    if (el.classList.contains('qo-device--browser')) return 'auto';
    if (el.classList.contains('qo-device--phone')) return 'cover';
    return 'fit-width';
  }

  function markUsedThumbs() {
    const used = new Set(Object.values(state).map(s => s.src).filter(Boolean));
    document.querySelectorAll('.qb-thumb').forEach(t => {
      t.classList.toggle('qb-used', used.has(t.dataset.path));
    });
  }

  /* ---- logo wells -------------------------------------------------------------
     The empty boxes on a Tech Stack page. Unlike a placed image (which floats
     free at a percentage of the sheet) a logo belongs to its tile: it moves,
     duplicates and deletes with the tile around it, so it's keyed by an id
     stamped on the well rather than by position.

     Same storage reasoning as the image editor — uploads go in by library id
     so undo snapshots stay small, manifest artwork goes in by path. */

  function indexLogos() {
    document.querySelectorAll('.qo-page').forEach((page, pi) => {
      const pageKey = `p${pi + 1}`;
      // Highest number already on this page, scanned up front — a duplicated
      // tile walks in ahead of wells that already own later numbers.
      let li = 0;
      page.querySelectorAll(`[data-logo-id^="${pageKey}-l"]`).forEach(el => {
        const n = +(/-l(\d+)$/.exec(el.dataset.logoId)?.[1] || 0);
        if (n > li) li = n;
      });
      page.querySelectorAll('.qo-logo').forEach(el => {
        if (el.dataset.logoId) return;
        const next = nextFreeId('data-logo-id', `${pageKey}-l`, li);
        li = next.n;
        el.dataset.logoId = next.key;
      });
    });
  }

  function logoSrc(entry) {
    if (!entry) return '';
    if (entry.srcId) return customImages.find(i => i.id === entry.srcId)?.path || '';
    return entry.src || '';
  }

  function applyLogos() {
    const logos = state.logos || {};
    document.querySelectorAll('.qo-logo').forEach(well => {
      const src = logoSrc(logos[well.dataset.logoId]);
      let img = well.querySelector('img');
      if (src) {
        if (!img) {
          img = document.createElement('img');
          img.alt = '';
          well.appendChild(img);
        }
        if (img.getAttribute('src') !== src) img.setAttribute('src', src);
      } else if (img) {
        img.remove();
      }
      well.classList.toggle('qo-logo--filled', !!src);
      // Clear control only exists while there's something to clear, and only
      // in the builder — it carries a qb- prefix so the export strips it.
      let clear = well.querySelector('.qb-logo-clear');
      if (src && !clear) {
        clear = document.createElement('button');
        clear.className = 'qb-logo-clear';
        clear.title = 'Remove this logo';
        clear.textContent = '×';
        clear.onclick = e => { e.stopPropagation(); clearLogo(well.dataset.logoId); };
        well.appendChild(clear);
      } else if (!src && clear) {
        clear.remove();
      }
    });
  }

  function assignLogo(id, source) {
    if (!id) return;
    state.logos ||= {};
    state.logos[id] = source.srcId ? { srcId: source.srcId } : { src: source.src };
    applyLogos();
    save();
    status('Logo set');
  }

  function clearLogo(id) {
    if (!state.logos) return;
    delete state.logos[id];
    applyLogos();
    save();
    status('Logo removed');
  }

  /* Click an empty well (or a filled one, to replace it) and pick a file —
     the same one-step upload-and-place the Image Editor's ＋ Upload does. */
  function bindLogoWells() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    let pendingWell = null;

    input.addEventListener('change', async () => {
      const id = pendingWell;
      pendingWell = null;
      if (!id || !input.files.length) return;
      const ids = await addCustomImages(input.files);
      input.value = '';
      if (ids[0]) assignLogo(id, { srcId: ids[0] });
    });

    document.addEventListener('click', e => {
      const well = e.target.closest('.qo-logo');
      if (!well || e.target.closest('.qb-logo-clear')) return;
      if (isElementLocked(well.closest('.qo-stack__item') || well)) { status('Element is locked'); return; }
      pendingWell = well.dataset.logoId;
      input.click();
    });
  }

  /* ---- free-floating images -------------------------------------------------
     Images placed anywhere on a sheet, independent of the device mockups
     (which the document's own flow lays out). Geometry is stored in
     PERCENTAGES of the sheet, so a placement holds at any screen zoom and
     prints where it looks. Everything lives in state.freeImages, so undo,
     save, load and "Reset all" already cover it.

     Uploads are referenced by library id (srcId) rather than inlined, since
     `state` is snapshotted whole on every undo step and a handful of base64
     images would bloat that history fast — same reasoning as IMAGES_STORE.
     Site images out of the manifest are just paths, so those go in as `src`. */

  const IMG_FITS = [
    ['cover',   'Fill frame'],
    ['contain', 'Fit inside'],
    ['fill',    'Stretch'],
  ];

  const IMG_LAYERS = [
    ['front',  'In front'],
    ['behind', 'Behind text'],
  ];

  /* Shortcuts for the gradient-opacity axis, in the same degrees CSS
     linear-gradient() uses (0deg points up, angles run clockwise). The fine
     Angle slider covers everything in between. */
  const GRAD_DIRS = [
    [180, '↓ Down'],
    [0,   '↑ Up'],
    [90,  '→ Right'],
    [270, '← Left'],
    [135, '↘ Corner'],
  ];

  /* Defaults for a freshly enabled gradient: full opacity down to 40% of the
     way along, fading to nothing by the far edge. Visible the moment it's
     switched on, rather than a no-op the user has to go hunting for. */
  const GRAD_DEFAULTS = { angle: 180, start: 40, end: 100, from: 100, to: 0 };

  // Corner and edge handles, as unit vectors pointing away from the centre.
  const FI_HANDLES = {
    nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0],
    se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0],
  };

  let selImg = null;          // selected .qo-free-img element
  let freeImgFilter = '';     // search string in the Image Editor picker
  // A drag that ends outside the image resolves its click against an
  // ancestor — the sheet — which the canvas click handler would read as
  // "clicked the page" and use to drop the selection the drag just made.
  // Selection already happened on mousedown, so that click is swallowed.
  let fiSuppressClick = false;

  const clampNum = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const round2 = v => Math.round(v * 100) / 100;

  function freeImages() {
    state.freeImages ||= [];
    return state.freeImages;
  }

  function freeImgEntry(idOrEl) {
    if (!idOrEl) return null;
    const id = typeof idOrEl === 'string' ? idOrEl : idOrEl.dataset?.freeImg;
    return freeImages().find(e => e.id === id) || null;
  }

  function resolveImgSrc(entry) {
    if (!entry) return '';
    if (entry.srcId) return customImages.find(i => i.id === entry.srcId)?.path || '';
    return entry.src || '';
  }

  function imgLabel(entry) {
    if (entry.name) return entry.name;
    if (entry.srcId) return customImages.find(i => i.id === entry.srcId)?.name || 'Upload';
    return (entry.src || '').split('/').pop() || 'Image';
  }

  function visiblePages() {
    return [...document.querySelectorAll('.qo-page')].filter(p => p.style.display !== 'none');
  }

  /* Where a newly placed image goes when nothing says otherwise: whatever the
     current selection is standing on, else the sheet the viewport is looking
     at, so "add image" lands where the eye already is rather than on page 1. */
  function currentPage() {
    const fromSelection = selPage
      || selImg?.parentElement
      || sel?.closest('.qo-page')
      || selText?.closest('.qo-page');
    if (fromSelection && fromSelection.style.display !== 'none') return fromSelection;

    const mid = window.innerHeight / 2;
    const pages = visiblePages();
    return pages.find(p => {
      const r = p.getBoundingClientRect();
      return r.top <= mid && r.bottom >= mid;
    }) || pages[0] || null;
  }

  /* Reconciles state.freeImages against the DOM: drops wrappers whose entry
     is gone (undo, delete, reset), builds the ones that don't exist yet, and
     re-applies every entry's geometry and styling. Safe to call any time. */
  function applyFreeImages() {
    const entries = freeImages();
    const live = new Set(entries.map(e => e.id));

    document.querySelectorAll('.qo-free-img').forEach(el => {
      if (live.has(el.dataset.freeImg)) return;
      if (selImg === el) selImg = null;
      el.remove();
    });

    entries.forEach(entry => {
      const page = document.querySelector(`.qo-page[data-page-id="${entry.pageId}"]`) || visiblePages()[0];
      if (!page) return;
      let el = document.querySelector(`[data-free-img="${entry.id}"]`);
      if (!el) {
        el = document.createElement('figure');
        el.className = 'qo-free-img';
        el.dataset.freeImg = entry.id;
        el.innerHTML = '<img alt="">';
      }
      if (el.parentElement !== page) page.appendChild(el);
      applyFreeImgTo(el, entry);
    });

    if (selImg && !selImg.isConnected) selImg = null;
    updateFreeImgOverlay();
  }

  function applyFreeImgTo(el, e) {
    const img = el.querySelector('img');
    const src = resolveImgSrc(e);
    if (img) {
      if (img.getAttribute('src') !== src) img.setAttribute('src', src);
      img.setAttribute('alt', e.name || '');
      img.style.objectFit = e.fit || 'cover';

      const filters = [];
      if (e.grayscale) filters.push(`grayscale(${e.grayscale}%)`);
      if (e.blur) filters.push(`blur(${e.blur}px)`);
      if ((e.brightness ?? 100) !== 100) filters.push(`brightness(${e.brightness}%)`);
      if ((e.contrast ?? 100) !== 100) filters.push(`contrast(${e.contrast}%)`);
      if ((e.saturate ?? 100) !== 100) filters.push(`saturate(${e.saturate}%)`);
      img.style.filter = filters.join(' ');
    }

    el.style.left = e.x + '%';
    el.style.top = e.y + '%';
    el.style.width = e.w + '%';
    el.style.height = e.h + '%';

    // Array order is paint order within a layer — expressed as z-index rather
    // than by shuffling nodes, so raising one image never re-inserts an <img>
    // (which makes it flicker) and never disturbs the page's own markup.
    const idx = Math.max(0, freeImages().indexOf(e));
    el.style.zIndex = (e.layer === 'behind' ? -100 : 10) + idx;

    const t = [];
    if (e.rot) t.push(`rotate(${e.rot}deg)`);
    if (e.flipX) t.push('scaleX(-1)');
    if (e.flipY) t.push('scaleY(-1)');
    el.style.transform = t.join(' ');

    el.style.opacity = (e.opacity ?? 100) === 100 ? '' : String((e.opacity ?? 100) / 100);
    el.style.borderRadius = e.radius ? e.radius + 'px' : '';

    // Gradient opacity — a linear alpha mask laid over the whole figure, so
    // the image fades off along an axis instead of uniformly like the Opacity
    // slider does. Two lines along that axis: everything before `start` sits
    // at the `from` opacity, everything past `end` at `to`, and in between the
    // browser interpolates, which is what makes the fade proportional.
    // A decreasing pair (end < start) is left to CSS, which clamps the second
    // stop up to the first — a hard cut on that line, not a broken gradient.
    const g = e.grad || {};
    if (g.on) {
      const a = g.angle ?? GRAD_DEFAULTS.angle;
      const from = ((g.from ?? GRAD_DEFAULTS.from) / 100).toFixed(3);
      const to = ((g.to ?? GRAD_DEFAULTS.to) / 100).toFixed(3);
      const mask = `linear-gradient(${a}deg, rgba(0, 0, 0, ${from}) ${g.start ?? GRAD_DEFAULTS.start}%, rgba(0, 0, 0, ${to}) ${g.end ?? GRAD_DEFAULTS.end}%)`;
      el.style.maskImage = mask;
      el.style.webkitMaskImage = mask;
    } else {
      el.style.maskImage = '';
      el.style.webkitMaskImage = '';
    }

    const shadows = [];
    if (e.shadow) {
      const s = e.shadow / 100;
      shadows.push(`0 ${(12 * s).toFixed(1)}px ${(30 * s).toFixed(1)}px rgba(0, 0, 0, ${(0.55 * s).toFixed(2)})`);
    }
    if (e.glow) {
      const rgb = resolveColorRgb(e.glowColor || 'teal', e.glowColorHex, effectRgb);
      const s = e.glow / 100;
      shadows.push(`0 0 ${(26 * s).toFixed(1)}px rgba(${rgb}, ${(0.8 * s).toFixed(2)})`);
    }
    el.style.boxShadow = shadows.join(', ');

    if (e.borderW) {
      const rgb = resolveColorRgb(e.borderColor || 'white', e.borderColorHex, effectRgb);
      el.style.border = `${e.borderW}px solid rgba(${rgb}, 0.9)`;
    } else {
      el.style.border = '';
    }

    el.classList.toggle('qb-fi-locked', !!e.locked);
  }

  /* Selection handles ride in their own overlay pinned over the image rather
     than inside it — the wrapper clips to its own frame (that's what gives
     the corner radius), so handles parented to it would be sliced in half. */
  function updateFreeImgOverlay() {
    const stale = document.querySelector('.qb-fi-overlay');
    const e = freeImgEntry(selImg);
    if (!selImg || !selImg.isConnected || !e || e.locked) {
      stale?.remove();
      return;
    }

    const page = selImg.parentElement;
    let ov = stale;
    if (!ov || ov.parentElement !== page) {
      stale?.remove();
      ov = document.createElement('div');
      ov.className = 'qb-fi-overlay';
      ov.innerHTML = Object.keys(FI_HANDLES)
        .map(h => `<i class="qb-fi-h qb-fi-h--${h}" data-fi-handle="${h}"></i>`).join('')
        + '<i class="qb-fi-rot" data-fi-handle="rot" title="Drag to rotate — hold Shift for 15° steps"></i>';
      page.appendChild(ov);
    }
    ov.style.left = e.x + '%';
    ov.style.top = e.y + '%';
    ov.style.width = e.w + '%';
    ov.style.height = e.h + '%';
    ov.style.transform = e.rot ? `rotate(${e.rot}deg)` : '';
  }

  /* Drops an image on a page. `source` is either { srcId } (an entry in the
     uploads library) or { src } (a manifest path). atX/atY are percentages of
     the sheet to centre it on; both default to the middle. */
  function placeFreeImage(source, page, atX, atY) {
    const target = page || currentPage();
    if (!target) { status('No page to place an image on'); return null; }

    const entry = {
      id: 'fi-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      pageId: target.dataset.pageId,
      name: source.name || '',
      x: 0, y: 0, w: 30, h: 22,
      rot: 0, flipX: false, flipY: false,
      fit: 'cover', layer: 'front',
      opacity: 100, radius: 0,
      shadow: 0, glow: 0, borderW: 0,
      grayscale: 0, blur: 0, brightness: 100, contrast: 100, saturate: 100,
    };
    if (source.srcId) entry.srcId = source.srcId; else entry.src = source.src;

    const cx = atX ?? 50, cy = atY ?? 50;
    let settled = false;
    const settle = (aspect) => {
      if (settled) return;   // a cached image can report complete AND fire onload
      settled = true;
      const pw = target.offsetWidth || 1, ph = target.offsetHeight || 1;
      const wPx = pw * 0.30;
      const hPx = aspect ? wPx / aspect : ph * 0.25;
      entry.w = round2(wPx / pw * 100);
      entry.h = round2(Math.min(hPx, ph * 0.75) / ph * 100);
      entry.x = round2(clampNum(cx - entry.w / 2, 0, 100 - entry.w));
      entry.y = round2(clampNum(cy - entry.h / 2, 0, 100 - entry.h));
      applyFreeImages();
      save();
      renderImageEditor();
    };

    freeImages().push(entry);
    applyFreeImages();
    selectFreeImage(document.querySelector(`[data-free-img="${entry.id}"]`));

    // Size it to the image's own aspect ratio once the browser knows it —
    // placing first and refining after keeps the click instant.
    const probe = new Image();
    probe.onload = () => settle(probe.naturalWidth / probe.naturalHeight);
    probe.onerror = () => settle(0);
    probe.src = resolveImgSrc(entry);
    if (probe.complete && probe.naturalWidth) settle(probe.naturalWidth / probe.naturalHeight);

    status('Image placed');
    return entry;
  }

  function deleteFreeImage(id) {
    state.freeImages = freeImages().filter(e => e.id !== id);
    if (selImg?.dataset.freeImg === id) selImg = null;
    applyFreeImages();
    save();
    renderImageEditor();
    status('Image removed');
  }

  function duplicateFreeImage(id) {
    const src = freeImgEntry(id);
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = 'fi-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    copy.x = round2(clampNum(copy.x + 3, 0, 100 - copy.w));
    copy.y = round2(clampNum(copy.y + 3, 0, 100 - copy.h));
    freeImages().push(copy);
    applyFreeImages();
    save();
    selectFreeImage(document.querySelector(`[data-free-img="${copy.id}"]`));
    status('Image duplicated');
  }

  function selectFreeImage(el, scroll) {
    if (el && selImg === el) return;
    clearSelection();
    selImg = el || null;
    if (selImg) {
      selImg.classList.add('qb-fi-sel');
      if (scroll) selImg.scrollIntoView({ block: 'center', behavior: 'smooth' });
      document.body.classList.add('qb-text-open');
      switchLeftTab('image');
    }
    updateFreeImgOverlay();
    renderInspector();
  }

  /* ---- Image Editor panel ---------------------------------------------------- */

  function buildImagePicker() {
    const picker = document.querySelector('.qb-fi-picker');
    if (!picker) return;

    const manifest = (window.QO_MANIFEST || []).map(m => ({ src: m.path, name: m.name, group: m.site }));
    const uploads = customImages.map(i => ({ srcId: i.id, path: i.path, name: i.name, group: 'Your uploads' }));
    const all = [...uploads, ...manifest]
      .filter(i => !freeImgFilter || (i.name || '').toLowerCase().includes(freeImgFilter));

    if (!all.length) {
      picker.innerHTML = `<div class="qb-empty">${freeImgFilter
        ? `Nothing matches "${escapeHtml(freeImgFilter)}".`
        : 'Upload an image above, or add files under <code>sites/</code> and run <code>python tools/build-manifest.py</code>.'}</div>`;
      return;
    }

    picker.innerHTML = all.map(i => {
      const ref = i.srcId ? `data-fi-src-id="${i.srcId}"` : `data-fi-src="${escapeHtml(i.src)}"`;
      return `<div class="qb-thumb" draggable="true" ${ref} data-name="${escapeHtml(i.name || '')}" title="${escapeHtml(i.name || '')}">
        <img src="${escapeHtml(i.path || i.src)}" alt="">
        <span class="qb-thumb__label">${escapeHtml(i.name || '')}</span>
      </div>`;
    }).join('');

    picker.querySelectorAll('.qb-thumb').forEach(t => {
      const source = () => (t.dataset.fiSrcId
        ? { srcId: t.dataset.fiSrcId, name: t.dataset.name }
        : { src: t.dataset.fiSrc, name: t.dataset.name });
      t.addEventListener('click', () => placeFreeImage(source()));
      t.addEventListener('dragstart', ev => {
        ev.dataTransfer.setData('text/qo-free-img', JSON.stringify(source()));
        // Devices read this one — dragging a picker thumbnail onto a mockup
        // should still assign it there, same as dragging from the tray.
        const path = t.dataset.fiSrc || customImages.find(i => i.id === t.dataset.fiSrcId)?.path;
        if (path) ev.dataTransfer.setData('text/qo-path', path);
        ev.dataTransfer.effectAllowed = 'copy';
      });
    });
  }

  function renderImageEditor() {
    renderImageList();
    renderImageInspector();
  }

  function renderImageList() {
    const list = document.querySelector('.qb-fi-list');
    if (!list) return;
    const entries = freeImages();

    if (!entries.length) {
      list.innerHTML = `<div class="qb-empty">No images placed yet. Pick one above to drop it on the page.</div>`;
      return;
    }

    const pageLabel = id => {
      const page = document.querySelector(`.qo-page[data-page-id="${id}"]`);
      if (!page) return 'Unplaced';
      const num = page.querySelector('.qo-page__num')?.textContent?.trim();
      const title = page.querySelector('.qo-page__title, .qo-cover__title')?.textContent?.trim().slice(0, 28);
      return title ? `${num ? num + ' · ' : ''}${title}` : `Page ${num || '?'}`;
    };

    const groups = new Map();
    entries.forEach(e => {
      if (!groups.has(e.pageId)) groups.set(e.pageId, []);
      groups.get(e.pageId).push(e);
    });

    list.innerHTML = [...groups.entries()].map(([pageId, items]) => `
      <div class="qb-fi-group">
        <div class="qb-fi-group__label">${escapeHtml(pageLabel(pageId))}</div>
        ${items.map(e => `
          <div class="qb-fi-item ${selImg?.dataset.freeImg === e.id ? 'qb-on' : ''}" data-fi-select="${e.id}">
            <img src="${escapeHtml(resolveImgSrc(e))}" alt="">
            <span class="qb-fi-item__name">${escapeHtml(imgLabel(e))}</span>
            ${e.locked ? '<span class="qb-fi-item__lock" title="Locked">🔒</span>' : ''}
            <button class="qb-fi-item__del" data-fi-delete="${e.id}" title="Remove from page">🗑</button>
          </div>`).join('')}
      </div>`).join('');

    list.querySelectorAll('[data-fi-select]').forEach(item => {
      item.addEventListener('click', ev => {
        if (ev.target.closest('[data-fi-delete]')) return;
        selectFreeImage(document.querySelector(`[data-free-img="${item.dataset.fiSelect}"]`), true);
      });
    });
    list.querySelectorAll('[data-fi-delete]').forEach(btn => {
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        deleteFreeImage(btn.dataset.fiDelete);
      });
    });
  }

  function renderImageInspector() {
    const box = document.querySelector('.qb-fi-inspector');
    if (!box) return;

    const e = freeImgEntry(selImg);
    if (!e) {
      box.innerHTML = `<div class="qb-empty">Click a placed image on the page — or one in the list above — to move it, resize it, and restyle it.</div>`;
      return;
    }

    const pages = visiblePages();
    const pageOptions = pages.map((p, i) => {
      const num = p.querySelector('.qo-page__num')?.textContent?.trim() || String(i + 1);
      const title = p.querySelector('.qo-page__title, .qo-cover__title')?.textContent?.trim().slice(0, 24) || '';
      return `<option value="${p.dataset.pageId}" ${p.dataset.pageId === e.pageId ? 'selected' : ''}>${escapeHtml(`${num} — ${title || 'Page'}`)}</option>`;
    }).join('');

    const grad = e.grad || {};
    const gAngle = grad.angle ?? GRAD_DEFAULTS.angle;
    const gStart = grad.start ?? GRAD_DEFAULTS.start;
    const gEnd = grad.end ?? GRAD_DEFAULTS.end;
    const gFrom = grad.from ?? GRAD_DEFAULTS.from;
    const gTo = grad.to ?? GRAD_DEFAULTS.to;

    box.innerHTML = `
      <div class="qb-slot-name">${escapeHtml(imgLabel(e))}</div>
      <div class="qb-slot-sub">Placed image · ${e.id}</div>

      <div class="qb-card">
        <h4 class="qb-card__title">Placement</h4>
        <div class="qb-field">
          <label>Page</label>
          <select class="qb-select" data-fi-page>${pageOptions}</select>
        </div>
        <div class="qb-field">
          <label>Layer</label>
          <div class="qb-seg">
            ${IMG_LAYERS.map(([v, l]) => `<button data-fi-layer="${v}" class="${(e.layer || 'front') === v ? 'qb-on' : ''}">${l}</button>`).join('')}
          </div>
        </div>
        <div class="qb-field">
          <label>Left <span>${round2(e.x)} %</span></label>
          <input type="range" data-fi="x" min="-40" max="140" step="0.5" value="${e.x}">
        </div>
        <div class="qb-field">
          <label>Top <span>${round2(e.y)} %</span></label>
          <input type="range" data-fi="y" min="-40" max="140" step="0.5" value="${e.y}">
        </div>
        <div class="qb-seg">
          <button data-fi-center="h">Centre across</button>
          <button data-fi-center="v">Centre down</button>
        </div>
      </div>

      <div class="qb-card">
        <h4 class="qb-card__title">Size</h4>
        <div class="qb-field">
          <label>Width <span>${round2(e.w)} %</span></label>
          <input type="range" data-fi="w" min="2" max="140" step="0.5" value="${e.w}">
        </div>
        <div class="qb-field">
          <label>Height <span>${round2(e.h)} %</span></label>
          <input type="range" data-fi="h" min="2" max="140" step="0.5" value="${e.h}">
        </div>
        <div class="qb-field">
          <label>Fit</label>
          <div class="qb-seg">
            ${IMG_FITS.map(([v, l]) => `<button data-fi-fit="${v}" class="${(e.fit || 'cover') === v ? 'qb-on' : ''}">${l}</button>`).join('')}
          </div>
        </div>
        <div class="qb-seg">
          <button data-fi-aspect>Match image shape</button>
          <button data-fi-fill-page>Fill the page</button>
        </div>
      </div>

      <div class="qb-card">
        <h4 class="qb-card__title">Transform</h4>
        <div class="qb-field">
          <label>Rotation <span>${Math.round(e.rot || 0)}°</span></label>
          <input type="range" data-fi="rot" min="-180" max="180" step="1" value="${e.rot || 0}">
        </div>
        <div class="qb-field">
          <label>Flip</label>
          <div class="qb-seg">
            <button data-fi-flip="flipX" class="${e.flipX ? 'qb-on' : ''}">Horizontal</button>
            <button data-fi-flip="flipY" class="${e.flipY ? 'qb-on' : ''}">Vertical</button>
            <button data-fi-rot-reset>Straighten</button>
          </div>
        </div>
      </div>

      <div class="qb-card">
        <h4 class="qb-card__title">Style</h4>
        <div class="qb-field">
          <label>Opacity <span>${e.opacity ?? 100} %</span></label>
          <input type="range" data-fi="opacity" min="5" max="100" step="1" value="${e.opacity ?? 100}">
        </div>
        <div class="qb-field">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">Gradient opacity <input type="checkbox" data-fi-grad-on ${grad.on ? 'checked' : ''}></label>
        </div>
        ${grad.on ? `
        <div class="qb-field">
          <label>Direction</label>
          <div class="qb-seg">
            ${GRAD_DIRS.map(([v, l]) => `<button data-fi-grad-dir="${v}" class="${gAngle === v ? 'qb-on' : ''}">${l}</button>`).join('')}
          </div>
        </div>
        <div class="qb-field">
          <label>Angle <span>${gAngle}°</span></label>
          <input type="range" data-fi-grad="angle" min="0" max="360" step="1" value="${gAngle}">
        </div>
        <div class="qb-field">
          <label>Start line <span>${gStart} %</span></label>
          <input type="range" data-fi-grad="start" min="0" max="100" step="1" value="${gStart}">
        </div>
        <div class="qb-field">
          <label>End line <span>${gEnd} %</span></label>
          <input type="range" data-fi-grad="end" min="0" max="100" step="1" value="${gEnd}">
        </div>
        <div class="qb-field">
          <label>Opacity at start <span>${gFrom} %</span></label>
          <input type="range" data-fi-grad="from" min="0" max="100" step="1" value="${gFrom}">
        </div>
        <div class="qb-field">
          <label>Opacity at end <span>${gTo} %</span></label>
          <input type="range" data-fi-grad="to" min="0" max="100" step="1" value="${gTo}">
        </div>
        <div class="qb-seg" style="margin-bottom:12px;">
          <button data-fi-grad-flip>Flip the fade</button>
          <button data-fi-grad-reset>Reset gradient</button>
        </div>
        <div class="qb-hint">The two lines are where the fade starts and finishes, measured along the direction arrow — 0% is the edge it points away from, 100% the edge it points at. Between them the image dissolves proportionally.</div>
        ` : ''}
        <div class="qb-field" style="margin-top:12px;">
          <label>Corner radius <span>${e.radius || 0} px</span></label>
          <input type="range" data-fi="radius" min="0" max="80" step="1" value="${e.radius || 0}">
        </div>
        <div class="qb-field">
          <label>Shadow <span>${e.shadow || 0} %</span></label>
          <input type="range" data-fi="shadow" min="0" max="100" step="1" value="${e.shadow || 0}">
        </div>
        <div class="qb-field">
          <label>Glow <span>${e.glow || 0} %</span></label>
          <input type="range" data-fi="glow" min="0" max="100" step="1" value="${e.glow || 0}">
        </div>
        ${e.glow ? `<div class="qb-field">
          <label>Glow colour</label>
          ${renderColorRow(EFFECT_COLORS, 'fi-glow', e.glowColor || 'teal', e.glowColorHex, false)}
        </div>` : ''}
        <div class="qb-field">
          <label>Border <span>${e.borderW || 0} px</span></label>
          <input type="range" data-fi="borderW" min="0" max="16" step="1" value="${e.borderW || 0}">
        </div>
        ${e.borderW ? `<div class="qb-field">
          <label>Border colour</label>
          ${renderColorRow(EFFECT_COLORS, 'fi-border', e.borderColor || 'white', e.borderColorHex, false)}
        </div>` : ''}
      </div>

      <div class="qb-card">
        <h4 class="qb-card__title">Filters</h4>
        <div class="qb-field">
          <label>Grayscale <span>${e.grayscale || 0} %</span></label>
          <input type="range" data-fi="grayscale" min="0" max="100" step="1" value="${e.grayscale || 0}">
        </div>
        <div class="qb-field">
          <label>Blur <span>${e.blur || 0} px</span></label>
          <input type="range" data-fi="blur" min="0" max="20" step="0.5" value="${e.blur || 0}">
        </div>
        <div class="qb-field">
          <label>Brightness <span>${e.brightness ?? 100} %</span></label>
          <input type="range" data-fi="brightness" min="20" max="200" step="1" value="${e.brightness ?? 100}">
        </div>
        <div class="qb-field">
          <label>Contrast <span>${e.contrast ?? 100} %</span></label>
          <input type="range" data-fi="contrast" min="20" max="200" step="1" value="${e.contrast ?? 100}">
        </div>
        <div class="qb-field">
          <label>Saturation <span>${e.saturate ?? 100} %</span></label>
          <input type="range" data-fi="saturate" min="0" max="200" step="1" value="${e.saturate ?? 100}">
        </div>
        <div class="qb-seg">
          <button data-fi-reset-style>Reset styling</button>
        </div>
      </div>

      <div class="qb-inspector-actions">
        <div class="qb-seg" style="margin-bottom:12px;">
          <button data-fi-forward>Bring forward</button>
          <button data-fi-backward>Send back</button>
        </div>
        <div class="qb-seg" style="margin-bottom:12px;">
          <button data-fi-lock class="${e.locked ? 'qb-on' : ''}">${e.locked ? '🔒 Locked' : '🔓 Lock'}</button>
          <button data-fi-duplicate>Duplicate</button>
          <button data-fi-delete-sel style="color:#FF6B6B;">Delete</button>
        </div>
        <div class="qb-hint">Drag the image to move it, its corners to resize (hold Shift to keep its shape), and the round handle above it to rotate. Arrow keys nudge, Delete removes.</div>
      </div>`;

    const live = () => freeImgEntry(e.id) || e;
    const repaint = () => { applyFreeImgTo(selImg, live()); updateFreeImgOverlay(); };

    // Every slider writes straight through to the entry and repaints live;
    // the commit (and the undo step that comes with it) waits for `change`,
    // so dragging a slider doesn't fill the history with every frame.
    box.querySelectorAll('[data-fi]').forEach(input => {
      const prop = input.dataset.fi;
      const unit = prop === 'rot' ? '°'
        : ['x', 'y', 'w', 'h', 'opacity', 'shadow', 'glow', 'grayscale', 'brightness', 'contrast', 'saturate'].includes(prop) ? ' %'
        : ' px';
      input.addEventListener('input', () => {
        live()[prop] = +input.value;
        repaint();
        const out = input.previousElementSibling?.querySelector('span');
        if (out) out.textContent = round2(+input.value) + unit;
      });
      input.addEventListener('change', () => {
        save();
        renderImageList();
        // Glow and border reveal a colour row once they're turned up at all,
        // so those two have to redraw the panel — on `change`, i.e. when the
        // slider is released, never mid-drag.
        if (prop === 'glow' || prop === 'borderW') renderImageInspector();
      });
    });

    // Gradient opacity lives one level down, in entry.grad — its own loop so
    // the generic [data-fi] sliders above stay pointed at top-level props.
    // Same live-repaint / commit-on-release split as those.
    const gradState = () => {
      const cur = live();
      return (cur.grad = cur.grad || {});
    };
    box.querySelectorAll('[data-fi-grad]').forEach(input => {
      const prop = input.dataset.fiGrad;
      const unit = prop === 'angle' ? '°' : ' %';
      input.addEventListener('input', () => {
        gradState()[prop] = +input.value;
        repaint();
        const out = input.previousElementSibling?.querySelector('span');
        if (out) out.textContent = round2(+input.value) + unit;
      });
      input.addEventListener('change', () => { save(); renderImageList(); });
    });

    const gradOn = box.querySelector('[data-fi-grad-on]');
    if (gradOn) gradOn.addEventListener('change', () => {
      gradState().on = gradOn.checked;
      repaint(); save(); renderImageInspector();
      status(gradOn.checked ? 'Gradient opacity on' : 'Gradient opacity off');
    });

    // A direction shortcut implies "and switch it on" — clicking one while the
    // gradient is off would otherwise look like it did nothing.
    box.querySelectorAll('[data-fi-grad-dir]').forEach(b => b.onclick = () => {
      const g = gradState();
      g.on = true;
      g.angle = +b.dataset.fiGradDir;
      repaint(); save(); renderImageInspector();
    });

    const gradFlip = box.querySelector('[data-fi-grad-flip]');
    if (gradFlip) gradFlip.onclick = () => {
      const g = gradState();
      const from = g.from ?? GRAD_DEFAULTS.from;
      g.from = g.to ?? GRAD_DEFAULTS.to;
      g.to = from;
      repaint(); save(); renderImageInspector();
    };

    const gradReset = box.querySelector('[data-fi-grad-reset]');
    if (gradReset) gradReset.onclick = () => {
      Object.assign(gradState(), GRAD_DEFAULTS, { on: true });
      repaint(); save(); renderImageInspector();
      status('Gradient reset');
    };

    const pageSelect = box.querySelector('[data-fi-page]');
    if (pageSelect) pageSelect.onchange = () => {
      live().pageId = pageSelect.value;
      applyFreeImages();
      save();
      renderImageEditor();
      selImg?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };

    box.querySelectorAll('[data-fi-layer]').forEach(b => b.onclick = () => {
      live().layer = b.dataset.fiLayer;
      repaint(); save(); renderImageInspector();
    });
    box.querySelectorAll('[data-fi-fit]').forEach(b => b.onclick = () => {
      live().fit = b.dataset.fiFit;
      repaint(); save(); renderImageInspector();
    });
    box.querySelectorAll('[data-fi-flip]').forEach(b => b.onclick = () => {
      const cur = live();
      cur[b.dataset.fiFlip] = !cur[b.dataset.fiFlip];
      repaint(); save(); renderImageInspector();
    });
    box.querySelectorAll('[data-fi-center]').forEach(b => b.onclick = () => {
      const cur = live();
      if (b.dataset.fiCenter === 'h') cur.x = round2((100 - cur.w) / 2);
      else cur.y = round2((100 - cur.h) / 2);
      repaint(); save(); renderImageInspector();
    });

    box.querySelector('[data-fi-rot-reset]').onclick = () => {
      live().rot = 0; repaint(); save(); renderImageInspector();
    };

    // Sizing helpers: the aspect one asks the browser what shape the file
    // actually is, then solves for the height that matches it on this sheet.
    box.querySelector('[data-fi-aspect]').onclick = () => {
      const cur = live();
      const page = selImg.parentElement;
      const probe = new Image();
      probe.onload = () => {
        const pw = page.offsetWidth || 1, ph = page.offsetHeight || 1;
        const wPx = cur.w / 100 * pw;
        cur.h = round2(wPx / (probe.naturalWidth / probe.naturalHeight) / ph * 100);
        repaint(); save(); renderImageInspector();
      };
      probe.src = resolveImgSrc(cur);
    };
    box.querySelector('[data-fi-fill-page]').onclick = () => {
      const cur = live();
      Object.assign(cur, { x: 0, y: 0, w: 100, h: 100, rot: 0 });
      repaint(); save(); renderImageInspector();
    };

    wireColorRow(box, 'fi-glow',
      v => { live().glowColor = v; repaint(); save(); renderImageInspector(); },
      v => { live().glowColorHex = v; repaint(); });
    wireColorRow(box, 'fi-border',
      v => { live().borderColor = v; repaint(); save(); renderImageInspector(); },
      v => { live().borderColorHex = v; repaint(); });

    box.querySelector('[data-fi-reset-style]').onclick = () => {
      const cur = live();
      delete cur.grad;
      Object.assign(cur, {
        rot: 0, flipX: false, flipY: false, opacity: 100, radius: 0,
        shadow: 0, glow: 0, borderW: 0,
        grayscale: 0, blur: 0, brightness: 100, contrast: 100, saturate: 100,
      });
      repaint(); save(); renderImageInspector();
    };

    // Reordering is a move within state.freeImages — applyFreeImgTo() reads
    // the new index back out as a z-index.
    const reorder = dir => {
      const arr = freeImages();
      const i = arr.findIndex(x => x.id === e.id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) { status('Already at the ' + (dir > 0 ? 'front' : 'back')); return; }
      [arr[i], arr[j]] = [arr[j], arr[i]];
      applyFreeImages(); save(); renderImageEditor();
    };
    box.querySelector('[data-fi-forward]').onclick = () => reorder(1);
    box.querySelector('[data-fi-backward]').onclick = () => reorder(-1);

    box.querySelector('[data-fi-lock]').onclick = () => {
      const cur = live();
      cur.locked = !cur.locked;
      repaint(); updateFreeImgOverlay(); save(); renderImageEditor();
      status(cur.locked ? 'Image locked' : 'Image unlocked');
    };
    box.querySelector('[data-fi-duplicate]').onclick = () => duplicateFreeImage(e.id);
    box.querySelector('[data-fi-delete-sel]').onclick = () => deleteFreeImage(e.id);
  }

  /* ---- free image canvas interaction ------------------------------------------
     Move, resize from any of eight handles, and rotate — all in the sheet's
     own coordinate space, so a page scaled by browser zoom still tracks the
     cursor 1:1. Resizing a rotated image works in the element's local frame
     and pins the opposite corner, the way a design tool does. */

  function bindFreeImageCanvas() {
    let fi = null;

    document.addEventListener('mousedown', ev => {
      const handle = ev.target.closest('[data-fi-handle]');
      const el = handle ? selImg : ev.target.closest('.qo-free-img');
      if (!el) return;
      const entry = freeImgEntry(el);
      if (!entry) return;

      if (entry.locked) { selectFreeImage(el); return; }

      ev.preventDefault();
      ev.stopPropagation();
      selectFreeImage(el);

      const page = el.parentElement;
      const pr = page.getBoundingClientRect();
      fi = {
        mode: !handle ? 'move' : handle.dataset.fiHandle === 'rot' ? 'rot' : 'resize',
        dir: handle?.dataset.fiHandle,
        entry, el, page,
        k: pr.width / (page.offsetWidth || 1) || 1,
        pw: page.offsetWidth || 1,
        ph: page.offsetHeight || 1,
        sx: ev.clientX, sy: ev.clientY,
        cx: pr.left + (entry.x + entry.w / 2) / 100 * pr.width,
        cy: pr.top + (entry.y + entry.h / 2) / 100 * pr.height,
        start: { ...entry },
        moved: false,
      };
      document.body.classList.add('qb-fi-dragging');
    }, true);   // capture: an image sitting over a mockup must win the drag

    document.addEventListener('mousemove', ev => {
      if (!fi) return;
      const dx = (ev.clientX - fi.sx) / fi.k;   // sheet-local px
      const dy = (ev.clientY - fi.sy) / fi.k;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) fi.moved = true;
      const { entry, start } = fi;

      if (fi.mode === 'move') {
        // Keep at least a tenth of the image on the sheet — sliding one fully
        // off would leave it unreachable except through the list.
        entry.x = round2(clampNum(start.x + dx / fi.pw * 100, -start.w * 0.9, 100 - start.w * 0.1));
        entry.y = round2(clampNum(start.y + dy / fi.ph * 100, -start.h * 0.9, 100 - start.h * 0.1));
      } else if (fi.mode === 'rot') {
        const deg = Math.atan2(ev.clientY - fi.cy, ev.clientX - fi.cx) * 180 / Math.PI + 90;
        const snapped = ev.shiftKey ? Math.round(deg / 15) * 15 : Math.round(deg);
        entry.rot = ((snapped + 180) % 360 + 360) % 360 - 180;
      } else {
        resizeFreeImg(fi, dx, dy, ev.shiftKey);
      }

      applyFreeImgTo(fi.el, entry);
      updateFreeImgOverlay();
    });

    document.addEventListener('mouseup', () => {
      if (!fi) return;
      const moved = fi.moved;
      fi = null;
      document.body.classList.remove('qb-fi-dragging');
      if (moved) { fiSuppressClick = true; save(); renderImageEditor(); }
    });

    /* The drag delta arrives in sheet coordinates; a rotated image resizes
       along its OWN axes, so it's rotated into the element's frame first.
       Growing changes the box about its centre, which would drag the far
       corner along with it — so the centre is walked back by half the growth
       (rotated out to sheet coordinates again) to pin that corner in place. */
    function resizeFreeImg(d, dx, dy, keepAspect) {
      const [hx, hy] = FI_HANDLES[d.dir] || [1, 1];
      const rad = (d.start.rot || 0) * Math.PI / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);

      const lx = dx * cos + dy * sin;
      const ly = -dx * sin + dy * cos;

      const w0 = d.start.w / 100 * d.pw;
      const h0 = d.start.h / 100 * d.ph;
      let w = Math.max(10, w0 + hx * lx);
      let h = Math.max(10, h0 + hy * ly);
      if (keepAspect && hx && hy && h0) h = w / (w0 / h0);

      const cx0 = (d.start.x + d.start.w / 2) / 100 * d.pw;
      const cy0 = (d.start.y + d.start.h / 2) / 100 * d.ph;
      const ox = hx * (w - w0) / 2;
      const oy = hy * (h - h0) / 2;
      const cx = cx0 + ox * cos - oy * sin;
      const cy = cy0 + ox * sin + oy * cos;

      d.entry.w = round2(w / d.pw * 100);
      d.entry.h = round2(h / d.ph * 100);
      d.entry.x = round2((cx - w / 2) / d.pw * 100);
      d.entry.y = round2((cy - h / 2) / d.ph * 100);
    }
  }

  /* ---- inspector ------------------------------------------------------------- */

  function renderInspector() {
    renderImageEditor();

    // 1. Text Inspector (Left Drawer)
    const textInspector = document.querySelector('.qb-text-inspector');
    if (textInspector) {
      if (!selText) {
        textInspector.innerHTML = `<div class="qb-empty">Click any text element on the page, or hover it and hit ✎ Edit, to edit its content and formatting.</div>`;
      } else {
        const key = selText.dataset.textId;
        const meta = textSlots.find(s => s.key === key) || { label: 'Text Element', sub: key };
        const curText = selText.innerText;

        // Toggle buttons reflect what's actually on screen, not just an
        // explicit override — so a heading that's already bold in the page's
        // own CSS shows "Bold" pressed in before anyone touches this tray.
        const st = state.styles?.[key] || {};
        const cs = getComputedStyle(selText);
        const curFont = st.fontFamily !== undefined ? st.fontFamily
          : cs.fontFamily.includes('Fraunces') ? 'editorial'
          : cs.fontFamily.includes('JetBrains') ? 'mono'
          : cs.fontFamily.includes('Hanken') ? 'brand' : '';
        const curCustomFont = curFont.startsWith('custom:') ? fontEntry(curFont.slice(7)) : null;
        const curBold = st.bold !== undefined ? st.bold : parseInt(cs.fontWeight, 10) >= 600;
        const curItalic = st.italic !== undefined ? st.italic : cs.fontStyle === 'italic';
        const curUnderline = st.underline !== undefined ? st.underline : cs.textDecorationLine.includes('underline');
        const curSize = st.fontSize || Math.round(parseFloat(cs.fontSize) * 0.75);
        const curAlign = st.align || cs.textAlign || 'left';

        textInspector.innerHTML = `
          <div class="qb-slot-name">${meta.label}</div>
          <div class="qb-slot-sub">${meta.sub} · ${key}</div>

          <div class="qb-field">
            <label>Edit Text Content</label>
            <textarea class="qb-textarea qb-text-input" rows="4">${curText}</textarea>
          </div>

          <div class="qb-seg" style="margin-bottom:12px">
            <button data-reset-text style="flex:1">Reset text</button>
          </div>

          <div class="qb-field">
            <label>Font${curCustomFont ? ` <span>${escapeHtml(curCustomFont.label)}</span>` : ''}</label>
            <div class="qb-seg">
              ${FONTS.map(([v, l]) => `<button data-font="${v}" class="${curFont === v ? 'qb-on' : ''}">${l}</button>`).join('')}
            </div>
            ${customFonts.length ? `
              <select class="qb-select" data-font-custom style="margin-top:6px">
                <option value="">Your fonts…</option>
                ${customFonts.map(f => `<option value="custom:${f.id}" ${curFont === 'custom:' + f.id ? 'selected' : ''} style="font-family:${escapeHtml(cssFamily(f.family))}">${escapeHtml(f.label)}${f.kind === 'local' ? ' (installed)' : ''}</option>`).join('')}
              </select>` : ''}
            <div class="qb-seg" style="margin-top:6px">
              <button data-font-upload title="Embed a .ttf, .otf or .woff file">Upload font…</button>
              <button data-font-local class="${localFontRowOpen ? 'qb-on' : ''}" title="Use a typeface installed on this computer">Windows fonts…</button>
              ${curCustomFont ? `<button data-font-remove title="Remove ${escapeHtml(curCustomFont.label)} from this project">Remove</button>` : ''}
            </div>
            ${localFontRowOpen ? `
              <div style="display:flex; gap:4px; margin-top:6px">
                <input class="qb-select" data-local-font list="qb-local-fonts" placeholder="Type a font name…" style="flex:1" autocomplete="off">
                <datalist id="qb-local-fonts">
                  ${localFamilies.map(f => `<option value="${escapeHtml(f)}"></option>`).join('')}
                </datalist>
                <button class="qb-btn" data-local-add>Use</button>
              </div>
              <div class="qb-hint">${localFamilies.length
                ? `${localFamilies.length} typefaces installed on this PC. Anyone opening the export needs the same font installed — upload the file instead to embed it.`
                : `This browser won't list installed fonts, but a name typed in by hand still works if the font is installed.`}</div>` : ''}
          </div>

          <div class="qb-field">
            <label>Style</label>
            <div class="qb-seg">
              <button data-bold class="${curBold ? 'qb-on' : ''}" title="Bold"><b>B</b></button>
              <button data-italic class="${curItalic ? 'qb-on' : ''}" title="Italic"><i>I</i></button>
              <button data-underline class="${curUnderline ? 'qb-on' : ''}" title="Underline"><u>U</u></button>
            </div>
          </div>

          <div class="qb-field">
            <label>Size <span>${curSize} pt</span></label>
            <input type="range" data-fontsize min="6" max="120" value="${curSize}">
          </div>

          <div class="qb-field">
            <label>Align</label>
            <div class="qb-seg">
              ${ALIGNS.map(([v, l]) => `<button data-align="${v}" class="${curAlign === v ? 'qb-on' : ''}" title="${v}">${l}</button>`).join('')}
            </div>
          </div>

          <div class="qb-field">
            <label>Colour <span>${st.color ? (st.color === 'custom' ? (st.colorHex || 'custom') : st.color) : 'theme'}</span></label>
            ${renderColorRow(TEXT_COLORS, 'text-ink', st.color, st.colorHex, true)}
          </div>

          <div class="qb-seg" style="margin-bottom:12px">
            <button data-reset-typography style="flex:1">Reset formatting</button>
          </div>

          <div class="qb-hint">Type directly on the page canvas or edit in the box above.</div>`;

        const txtarea = textInspector.querySelector('.qb-text-input');
        if (txtarea) {
          txtarea.addEventListener('input', () => {
            selText.innerText = txtarea.value;
            state.texts ||= {};
            state.texts[key] = txtarea.value;
            syncSwatch(selText);
            save();
            buildTextTray();
          });
        }

        textInspector.querySelector('[data-reset-text]').onclick = () => {
          const orig = textBaseline[key];
          if (orig !== undefined) {
            selText.innerText = orig;
            if (state.texts) delete state.texts[key];
            if (txtarea) txtarea.value = orig;
            syncSwatch(selText);
            save();
            buildTextTray();
          }
        };

        textInspector.querySelectorAll('[data-font]').forEach(b => b.onclick = () => {
          const st2 = styleStateOf(key);
          if (b.dataset.font) st2.fontFamily = b.dataset.font; else delete st2.fontFamily;
          applyStyleTo(selText, key); save(); renderInspector();
        });
        const pickFont = (val) => {
          const st2 = styleStateOf(key);
          if (val) st2.fontFamily = val; else delete st2.fontFamily;
          applyStyleTo(selText, key); save(); renderInspector();
        };

        const customSelect = textInspector.querySelector('[data-font-custom]');
        if (customSelect) customSelect.onchange = () => pickFont(customSelect.value);

        textInspector.querySelector('[data-font-upload]').onclick = () => {
          const inp = document.createElement('input');
          inp.type = 'file';
          inp.accept = FONT_FILE_TYPES;
          inp.multiple = true;
          inp.onchange = async () => {
            const files = [...(inp.files || [])];
            if (!files.length) return;
            let last = null;
            for (const f of files) last = (await addFontFile(f)) || last;
            if (!last) { status('Could not read that font file'); return; }
            // Applying the last one added is the point of uploading from here —
            // the picker is open on a selected element, not a settings screen.
            pickFont('custom:' + last);
            status(files.length === 1 ? 'Font added' : `${files.length} fonts added`);
          };
          inp.click();
        };

        textInspector.querySelector('[data-font-local]').onclick = async () => {
          localFontRowOpen = !localFontRowOpen;
          if (localFontRowOpen && !localFamilies.length) {
            // Fired straight off the click so the permission prompt still has
            // the user activation it requires.
            const ok = await loadLocalFamilies();
            if (!ok) status('Windows font list unavailable — type the name instead');
          }
          renderInspector();
          textInspector.querySelector('[data-local-font]')?.focus();
        };

        const localInput = textInspector.querySelector('[data-local-font]');
        if (localInput) {
          const useTyped = () => {
            const id = addLocalFont(localInput.value);
            if (!id) { status('Type the name of an installed font first'); return; }
            localFontRowOpen = false;
            pickFont('custom:' + id);
          };
          textInspector.querySelector('[data-local-add]').onclick = useTyped;
          localInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); useTyped(); }
          });
        }

        const removeFontBtn = textInspector.querySelector('[data-font-remove]');
        if (removeFontBtn) removeFontBtn.onclick = () => removeCustomFont(curCustomFont.id);

        textInspector.querySelector('[data-bold]').onclick = () => {
          styleStateOf(key).bold = !curBold;
          applyStyleTo(selText, key); save(); renderInspector();
        };
        textInspector.querySelector('[data-italic]').onclick = () => {
          styleStateOf(key).italic = !curItalic;
          applyStyleTo(selText, key); save(); renderInspector();
        };
        textInspector.querySelector('[data-underline]').onclick = () => {
          styleStateOf(key).underline = !curUnderline;
          applyStyleTo(selText, key); save(); renderInspector();
        };
        textInspector.querySelectorAll('[data-align]').forEach(b => b.onclick = () => {
          styleStateOf(key).align = b.dataset.align;
          applyStyleTo(selText, key); save(); renderInspector();
        });
        const fontSizeRange = textInspector.querySelector('[data-fontsize]');
        if (fontSizeRange) {
          fontSizeRange.addEventListener('input', () => {
            styleStateOf(key).fontSize = +fontSizeRange.value;
            applyStyleTo(selText, key);
            const out = fontSizeRange.previousElementSibling?.querySelector('span');
            if (out) out.textContent = fontSizeRange.value + ' pt';
          });
          fontSizeRange.addEventListener('change', () => { save(); renderInspector(); });
        }

        wireColorRow(textInspector, 'text-ink', (val) => {
          const st2 = styleStateOf(key);
          if (val === 'none') delete st2.color;
          else st2.color = val;
          applyStyleTo(selText, key); save(); renderInspector();
        }, (hex) => {
          styleStateOf(key).colorHex = hex;
          applyStyleTo(selText, key);
        });

        textInspector.querySelector('[data-reset-typography]').onclick = () => {
          const st2 = state.styles?.[key];
          if (st2) {
            delete st2.fontFamily; delete st2.bold; delete st2.italic;
            delete st2.underline; delete st2.fontSize; delete st2.align;
            delete st2.color; delete st2.colorHex;
            if (!Object.keys(st2).length) delete state.styles[key];
          }
          applyStyleTo(selText, key); save(); renderInspector();
        };
      }
    }

    // 2. Device Slot Inspector (Right Drawer)
    const box = document.querySelector('.qb-inspector');
    if (!box) return;

    if (!sel) {
      box.innerHTML = `<div class="qb-empty">Click any device mockup on the document to select it.<br><br>
        Then drag a screenshot onto it or adjust fit, angle, zoom, and width.</div>`;
      return;
    }

    const key = sel.dataset.slot;
    const meta = slots.find(s => s.key === key);
    const s = state[key] || {};
    const curW = Math.round(parseFloat(sel.style.width) || sel.getBoundingClientRect().width / 3.7795);

    box.innerHTML = `
      <div class="qb-slot-name">${meta.label}</div>
      <div class="qb-slot-sub">${meta.sub} · ${key}</div>

      <div class="qb-card">
        <h4 class="qb-card__title">Content</h4>
        <div class="qb-field">
          <label>Image</label>
          <div class="qb-seg">
            <button data-clear>${s.src ? 'Remove image' : 'Empty'}</button>
          </div>
        </div>
        <div class="qb-field">
          <label>Device</label>
          <div class="qb-seg">
            ${KINDS.map(([v, l]) =>
              `<button data-kind="${v}" class="${kindOf(sel) === v ? 'qb-on' : ''}">${l}</button>`).join('')}
          </div>
        </div>
        <div class="qb-field">
          <label>Fit</label>
          <div class="qb-seg">
            ${FITS.map(([v, l]) =>
              `<button data-fit="${v}" class="${(s.fit || 'cover') === v ? 'qb-on' : ''}">${l}</button>`).join('')}
          </div>
        </div>
      </div>

      <div class="qb-card">
        <h4 class="qb-card__title">Presentation</h4>
        <div class="qb-field">
          <label>Angle</label>
          <div class="qb-seg">
            ${VIEWS.map(([v, l]) =>
              `<button data-view="${v}" class="${curView() === v ? 'qb-on' : ''}">${l}</button>`).join('')}
          </div>
        </div>
        <div class="qb-field">
          <label>Depth</label>
          <div class="qb-seg">
            ${EFFECTS.map(([v, l]) =>
              `<button data-fx="${v}" class="${(s.fx || '') === v ? 'qb-on' : ''}">${l}</button>`).join('')}
          </div>
        </div>
        <div class="qb-field">
          <label style="display:flex;align-items:center;gap:6px;">Shadow <input type="checkbox" data-shadow-inspector-toggle ${(s.shadow?.on) ? 'checked' : ''}></label>
        </div>
      </div>

      <div class="qb-card">
        <h4 class="qb-card__title">Transform</h4>
        <div class="qb-field">
          <label>Width <span>${curW} mm</span></label>
          <input type="range" data-w min="16" max="240" value="${curW}">
        </div>
        <div class="qb-field">
          <label>Zoom <span>${Math.round(zoomOf(s) * 100)}%</span></label>
          <input type="range" data-z min="100" max="300" value="${Math.round(zoomOf(s) * 100)}">
        </div>
        <div class="qb-field">
          <label>Nudge X <span>${Math.round(s.x || 0)} px</span></label>
          <input type="range" data-x min="-400" max="400" value="${Math.round(s.x || 0)}">
        </div>
        <div class="qb-field">
          <label>Nudge Y <span>${Math.round(s.y || 0)} px</span></label>
          <input type="range" data-y min="-600" max="600" value="${Math.round(s.y || 0)}">
        </div>
      </div>

      <div class="qb-inspector-actions">
        <div class="qb-seg" style="margin-bottom:12px">
          <button data-add-device>＋ Add mockup beside</button>
          <button data-reset>Reset this slot</button>
        </div>
        <div class="qb-hint">Drag on the screen to pan · scroll over it to zoom.</div>
      </div>`;

    box.querySelector('[data-clear]').onclick = () => {
      delete state[key].src; state[key].x = 0; state[key].y = 0; state[key].z = 1;
      apply(key); save(); renderInspector(); markUsedThumbs();
    };
    box.querySelector('[data-reset]').onclick = () => {
      delete state[key]; sel.style.width = ''; apply(key); save(); renderInspector();
    };
    const addBtn = box.querySelector('[data-add-device]');
    if (addBtn) addBtn.onclick = () => addDevice(sel);
    box.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => {
      slotState(key).kind = b.dataset.kind; apply(key); save(); renderInspector(); renderPop(); positionPop();
    });
    box.querySelectorAll('[data-fit]').forEach(b => b.onclick = () => {
      slotState(key).fit = b.dataset.fit; apply(key); save(); renderInspector();
    });
    box.querySelectorAll('[data-view]').forEach(b => b.onclick = () => {
      slotState(key).view = b.dataset.view; apply(key); save(); renderInspector(); renderPop(); positionPop();
    });
    box.querySelectorAll('[data-fx]').forEach(b => b.onclick = () => {
      if (b.dataset.fx) slotState(key).fx = b.dataset.fx;
      else delete slotState(key).fx;
      apply(key); save(); renderInspector(); renderPop();
    });
    const shadowInspToggle = box.querySelector('[data-shadow-inspector-toggle]');
    if (shadowInspToggle) {
      shadowInspToggle.addEventListener('change', () => {
        const st = slotState(key);
        st.shadow = st.shadow || {};
        st.shadow.on = shadowInspToggle.checked;
        apply(key); save(); renderPop();
      });
    }
    bindRange(box, '[data-w]', v => { slotState(key).w = +v; apply(key); });
    bindRange(box, '[data-z]', v => { slotState(key).z = v / 100; clampPan(key); apply(key); });
    bindRange(box, '[data-x]', v => { slotState(key).x = +v; clampPan(key); apply(key); });
    bindRange(box, '[data-y]', v => { slotState(key).y = +v; clampPan(key); apply(key); });

    function curView() {
      return VIEWS.find(([v]) => sel.classList.contains(v))?.[0] || 'qo-view--front';
    }
  }

  function bindRange(box, sel_, fn) {
    const el = box.querySelector(sel_);
    if (!el) return;
    el.addEventListener('input', () => {
      fn(el.value);
      const out = el.previousElementSibling?.querySelector('span');
      if (out) {
        const unit = sel_ === '[data-z]' ? '%' : (sel_ === '[data-w]' ? ' mm' : ' px');
        out.textContent = (sel_ === '[data-z]' ? el.value : Math.round(el.value)) + unit;
      }
    });
    el.addEventListener('change', save);
  }

  /* ---- device popover -------------------------------------------------------------
     Floating quick-actions card anchored to the selected device: change the
     mockup (device + angle variations, flat and 3D), resize, and reposition,
     without opening the full drawer. */

  /* ---- Move & Position + Lock system ----------------------------------------- */

  let moveTarget = null;

  function elementKey(target) {
    if (!target) return null;
    return target.dataset.textId || target.dataset.blockId || target.dataset.slot;
  }

  function isElementLocked(target) {
    const key = elementKey(target);
    return key ? (state.locked || []).includes(key) : false;
  }

  function toggleLock(target) {
    closeContextMenu();
    const key = elementKey(target);
    if (!key) return;
    state.locked ||= [];
    const idx = state.locked.indexOf(key);
    if (idx >= 0) {
      state.locked.splice(idx, 1);
      target.removeAttribute('data-locked');
      if (target.dataset.editable === 'true') target.setAttribute('contenteditable', 'true');
      status('Element unlocked');
    } else {
      state.locked.push(key);
      target.setAttribute('data-locked', 'true');
      if (target.dataset.editable === 'true') target.setAttribute('contenteditable', 'false');
      status('Element locked in place');
    }
    save();
    showBlockTools(target);
  }

  function buildMovePop() {
    const pop = document.createElement('div');
    pop.className = 'qb-move-pop qb-pop';
    pop.hidden = true;
    document.body.appendChild(pop);

    pop.addEventListener('mousedown', e => e.stopPropagation());
    pop.addEventListener('click', e => e.stopPropagation());
    window.addEventListener('scroll', () => { if (moveTarget) positionMovePop(); }, { passive: true });
  }

  function openMovePop(target) {
    closeContextMenu();
    moveTarget = target;
    moveAnchor = null;      // anchor afresh for this element
    hideBlockTools();
    positionMovePop();
    renderMovePop();
  }

  function closeMovePop() {
    moveTarget = null;
    moveAnchor = null;
    const pop = document.querySelector('.qb-move-pop');
    if (pop) pop.hidden = true;
  }

  /* Pinned to where the element sat when the bar opened, in page coordinates
     — nudging moves the element out from under its own controls otherwise.
     Same reasoning as popAnchor; see the note on positionPop(). */
  let moveAnchor = null;

  function positionMovePop() {
    const pop = document.querySelector('.qb-move-pop');
    if (!pop || !moveTarget) return;

    if (!moveAnchor) {
      const box = moveTarget.getBoundingClientRect();
      moveAnchor = { x: box.left + window.scrollX, y: box.top + window.scrollY, width: box.width, height: box.height };
    }
    const r = {
      left: moveAnchor.x - window.scrollX,
      top: moveAnchor.y - window.scrollY,
      width: moveAnchor.width,
      height: moveAnchor.height,
      get bottom() { return this.top + this.height; },
    };
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = r.left + r.width / 2 - pw / 2;
    x = Math.max(12, Math.min(x, window.innerWidth - pw - 12));
    let y = r.top - ph - 14;
    if (y < 12) y = Math.min(r.bottom + 14, window.innerHeight - ph - 12);
    pop.style.left = x + 'px';
    pop.style.top = y + 'px';
  }

  function renderMovePop() {
    const pop = document.querySelector('.qb-move-pop');
    if (!pop || !moveTarget) return;

    const key = elementKey(moveTarget);
    state.offsets ||= {};
    const off = state.offsets[key] || { dx: 0, dy: 0 };
    const locked = isElementLocked(moveTarget);

    pop.innerHTML = `
      <div class="qb-pop__bar">
        <span class="qb-pop__title">Move & Position Element</span>
        <button class="qb-pop__x" title="Close">×</button>
      </div>
      <div class="qb-pop__panel">
        <div class="qb-pop__group-label">Nudge Position</div>
        <div class="qb-pop__pad" style="margin-bottom:10px;">
          <span></span><button data-nudge-y="-8">↑</button><span></span>
          <button data-nudge-x="-8">←</button><button data-nudge-reset title="Center">0</button><button data-nudge-x="8">→</button>
          <span></span><button data-nudge-y="8">↓</button><span></span>
        </div>

        <div class="qb-field">
          <label>Offset X <span>${off.dx || 0} px</span></label>
          <input type="range" data-off-x min="-300" max="300" value="${off.dx || 0}">
        </div>

        <div class="qb-field">
          <label>Offset Y <span>${off.dy || 0} px</span></label>
          <input type="range" data-off-y min="-300" max="300" value="${off.dy || 0}">
        </div>

        <div class="qb-pop__group-label" style="margin-top:10px;">Element Actions</div>
        <div class="qb-pop__seg">
          <button data-move-up style="flex:1">↑ Move Up</button>
          <button data-move-down style="flex:1">↓ Move Down</button>
          <button data-lock-toggle style="flex:1">${locked ? '🔒 Unlock' : '🔓 Lock'}</button>
        </div>

        <div class="qb-pop__seg" style="margin-top:8px;">
          <button data-nudge-reset style="flex:1">Reset Position</button>
        </div>
      </div>`;

    pop.querySelector('.qb-pop__x').onclick = closeMovePop;
    pop.hidden = false;

    function setOffset(dx, dy) {
      if (isElementLocked(moveTarget)) { status('Element is locked'); return; }
      state.offsets ||= {};
      state.offsets[key] = { dx, dy };
      moveTarget.style.translate = `${dx}px ${dy}px`;
      save();
      renderMovePop();
    }

    pop.querySelectorAll('[data-nudge-x]').forEach(btn => {
      btn.onclick = (e) => {
        const step = e.shiftKey ? +btn.dataset.nudgeX * 4 : +btn.dataset.nudgeX;
        setOffset((off.dx || 0) + step, off.dy || 0);
      };
    });

    pop.querySelectorAll('[data-nudge-y]').forEach(btn => {
      btn.onclick = (e) => {
        const step = e.shiftKey ? +btn.dataset.nudgeY * 4 : +btn.dataset.nudgeY;
        setOffset(off.dx || 0, (off.dy || 0) + step);
      };
    });

    pop.querySelectorAll('[data-nudge-reset]').forEach(btn => {
      btn.onclick = () => setOffset(0, 0);
    });

    bindRange(pop, '[data-off-x]', v => setOffset(+v, off.dy || 0));
    bindRange(pop, '[data-off-y]', v => setOffset(off.dx || 0, +v));

    pop.querySelector('[data-lock-toggle]').onclick = () => {
      toggleLock(moveTarget);
      renderMovePop();
    };

    pop.querySelector('[data-move-up]').onclick = () => {
      if (isElementLocked(moveTarget)) { status('Element is locked'); return; }
      const prev = moveTarget.previousElementSibling;
      if (prev) {
        prev.before(moveTarget);
        status('Moved element up');
      }
    };

    pop.querySelector('[data-move-down]').onclick = () => {
      if (isElementLocked(moveTarget)) { status('Element is locked'); return; }
      const next = moveTarget.nextElementSibling;
      if (next) {
        next.after(moveTarget);
        status('Moved element down');
      }
    };
  }

  /* ---- hover block controls --------------------------------------------------- */

  let hoveredBlockEl = null;
  let blockToolsHover = false;
  let blockToolsTimeout = null;

  function buildBlockTools() {
    const el = document.createElement('div');
    el.className = 'qb-block-tools';
    el.hidden = true;
    el.innerHTML = `
      <button class="qb-block-tools__edit" title="Edit Text">✎</button>
      <button class="qb-block-tools__move" title="Move & Position Element">✥</button>
      <button class="qb-block-tools__style" title="Style Element">🎨</button>
      <button class="qb-block-tools__lock" title="Lock / Unlock Element">🔓</button>
      <button class="qb-block-tools__more" title="Copy / Cut / Paste">⋮</button>
      <button class="qb-block-tools__del" title="Remove Element">🗑</button>`;
    document.body.appendChild(el);

    el.addEventListener('mousedown', e => e.stopPropagation());
    el.addEventListener('click', e => e.stopPropagation());
    el.addEventListener('mouseenter', () => {
      blockToolsHover = true;
      if (blockToolsTimeout) { clearTimeout(blockToolsTimeout); blockToolsTimeout = null; }
    });
    el.addEventListener('mouseleave', () => {
      blockToolsHover = false;
      hideBlockTools();
    });

    window.addEventListener('scroll', () => {
      blockToolsHover = false;
      hideBlockTools(true);
    }, { passive: true });

    buildMovePop();
  }

  function positionBlockTools(target) {
    const el = document.querySelector('.qb-block-tools');
    if (!el || !target) return;
    const r = target.getBoundingClientRect();
    let x = Math.min(Math.max(4, r.right - el.offsetWidth), window.innerWidth - el.offsetWidth - 4);
    let y = r.top - el.offsetHeight - 4;
    if (y < 4) y = Math.min(r.top + 4, window.innerHeight - el.offsetHeight - 4);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  }

  function showBlockTools(target) {
    if (blockToolsTimeout) { clearTimeout(blockToolsTimeout); blockToolsTimeout = null; }

    if (hoveredBlockEl && hoveredBlockEl !== target) hoveredBlockEl.classList.remove('qb-block-hover');
    hoveredBlockEl = target;
    target.classList.add('qb-block-hover');

    const el = document.querySelector('.qb-block-tools');
    if (!el) return;
    const isText = target.dataset.editable === 'true';
    const locked = isElementLocked(target);

    const lockBtn = el.querySelector('.qb-block-tools__lock');
    lockBtn.innerHTML = locked ? '🔒' : '🔓';
    lockBtn.title = locked ? 'Unlock element' : 'Lock element in place';

    el.querySelector('.qb-block-tools__edit').style.display = isText && !locked ? '' : 'none';
    el.hidden = false;
    positionBlockTools(target);

    el.querySelector('.qb-block-tools__edit').onclick = () => {
      if (isElementLocked(target)) { status('Element is locked'); return; }
      closeContextMenu();
      selectText(target); target.focus();
    };
    el.querySelector('.qb-block-tools__move').onclick = () => openMovePop(target);
    el.querySelector('.qb-block-tools__style').onclick = () => openStylePop(target);
    el.querySelector('.qb-block-tools__lock').onclick = () => toggleLock(target);
    el.querySelector('.qb-block-tools__more').onclick = () => openContextMenu(target);
    el.querySelector('.qb-block-tools__del').onclick = () => {
      if (isElementLocked(target)) { status('Element is locked (unlock first)'); return; }
      closeContextMenu();
      if (isText) {
        if (!confirm('Remove this text block from the page? Undo or "Reset all" brings it back.')) return;
        removeTextBlock(target.dataset.textId);
      } else {
        if (!confirm('Remove this component from the page? Undo or "Reset all" brings it back.')) return;
        removeBlock(target.dataset.blockId);
      }
      hideBlockTools(true);
    };
  }

  function hideBlockTools(force = false) {
    if (blockToolsTimeout) { clearTimeout(blockToolsTimeout); blockToolsTimeout = null; }

    const performHide = () => {
      const el = document.querySelector('.qb-block-tools');
      if (el && el.matches(':hover')) return;
      if (el) el.hidden = true;
      if (hoveredBlockEl) hoveredBlockEl.classList.remove('qb-block-hover');
      hoveredBlockEl = null;
      blockToolsHover = false;
    };

    if (force) {
      performHide();
    } else {
      blockToolsTimeout = setTimeout(performHide, 80);
    }
  }

  /* ---- auto-dismiss for the floating panels ------------------------------
     The hover toolbar already comes and goes on its own, but the three panels
     it opens — Move, Style, and the ⋮ menu — stayed pinned over the canvas
     until something was clicked or Escape was pressed. On a sheet this dense
     that reads as an overlay you have to fight rather than a tool.

     They now follow the pointer the same way the toolbar does: leave both the
     panel and the element it belongs to, and it closes after a grace period.
     Everything that makes one still usable holds it open — the pointer being
     inside it, a control being dragged (a slider drag routinely leaves the
     panel's box), and any field within it holding focus, so a number being
     typed is never interrupted. */

  const FLOATING_GRACE_MS = 700;
  const floatingTimers = new WeakMap();
  let pointerIsDown = false;

  function openFloatingPanels() {
    return [
      { el: document.querySelector('.qb-style-pop'),    target: styleTarget,       close: closeStylePop },
      { el: document.querySelector('.qb-move-pop'),     target: moveTarget,        close: closeMovePop },
      { el: document.querySelector('.qb-context-menu'), target: contextMenuTarget, close: closeContextMenu },
    ].filter(p => p.el && p.target && !p.el.hidden);
  }

  function updateFloatingPanels(e) {
    openFloatingPanels().forEach(p => {
      const over = p.el.contains(e.target) || p.target === e.target || p.target.contains?.(e.target);
      const pending = floatingTimers.get(p.el);

      if (over || pointerIsDown || p.el.contains(document.activeElement)) {
        if (pending) { clearTimeout(pending); floatingTimers.delete(p.el); }
        return;
      }
      if (pending) return;

      floatingTimers.set(p.el, setTimeout(() => {
        floatingTimers.delete(p.el);
        // Re-checked on the way out: the pointer can come back, or a field
        // inside can take focus, during the grace period.
        if (pointerIsDown || p.el.contains(document.activeElement)) return;
        if (p.el.matches(':hover')) return;
        p.close();
      }, FLOATING_GRACE_MS));
    });
  }

  function updateBlockHover(e) {
    if (e.target.closest('.qb-drawer--left, .qb-drawer--right, .qb-toggle--left, .qb-toggle--right, .qb-pop, .qb-block-tools, .qb-context-menu')) return;
    if (e.target.closest('.qo-device')) { hideBlockTools(true); return; }

    const target = e.target.closest('[data-editable="true"], [data-block-id]');

    // The ⋮ menu is a quick action on whatever's currently hovered, not a
    // pinned popover — moving on to hover something else (without
    // necessarily clicking anywhere) should dismiss it the same way a
    // native context menu closes, instead of leaving it stranded over an
    // element that isn't highlighted anymore.
    if (contextMenuTarget && target !== contextMenuTarget) closeContextMenu();

    if (!target) { hideBlockTools(true); return; }
    if (target === hoveredBlockEl) {
      if (blockToolsTimeout) { clearTimeout(blockToolsTimeout); blockToolsTimeout = null; }
      positionBlockTools(target);
      return;
    }
    showBlockTools(target);
  }

  /* ---- context menu (Copy / Cut / Paste) ---------------------------------------
     Opened via the ⋮ button in the hover block toolbar; works the same for
     text and repeatable-block elements. The clipboard isn't page-scoped —
     every "page" in this document is really just a section of one long
     scrolling canvas, so "paste it somewhere else in the project" is just
     hovering a different element and clicking Paste, no cross-document
     plumbing required. Held in memory only (not persisted): once this tab
     closes the clipboard is gone, same as a normal system clipboard. */

  let contextMenuTarget = null;
  let clipboard = null; // { kind: 'text'|'block', template: Node, styles: {...} }

  function cloneStyleObj(obj) { return obj ? JSON.parse(JSON.stringify(obj)) : null; }

  // Strips every qb-owned attribute/class from a clone (and its descendants)
  // so indexTexts()/indexBlocks() treat the whole subtree as brand new
  // instead of reusing — and colliding with — the source's own keys.
  function cleanClone(el) {
    const clone = el.cloneNode(true);
    const strip = node => {
      node.removeAttribute('data-text-id');
      node.removeAttribute('data-block-id');
      node.removeAttribute('data-editable');
      node.removeAttribute('data-qb-inline-text');
      // "Listeners attached" is true of the source, never of a fresh copy —
      // carrying it over would leave the copy editable on screen but deaf.
      node.removeAttribute('data-qb-wired');
      node.removeAttribute('contenteditable');
      node.classList.remove('qb-text-sel', 'qb-block-hover', 'qb-sel', 'qb-drop', 'qb-text-resizing', 'qb-page-sel');
    };
    strip(clone);
    clone.querySelectorAll('[data-text-id], [data-block-id]').forEach(strip);

    // A copied logo well starts empty: its id is dropped so indexLogos()
    // issues a fresh one, and the artwork the original carried comes out
    // with it. Copying a tile is how you add another placeholder — it
    // shouldn't silently clone the logo you already placed.
    clone.querySelectorAll('.qo-logo').forEach(well => {
      well.removeAttribute('data-logo-id');
      well.classList.remove('qo-logo--filled', 'qb-logo-drop');
      well.querySelector('img')?.remove();
      well.querySelector('.qb-logo-clear')?.remove();
    });
    return clone;
  }

  // Captures this element's own style overrides plus any nested text/block
  // elements' overrides (e.g. a card that contains a heading someone made
  // bold) — keyed by position in document order, not by id, since the ids
  // won't exist yet on the copy. applyCollectedStyles() below re-walks a
  // pasted clone in the same order to match them back up.
  function collectStyles(root) {
    return {
      self: cloneStyleObj(state.styles?.[styleKeyOf(root)]),
      textStyles: [...root.querySelectorAll('[data-text-id]')].map(el => cloneStyleObj(state.styles?.[el.dataset.textId])),
      blockStyles: [...root.querySelectorAll('[data-block-id]')].map(el => cloneStyleObj(state.styles?.[el.dataset.blockId])),
    };
  }

  function applyCollectedStyles(root, captured) {
    if (!captured) return;
    const key = styleKeyOf(root);
    if (key && captured.self) Object.assign(styleStateOf(key), captured.self);
    [...root.querySelectorAll('[data-text-id]')].forEach((el, i) => {
      if (captured.textStyles[i]) Object.assign(styleStateOf(el.dataset.textId), captured.textStyles[i]);
    });
    [...root.querySelectorAll('[data-block-id]')].forEach((el, i) => {
      if (captured.blockStyles[i]) Object.assign(styleStateOf(el.dataset.blockId), captured.blockStyles[i]);
    });
  }

  function copyElement(target) {
    clipboard = {
      kind: target.dataset.editable === 'true' ? 'text' : 'block',
      template: cleanClone(target),
      styles: collectStyles(target),
    };
    status('Copied — hover any element and use ⋮ → Paste to place it');
  }

  /* Copy-then-paste-in-place, as one action. Adding another stack tile (or
     another principle, spec row, card…) is common enough that it shouldn't
     cost two menu trips, and it leaves whatever is on the clipboard alone. */
  function duplicateElement(target) {
    const clone = cleanClone(target);
    const styles = collectStyles(target);
    target.after(clone);

    indexTexts();
    indexBlocks();
    indexLogos();
    applyCollectedStyles(clone, styles);
    applyAllText();
    applyBlocks();
    applyStyles();
    applyLogos();
    recordAddedBlock(clone, target);
    save();
    status('Duplicated');
  }

  /* A block inserted at runtime only exists in this session's DOM — reloading
     rebuilds the page from the authored HTML and it would be gone. Recording
     it (anchored to the block it was dropped after) lets init put it back,
     the same way recreateAdded() replays added mockups.

     The markup is captured AFTER re-indexing on purpose: it carries its own
     text/block/logo ids, so everything keyed to those ids — edits, styles, a
     logo — reattaches to the right element on the next load. */
  function recordAddedBlock(el, afterEl) {
    const id = el.dataset.blockId;
    if (!id) return;
    state.blocksAdded = [
      ...(state.blocksAdded || []).filter(b => b.id !== id),
      { id, afterId: afterEl?.dataset.blockId || null, html: serializeBlock(el) },
    ];
  }

  /* Ids are identity and must survive; anything that only describes this
     session must not. data-qb-wired especially: it marks "listeners already
     attached", so baking it in would bring a block back looking editable but
     deaf — typing in it would never reach state.texts. */
  function serializeBlock(el) {
    const copy = el.cloneNode(true);
    const clean = node => {
      node.removeAttribute('data-qb-wired');
      node.classList.remove('qb-block-hover', 'qb-text-sel', 'qb-sel', 'qb-drop', 'qb-text-resizing', 'qb-logo-drop');
    };
    clean(copy);
    copy.querySelectorAll('*').forEach(clean);
    copy.querySelectorAll('.qb-logo-clear').forEach(b => b.remove());
    return copy.outerHTML;
  }

  /* Replays those insertions. Runs at init once indexBlocks() has stamped the
     authored blocks, so the anchors it looks for exist. Resolved iteratively
     so a run of blocks added one after another comes back in order however
     they're stored. */
  function recreateBlocksAdded() {
    const remaining = new Map((state.blocksAdded || []).map(b => [b.id, b]));
    let progress = true;
    while (progress && remaining.size) {
      progress = false;
      for (const [id, b] of [...remaining]) {
        if (document.querySelector(`[data-block-id="${id}"]`)) { remaining.delete(id); progress = true; continue; }
        const anchor = b.afterId ? document.querySelector(`[data-block-id="${b.afterId}"]`) : null;
        if (b.afterId && !anchor) continue;      // its anchor is itself pending
        const tmp = document.createElement('div');
        tmp.innerHTML = b.html;
        const node = tmp.firstElementChild;
        if (node && anchor) anchor.after(node);
        remaining.delete(id);
        progress = true;
      }
    }
  }

  function cutElement(target) {
    copyElement(target);
    if (target.dataset.editable === 'true') removeTextBlock(target.dataset.textId);
    else removeBlock(target.dataset.blockId);
    status('Cut — hover any element and use ⋮ → Paste to place it');
  }

  // Content and formatting need no separate handling here: the clone
  // already carries whatever text/inline styles were live on the source at
  // copy time, and indexTexts() reads an element's own current DOM content
  // as its baseline the moment it assigns a fresh id — so a pasted copy's
  // current text simply becomes its own baseline, same as any other element.
  function pasteElement(target) {
    if (!clipboard) return;
    const clone = clipboard.template.cloneNode(true);
    target.after(clone);

    indexTexts();
    indexBlocks();
    indexLogos();
    applyCollectedStyles(clone, clipboard.styles);
    applyAllText();
    applyBlocks();
    applyStyles();
    applyLogos();
    recordAddedBlock(clone, target);
    save();
    status('Pasted');
  }

  function buildContextMenu() {
    const el = document.createElement('div');
    el.className = 'qb-context-menu';
    el.hidden = true;
    el.innerHTML = `
      <button data-action="duplicate">Duplicate</button>
      <button data-action="copy">Copy</button>
      <button data-action="cut">Cut</button>
      <button data-action="paste">Paste</button>`;
    document.body.appendChild(el);

    el.addEventListener('mousedown', e => e.stopPropagation());
    el.addEventListener('click', e => e.stopPropagation());

    el.querySelector('[data-action="duplicate"]').onclick = () => {
      if (!contextMenuTarget) return;
      duplicateElement(contextMenuTarget);
      closeContextMenu();
    };
    el.querySelector('[data-action="copy"]').onclick = () => {
      if (!contextMenuTarget) return;
      copyElement(contextMenuTarget);
      closeContextMenu();
    };
    el.querySelector('[data-action="cut"]').onclick = () => {
      if (!contextMenuTarget || isElementLocked(contextMenuTarget)) return;
      cutElement(contextMenuTarget);
      closeContextMenu();
    };
    el.querySelector('[data-action="paste"]').onclick = () => {
      if (!contextMenuTarget || !clipboard) return;
      pasteElement(contextMenuTarget);
      closeContextMenu();
    };

    window.addEventListener('scroll', () => { if (contextMenuTarget) positionContextMenu(); }, { passive: true });
  }

  function openContextMenu(target) {
    contextMenuTarget = target;
    hideBlockTools();
    renderContextMenu();
  }

  function closeContextMenu() {
    contextMenuTarget = null;
    const el = document.querySelector('.qb-context-menu');
    if (el) el.hidden = true;
  }

  function positionContextMenu() {
    const el = document.querySelector('.qb-context-menu');
    if (!el || !contextMenuTarget) return;
    const r = contextMenuTarget.getBoundingClientRect();
    let x = Math.min(r.right - el.offsetWidth, window.innerWidth - el.offsetWidth - 8);
    x = Math.max(8, x);
    let y = r.top - el.offsetHeight - 6;
    if (y < 8) y = Math.min(r.bottom + 6, window.innerHeight - el.offsetHeight - 8);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  }

  function renderContextMenu() {
    const el = document.querySelector('.qb-context-menu');
    if (!el || !contextMenuTarget) return;
    const locked = isElementLocked(contextMenuTarget);

    const cutBtn = el.querySelector('[data-action="cut"]');
    cutBtn.disabled = locked;
    cutBtn.title = locked ? 'Unlock this element first' : '';

    const pasteBtn = el.querySelector('[data-action="paste"]');
    pasteBtn.disabled = !clipboard;
    pasteBtn.title = clipboard ? '' : 'Copy or cut something first';
    pasteBtn.textContent = clipboard ? `Paste ${clipboard.kind === 'text' ? 'text' : 'element'}` : 'Paste';

    el.hidden = false;
    positionContextMenu();
  }

  /* ---- style popover ----------------------------------------------------------
     Opened via the 🎨 button in the hover block toolbar. Independent of
     sel/selText/selPage — it targets whatever element it was opened on
     (styleTarget) and stays open (pinned) regardless of subsequent hover
     changes, closing only via × or a click elsewhere, same as the device
     popover. Reuses .qb-pop's box styling (position, width, chrome). */

  let styleTarget = null;

  function buildStylePop() {
    const pop = document.createElement('div');
    pop.className = 'qb-style-pop qb-pop';
    pop.hidden = true;
    document.body.appendChild(pop);

    pop.addEventListener('mousedown', e => e.stopPropagation());
    pop.addEventListener('click', e => e.stopPropagation());

    window.addEventListener('scroll', () => { if (styleTarget) positionStylePop(); }, { passive: true });
  }

  function openStylePop(target) {
    closeContextMenu();
    styleTarget = target;
    hideBlockTools();
    renderStylePop();
  }

  function closeStylePop() {
    styleTarget = null;
    const pop = document.querySelector('.qb-style-pop');
    if (pop) pop.hidden = true;
  }

  function positionStylePop() {
    const pop = document.querySelector('.qb-style-pop');
    if (!pop || !styleTarget) return;
    const r = styleTarget.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = r.left + r.width / 2 - pw / 2;
    x = Math.max(12, Math.min(x, window.innerWidth - pw - 12));
    let y = r.top - ph - 14;
    if (y < 12) y = Math.min(r.bottom + 14, window.innerHeight - ph - 12);
    pop.style.left = x + 'px';
    pop.style.top = y + 'px';
  }

  function renderStylePop() {
    const pop = document.querySelector('.qb-style-pop');
    if (!pop) return;
    if (!styleTarget) { pop.hidden = true; return; }

    const key = styleKeyOf(styleTarget);
    if (!key) { closeStylePop(); return; }
    const st = styleStateOf(key);
    const bgActive = st.bg && st.bg !== 'none';

    pop.innerHTML = `
      <div class="qb-pop__bar">
        <span class="qb-pop__tab qb-on" style="flex:1;cursor:default;">Style</span>
        <button class="qb-pop__x" title="Close">×</button>
      </div>
      <div class="qb-pop__panel">
        <div class="qb-pop__group-label">Text colour</div>
        ${renderColorRow(TEXT_COLORS, 'ink', st.color, st.colorHex, true)}

        <div class="qb-pop__group-label" style="margin-top:12px;">Glow
          <label><input type="checkbox" data-style-on="glow" ${st.glow ? 'checked' : ''}></label>
        </div>
        ${renderColorRow(EFFECT_COLORS, 'glow', st.glowColor || 'teal', st.glowColorHex, false)}
        <input type="range" data-style-range="glowIntensity" min="20" max="200" value="${st.glowIntensity ?? 100}">

        <div class="qb-pop__group-label" style="margin-top:12px;">Stroke
          <label><input type="checkbox" data-style-on="stroke" ${st.stroke ? 'checked' : ''}></label>
        </div>
        ${renderColorRow(EFFECT_COLORS, 'stroke', st.strokeColor || 'teal', st.strokeColorHex, false)}
        <input type="range" data-style-range="strokeWidth" min="20" max="200" value="${st.strokeWidth ?? 100}">

        <div class="qb-pop__group-label" style="margin-top:12px;">Shadow
          <label><input type="checkbox" data-style-on="shadow" ${st.shadow ? 'checked' : ''}></label>
        </div>
        <input type="range" data-style-range="shadowIntensity" min="20" max="200" value="${st.shadowIntensity ?? 100}">

        <div class="qb-pop__group-label" style="margin-top:12px;">Background</div>
        ${renderColorRow(BG_WASHES, 'bg', st.bg, st.bgHex, true)}
        <input type="range" data-style-range="bgIntensity" min="20" max="200" value="${st.bgIntensity ?? 100}" ${bgActive ? '' : 'disabled'}>

        <div class="qb-pop__hint">Text colour and background each pick one at a time · glow, stroke and shadow combine freely · None hands the colour back to the page theme</div>
      </div>`;

    pop.querySelector('.qb-pop__x').onclick = () => closeStylePop();

    pop.querySelectorAll('[data-style-on]').forEach(cb => cb.addEventListener('change', () => {
      st[cb.dataset.styleOn] = cb.checked;
      applyStyleTo(styleTarget, key); save();
      status('Style changed');
    }));

    wireColorRow(pop, 'ink', (val) => {
      if (val === 'none') delete st.color;
      else st.color = val;
      applyStyleTo(styleTarget, key); save(); renderStylePop();
      status('Text colour changed');
    }, (hex) => {
      st.colorHex = hex;
      applyStyleTo(styleTarget, key);
    });

    wireColorRow(pop, 'glow', (val) => {
      st.glowColor = val;
      applyStyleTo(styleTarget, key); save(); renderStylePop();
    }, (hex) => {
      st.glowColorHex = hex;
      applyStyleTo(styleTarget, key);
    });

    wireColorRow(pop, 'stroke', (val) => {
      st.strokeColor = val;
      applyStyleTo(styleTarget, key); save(); renderStylePop();
    }, (hex) => {
      st.strokeColorHex = hex;
      applyStyleTo(styleTarget, key);
    });

    wireColorRow(pop, 'bg', (val) => {
      if (val === 'none') delete st.bg;
      else st.bg = val;
      applyStyleTo(styleTarget, key); save(); renderStylePop();
    }, (hex) => {
      st.bgHex = hex;
      applyStyleTo(styleTarget, key);
    });

    pop.querySelectorAll('[data-style-range]').forEach(input => {
      input.addEventListener('input', () => {
        st[input.dataset.styleRange] = +input.value;
        applyStyleTo(styleTarget, key);
      });
      input.addEventListener('change', save);
    });

    pop.hidden = false;
    positionStylePop();
  }

  let popTab = 'mockup';
  let popCollapsed = false;
  let popDetached = false;
  let popCustomX = 0;
  let popCustomY = 0;

  function buildPop() {
    const pop = document.createElement('div');
    pop.className = 'qb-pop';
    pop.hidden = true;
    document.body.appendChild(pop);

    // keep clicks inside the popover from bubbling to the canvas deselect
    pop.addEventListener('mousedown', e => {
      const grab = e.target.closest('.qb-pop__grab');
      if (grab) {
        e.preventDefault();
        e.stopPropagation();

        const rect = pop.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const popLeft = rect.left;
        const popTop = rect.top;

        const onMouseMove = (moveEvent) => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;

          popDetached = true;
          popCustomX = popLeft + dx;
          popCustomY = popTop + dy;

          // Clamp to window boundaries
          popCustomX = Math.max(0, Math.min(popCustomX, window.innerWidth - pop.offsetWidth));
          popCustomY = Math.max(0, Math.min(popCustomY, window.innerHeight - pop.offsetHeight));

          pop.style.left = popCustomX + 'px';
          pop.style.top = popCustomY + 'px';

          // Force render of dock button if not already shown
          const dock = pop.querySelector('.qb-pop__dock');
          if (dock) dock.hidden = false;
        };

        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return;
      }
      e.stopPropagation();
    });

    pop.addEventListener('click', e => {
      const toggleCollapse = e.target.closest('[data-act="toggle-collapse-pop"]');
      if (toggleCollapse) {
        e.preventDefault();
        e.stopPropagation();
        popCollapsed = !popCollapsed;
        renderPop();
        return;
      }

      const dock = e.target.closest('.qb-pop__dock');
      if (dock) {
        e.preventDefault();
        e.stopPropagation();
        popDetached = false;
        positionPop();
        renderPop();
        return;
      }

      e.stopPropagation();
    });

    window.addEventListener('scroll', () => { if ((sel || selPage) && !popDetached) positionPop(); }, { passive: true });
    // A resize relays the sheets, so the anchor point genuinely moved — that
    // is the one case where re-reading the target's box is right.
    window.addEventListener('resize', () => {
      if (!sel && !selPage) return;
      popAnchor = null;
      if (!popDetached) positionPop();
    }, { passive: true });
  }

  /* The popover is pinned to where its target sat when it was selected, in
     page coordinates, rather than to wherever the target is right now. Nudging
     or resizing a mockup from the Position/Resize tabs moves the device under
     the popover — re-anchoring on each of those meant the controls crawled
     away from the cursor mid-adjustment, so a second nudge landed on whatever
     button had slid under the pointer. It re-anchors when the selection
     changes (see clearSelection) or when the window is resized; scrolling
     still carries it along with the page, since the anchor is page-space. */
  let popAnchor = null;

  function positionPop() {
    const pop = document.querySelector('.qb-pop');
    const target = sel || selPage;
    if (!pop || !target) return;

    if (popDetached) {
      pop.style.left = popCustomX + 'px';
      pop.style.top = popCustomY + 'px';
      return;
    }

    if (!popAnchor) {
      const box = target.getBoundingClientRect();
      popAnchor = {
        x: box.left + window.scrollX,
        y: box.top + window.scrollY,
        width: box.width,
        height: box.height,
      };
    }
    const r = {
      left: popAnchor.x - window.scrollX,
      top: popAnchor.y - window.scrollY,
      width: popAnchor.width,
      height: popAnchor.height,
      get bottom() { return this.top + this.height; },
    };
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = r.left + r.width / 2 - pw / 2;
    x = Math.max(12, Math.min(x, window.innerWidth - pw - 12));
    let y = r.top - ph - 14;                    // prefer above the device
    if (y < 12) y = Math.min(r.bottom + 14, window.innerHeight - ph - 12);
    pop.style.left = x + 'px';
    pop.style.top = y + 'px';
  }

  function renderPagePop(pop) {
    const visible = [...document.querySelectorAll('.qo-page')].filter(p => p.style.display !== 'none');
    const pos = visible.indexOf(selPage);
    const theme = pageTheme(selPage);
    const bg = pageBg(selPage);
    const tone = pageToneName(selPage);
    const toneHex = pageToneHex(selPage);

    pop.innerHTML = `
      <div class="qb-pop__bar">
        <div class="qb-pop__grab" title="Drag to move popover">✥</div>
        <span class="qb-pop__tab qb-on" style="flex:1;cursor:default;">Page ${pos + 1} of ${visible.length}</span>
        <button class="qb-pop__dock" title="Re-dock to device" ${popDetached ? '' : 'hidden'}>📌</button>
        <button class="qb-pop__x" title="Deselect">×</button>
      </div>
      <div class="qb-pop__panel" ${popCollapsed ? 'hidden' : ''}>
        <div class="qb-pop__group-label">Order</div>
        <div class="qb-pop__seg">
          <button data-move-page="-1" style="flex:1" ${pos <= 0 ? 'disabled' : ''}>↑ Move before</button>
          <button data-move-page="1" style="flex:1" ${pos >= visible.length - 1 ? 'disabled' : ''}>↓ Move after</button>
        </div>
        <div class="qb-pop__seg" style="margin-top:6px;">
          <button data-move-page-end="-1" style="flex:1" ${pos <= 0 ? 'disabled' : ''}>⇧ To front</button>
          <button data-move-page-end="1" style="flex:1" ${pos >= visible.length - 1 ? 'disabled' : ''}>⇩ To back</button>
        </div>

        <div class="qb-pop__group-label" style="margin-top:12px;">Theme</div>
        <div class="qb-pop__seg">
          <button data-page-theme="light" class="${theme === 'light' ? 'qb-on' : ''}" style="flex:1">☀ Light</button>
          <button data-page-theme="dark" class="${theme === 'dark' ? 'qb-on' : ''}" style="flex:1">☾ Dark</button>
        </div>

        <div class="qb-pop__group-label" style="margin-top:12px;">Surface</div>
        <div class="qb-tone-grid">
          ${toneList(theme).map(([v, label, hex]) => `
            <button data-page-tone="${v}" class="qb-tone ${tone === v ? 'qb-on' : ''}" title="${label} · ${hex}">
              <span class="qb-tone__chip" style="background:${hex};"></span>
              <span class="qb-tone__name">${label}</span>
            </button>`).join('')}
          <button data-page-tone="custom" class="qb-tone ${tone === 'custom' ? 'qb-on' : ''}" title="Pick any colour">
            <span class="qb-tone__chip qb-tone__chip--custom" ${toneHex ? `style="background:${escapeHtml(toneHex)};"` : ''}></span>
            <span class="qb-tone__name">Custom</span>
          </button>
        </div>
        ${tone === 'custom' ? `
          <div class="qb-tone-custom">
            <input type="color" data-tone-color value="${escapeHtml(toneHex || '#0A1830')}" title="Pick a surface colour">
            <input type="text" class="qb-hex-input" data-tone-hex placeholder="#0A1830" maxlength="7" value="${escapeHtml(toneHex)}">
          </div>` : ''}

        <div class="qb-pop__group-label" style="margin-top:12px;">Background</div>
        <div class="qb-bg-picker ${theme === 'light' ? 'qo-page--light' : ''}">
          ${PAGE_BGS.map(([group, items]) => `
            <div class="qb-bg-set__label">${group}</div>
            <div class="qb-bg-grid">
              ${items.map(([v, label, hint]) => `
                <button data-page-bg="${v}" class="qb-bg-opt ${bg === v ? 'qb-on' : ''}" title="${escapeHtml(hint)}">
                  <span class="qb-bg-chip ${v ? 'qo-bg--' + v : 'qb-bg-chip--none'}"></span>
                  <span class="qb-bg-opt__name">${label}</span>
                </button>`).join('')}
            </div>`).join('')}
        </div>

        <div class="qb-pop__group-label" style="margin-top:12px;">This page</div>
        <div class="qb-pop__row" style="margin-top:0;">
          <button class="qb-pop__add" data-add-page>＋ Add page after</button>
          <button class="qb-pop__delete" data-delete-page ${visible.length <= 1 ? 'disabled' : ''}>🗑 Delete page</button>
        </div>
        <div class="qb-pop__hint">Theme repoints this sheet's tokens, so its text, panels, rules and components all re-contrast together.</div>
      </div>
      <div class="qb-pop__footer">
        <button class="qb-pop__toggle-collapse" data-act="toggle-collapse-pop">
          ${popCollapsed ? 'Expand Panel ▼' : 'Collapse Panel ▲'}
        </button>
      </div>`;

    pop.querySelector('.qb-pop__x').onclick = () => selectPage(null);
    pop.querySelector('[data-add-page]').onclick = () => addPage(selPage);
    const delBtn = pop.querySelector('[data-delete-page]');
    if (delBtn && !delBtn.disabled) delBtn.onclick = () => deletePage(selPage);

    pop.querySelectorAll('[data-move-page]').forEach(b => {
      if (!b.disabled) b.onclick = () => movePage(selPage, +b.dataset.movePage);
    });
    // "To front"/"To back" is the same single-step move, repeated until the
    // sheet runs out of neighbours — each hop re-keys as it goes.
    pop.querySelectorAll('[data-move-page-end]').forEach(b => {
      if (b.disabled) return;
      b.onclick = () => {
        const dir = +b.dataset.movePageEnd;
        const page = selPage;
        let guard = document.querySelectorAll('.qo-page').length + 1;
        while (guard-- > 0) {
          const list = [...document.querySelectorAll('.qo-page')].filter(p => p.style.display !== 'none');
          const at = list.indexOf(page);
          if (at < 0 || at + dir < 0 || at + dir >= list.length) break;
          movePage(page, dir);
        }
      };
    });

    pop.querySelectorAll('[data-page-theme]').forEach(b => {
      b.onclick = () => setPageTheme(selPage, b.dataset.pageTheme);
    });
    pop.querySelectorAll('[data-page-bg]').forEach(b => {
      b.onclick = () => setPageBg(selPage, b.dataset.pageBg);
    });
    pop.querySelectorAll('[data-page-tone]').forEach(b => {
      b.onclick = () => setPageTone(selPage, b.dataset.pageTone);
    });

    // The swatch drives the page live; the commit (and its undo step) waits
    // for the picker to close, so dragging through a colour wheel doesn't
    // land fifty entries in the history.
    const toneColor = pop.querySelector('[data-tone-color]');
    if (toneColor) {
      const page = selPage;
      const hexField = pop.querySelector('[data-tone-hex]');
      toneColor.addEventListener('input', () => {
        setPageToneHex(page, toneColor.value, false);
        if (hexField) hexField.value = toneColor.value;
      });
      toneColor.addEventListener('change', () => setPageToneHex(page, toneColor.value, true));
    }
    const toneHexField = pop.querySelector('[data-tone-hex]');
    if (toneHexField) {
      const page = selPage;
      toneHexField.addEventListener('input', () => {
        if (!hexToRgbTriple(toneHexField.value)) return;   // ignore half-typed values
        setPageToneHex(page, toneHexField.value, false);
        if (toneColor) toneColor.value = toneHexField.value;
      });
      toneHexField.addEventListener('change', () => {
        if (hexToRgbTriple(toneHexField.value)) setPageToneHex(page, toneHexField.value, true);
      });
    }

    pop.hidden = false;
    positionPop();
  }

  function renderPop() {
    const pop = document.querySelector('.qb-pop');
    if (!pop) return;

    // Grab-to-move applies to exactly one device at a time, and only while
    // its Position tab is showing — the class carries that affordance.
    document.querySelectorAll('.qo-device.qb-pos-target')
      .forEach(d => d.classList.remove('qb-pos-target'));
    if (sel && popTab === 'position') sel.classList.add('qb-pos-target');

    if (!sel && !selPage) { pop.hidden = true; return; }
    if (selPage) { renderPagePop(pop); return; }

    const key = sel.dataset.slot;
    const s = state[key] || {};
    const kind = kindOf(sel);
    const view = VIEWS.find(([v]) => sel.classList.contains(v))?.[0] || 'qo-view--front';
    const curW = Math.round(parseFloat(sel.style.width) || sel.getBoundingClientRect().width / 3.7795);

    const tabs = [
      ['mockup',   'Mockup'],
      ['angle',    'Angle'],
      ['depth',    'Depth'],
      ['shadow',   'Shadow'],
      ['resize',   'Resize'],
      ['position', 'Position'],
    ];

    let panel = '';

    if (popTab === 'mockup') {
      const finish = ALL_FINISHES.includes(s.finish) ? s.finish : 'graphite';
      panel = `<div class="qb-pop__kinds">
        ${KINDS.map(([k, label, , ratio]) => `
          <button class="qb-pop__kind ${k === kind ? 'qb-on' : ''}" data-kind="${k}" title="${label}">
            <span class="qb-pop__glyph" style="aspect-ratio:${ratio};"></span>
            <span>${label}</span>
          </button>`).join('')}
      </div>
      <div class="qb-pop__group-label" style="margin-top:10px;">Finish</div>
      <div class="qb-pop__seg qb-pop__seg--wrap">
        ${FINISHES.map(([f, label, chip]) => `
          <button data-finish="${f}" class="${finish === f ? 'qb-on' : ''}">
            <span class="qb-pop__chip" style="background:${chip};"></span>${label}
          </button>`).join('')}
      </div>
      <div class="qb-pop__row">
        <button class="qb-pop__add" data-add>＋ Add mockup</button>
        <button class="qb-pop__delete" data-delete>🗑 Delete</button>
      </div>`;
    }

    if (popTab === 'angle') {
      const flat = VIEWS.filter(([v]) => !v.includes('3d'));
      const threeD = VIEWS.filter(([v]) => v.includes('3d'));
      const shadow3d = s.shadow3dIntensity ?? 100;
      panel = `
        <div class="qb-pop__group-label">Flat</div>
        <div class="qb-pop__seg">
          ${flat.map(([v, l]) => `<button data-view="${v}" class="${v === view ? 'qb-on' : ''}">${l}</button>`).join('')}
        </div>
        <div class="qb-pop__group-label">3D — extruded edge + glare</div>
        <div class="qb-pop__seg">
          ${threeD.map(([v, l]) => `<button data-view="${v}" class="${v === view ? 'qb-on' : ''}">${l.replace('3D ', '')}</button>`).join('')}
        </div>
        ${view.includes('3d') ? `
        <div class="qb-pop__group-label" style="margin-top:10px;">Backdrop shadow <span data-shadow3d-out>${shadow3d}%</span></div>
        <input type="range" data-shadow3d min="0" max="200" value="${shadow3d}">
        <div class="qb-pop__hint">Cast shadow behind the extruded edge · drag to 0 to remove it</div>` : ''}`;
    }

    if (popTab === 'depth') {
      const curFx = s.fx || '';
      const fxColor = s.fxColor || 'teal';
      const fxIntensity = s.fxIntensity ?? 100;
      panel = `
        <div class="qb-pop__group-label">Depth effect</div>
        <div class="qb-pop__seg qb-pop__seg--wrap">
          ${EFFECTS.map(([c, l]) => `<button data-fx="${c}" class="${c === curFx ? 'qb-on' : ''}">${l}</button>`).join('')}
        </div>
        <div class="qb-pop__group-label" style="margin-top:10px;">Color</div>
        ${renderColorRow(EFFECT_COLORS, 'fx', fxColor, s.fxColorHex, false)}
        <div class="qb-pop__group-label" style="margin-top:10px;">Strength <span data-fxs-out>${fxIntensity}%</span></div>
        <input type="range" data-fx-strength min="20" max="200" value="${fxIntensity}">
        <div class="qb-pop__hint">Shadow grounds the device · glow lifts it off a dark page · reflection mirrors it below</div>`;
    }

    if (popTab === 'shadow') {
      const sh = s.shadow || {};
      const shOn = !!sh.on;
      const shX = sh.x ?? 0;
      const shY = sh.y ?? 8;
      const shBlur = sh.blur ?? 20;
      const shSpread = sh.spread ?? 0;
      const shOpacity = sh.opacity ?? 50;
      const shSX = sh.sx ?? 100;
      const shSY = sh.sy ?? 40;
      const shColor = sh.color || 'black';
      panel = `
        <div class="qb-pop__group-label">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" data-shadow-toggle ${shOn ? 'checked' : ''}> Enable shadow
          </label>
        </div>
        <div data-shadow-controls style="${shOn ? '' : 'opacity:0.35;pointer-events:none;'}">
          <div class="qb-pop__group-label" style="margin-top:8px;">Offset X <span data-sh-x-out>${shX} mm</span></div>
          <input type="range" data-sh-x min="-40" max="40" value="${shX}">
          <div class="qb-pop__group-label" style="margin-top:6px;">Offset Y <span data-sh-y-out>${shY} mm</span></div>
          <input type="range" data-sh-y min="-40" max="40" value="${shY}">
          <div class="qb-pop__group-label" style="margin-top:6px;">Blur <span data-sh-blur-out>${shBlur} mm</span></div>
          <input type="range" data-sh-blur min="0" max="60" value="${shBlur}">
          <div class="qb-pop__group-label" style="margin-top:6px;">Spread <span data-sh-spread-out>${shSpread} mm</span></div>
          <input type="range" data-sh-spread min="-20" max="20" value="${shSpread}">
          <div class="qb-pop__group-label" style="margin-top:6px;">Opacity <span data-sh-opacity-out>${shOpacity}%</span></div>
          <input type="range" data-sh-opacity min="0" max="100" value="${shOpacity}">
          <div class="qb-pop__group-label" style="margin-top:6px;">Scale X <span data-sh-sx-out>${shSX}%</span></div>
          <input type="range" data-sh-sx min="20" max="200" value="${shSX}">
          <div class="qb-pop__group-label" style="margin-top:6px;">Scale Y <span data-sh-sy-out>${shSY}%</span></div>
          <input type="range" data-sh-sy min="10" max="150" value="${shSY}">
          <div class="qb-pop__group-label" style="margin-top:8px;">Color</div>
          ${renderColorRow(SHADOW_COLORS, 'shadow', shColor, sh.colorHex, false)}
          <div class="qb-pop__seg" style="margin-top:10px;">
            <button data-shadow-reset>Reset shadow</button>
          </div>
          <div class="qb-pop__hint">Position, blur, and stretch the shadow independently of the device angle.</div>
        </div>`;
    }

    if (popTab === 'resize') {
      panel = `
        <div class="qb-pop__group-label">Width <span data-w-out>${curW} mm</span></div>
        <input type="range" data-w min="16" max="240" value="${curW}">
        <div class="qb-pop__seg" style="margin-top:8px;">
          <button data-wset="0.8">−20%</button>
          <button data-wset="1.25">+25%</button>
          <button data-wreset>Reset</button>
        </div>`;
    }

    if (popTab === 'position') {
      const st = state[key] || {};
      panel = `
        <div class="qb-pop__pad">
          <span></span><button data-move="0,-8">↑</button><span></span>
          <button data-move="-8,0">←</button><button data-posreset title="Center">·</button><button data-move="8,0">→</button>
          <span></span><button data-move="0,8">↓</button><span></span>
        </div>
        <div class="qb-pop__group-label" style="margin-top:10px;">Offset</div>
        <div class="qb-pop__coords">
          <span>X <b data-pos-x>${Math.round(st.dx || 0)}</b> px</span>
          <span>Y <b data-pos-y>${Math.round(st.dy || 0)}</b> px</span>
        </div>
        <div class="qb-pop__hint">Grab the mockup and drag it anywhere on the sheet. Arrows nudge by 8px, Shift for 32px. While this tab is open, dragging moves the device rather than panning its screen.</div>`;
    }

    pop.innerHTML = `
      <div class="qb-pop__bar">
        <div class="qb-pop__grab" title="Drag to move popover">✥</div>
        ${tabs.map(([t, l]) => `<button class="qb-pop__tab ${popTab === t ? 'qb-on' : ''}" data-tab="${t}">${l}</button>`).join('')}
        <button class="qb-pop__dock" title="Re-dock to device" ${popDetached ? '' : 'hidden'}>📌</button>
        <button class="qb-pop__x" title="Deselect">×</button>
      </div>
      <div class="qb-pop__panel" ${popCollapsed ? 'hidden' : ''}>${panel}</div>
      <div class="qb-pop__footer">
        <button class="qb-pop__toggle-collapse" data-act="toggle-collapse-pop">
          ${popCollapsed ? 'Expand Panel ▼' : 'Collapse Panel ▲'}
        </button>
      </div>`;

    // wiring
    pop.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { popTab = b.dataset.tab; renderPop(); });
    pop.querySelector('.qb-pop__x').onclick = () => select(null);

    pop.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => {
      slotState(key).kind = b.dataset.kind;
      apply(key); save(); renderPop(); renderInspector();
      status('Mockup changed');
    });

    pop.querySelectorAll('[data-fx]').forEach(b => b.onclick = () => {
      const st = slotState(key);
      if (b.dataset.fx) st.fx = b.dataset.fx;
      else delete st.fx;
      apply(key); save(); renderPop(); renderInspector();
      status('Depth changed');
    });

    wireColorRow(pop, 'fx', (val) => {
      slotState(key).fxColor = val;
      apply(key); save(); renderPop(); renderInspector();
      status('Depth color changed');
    }, (hex) => {
      slotState(key).fxColorHex = hex;
      apply(key);
    });

    const fxStrength = pop.querySelector('[data-fx-strength]');
    if (fxStrength) {
      fxStrength.addEventListener('input', () => {
        slotState(key).fxIntensity = +fxStrength.value;
        apply(key);
        const out = pop.querySelector('[data-fxs-out]');
        if (out) out.textContent = fxStrength.value + '%';
      });
      fxStrength.addEventListener('change', () => { save(); renderInspector(); });
    }

    const shadow3dRange = pop.querySelector('[data-shadow3d]');
    if (shadow3dRange) {
      shadow3dRange.addEventListener('input', () => {
        slotState(key).shadow3dIntensity = +shadow3dRange.value;
        apply(key);
        const out = pop.querySelector('[data-shadow3d-out]');
        if (out) out.textContent = shadow3dRange.value + '%';
      });
      shadow3dRange.addEventListener('change', () => { save(); renderInspector(); });
    }

    // ---- Shadow tab wiring ----
    const shadowToggle = pop.querySelector('[data-shadow-toggle]');
    if (shadowToggle) {
      shadowToggle.addEventListener('change', () => {
        const st = slotState(key);
        st.shadow = st.shadow || {};
        st.shadow.on = shadowToggle.checked;
        apply(key); save(); renderPop(); renderInspector();
        status(shadowToggle.checked ? 'Shadow enabled' : 'Shadow disabled');
      });
    }

    const shadowSliders = [
      ['sh-x',       'x',       'sh-x-out',       ' mm'],
      ['sh-y',       'y',       'sh-y-out',       ' mm'],
      ['sh-blur',    'blur',    'sh-blur-out',    ' mm'],
      ['sh-spread',  'spread',  'sh-spread-out',  ' mm'],
      ['sh-opacity', 'opacity', 'sh-opacity-out', '%'],
      ['sh-sx',      'sx',      'sh-sx-out',      '%'],
      ['sh-sy',      'sy',      'sh-sy-out',      '%'],
    ];
    shadowSliders.forEach(([attr, prop, outAttr, unit]) => {
      const range = pop.querySelector(`[data-${attr}]`);
      if (!range) return;
      range.addEventListener('input', () => {
        const st = slotState(key);
        st.shadow = st.shadow || {};
        st.shadow[prop] = +range.value;
        apply(key);
        const out = pop.querySelector(`[data-${outAttr}]`);
        if (out) out.textContent = range.value + unit;
      });
      range.addEventListener('change', () => { save(); renderInspector(); });
    });

    wireColorRow(pop, 'shadow', (val) => {
      const st = slotState(key);
      st.shadow = st.shadow || {};
      st.shadow.color = val;
      apply(key); save(); renderPop(); renderInspector();
      status('Shadow color changed');
    }, (hex) => {
      const st = slotState(key);
      st.shadow = st.shadow || {};
      st.shadow.colorHex = hex;
      apply(key);
    });

    const shadowReset = pop.querySelector('[data-shadow-reset]');
    if (shadowReset) shadowReset.onclick = () => {
      delete slotState(key).shadow;
      apply(key); save(); renderPop(); renderInspector();
      status('Shadow reset');
    };

    pop.querySelectorAll('[data-finish]').forEach(b => b.onclick = () => {
      const st = slotState(key);
      if (b.dataset.finish === 'graphite') delete st.finish;
      else st.finish = b.dataset.finish;
      apply(key); save(); renderPop(); renderInspector();
      status('Finish changed');
    });

    const add = pop.querySelector('[data-add]');
    if (add) add.onclick = () => addDevice(sel);

    const del = pop.querySelector('[data-delete]');
    if (del) del.onclick = () => {
      if (!confirm('Delete this mockup from the page? "Reset all" or undo brings it back.')) return;
      slotState(key).deleted = true;
      apply(key); save(); select(null); renderInspector();
      status('Mockup deleted');
    };

    pop.querySelectorAll('[data-view]').forEach(b => b.onclick = () => {
      slotState(key).view = b.dataset.view;
      apply(key); save(); renderPop(); renderInspector();
    });

    const wRange = pop.querySelector('[data-w]');
    if (wRange) {
      wRange.addEventListener('input', () => {
        slotState(key).w = +wRange.value;
        apply(key);
        const out = pop.querySelector('[data-w-out]');
        if (out) out.textContent = wRange.value + ' mm';
      });
      wRange.addEventListener('change', () => { save(); renderInspector(); });
    }
    pop.querySelectorAll('[data-wset]').forEach(b => b.onclick = () => {
      const cur = parseFloat(sel.style.width) || curW;
      slotState(key).w = Math.max(16, Math.min(240, Math.round(cur * +b.dataset.wset)));
      apply(key); save(); renderPop(); renderInspector();
    });
    const wReset = pop.querySelector('[data-wreset]');
    if (wReset) wReset.onclick = () => {
      slotState(key).w = baseline[key]?.w || 0;
      if (!slotState(key).w) { delete slotState(key).w; sel.style.width = ''; }
      apply(key); save(); renderPop(); renderInspector();
    };

    pop.querySelectorAll('[data-move]').forEach(b => b.onclick = (ev) => {
      const [mx, my] = b.dataset.move.split(',').map(Number);
      const scale = ev.shiftKey ? 4 : 1;
      const st = slotState(key);
      st.dx = (st.dx || 0) + mx * scale;
      st.dy = (st.dy || 0) + my * scale;
      apply(key); save(); renderPop();
    });
    const posReset = pop.querySelector('[data-posreset]');
    if (posReset) posReset.onclick = () => {
      const st = slotState(key);
      st.dx = 0; st.dy = 0;
      apply(key); save();
    };

    // Nothing in here repositions the popover. It is anchored once per
    // selection (see positionPop) and stays there: the tab panels differ in
    // height, so re-placing it on a re-render made the card visibly jump, and
    // re-placing it after a nudge or resize made it crawl along with the
    // device — walking the buttons out from under the cursor mid-adjustment,
    // which is exactly when they need to hold still.
    pop.hidden = false;
  }

  /* ---- canvas interactions ------------------------------------------------------ */

  function bindCanvas() {
    // hover controls for text blocks and repeatable components
    document.addEventListener('mouseover', updateBlockHover);
    window.addEventListener('mouseleave', () => hideBlockTools(true));
    document.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget) hideBlockTools(true);
    });
    window.addEventListener('blur', () => hideBlockTools(true));

    // …and the panels those controls open, which dismiss themselves once the
    // pointer has left both them and their element. Bound separately because
    // updateBlockHover bails out early over the builder's own chrome, which is
    // exactly where these need to keep listening.
    document.addEventListener('mouseover', updateFloatingPanels);
    document.addEventListener('mousedown', () => { pointerIsDown = true; }, true);
    document.addEventListener('mouseup', () => { pointerIsDown = false; }, true);

    let suppressNextClick = false; // swallow the click that follows a text-resize drag

    // select
    document.addEventListener('click', e => {
      if (suppressNextClick) { suppressNextClick = false; return; }
      if (e.target.closest('.qb-drawer--left, .qb-drawer--right, .qb-toggle--left, .qb-toggle--right, .qb-pop, .qb-block-tools, .qb-context-menu')) return;
      if (fiSuppressClick) { fiSuppressClick = false; return; }
      if (posSuppressClick) { posSuppressClick = false; return; }
      if (e.target.closest('[data-fi-handle]')) return;   // handle drags are not selection clicks
      if (styleTarget) closeStylePop();
      if (contextMenuTarget) closeContextMenu();

      const freeImg = e.target.closest('.qo-free-img');
      if (freeImg) { e.preventDefault(); selectFreeImage(freeImg); return; }

      const dev = e.target.closest('.qo-device');
      if (dev) { e.preventDefault(); select(dev); return; }

      let textEl = e.target.closest('[data-editable="true"]');
      if (!textEl && e.target.closest('.qo-page')) {
        const candidate = e.target.closest('h1, h2, h3, h4, h5, h6, p, li, dt, dd, td, th, label, figcaption, cite, span, a, b, strong, em, small');
        if (candidate && isLeafText(candidate) && !candidate.closest('.qo-device__frame, .qb-drawer, .qb-pop, .qb-navbar, code, pre, .qo-page__num')) {
          textEl = candidate;
          if (!textEl.dataset.editable) {
            textEl.dataset.editable = 'true';
            if (!isElementLocked(textEl)) textEl.setAttribute('contenteditable', 'true');
            indexTexts();
          }
        }
      }

      if (textEl) { selectText(textEl); return; }
      const page = e.target.closest('.qo-page');
      if (page) { selectPage(page); return; }
      if (sel || selText || selPage) select(null);
    });

    // Text-block width resize — hovering the left/right edge of an editable
    // text element swaps the cursor to a horizontal resize handle (same
    // affordance as dragging a Windows Explorer pane divider); dragging it
    // sets the element's width live on every mousemove so the text reflows
    // continuously instead of only settling once the drag ends.
    const RESIZE_EDGE_PX = 6;
    const RESIZE_MIN_WIDTH = 24;
    let resizeHoverEl = null;
    let textResize = null;

    function resizeEdgeAt(el, clientX) {
      const r = el.getBoundingClientRect();
      if (clientX - r.left <= RESIZE_EDGE_PX) return 'left';
      if (r.right - clientX <= RESIZE_EDGE_PX) return 'right';
      return null;
    }

    document.addEventListener('mousemove', e => {
      if (textResize || !document.body.classList.contains('qb-open')) return;
      const el = e.target.closest('[data-editable="true"]');
      const onEdge = el && !isElementLocked(el) && resizeEdgeAt(el, e.clientX);
      const hoverTarget = onEdge ? el : null;
      // Clear the cursor left over from whatever was hovered before —
      // needed even when jumping straight from one element's edge to
      // another element's middle, not just when leaving to empty space.
      if (resizeHoverEl && resizeHoverEl !== hoverTarget) resizeHoverEl.style.cursor = '';
      if (hoverTarget) hoverTarget.style.cursor = 'col-resize';
      resizeHoverEl = hoverTarget;
    });

    document.addEventListener('mousedown', e => {
      const el = e.target.closest('[data-editable="true"]');
      if (!el || isElementLocked(el)) return;
      const edge = resizeEdgeAt(el, e.clientX);
      if (!edge) return;
      e.preventDefault();
      e.stopPropagation();

      // Inline elements (span, a, em…) don't respect width at all until
      // switched to inline-block.
      if (el.dataset.qbInlineText === 'true') el.style.display = 'inline-block';
      // Authored typography often caps measure with max-width (e.g. cover
      // titles at 16ch) — that would silently out-clamp a manual resize,
      // so a drag overrides it same as it overrides the authored width.
      el.style.maxWidth = 'none';
      textResize = {
        el,
        key: el.dataset.textId,
        edge,
        startX: e.clientX,
        startWidth: el.getBoundingClientRect().width,
        startMarginLeft: parseFloat(getComputedStyle(el).marginLeft) || 0,
        moved: false,
      };
      el.classList.add('qb-text-resizing');
      document.body.classList.add('qb-resizing-text');
    }, true);

    document.addEventListener('mousemove', e => {
      if (!textResize) return;
      const dx = e.clientX - textResize.startX;
      if (Math.abs(dx) > 2) textResize.moved = true;

      if (textResize.edge === 'right') {
        // Right border tracks the cursor; left edge stays put.
        const w = Math.max(RESIZE_MIN_WIDTH, Math.round(textResize.startWidth + dx));
        textResize.el.style.width = w + 'px';
      } else {
        // Left border tracks the cursor; right edge stays put, so the
        // margin has to absorb whatever the width doesn't.
        const w = Math.max(RESIZE_MIN_WIDTH, Math.round(textResize.startWidth - dx));
        const widthDelta = w - textResize.startWidth;
        textResize.el.style.width = w + 'px';
        textResize.el.style.marginLeft = (textResize.startMarginLeft - widthDelta) + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      if (!textResize) return;
      const { el, key, moved } = textResize;
      el.classList.remove('qb-text-resizing');
      document.body.classList.remove('qb-resizing-text');
      if (moved) {
        const st = styleStateOf(key);
        st.width = Math.round(parseFloat(el.style.width)) || undefined;
        const ml = Math.round(parseFloat(el.style.marginLeft) || 0);
        if (ml) st.marginLeft = ml; else delete st.marginLeft;
        save();
        suppressNextClick = true;
      }
      textResize = null;
    });

    /* Drag to position — the Position tab turns the selected mockup into
       something you grab and move, anywhere on it including the bezel. It
       takes the mousedown before the pan handler below (capture phase, and
       it stops propagation), because on that tab the screen should move the
       device rather than pan its image. */
    let posDrag = null;
    let posSuppressClick = false;
    document.addEventListener('mousedown', e => {
      if (popTab !== 'position' || !sel) return;
      const dev = e.target.closest('.qo-device');
      if (dev !== sel) return;
      if (isElementLocked(dev)) { status('Mockup is locked'); return; }
      e.preventDefault();
      e.stopPropagation();

      const page = dev.closest('.qo-page');
      const rect = page.getBoundingClientRect();
      const s = slotState(dev.dataset.slot);
      posDrag = {
        key: dev.dataset.slot,
        px: e.clientX,
        py: e.clientY,
        dx: s.dx || 0,
        dy: s.dy || 0,
        // Page-level zoom again: divide the cursor delta by the sheet's own
        // scale so the mockup tracks the pointer 1:1 at any browser zoom.
        k: rect.width / (page.offsetWidth || 1) || 1,
        moved: false,
      };
      dev.classList.add('qb-pos-dragging');
      document.body.classList.add('qb-pos-dragging-on');
    }, true);

    document.addEventListener('mousemove', e => {
      if (!posDrag) return;
      const s = slotState(posDrag.key);
      const mx = (e.clientX - posDrag.px) / posDrag.k;
      const my = (e.clientY - posDrag.py) / posDrag.k;
      if (Math.abs(mx) > 1 || Math.abs(my) > 1) posDrag.moved = true;
      // Shift keeps a drag on one axis, the way a nudge would.
      s.dx = Math.round(e.shiftKey && Math.abs(mx) < Math.abs(my) ? posDrag.dx : posDrag.dx + mx);
      s.dy = Math.round(e.shiftKey && Math.abs(my) < Math.abs(mx) ? posDrag.dy : posDrag.dy + my);
      apply(posDrag.key);

      // Live readout in the popover, without re-rendering it mid-drag.
      const xOut = document.querySelector('.qb-pop [data-pos-x]');
      const yOut = document.querySelector('.qb-pop [data-pos-y]');
      if (xOut) xOut.textContent = s.dx;
      if (yOut) yOut.textContent = s.dy;
    });

    document.addEventListener('mouseup', () => {
      if (!posDrag) return;
      const { moved } = posDrag;
      document.querySelector('.qo-device.qb-pos-dragging')?.classList.remove('qb-pos-dragging');
      document.body.classList.remove('qb-pos-dragging-on');
      posDrag = null;
      if (moved) { posSuppressClick = true; save(); renderInspector(); status('Mockup moved'); }
    });

    /* Middle-button drag pans the whole canvas — the deck is a tall column of
       sheets and every other drag gesture on it is already spoken for (the
       screen pans its image, the Position tab moves the mockup, blank page
       area selects the page), so the wheel button is the one press left that
       can mean "move the view" anywhere without a modifier.

       Capture phase, and it swallows the event: the image-pan and
       position-drag handlers below never look at e.button, so without
       stopPropagation a middle-press over a selected device would start a
       canvas pan and an image pan at the same time. */
    let canvasPan = null;

    const endCanvasPan = () => {
      if (!canvasPan) return;
      canvasPan = null;
      document.body.classList.remove('qb-canvas-panning');
    };

    document.addEventListener('mousedown', e => {
      if (e.button !== 1) return;
      // The chrome keeps its own scrolling — a drawer is a list, not the canvas.
      if (e.target.closest('.qb-drawer, .qb-pop, .qb-navbar')) return;
      e.preventDefault();      // also suppresses Chrome's autoscroll widget
      e.stopPropagation();
      canvasPan = { px: e.clientX, py: e.clientY, sx: window.scrollX, sy: window.scrollY };
      document.body.classList.add('qb-canvas-panning');
    }, true);

    document.addEventListener('mousemove', e => {
      if (!canvasPan) return;
      e.preventDefault();
      // Content follows the cursor, so the scroll offset moves against it.
      // behavior:'instant' overrides the stylesheet's scroll-behavior:smooth,
      // which would otherwise ease every frame of the drag and lag the pointer.
      window.scrollTo({
        left: canvasPan.sx - (e.clientX - canvasPan.px),
        top:  canvasPan.sy - (e.clientY - canvasPan.py),
        behavior: 'instant',
      });
    });

    document.addEventListener('mouseup', e => { if (e.button === 1) endCanvasPan(); });
    // Releasing outside the document, or alt-tabbing mid-drag, must not leave
    // the canvas stuck to the pointer.
    window.addEventListener('blur', endCanvasPan);
    document.addEventListener('mouseleave', endCanvasPan);
    // Middle-click's own default action (autoscroll, or paste on Linux) fires
    // on release and would land after the pan finished.
    document.addEventListener('auxclick', e => {
      if (e.button === 1 && !e.target.closest('.qb-drawer, .qb-pop, .qb-navbar')) e.preventDefault();
    });

    // drag to pan
    let drag = null;
    document.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      const screen = e.target.closest('.qo-screen');
      const dev = screen?.closest('.qo-device');
      if (!dev || dev !== sel || !screen.querySelector('img')) return;
      e.preventDefault();
      const s = slotState(dev.dataset.slot);
      // account for any page-level zoom so the image tracks the cursor 1:1
      const k = screen.getBoundingClientRect().width / screen.offsetWidth || 1;
      drag = { key: dev.dataset.slot, px: e.clientX, py: e.clientY, x: s.x || 0, y: s.y || 0, k };
    });
    document.addEventListener('mousemove', e => {
      if (!drag) return;
      const s = slotState(drag.key);
      s.x = drag.x + (e.clientX - drag.px) / drag.k;
      s.y = drag.y + (e.clientY - drag.py) / drag.k;
      clampPan(drag.key);
      apply(drag.key);
    });
    document.addEventListener('mouseup', () => {
      if (!drag) return;
      drag = null; save(); renderInspector();
    });

    // wheel to zoom
    document.addEventListener('wheel', e => {
      const screen = e.target.closest('.qo-screen');
      const dev = screen?.closest('.qo-device');
      if (!dev || dev !== sel || !screen.querySelector('img')) return;
      e.preventDefault();
      const s = slotState(dev.dataset.slot);
      s.z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomOf(s) * (e.deltaY < 0 ? 1.06 : 0.94)));
      clampPan(dev.dataset.slot);   // zooming out shrinks the slack — rein the pan back in
      apply(dev.dataset.slot); save(); renderInspector();
    }, { passive: false });

    // drop a thumbnail onto a device
    document.addEventListener('dragover', e => {
      const dev = e.target.closest('.qo-device');
      if (!dev) {
        // Anywhere else on a sheet is a valid landing spot for a placed image.
        if (e.target.closest('.qo-page')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
        document.querySelectorAll('.qb-logo-drop').forEach(l => l.classList.remove('qb-logo-drop'));
        e.target.closest('.qo-logo')?.classList.add('qb-logo-drop');
        return;
      }
      document.querySelectorAll('.qb-logo-drop').forEach(l => l.classList.remove('qb-logo-drop'));
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      document.querySelectorAll('.qb-drop').forEach(d => d.classList.remove('qb-drop'));
      dev.querySelector('.qo-device__frame')?.classList.add('qb-drop');
    });
    document.addEventListener('dragleave', e => {
      if (!e.target.closest('.qo-device')) {
        document.querySelectorAll('.qb-drop').forEach(d => d.classList.remove('qb-drop'));
      }
      if (!e.target.closest('.qo-logo')) {
        document.querySelectorAll('.qb-logo-drop').forEach(l => l.classList.remove('qb-logo-drop'));
      }
    });
    document.addEventListener('drop', async e => {
      const dev = e.target.closest('.qo-device');
      document.querySelectorAll('.qb-drop').forEach(d => d.classList.remove('qb-drop'));

      // A logo well is a smaller, more specific target than the sheet or the
      // mockup it may be sitting over, so it gets first refusal on the drop.
      document.querySelectorAll('.qb-logo-drop').forEach(l => l.classList.remove('qb-logo-drop'));

      const well = e.target.closest('.qo-logo');
      if (well) {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files?.length) {
          status('Uploading logo…');
          const ids = await addCustomImages(e.dataTransfer.files);
          if (ids[0]) assignLogo(well.dataset.logoId, { srcId: ids[0] });
          return;
        }
        const payload = e.dataTransfer.getData('text/qo-free-img');
        const path = e.dataTransfer.getData('text/qo-path');
        if (payload) {
          try { assignLogo(well.dataset.logoId, JSON.parse(payload)); }
          catch { status('Could not read that image'); }
        } else if (path) {
          assignLogo(well.dataset.logoId, { src: path });
        }
        return;
      }

      // Not on a mockup but still on a sheet: place it free-floating, centred
      // on the cursor, rather than ignoring the drop.
      if (!dev) {
        const page = e.target.closest('.qo-page');
        if (!page) return;
        const pr = page.getBoundingClientRect();
        const atX = (e.clientX - pr.left) / pr.width * 100;
        const atY = (e.clientY - pr.top) / pr.height * 100;

        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          e.preventDefault();
          status('Uploading dropped image…');
          const ids = await addCustomImages(e.dataTransfer.files);
          ids.forEach((id, i) => placeFreeImage({ srcId: id }, page, atX + i * 3, atY + i * 3));
          return;
        }

        const payload = e.dataTransfer.getData('text/qo-free-img');
        const path = e.dataTransfer.getData('text/qo-path');
        if (payload) {
          e.preventDefault();
          try { placeFreeImage(JSON.parse(payload), page, atX, atY); } catch { status('Could not place that image'); }
        } else if (path) {
          e.preventDefault();
          placeFreeImage({ src: path, name: path.split('/').pop() }, page, atX, atY);
        }
        return;
      }

      e.preventDefault();
      
      // Support dropping local file directly onto a device mockup
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
        if (files.length) {
          status('Uploading dropped image...');
          try {
            const dataUrl = await downscaleImage(files[0]);
            const id = 'up-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            customImages.push({
              id,
              name: files[0].name,
              path: dataUrl,
            });
            saveCustomImages();
            buildTray();
            select(dev);
            assign(dev.dataset.slot, dataUrl);
          } catch (err) {
            status('Could not read dropped file');
          }
        }
        return;
      }

      const path = e.dataTransfer.getData('text/qo-path');
      if (path) { select(dev); assign(dev.dataset.slot, path); }
    });
  }

  /* ---- footer actions -------------------------------------------------------------- */

  function onAction(e) {
    const act = e.target.dataset.act;
    if (!act) return;

    if (act === 'preview-pdf') {
      togglePdfPreview(true);
      return;
    }

    if (act === 'save-new') {
      saveCurrentAs();
      return;
    }

    if (act === 'add-page') {
      addPage(selPage || null);
      return;
    }

    if (act === 'add-mockup') {
      addDevice(sel || null);
      return;
    }

    if (act === 'load-toggle') {
      const box = document.querySelector('.qb-saves-list');
      if (!box) return;
      const willShow = box.hasAttribute('hidden');
      if (willShow) renderSavesList();
      box.toggleAttribute('hidden', !willShow);
      return;
    }

    if (act === 'pdf') {
      document.body.classList.remove('qb-open');
      status('Opening print dialog…');
      // let the drawer finish closing so it can't appear in the capture
      setTimeout(() => window.print(), 300);
    }

    if (act === 'export') {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'qoarc-layout.json';
      a.click();
      URL.revokeObjectURL(a.href);
      status('Exported layout');
    }

    if (act === 'import') {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'application/json';
      inp.onchange = () => {
        const f = inp.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          try {
            loadState(JSON.parse(r.result), 'Layout imported');
          } catch { status('Invalid JSON'); }
        };
        r.readAsText(f);
      };
      inp.click();
    }

    if (act === 'export-html') {
      const clone = document.documentElement.cloneNode(true);
      clone.querySelectorAll('.qb-navbar, .qb-toggle--left, .qb-toggle--right, .qb-drawer--left, .qb-drawer--right, .qb-pop, .qb-block-tools, .qb-context-menu, .qb-pdf-bar, .qb-fi-overlay')
        .forEach(el => el.remove());
      // panel.css only styles builder chrome (navbar, drawers, popovers) —
      // all of it just got removed above, but the stylesheet link itself
      // was never dropped, so a "clean" export still pulled in its
      // unconditional body{padding-top:46px} and left dead space up top.
      // Matched loosely on purpose: the link carries a cache-busting query
      // (panel.css?v=…), which an ends-with match silently misses — leaving
      // the builder's own hover outlines and cursors in a "clean" export.
      clone.querySelectorAll('link[href*="panel.css"]').forEach(el => el.remove());
      clone.querySelector('body')?.classList.remove('qb-open', 'qb-text-open', 'qb-pdf-preview');
      clone.querySelectorAll('.qb-sel, .qb-drop, .qb-text-sel, .qb-block-hover, .qb-page-sel')
        .forEach(el => el.classList.remove('qb-sel', 'qb-drop', 'qb-text-sel', 'qb-block-hover', 'qb-page-sel'));

      // Placed images are real markup carrying real inline geometry, so they
      // export as-is — only the builder's own hooks come off. Their layout
      // rules live in css/free-images.css, which the export keeps linked.
      clone.querySelectorAll('.qb-logo-clear').forEach(el => el.remove());
      clone.querySelectorAll('.qo-logo').forEach(el => {
        el.removeAttribute('data-logo-id');
        el.classList.remove('qb-logo-drop');
      });

      clone.querySelectorAll('.qo-free-img').forEach(el => {
        el.removeAttribute('data-free-img');
        el.classList.remove('qb-fi-sel', 'qb-fi-locked');
        if (!el.getAttribute('class')) el.setAttribute('class', 'qo-free-img');
      });

      const removedTexts = state.removedTexts || [];
      const removedBlocks = state.removedBlocks || [];
      clone.querySelectorAll('[data-text-id]').forEach(el => {
        if (removedTexts.includes(el.dataset.textId)) el.remove();
      });
      clone.querySelectorAll('[data-block-id]').forEach(el => {
        if (removedBlocks.includes(el.dataset.blockId)) el.remove();
        else el.removeAttribute('data-block-id');
      });

      clone.querySelectorAll('[data-editable]').forEach(el => {
        el.removeAttribute('contenteditable');
        el.removeAttribute('data-editable');
        el.removeAttribute('data-text-id');
      });

      clone.querySelectorAll('.qo-page').forEach((page, pi) => {
        if (page.style.display === 'none') { page.remove(); return; }   // deleted pages leave no markup
        delete page.dataset.pageId;

        page.querySelectorAll('.qo-device').forEach((el, di) => {
          const key = `p${pi + 1}-d${di + 1}`;
          const s = state[key];
          if (!s) return;
          delete el.dataset.slot;

          if (s.deleted) { el.remove(); return; }   // deleted mockups leave no markup

          const screen = el.querySelector('.qo-screen');
          if (!screen) return;

          if (s.kind && s.kind !== kindOf(el)) setKind(el, s.kind);
          ALL_FINISHES.forEach(f => el.classList.remove('qo-device--' + f));
          if (s.finish && ALL_FINISHES.includes(s.finish)) el.classList.add('qo-device--' + s.finish);
          ALL_FX.forEach(c => el.classList.remove(c));
          if (s.fx) {
            el.classList.add(s.fx);
            const rgb = resolveColorRgb(s.fxColor || 'teal', s.fxColorHex, effectRgb);
            const strength = (s.fxIntensity ?? 100) / 100;
            el.style.setProperty('--qo-fx-glow', `rgba(${rgb}, ${Math.min(0.95, 0.5 * strength).toFixed(2)})`);
            el.style.setProperty('--qo-fx-shadow', `rgba(0, 0, 0, ${Math.min(0.95, 0.45 * strength).toFixed(2)})`);
            el.style.setProperty('--qo-fx-stroke', `rgba(${rgb}, ${Math.min(0.95, 0.85 * strength).toFixed(2)})`);
            el.style.setProperty('--qo-fx-scale', strength.toFixed(2));
          }
          const shadow3d = (s.shadow3dIntensity ?? 100) / 100;
          if (shadow3d !== 1) {
            el.style.setProperty('--qo-3d-shadow', `rgba(0, 0, 0, ${Math.min(0.95, 0.8 * shadow3d).toFixed(2)})`);
            el.style.setProperty('--qo-3d-shadow-scale', shadow3d.toFixed(2));
          }
          if (s.dx || s.dy) el.style.translate = `${s.dx || 0}px ${s.dy || 0}px`;

          let img = screen.querySelector('img');
          if (s.src) {
            if (!img) {
              img = document.createElement('img');
              img.setAttribute('alt', '');
              screen.appendChild(img);
            }
            img.setAttribute('src', s.src);
          } else if (img) {
            img.remove();
            img = null;
          }

          screen.classList.remove('qo-screen--fit-width', 'qo-screen--auto');
          if (s.fit === 'fit-width') screen.classList.add('qo-screen--fit-width');
          if (s.fit === 'auto') screen.classList.add('qo-screen--auto');

          if (s.view) {
            VIEWS.forEach(([cls]) => el.classList.remove(cls));
            el.classList.add(s.view);
          }

          if (s.w) el.style.width = s.w + 'mm';
          else if (el.style.width) el.style.width = '';

          if (img) {
            if (s.x || s.y || zoomOf(s) !== 1) {
              img.style.setProperty('--sx', (s.x || 0) + 'px');
              img.style.setProperty('--sy', (s.y || 0) + 'px');
              img.style.setProperty('--sz', zoomOf(s));
            } else {
              img.removeAttribute('style');
            }
          }
        });
      });

      const htmlContent = '<!DOCTYPE html>\n' + clone.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'index.html';
      a.click();
      URL.revokeObjectURL(a.href);
      status('Exported clean index.html');
    }

    if (act === 'reset') {
      if (!confirm('Discard your changes and restore the layout and text as shipped in index.html?')) return;
      loadState({}, 'Restored to document');
    }
  }

  /* ---- keyboard shortcuts -------------------------------------------------------- */

  function bindKeyboard() {
    document.addEventListener('keydown', e => {
      // Escape handler
      if (e.key === 'Escape') {
        if (document.body.classList.contains('qb-pdf-preview')) {
          togglePdfPreview(false);
          return;
        }
        if (styleTarget) { closeStylePop(); return; }
        if (contextMenuTarget) { closeContextMenu(); return; }
        if (sel || selText || selPage || selImg) { select(null); }
        else document.body.classList.remove('qb-open', 'qb-text-open');
        return;
      }

      // Undo / Redo shortcuts (work even if input is focused if editing text, but avoid breaking typing)
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && !isInput) {
        e.preventDefault();
        undo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) && !isInput) {
        e.preventDefault();
        redo();
        return;
      }

      if (isInput) return;

      // A selected placed image takes the arrow keys and Delete for itself —
      // nudging it around the sheet, in the same units the sliders use.
      if (selImg) {
        const entry = freeImgEntry(selImg);
        if (entry && !entry.locked) {
          const stepX = e.shiftKey ? 2 : 0.25;
          const stepY = e.shiftKey ? 2 : 0.25;
          const nudge = (dx, dy) => {
            e.preventDefault();
            entry.x = round2(clampNum(entry.x + dx, -entry.w * 0.9, 100 - entry.w * 0.1));
            entry.y = round2(clampNum(entry.y + dy, -entry.h * 0.9, 100 - entry.h * 0.1));
            applyFreeImgTo(selImg, entry);
            updateFreeImgOverlay();
            save();
            renderImageInspector();
          };
          if (e.key === 'ArrowLeft') { nudge(-stepX, 0); return; }
          if (e.key === 'ArrowRight') { nudge(stepX, 0); return; }
          if (e.key === 'ArrowUp') { nudge(0, -stepY); return; }
          if (e.key === 'ArrowDown') { nudge(0, stepY); return; }
          if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            deleteFreeImage(entry.id);
            return;
          }
        }
      }

      if (!document.body.classList.contains('qb-open') && !sel && !selText && !selPage) return;

      if (!sel) return;
      const key = sel.dataset.slot;
      const s = slotState(key);
      const step = e.shiftKey ? 10 : 1;

      // On the Position tab the arrows move the whole mockup, matching what
      // dragging does there; otherwise they pan the image, as before.
      if (popTab === 'position' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'ArrowLeft') s.dx = (s.dx || 0) - step;
        if (e.key === 'ArrowRight') s.dx = (s.dx || 0) + step;
        if (e.key === 'ArrowUp') s.dy = (s.dy || 0) - step;
        if (e.key === 'ArrowDown') s.dy = (s.dy || 0) + step;
        apply(key); save(); renderPop();
        return;
      }

      if (e.key === 'ArrowLeft') { e.preventDefault(); s.x = (s.x || 0) - step; clampPan(key); apply(key); save(); renderInspector(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); s.x = (s.x || 0) + step; clampPan(key); apply(key); save(); renderInspector(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); s.y = (s.y || 0) - step; clampPan(key); apply(key); save(); renderInspector(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); s.y = (s.y || 0) + step; clampPan(key); apply(key); save(); renderInspector(); }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); s.z = Math.min(MAX_ZOOM, zoomOf(s) + 0.05); clampPan(key); apply(key); save(); renderInspector(); }
      if (e.key === '-' || e.key === '_') { e.preventDefault(); s.z = Math.max(MIN_ZOOM, zoomOf(s) - 0.05); clampPan(key); apply(key); save(); renderInspector(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();

        // 1. Device mockup selection
        if (sel) {
          const key = sel.dataset.slot;
          if (slotState(key).src) {
            delete slotState(key).src;
            slotState(key).x = 0; slotState(key).y = 0; slotState(key).z = 1;
            apply(key); save(); renderInspector(); markUsedThumbs();
            status('Image removed');
          } else {
            slotState(key).deleted = true;
            apply(key); save(); select(null); renderInspector();
            status('Mockup deleted');
          }
          return;
        }

        // 2. Text element selection
        if (selText) {
          const textId = selText.dataset.textId;
          if (textId) {
            removeTextBlock(textId);
            selectText(null);
            status('Text element removed');
          }
          return;
        }

        // 3. Hovered component block
        if (hoveredBlockEl) {
          const blockId = hoveredBlockEl.dataset.blockId;
          const textId = hoveredBlockEl.dataset.textId;
          if (blockId) {
            removeBlock(blockId);
            status('Component block removed');
          } else if (textId) {
            removeTextBlock(textId);
            status('Text element removed');
          }
          return;
        }
      }
    });
  }

  /* ---- manual entry beside every slider ------------------------------------
     A slider is fast but never exact, and every value behind one here is a
     real number an author may already know — 42mm, -12px, 180°. Each range
     gets a number box next to it.

     Generated from the range rather than written out at each of the forty-odd
     call sites: the box inherits min/max/step from the slider it belongs to,
     and commits by dispatching that slider's own input/change events. The
     existing handler stays the only code that writes to state, so a typed
     value and a dragged one travel exactly the same path. */

  function sliderUnit(range) {
    // Every slider is preceded by its own read-out — "Width <span>48 mm</span>"
    // in the inspectors, "Blur <span>6 mm</span>" in the popovers.
    const field = range.closest('.qb-field');
    const out = field?.querySelector('label span')
             || range.previousElementSibling?.querySelector?.('span');
    const m = /([a-z°%]+)\s*$/i.exec(out?.textContent?.trim() || '');
    return m ? m[1] : '';
  }

  function attachNumberField(range) {
    // Marked before anything is inserted: the observer below sees the nodes
    // this function itself adds, and would otherwise re-enter on them.
    if (range.dataset.qbNum) return;
    range.dataset.qbNum = 'true';

    const row = document.createElement('div');
    row.className = 'qb-range-row';
    range.replaceWith(row);
    row.appendChild(range);

    const box = document.createElement('span');
    box.className = 'qb-num';
    const num = document.createElement('input');
    num.type = 'number';
    if (range.min !== '') num.min = range.min;
    if (range.max !== '') num.max = range.max;
    num.step = range.step || 1;
    num.value = range.value;
    num.disabled = range.disabled;
    box.appendChild(num);

    const unit = sliderUnit(range);
    if (unit) {
      const u = document.createElement('i');
      u.textContent = unit;
      box.appendChild(u);
    }
    row.appendChild(box);

    // Slider → box, so dragging keeps the number honest.
    range.addEventListener('input', () => { num.value = range.value; });

    const commit = (type) => {
      const v = parseFloat(num.value);
      if (Number.isNaN(v)) return;   // "" or a lone "-" mid-typing: wait for more
      const min = range.min === '' ? -Infinity : +range.min;
      const max = range.max === '' ? Infinity : +range.max;
      range.value = Math.min(max, Math.max(min, v));
      range.dispatchEvent(new Event(type, { bubbles: true }));
    };

    // Typing streams through 'input' so the canvas tracks live exactly as it
    // does under a drag. 'change' is what the handlers treat as the end of a
    // gesture — the point they save and re-render on — so it is only sent
    // when the value is actually committed.
    num.addEventListener('input', () => commit('input'));
    num.addEventListener('change', () => { commit('input'); commit('change'); });
    num.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      commit('input');
      commit('change');
      num.blur();
    });
  }

  function attachNumberFieldsIn(root) {
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.matches?.('input[type="range"]')) attachNumberField(root);
    root.querySelectorAll?.('input[type="range"]').forEach(attachNumberField);
  }

  /* Inspectors, popovers and trays are all rebuilt by replacing innerHTML,
     from a dozen different places and on every selection change. Watching for
     the sliders to appear covers all of them at once — and keeps covering any
     added later — instead of remembering to call this after each render. */
  function watchForSliders() {
    attachNumberFieldsIn(document);
    new MutationObserver(muts => {
      muts.forEach(m => m.addedNodes.forEach(attachNumberFieldsIn));
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ---- boot -------------------------------------------------------------------------- */

  function init() {
    load();                // state (incl. .added / .pagesAdded / .pagesDeleted) must exist first
    loadCustomFonts();     // …and the @font-face rules before applyStyles() asks for them
    refreshFontFaces();
    ensurePageIds();       // stable ids for the ORIGINAL pages, before any dynamic ones exist
    recreatePagesAdded();  // reinsert pages added in a previous session
    applyPageOrder();      // …then put every sheet where this state left it —
                           // before indexSlots(), since slot keys are positional
    capturePageThemes();   // remember how the template authored each sheet
    recreateAdded();       // reinsert devices added in a previous session (may live on those pages)
    indexSlots();
    indexTexts();
    indexBlocks();
    recreateBlocksAdded();   // needs the authored blocks stamped first — that's the anchor
    indexTexts();            // …then register whatever came back with them
    indexBlocks();
    indexLogos();
    originalBlockIds = blockSlots
      .map(b => b.key)
      .filter(k => !(state.blocksAdded || []).some(a => a.id === k));
    baseline = readDOM();  // snapshot the now-complete DOM (recreated extras included)
    // Recreated devices are extras, not authored content — flag them in the
    // baseline every load so "Reset all" hides them again, the same way
    // addDevice() flags them the moment they're created.
    (state.added || []).forEach(k => { baseline[k] = { deleted: true }; });
    fillMissingFromBaseline();   // any slot with no saved edits falls back to what the document ships
    applyPageThemes();
    applyPageTones();
    applyPageBackgrounds();
    applyPageVisibility();
    buildUI();
    buildBlockTools();
    buildStylePop();
    buildContextMenu();
    applyAll();
    applyAllText();
    applyBlocks();
    applyStyles();
    applyFreeImages();
    applyLogos();
    // History starts here, not back in load(). load() snapshots the stored
    // blob as-is — before fillMissingFromBaseline() has filled in every slot
    // the document ships with — so the bottom of the undo stack described a
    // document that never existed: undoing all the way stripped the authored
    // screenshots instead of restoring the file as opened.
    resetHistory();
    watchForSliders();
    bindCanvas();
    bindFreeImageCanvas();
    bindLogoWells();
    bindKeyboard();
    markUsedThumbs();
    if (state.showGrid) {
      document.body.classList.add('qb-show-grid');
      document.querySelector('.qb-toggle-grid')?.classList.add('qb-on');
    }
    if (state.showAxis) {
      document.body.classList.add('qb-show-axis');
      document.querySelector('.qb-toggle-axis')?.classList.add('qb-on');
    }
    window.QOBuilder = {
      get state() { return state; },
      get baseline() { return baseline; },
      get textBaseline() { return textBaseline; },
      apply, applyAll, applyAllText, indexSlots, indexTexts, select, selectText,
      placeFreeImage, applyFreeImages, selectFreeImage,
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
