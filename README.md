# Tangerine-Handfish

TangerineUI for Mastodon, ported to the [Handfish](https://handfish.noisefactor.io) design system.

Based on [TangerineUI-for-Mastodon](https://github.com/nileane/TangerineUI-for-Mastodon) by Nileane.

## What This Is

A Mastodon CSS theme that combines TangerineUI's UX improvements (compact timeline, interaction animations, icon system, DM styling) with Handfish's design language (OKLCH colors, glassmorphism, themed typography, consistent spacing).

Supports all Handfish themes — switch themes by setting `data-theme` on `<html>`.

## Usage

### Option A: Separate Stylesheets (Recommended)

Load Handfish tokens, an optional theme, then tangerine-handfish:

```html
<link rel="stylesheet" href="https://handfish.noisefactor.io/0.9.0/styles/tokens.css">
<link rel="stylesheet" href="https://handfish.noisefactor.io/0.9.0/styles/themes/cyberpunk.css">
<link rel="stylesheet" href="tangerine-handfish.css">
```

### Option B: Mastodon Admin Panel

Paste the contents of `dist/tangerine-handfish-standalone.css` into your instance's **Custom CSS** field (Administration > Server Settings > Appearance).

### Option C: Browser Extension

Use [Stylus](https://add0n.com/stylus.html) or similar to inject the standalone CSS.

## Building

```bash
npm install
npm run build                                    # modular output
npm run build:standalone                         # standalone with default tokens
node scripts/build.js --standalone --theme cyberpunk  # standalone with specific theme
```

## Available Themes

Set `data-theme` on `<html>`: `dark`, `light`, `cyberpunk`, `terminal`, `organic`, `earthy`, `corporate`, `neutral-dark`, `neutral-light`, `gray-dark`, `gray-light`.

Without `data-theme`, automatically follows system light/dark preference.

## License

MIT. See LICENSE.
