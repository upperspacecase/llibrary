# LandBook Report Design System

> River's Environmental Ledger — the canonical style reference for all report pages.
> Update this doc to change how the report is styled.
>
> **Code implementation:** `report-design-system.js` (tokens, CSS, page shell)
> **Template:** `report.hbs` (18-page Handlebars template)

---

## 1. Color Palette

| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| Forest Green | `#1B3A2F` | `text-brand-forest` / `bg-brand-forest` | Headings, primary data, positive indicators, icon backgrounds |
| Sage | `#8B9A7E` | `text-brand-sage` / `bg-brand-sage` | Dividers, secondary text, subtle labels, hairlines |
| Terracotta | `#C4705A` | `text-brand-terracotta` / `bg-brand-terracotta` | Pull quote borders, alerts, recommendations, accent tags |
| Amber | `#D4A574` | `text-brand-amber` / `bg-brand-amber` | Caution, fire risk, seasonal tags, habitat segments |
| Cream | `#F5F1E8` | `bg-brand-cream` | Page background |
| Charcoal | `#2C2C2C` | `text-on-surface` | Body text |

**Rules:**
- Use only these six colors. No gradients except gauge SVG strokes.
- Opacity only for dividers (`divide-brand-sage/20`) and subtle tag backgrounds (`bg-brand-forest/20`, `bg-brand-amber/20`, `bg-brand-terracotta/20`).

---

## 2. Typography

### Font Families

| Role | Font | CSS Variable |
|------|------|-------------|
| Serif (display) | Libre Baskerville | `'Libre Baskerville', serif` |
| Sans (body) | Inter | `'Inter', sans-serif` |

### Type Scale

| Name | Size | Font | Weight | Extras | Tailwind Classes |
|------|------|------|--------|--------|-----------------|
| Page Title | 36px | Libre Baskerville | 700 | tight leading | `serif-title text-[36px] text-brand-forest leading-tight` |
| Hero Figure | 43px | Inter | 900 (black) | tighter tracking | `text-[43px] font-black tracking-tighter text-brand-forest leading-none` |
| Section Header | 24px | Libre Baskerville | 700 | — | `text-[24px] serif-title text-brand-forest` |
| Body Text | 14.6px | Inter | 400 | relaxed leading (~11pt) | `text-[14.6px] leading-relaxed text-on-surface` |
| Small Caps Label | 10px | Inter | 700 | uppercase, 0.15em tracking | `text-[10px] font-bold tracking-[0.15em] text-brand-forest uppercase` |
| Caption | 12px | Inter | 400 | italic | `text-[12px] italic text-brand-forest` |

### Custom CSS Classes

| Class | Definition |
|-------|-----------|
| `.serif-title` | `font-family: 'Libre Baskerville', serif; font-weight: 700;` |
| `.drop-cap` | First letter: Libre Baskerville, 52pt, float left, Forest Green |

---

## 3. Spacing

Base unit: **8px**

| Token | Value | Tailwind |
|-------|-------|----------|
| xs | 8px | `gap-2`, `p-2` |
| sm | 16px | `gap-4`, `p-4` |
| md | 24px | `gap-6`, `p-6`, `my-6` |
| lg | 32px | `gap-8`, `p-8` |
| xl | 48px | `mb-12`, `py-12` |

**Rhythm:**
- Major sections separated by **48px** (`py-12`, `mb-12`)
- Related elements grouped with **16-24px** (`gap-4` to `gap-6`)
- Component internal gaps: **8-16px** (`gap-2` to `gap-4`)

---

## 4. Layout

### Page Container

```
Width:      210mm (A4)
Min-height: 297mm (A4)
Padding:    10% top/bottom, 15% left/right
Background: #F5F1E8 (Cream)
```

CSS class: `.a4-container`

```css
.a4-container {
  width: 210mm;
  min-height: 297mm;
  margin: auto;
  background: #F5F1E8;
  padding: 10% 15%;
  position: relative;
  page-break-after: always;
}
```

### Grid System

| Pattern | Usage |
|---------|-------|
| `grid grid-cols-2 gap-12` | Editorial two-column text |
| `grid grid-cols-3 gap-8` | Narrative columns, stat rows |
| `grid grid-cols-4 gap-8` | Key metrics, seasonal cards |
| `grid grid-cols-5 gap-0` | Climate KPIs (tight) |
| `grid grid-cols-[1.5fr_1fr] gap-12` | Text + sidebar (common section layout) |

### No Border Radius

All corners are sharp. The Tailwind config enforces `borderRadius: 0px` globally.

---

## 5. Dividers

### Primary Hairline

```css
.hairline {
  height: 0.5px;
  width: 100%;
  background-color: #8B9A7E;  /* Sage */
}
```

Margin: `my-6` (24px vertical) in most contexts. Applied as standalone `<div class="hairline"></div>`.

### Right Border Hairline

```css
.hairline-r {
  border-right: 0.5pt solid #8B9A7E;
}
```

