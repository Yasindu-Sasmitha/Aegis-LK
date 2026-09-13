---
name: Aegis National Emergency
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#49607e'
  on-secondary: '#ffffff'
  secondary-container: '#c4dcff'
  on-secondary-container: '#49617f'
  tertiary: '#004a66'
  on-tertiary: '#ffffff'
  tertiary-container: '#006387'
  on-tertiary-container: '#a3dcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#d2e4ff'
  secondary-fixed-dim: '#b0c8eb'
  on-secondary-fixed: '#001c37'
  on-secondary-fixed-variant: '#314865'
  tertiary-fixed: '#c4e7ff'
  tertiary-fixed-dim: '#7bd0ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c69'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.025em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-status:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
  code-telemetry:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system delivers a high-reliability, civic-grade interface for disaster management, humanitarian relief, and real-time early warning operations across Sri Lanka. It projects calm authority, technological speed, and institutional trust under life-or-death conditions. The visual language blends civic resilience with modern command-and-control software aesthetics, ensuring seamless operational clarity for emergency personnel, government bodies, and citizens alike.

The aesthetic philosophy centers on **Corporate / Modern High-Reliability**:
- **Bimodal Depth Architecture:** A dual-surface approach where the primary hero canvases, tactical command bars, and navigation headers employ an authoritative deep navy (#0A2540 to #0B192C), while data workspaces, information cards, and report modules sit on luminous, surgical white and cool slate surfaces.
- **High-Contrast Chromatic Hierarchy:** Vibrant primary blues (#1D4ED8, #2563EB) signal active controls and digital momentum, accompanied by an unambiguous, strict hazard-severity triage spectrum (Crimson High, Amber-Gold Moderate, Emerald Safe/Normal).
- **Civic Pride & Cohesion:** Subtle national motifs, clean vector cartography, and shield iconography are integrated seamlessly without compromising situational speed or visual clarity.

## Colors

The color system is engineered for unambiguous triage, accessibility in outdoor mobile glare, and immediate hierarchy:

- **Primary Action Blue (`#1D4ED8` & `#2563EB`):** Used for focal calls to action, active navigation tabs, interactive state highlights, and primary flow completions.
- **Deep Slate/Navy Command (`#0A2540` & `#0B192C`):** Represents institutional authority, grounding the top-level masthead, alert notification backdrops, and tactical command cards.
- **Atmospheric Sky Accent (`#38BDF8`):** Applied to sub-headers on dark surfaces, active radar rings, telemetry stats, and high-tech vector overlays.
- **Triage & Hazard Semantics:**
  - *Emergency / Severe (`#EF4444`):* Flash floods, landslides, active tsunami warnings, and 117/1990 emergency hotline triggers. Paired with light crimson surface `#FEF2F2` for inline callouts.
  - *Warning / Elevated (`#F59E0B`):* Strong wind watches, rising reservoir levels, and advisory notices. Paired with soft amber `#FFFBEB`.
  - *Advisory / Low Risk (`#EAB308` to `#FCD34D`):* Localized weather updates and regional watches.
  - *Clear / Safe (`#10B981`):* Operational shelters, cleared transit routes, and normal water levels.
- **Neutral Framework:** Neutral background (`#F8FAFC`), subtle border outlines (`#E2E8F0`), secondary content cards (`#FFFFFF`), and dense typography slate (`#0F172A` headings, `#475569` body).

## Typography

The typographic hierarchy uses **Plus Jakarta Sans** for headlines and brand titles to convey geometric authority, human clarity, and high legibility. **Inter** serves as the utilitarian body typeface, selected for its micro-legibility during intense emergency reading conditions and high data density. **JetBrains Mono** is reserved for telemetry figures, timestamps, coordinate readouts, and hotline numbers (e.g., 117, 1990).

- **Hierarchy Rules:** All mission-critical warnings must pair a bold uppercase triage tag (`label-status`) with a `headline-sm` or `headline-md` title.
- **Mobile Adaptations:** The primary hero scale steps down from 48px to 32px on viewports under 768px, ensuring that crucial instructions and call-to-action buttons remain visible above the fold on compact devices.

## Layout & Spacing

The platform follows a responsive 12-column fluid grid structured on an 8pt base grid unit, constrained to a maximum content width of 1440px for desktop situational command centers.

- **Desktop (1024px+):** 12 columns, 24px (`1.5rem`) gutters, 32px (`2rem`) margins. Allows multi-pane operations (e.g., live alert list spanning 4 columns, interactive GIS Hazard Map spanning 4 columns, and tactical quick-access spanning 4 columns).
- **Tablet (768px - 1023px):** 8 columns, 16px (`1rem`) gutters, 24px (`1.5rem`) margins. Content shifts from triple-column to dual-column stacks.
- **Mobile (< 768px):** 4 columns, 12px gutters, 16px (`1rem`) margins. Critical actions (Report Disaster, Emergency Hotlines) lock to sticky accessible top/bottom thumb regions.
- **Component Padding Scale:**
  - Micro-elements (badges, buttons, status indicators): `space-xs` (4px) to `space-sm` (8px).
  - Form controls and list rows: `space-md` (16px).
  - Cards and dashboard modular panels: `space-lg` (24px).
  - Page sections and hero containers: `space-xl` (40px).

## Elevation & Depth

Visual hierarchy is maintained through soft ambient shadows, delicate perimeter borders, and deep tinted surface overlays rather than dramatic drop shadows:

- **Level 0 (Flat Canvas):** Used for base page background `#F8FAFC` and hero deep navy `#0A2540`.
- **Level 1 (Card Default):** Crisp white cards `#FFFFFF` on neutral backgrounds use a subtle hairline border (`1px solid #E2E8F0`) and an ambient shadow: `0px 1px 3px rgba(15, 23, 42, 0.04), 0px 6px 16px -2px rgba(15, 23, 42, 0.05)`.
- **Level 2 (Interactive Hover & Quick-Access Overlays):** Elevation lifts with `0px 4px 6px -1px rgba(15, 23, 42, 0.06), 0px 12px 24px -4px rgba(15, 23, 42, 0.08)`.
- **Level 3 (Modal Alerts, Floating Emergency Triggers):** Heavy situational priority elevated with `0px 20px 32px -8px rgba(10, 37, 64, 0.18)` and an outline ring `1px solid rgba(255, 255, 255, 0.2)` when rendered over navy canvas.
- **Tactical Dark Glass (Over Hero):** Backdrop blur `12px` with `rgba(11, 25, 44, 0.65)` and `1px solid rgba(255, 255, 255, 0.1)` for sub-navigation bars and floating weather radars.

## Shapes

The design system standardizes on **Rounded (Level 2)** geometry:
- **Base Components:** Inputs, triage badges, primary buttons, and alert rows feature `8px` (`0.5rem`) corner radiuses.
- **Card Containers (`rounded-xl`):** Incident summaries, GIS preview widgets, and auth cards feature generous `16px` (`1rem`) to `24px` (`1.5rem`) radiuses, conveying a welcoming, modern, and human-centric shelter interface.
- **Pill Elements:** Hotline triggers (117, 1990), circular agency emblems, and filter toggles leverage fully rounded `9999px` borders to draw immediate tactical focus.

## Components

### Buttons
- **Emergency / Primary Action:** Bold `#1D4ED8` background, 8px radius, white text with leading emergency icon (shield, alert triangle). On hover: `#1E40AF` with a subtle 2px glow ring (`rgba(29, 78, 216, 0.35)`).
- **Secondary Ghost / Outlined:** Over dark hero surfaces: transparent background with `1.5px solid rgba(255, 255, 255, 0.4)`, text white. Over light surfaces: white background, `1px solid #CBD5E1`, text `#0A2540`.
- **Destructive / SOS Primary:** Deep crimson `#EF4444`, text white, pulse animation for active broadcast mode.

### Triage Badges & Status Chips
- **High Severity:** High-contrast solid `#EF4444` background or soft tint `#FEF2F2` with `#DC2626` text, 6px radius, uppercase tracking (`0.05em`), font size 11px.
- **Moderate Severity:** Solid `#F59E0B` or tinted `#FFFBEB` with `#D97706` text.
- **Low Risk / Safe:** Solid `#10B981` or tinted `#ECFDF5` with `#059669` text.

### Cards & Hazard Modules
- **Standard Service Card:** White background `#FFFFFF`, 16px radius, 24px padding. Top-left features a tinted circular icon badge (48x48px) with category-themed icon (e.g., megaphone for alerts, shield for shelter, medical cross for relief).
- **Tactical Quick Access Card:** Deep navy container `#0A2540`, white and sky-blue typography, containing direct action links with trailing arrows and an integrated vector watermark of Sri Lanka's territorial boundary. Bottom footer locks the 24/7 National Emergency Hotline (117 / 1990) in bold white and amber.

### Input Fields & Controls
- **Text Inputs:** Height 48px, background `#FFFFFF`, border `1.5px solid #E2E8F0`, rounded 8px, font Inter 14px. Placeholder `#94A3B8`. Focus state introduces a crisp `#2563EB` border with a 3px ring (`rgba(37, 99, 235, 0.15)`).
- **Form Groups:** Integrated leading icons (user, lock, location pin) in muted slate (`#64748B`).

### Interactive Hazard Map Container
- Enclosed in a 16px rounded card container with 1px border `#E2E8F0`. Features a map view alongside a discrete triage legend (High, Moderate, Low, Normal) and a bottom-pinned status drawer for situational awareness.