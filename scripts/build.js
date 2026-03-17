#!/usr/bin/env node
/**
 * Build tangerine-handfish CSS bundles.
 *
 * Usage:
 *   node scripts/build.js                    # modular output (requires external handfish tokens)
 *   node scripts/build.js --standalone       # standalone with default handfish tokens inlined
 *   node scripts/build.js --standalone --theme cyberpunk  # standalone with specific theme
 *   node scripts/build.js --standalone --all              # standalone for every theme + default
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { build, transform } from 'esbuild'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const distDir = path.join(repoRoot, 'dist')
const srcDir = path.join(repoRoot, 'src')

// Handfish paths (sibling repo in platform directory)
const platformDir = path.resolve(repoRoot, '..')
const handfishStylesDir = path.join(platformDir, 'handfish', 'src', 'styles')

const args = process.argv.slice(2)
const isStandalone = args.includes('--standalone')
const buildAll = args.includes('--all')
const themeIndex = args.indexOf('--theme')
const themeName = themeIndex !== -1 ? args[themeIndex + 1] : null

fs.mkdirSync(distDir, { recursive: true })

// --- OKLCH to Hex conversion for icon recoloring ---

function oklchToHex(l, c, h) {
    // OKLCH → OKLab
    const hRad = (h * Math.PI) / 180
    const L = l
    const a = c * Math.cos(hRad)
    const b = c * Math.sin(hRad)

    // OKLab → linear sRGB
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b

    const ll = l_ * l_ * l_
    const mm = m_ * m_ * m_
    const ss = s_ * s_ * s_

    const r = +4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss
    const g = -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss
    const bv = -0.0041960863 * ll - 0.7034186147 * mm + 1.7076147010 * ss

    // Linear sRGB → sRGB gamma
    const gamma = (x) => x >= 0.0031308 ? 1.055 * Math.pow(x, 1 / 2.4) - 0.055 : 12.92 * x
    const clamp = (x) => Math.max(0, Math.min(255, Math.round(gamma(x) * 255)))

    return clamp(r).toString(16).padStart(2, '0') +
           clamp(g).toString(16).padStart(2, '0') +
           clamp(bv).toString(16).padStart(2, '0')
}

// Parse an oklch() value string like "oklch(72.0% 0.200 140)" → hex
function parseOklch(str) {
    const m = str.match(/oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/)
    if (!m) return null
    let l = parseFloat(m[1])
    if (l > 1) l /= 100 // handle percentage
    return oklchToHex(l, parseFloat(m[2]), parseFloat(m[3]))
}

// Extract theme colors from a theme CSS string for icon recoloring
function extractThemeColors(themeCSS, tokensCSS) {
    // Parse all --hf-* values from theme, falling back to tokens defaults
    const parseVars = (css) => {
        const vars = {}
        for (const match of css.matchAll(/--(hf-[\w-]+):\s*([^;]+);/g)) {
            vars[match[1]] = match[2].trim()
        }
        return vars
    }

    const defaults = parseVars(tokensCSS)
    const theme = parseVars(themeCSS)
    const merged = { ...defaults, ...theme }

    // accent-3 = accent color, color-7 = bright text, color-1 = dark bg
    const accent = parseOklch(merged['hf-accent-3'] || '')
    const textDark = parseOklch(merged['hf-color-7'] || '')  // bright text (for dark bg icons)
    const textLight = parseOklch(merged['hf-color-6'] || '') // normal text

    return { accent, textDark, textLight }
}

// Recolor icon SVG data URIs by replacing TangerineUI's hardcoded colors
function recolorIcons(iconsCSS, colors) {
    if (!colors.accent) return iconsCSS
    let result = iconsCSS
    // Replace accent orange variants with theme accent
    result = result.replace(/%23f76902/gi, `%23${colors.accent}`)
    result = result.replace(/%23e68933/gi, `%23${colors.accent}`)
    result = result.replace(/%23ff4013/gi, `%23${colors.accent}`) // boost active
    // Replace dark text color with theme text
    if (colors.textLight) {
        result = result.replace(/%232a2d37/gi, `%23${colors.textLight}`)
    }
    return result
}

const banner = `/**
 * Tangerine-Handfish
 * TangerineUI for Mastodon, ported to the Handfish design system
 * Copyright (c) ${new Date().getFullYear()} Noise Factor LLC
 * Based on TangerineUI by Nileane
 * SPDX-License-Identifier: MIT
 */`

async function buildModular() {
    // Create a temporary entry file that imports all source CSS in order
    const entryContent = [
        `@import "./src/fonts.css";`,
        `@import "./src/mapping.css";`,
        `@import "./src/icons.css";`,
        `@import "./src/tangerine-base.css";`,
        `@import "./src/overrides.css";`,
    ].join('\n')

    const entryPath = path.join(repoRoot, '.build-entry.css')
    fs.writeFileSync(entryPath, entryContent)

    try {
        await build({
            entryPoints: [entryPath],
            bundle: true,
            outfile: path.join(distDir, 'tangerine-handfish.css'),
            minify: false,
            banner: { css: banner },
            logLevel: 'warning',
        })
        console.log('  - dist/tangerine-handfish.css')
    } finally {
        fs.unlinkSync(entryPath)
    }
}

async function buildStandalone(theme = null) {
    const parts = []

    // Inline handfish tokens
    const tokensPath = path.join(handfishStylesDir, 'tokens.css')
    if (!fs.existsSync(tokensPath)) {
        console.error(`Handfish tokens not found at: ${tokensPath}`)
        console.error('Ensure the handfish repo is checked out at ../handfish/')
        process.exit(1)
    }
    parts.push(fs.readFileSync(tokensPath, 'utf8'))

    // Inline theme if specified — unwrap the requested [data-theme="..."] selector
    // to :root so it applies unconditionally, and strip other variants from the file
    if (theme) {
        // Theme name may be a sub-variant (e.g. "gray-dark") inside a file (e.g. "gray.css")
        // Try exact file first, then try base name
        let themePath = path.join(handfishStylesDir, 'themes', `${theme}.css`)
        if (!fs.existsSync(themePath)) {
            const baseName = theme.replace(/-(?:dark|light)$/, '')
            themePath = path.join(handfishStylesDir, 'themes', `${baseName}.css`)
        }
        if (!fs.existsSync(themePath)) {
            console.error(`Handfish theme not found for: ${theme}`)
            process.exit(1)
        }
        let themeCSS = fs.readFileSync(themePath, 'utf8')
        // Unwrap the requested variant to :root
        themeCSS = themeCSS.replace(`[data-theme="${theme}"]`, ':root')
        // Remove any other [data-theme="..."] blocks entirely (other variants in same file)
        themeCSS = themeCSS.replace(/\[data-theme="[^"]+"\]\s*\{[^}]*\}/gs, '')
        parts.push(themeCSS)
    }

    // Recolor icons if we have theme colors
    const tokensCSS = parts[0] // tokens.css is always first
    const themeCSS = theme ? parts[parts.length - 1] : '' // theme CSS if present
    const themeColors = extractThemeColors(themeCSS, tokensCSS)

    // Append tangerine-handfish source files (fonts first, overrides LAST so they win over tangerine-base)
    for (const file of ['fonts.css', 'mapping.css', 'icons.css', 'tangerine-base.css', 'overrides.css']) {
        let content = fs.readFileSync(path.join(srcDir, file), 'utf8')
        if (file === 'icons.css' && themeColors.accent) {
            content = recolorIcons(content, themeColors)
        }
        parts.push(content)
    }

    const suffix = theme ? `-${theme}` : ''
    const outPath = path.join(distDir, `tangerine-handfish-standalone${suffix}.css`)

    // Minify the concatenated output via esbuild transform
    const combined = `${banner}\n\n${parts.join('\n\n')}`
    const minified = await transform(combined, { loader: 'css', minify: true })

    // Write both unminified (for debugging) and minified (for admin panel paste)
    fs.writeFileSync(outPath, combined)
    fs.writeFileSync(outPath.replace('.css', '.min.css'), `${banner}\n${minified.code}`)
    console.log(`  - dist/tangerine-handfish-standalone${suffix}.css`)
    console.log(`  - dist/tangerine-handfish-standalone${suffix}.min.css`)
}

// Discover all available themes from handfish (including sub-variants like gray-dark/gray-light)
function getAvailableThemes() {
    const themesDir = path.join(handfishStylesDir, 'themes')
    const themes = []
    for (const file of fs.readdirSync(themesDir).filter(f => f.endsWith('.css'))) {
        const css = fs.readFileSync(path.join(themesDir, file), 'utf8')
        const variants = [...css.matchAll(/\[data-theme="([^"]+)"\]/g)].map(m => m[1])
        if (variants.length > 0) {
            themes.push(...variants)
        } else {
            themes.push(file.replace('.css', ''))
        }
    }
    return themes
}

console.log('Building tangerine-handfish...')

if (isStandalone && buildAll) {
    // Build default (no theme) + all discovered themes
    await buildStandalone(null)
    for (const theme of getAvailableThemes()) {
        await buildStandalone(theme)
    }
} else if (isStandalone) {
    await buildStandalone(themeName)
} else {
    await buildModular()
}

console.log('Done.')