Used between stat card columns.

### Bottom Border Hairline

```css
.hairline-b {
  border-bottom: 0.5pt solid #8B9A7E;
}
```

### Subtle Divider (Tables)

```
border-bottom: 0.5px solid rgba(139, 154, 126, 0.2)  /* Sage at 20% */
```

Tailwind: `divide-y-[0.5px] divide-brand-sage/20`

---

## 6. Components

### Section Header (partial: `section-header.hbs`)

```html
<header class="mb-12">
  <h1 class="serif-title text-[36px] text-brand-forest leading-tight">{{title}}</h1>
  <div class="hairline mt-4"></div>
</header>
```

### Section Footer (partial: `section-footer.hbs`)

```html
<footer class="mt-20">
  <div class="hairline mb-6" style="opacity:0.5"></div>
  <div class="flex justify-between">
    <span class="text-[8px] uppercase tracking-widest text-brand-sage">LandBook · {{monthYear}}</span>
    <span class="text-[8px] uppercase tracking-widest text-brand-sage">{{label}}</span>
  </div>
</footer>
```

### Stat Cards

Hero numbers in a grid with hairline-r dividers.

```html
<section class="grid grid-cols-4 gap-0 items-center py-8">
  <div class="hairline-r px-6 py-2">
    <div class="text-[43px] font-black tracking-tighter text-brand-forest leading-none">{{value}}</div>
    <div class="text-[10px] font-bold tracking-[0.15em] text-brand-forest uppercase mt-2">{{label}}</div>
  </div>
  <!-- ... more columns, last one without hairline-r -->
</section>
```

- Value: `text-[43px] font-black tracking-tighter text-brand-forest leading-none`
- Label: `text-[10px] font-bold tracking-[0.15em] text-brand-forest uppercase mt-2`
- Variants: `grid-cols-3`, `grid-cols-4`, `grid-cols-5` depending on count

### Semi-Circular Gauge

```html
<div class="relative w-32 h-16 overflow-hidden">
  <svg class="absolute w-32 h-32 gauge-svg" viewBox="0 0 128 128">
    <circle cx="64" cy="64" r="45" fill="none" stroke="#E7EEFE"
            stroke-width="12" stroke-dasharray="141.37 282.74"/>
    <circle cx="64" cy="64" r="45" fill="none" stroke="#3f6653"
            stroke-width="12" stroke-dasharray="{{fillArc}} 282.74"/>
  </svg>
  <div class="absolute bottom-0 w-full text-center text-lg font-bold text-brand-forest">{{score}}</div>
</div>
<div class="text-[10px] font-bold uppercase tracking-widest text-brand-forest mt-2 text-center">{{label}}</div>
```

- Background stroke: `#E7EEFE`, dasharray `141.37 282.74`
- Value stroke colors: Forest `#3f6653` (good), Amber `#D4A574` (caution), Terracotta `#C4705A` (alert)
- CSS: `.gauge-svg { transform: rotate(-90deg); }`

### Horizontal Bar Chart

```html
<div class="flex h-12 w-full">
  <div class="h-full bg-brand-forest" style="width:{{pct}}%"></div>
  <div class="h-full bg-brand-sage" style="width:{{pct}}%"></div>
  <div class="h-full bg-brand-amber" style="width:{{pct}}%"></div>
</div>
<!-- Legend -->
<div class="flex gap-6 mt-4">
  <div class="flex items-center gap-2">
    <div class="w-2 h-2 bg-brand-forest"></div>
    <span class="text-[10px] font-bold text-brand-forest">{{name}} {{pct}}%</span>
  </div>
</div>
```

### Pull Quote (partial: `pull-quote.hbs`)

```html
<blockquote class="max-w-[320px] border-l-4 border-brand-terracotta pl-6 py-2">
  <p class="serif-title text-xl text-brand-forest leading-relaxed">"{{text}}"</p>
</blockquote>
```

Always right-aligned: wrapped in `<div class="flex justify-end">`.

### Recommendation Box

```html
<div class="my-6">
  <div class="text-[10px] font-black tracking-[0.2em] text-brand-terracotta uppercase">{{header}}</div>
  <div class="text-[14.6px] text-brand-forest font-medium leading-snug mt-2">{{body}}</div>
</div>
```

No background color — clean on cream.

### Data Table

```html
<table class="w-full text-left">
  <thead>
    <tr class="border-b-[0.5px] border-brand-sage">
      <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">{{column}}</th>
    </tr>
  </thead>
  <tbody class="divide-y-[0.5px] divide-brand-sage/20">
    <tr>
      <td class="py-4 text-sm font-bold text-brand-forest">{{label}}</td>
      <td class="py-4 text-sm text-on-surface">{{value}}</td>
    </tr>
  </tbody>
</table>
```

Status badges in tables: `px-2 py-1 text-[10px] font-bold` with colored background + matching text.

