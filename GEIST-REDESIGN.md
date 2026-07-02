# PM2 Orbit — Vercel Geist Design System Adoption

## Overview
Transform PM2 Orbit's UI from the current dark slate+teal theme to Vercel's Geist design system: near-white canvas, near-black ink, 1px hairlines, and restrained use of color.

## Key Changes
1. **Colors**: Dark theme → Light canvas (#fafafa) + ink (#171717) + hairline (#ebebeb)
2. **Typography**: Exo → Geist Sans + Geist Mono (Inter/JetBrains Mono fallbacks)
3. **Radius**: Sharp 0px → Bimodal (6px functional, 100px pills, 12-16px cards)
4. **Elevation**: Glow shadows → 1px hairline + whisper shadows
5. **Buttons**: Custom variants → Black pills (marketing) + 6px squares (app)
6. **Spacing**: 10px base → 4px base unit

## Implementation Order
1. globals.css - Complete color/typography/radius/spacing tokens
2. Font loading - Add Geist fonts
3. Shared components - Button, Badge, Input, Dialog, Tabs, Dropdown
4. Layout - Header, AppShell, StatusBar
5. Process components - ProcessTable, ProcessRow, ProcessDetail
6. System cards
7. Log viewer
8. Alert components
9. Charts
10. Settings page
