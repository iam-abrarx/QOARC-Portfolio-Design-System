/* ============================================================
   TOKEN DERIVATION
   Expands the five brand colors (deep space, navy, slate, paper,
   teal) into the full custom-property set css/tokens.css hand-
   authors — hover/active/muted states, the navy hover, the
   elevation ladder, and the light-theme role overrides — using the
   same lighten/darken relationships already visible between
   tokens.css's own shipped defaults. Shared by the project creation
   screen (live preview) and by project.js (applying an active
   project's palette inside index.html), so both use identical math.
   ============================================================ */

(function () {
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec((hex || '').trim());
    if (!m) return { r: 10, g: 24, b: 48 };
    let h = m[1];
    if (h.length === 3) h = [...h].map(c => c + c).join('');
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex({ r, g, b }) {
    return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  }

  function rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h *= 60;
    }
    return { h, s: s * 100, l: l * 100 };
  }

  function hslToRgb({ h, s, l }) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    if (s === 0) { const v = l * 255; return { r: v, g: v, b: v }; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return {
      r: hue2rgb(p, q, h / 360 + 1 / 3) * 255,
      g: hue2rgb(p, q, h / 360) * 255,
      b: hue2rgb(p, q, h / 360 - 1 / 3) * 255,
    };
  }

  const hexToHsl = hex => rgbToHsl(hexToRgb(hex));
  const hslToHex = hsl => rgbToHex(hslToRgb(hsl));

  /* Nudges a hex color's lightness (and optionally saturation) by a fixed
     amount in HSL space — the same kind of step tokens.css's own hover/
     active/elevation values already are relative to their base color. */
  function shiftLightness(hex, deltaL, deltaS) {
    const hsl = hexToHsl(hex);
    return hslToHex({ h: hsl.h, s: clamp(hsl.s + (deltaS || 0), 0, 100), l: clamp(hsl.l + deltaL, 0, 100) });
  }

  function rgbTriple(hex) {
    const { r, g, b } = hexToRgb(hex);
    return `${Math.round(r)},${Math.round(g)},${Math.round(b)}`;
  }

  function rgba(hex, a) { return `rgba(${rgbTriple(hex)}, ${a})`; }

  const DEFAULT_COLORS = {
    deepSpace: '#0A1830',
    navy: '#0F2244',
    slate: '#6B7A94',
    paper: '#F7F7F9',
    teal: '#2DD4BF',
  };

  /* Returns { root, light, swatches } — root/light are flat maps of CSS
     custom-property name -> value, matching tokens.css's :root block and
     its .qo-page--light override block respectively. */
  function deriveTokens(colors) {
    const c = { ...DEFAULT_COLORS, ...(colors || {}) };

    const root = {
      '--qo-deep-space': c.deepSpace,
      '--qo-navy': c.navy,
      '--qo-slate': c.slate,
      '--qo-paper': c.paper,
      '--qo-teal': c.teal,

      '--qo-teal-hover': shiftLightness(c.teal, 13),
      '--qo-teal-active': shiftLightness(c.teal, -14),
      '--qo-teal-muted': rgba(c.teal, 0.14),
      '--qo-teal-glow': rgba(c.teal, 0.35),

      '--qo-navy-hover': shiftLightness(c.navy, 10),
      '--qo-slate-muted': rgba(c.slate, 0.35),
      '--qo-paper-muted': rgba(c.paper, 0.7),
      '--qo-paper-faint': rgba(c.paper, 0.08),

      '--qo-border-subtle': rgba(c.paper, 0.12),
      '--qo-border-strong': rgba(c.paper, 0.24),

      '--qo-elev-0': c.deepSpace,
      '--qo-elev-1': shiftLightness(c.deepSpace, 4),
      '--qo-elev-2': shiftLightness(c.deepSpace, 9),
      '--qo-elev-3': shiftLightness(c.deepSpace, 15),
    };

    root['--qo-bg'] = root['--qo-elev-0'];
    root['--qo-surface'] = root['--qo-elev-1'];
    root['--qo-surface-raised'] = root['--qo-elev-2'];
    root['--qo-surface-high'] = root['--qo-elev-3'];
    root['--qo-text'] = c.paper;
    root['--qo-text-muted'] = c.slate;
    // Case pages resolve their accent through the base (see .qo-page--case in
    // pages.css), so both have to be emitted or a live palette edit would
    // leave case pages on whatever tokens.css last shipped.
    root['--qo-accent-base'] = c.teal;
    root['--qo-accent'] = c.teal;
    root['--qo-accent-contrast'] = c.deepSpace;
    root['--qo-accent-hover'] = root['--qo-teal-hover'];
    root['--qo-accent-active'] = root['--qo-teal-active'];

    // Filled shapes wear the navy, not the accent (see --qo-fill in
    // tokens.css). Lifted on dark pages so the shape clears the deep-space
    // background it sits on.
    root['--qo-fill'] = root['--qo-navy-hover'];
    root['--qo-fill-contrast'] = c.paper;
    root['--qo-fill-hover'] = shiftLightness(root['--qo-navy-hover'], 8);
    root['--qo-fill-active'] = c.navy;
    root['--qo-border'] = root['--qo-border-subtle'];
    root['--qo-focus-ring'] = c.teal;

    // Teal needs darkening to stay legible on paper — same fix tokens.css
    // hand-encodes for the light theme's --qo-accent.
    const tealOnPaper = shiftLightness(c.teal, -24, 12);

    const light = {
      '--qo-bg': c.paper,
      '--qo-surface': '#FFFFFF',
      '--qo-surface-raised': '#FFFFFF',
      '--qo-surface-high': '#FFFFFF',
      '--qo-text': c.navy,
      '--qo-text-muted': shiftLightness(c.slate, -10),
      '--qo-accent-contrast': c.deepSpace,
      '--qo-accent-base': tealOnPaper,
      '--qo-accent': tealOnPaper,
      /* Stepped off tealOnPaper, not off the brand teal, so a filled control
         on a light page gets lighter on hover and darker when pressed. Taking
         the root steps here would hover to a colour brighter than the resting
         fill — see the same note in tokens.css's .qo-page--light block. */
      '--qo-accent-hover': shiftLightness(tealOnPaper, 8),
      '--qo-accent-active': shiftLightness(tealOnPaper, -9),
      // On paper the navy is already the darkest ink available, so a filled
      // shape uses it at full strength rather than the lifted dark-page value.
      '--qo-fill': c.navy,
      '--qo-fill-contrast': c.paper,
      /* Both states are lightness steps off the navy itself. Handing active
         the deep-space colour instead would look right on the shipped blue
         palette and wrong on every other one — a magenta button would press
         to navy, dropping the brand hue at the moment of interaction. */
      '--qo-fill-hover': shiftLightness(c.navy, 9),
      '--qo-fill-active': shiftLightness(c.navy, -7),
      '--qo-border-subtle': rgba(c.navy, 0.12),
      '--qo-border-strong': rgba(c.navy, 0.26),
      '--qo-border': rgba(c.navy, 0.12),
      '--qo-paper-faint': rgba(c.navy, 0.05),
      '--qo-slate-muted': rgba(c.slate, 0.4),
      '--qo-teal-muted': rgba(tealOnPaper, 0.12),
      '--qo-focus-ring': tealOnPaper,
    };

    return { root, light, swatches: c };
  }

  window.QOTokenDerive = {
    hexToRgb, rgbToHex, hexToHsl, hslToHex, shiftLightness, rgba, rgbTriple,
    deriveTokens, DEFAULT_COLORS,
  };
})();