### Percentile Comparison Card

```html
<div class="py-4 flex gap-8 items-start">
  <div class="w-16 h-16 bg-brand-forest flex items-center justify-center shrink-0">
    <span class="material-symbols-outlined text-brand-cream text-3xl">{{icon}}</span>
  </div>
  <div>
    <div class="flex items-baseline gap-4 mb-2">
      <span class="text-[30px] font-black text-brand-forest">{{value}}</span>
      <span class="text-[10px] font-bold text-brand-terracotta uppercase tracking-widest">{{headline}}</span>
    </div>
    <p class="text-sm text-on-surface leading-relaxed max-w-[300px]">{{description}}</p>
  </div>
</div>
```

### Seasonal Cards

```html
<div class="grid grid-cols-4 gap-8">
  <div>
    <span class="text-[10px] font-bold text-brand-sage uppercase block mb-4">{{months}}</span>
    <div class="mb-4">
      <span class="inline-block bg-brand-sage text-white px-3 py-1 text-[10px] font-bold">{{tag}}</span>
    </div>
    <p class="text-[13px] text-brand-forest leading-relaxed">{{description}}</p>
  </div>
</div>
```

Tag background colors by season type:
- Recharge: `bg-brand-sage`
- Growth: `bg-brand-forest`
- Dormancy: `bg-brand-terracotta`
- Harvest: `bg-brand-amber`

### Color Swatch Row

```html
<div class="flex gap-1">
  <div class="flex-1 p-4 h-24 flex flex-col justify-end" style="background:{{hex}}">
    <span class="text-[9px] font-bold text-brand-cream uppercase tracking-widest">{{name}}</span>
  </div>
</div>
```

---

## 7. Content Patterns

### Standard Section Layout

Most pages follow this structure:

```
section-header (title + hairline)
  grid [1.5fr 1fr]
    left:  drop-cap narrative text (14.6px, relaxed leading)
    right: pull-quote + supplementary content
  hairline
  data section (table / stats / chart)
  hairline
  secondary content
section-footer
```

### Editorial Two-Column Text

```html
<div class="grid grid-cols-2 gap-12">
  <p class="text-[13px] text-on-surface leading-snug">{{col1}}</p>
  <p class="text-[13px] text-on-surface leading-snug">{{col2}}</p>
</div>
```

For longer narrative passages. Slightly smaller text (13px) than standard body (14.6px).

### Three-Column Narrative

```html
<div class="grid grid-cols-3 gap-8 text-[14.6px] leading-relaxed text-on-surface">
  <div class="drop-cap">{{para1}}</div>
  <div>{{para2}}</div>
  <div>{{para3}}</div>
</div>
```

Used on the Executive Summary page. First column gets drop-cap treatment.

---

## 8. Icons

| Setting | Value |
|---------|-------|
| Library | Material Symbols Outlined |
| Class | `material-symbols-outlined` |
| Variation | `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24` |
| Color | `text-brand-forest` (on light) or `text-brand-cream` (on dark) |
| Large size | `text-3xl` (in icon boxes) |
| Inline size | `text-xl` |

Icon containers: `w-16 h-16 bg-brand-forest flex items-center justify-center shrink-0`

---

## 9. Images

- Prefer grayscale or desaturated: `class="grayscale opacity-80 contrast-125"`
- Contained in aspect-ratio boxes: `aspect-video w-full` or fixed height `h-48`
- Captions below: `text-[12px] italic text-brand-forest mt-2`
- Missing image fallback: `<div class="w-full h-full flex items-center justify-center text-brand-sage text-sm">Map not available</div>`

---

## 10. Implementation Rules

1. **No border-radius.** All elements have sharp corners. Tailwind config sets `borderRadius: 0px` globally.

2. **Typography consistency.** Titles = Libre Baskerville bold. Data/labels = Inter bold uppercase tracked. Body = Inter regular with comfortable line-height.

3. **Color discipline.** Only the six defined colors. No gradients except gauge SVG strokes. Opacity only for dividers (20% sage) and subtle backgrounds.

4. **Spacing rhythm.** Base everything on 8px. Major sections: 48px. Related elements: 16-24px.

5. **Visual hierarchy.** Large numbers for key metrics. Small caps for metadata and labels. Hairlines separate; whitespace groups.

6. **Icons.** Material Symbols Outlined, weight 400, 24-48px, Forest Green.

---

## 11. Output Format

Each report page is rendered as self-contained HTML with:
- Tailwind CSS via CDN (`cdn.tailwindcss.com`)
- Google Fonts: Libre Baskerville (400, 700, 400 italic), Inter (400-900)
- Material Symbols Outlined
- Inline `<style>` for custom CSS classes (`.a4-container`, `.serif-title`, `.hairline`, `.drop-cap`, `.gauge-svg`)
- Tailwind config embedded via `<script>` with brand color extensions

See `report-design-system.js` → `wrapFullPage()` for the complete HTML shell.
