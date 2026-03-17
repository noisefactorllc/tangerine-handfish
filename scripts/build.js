#!/usr/bin/env node
/**
 * Build tangerine-handfish CSS bundles.
 *
 * Usage:
 *   node scripts/build.js                    # modular output (requires external handfish tokens)
 *   node scripts/build.js --standalone       # standalone with default handfish tokens inlined
 *   node scripts/build.js --standalone --theme cyberpunk  # standalone with specific theme
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
const themeIndex = args.indexOf('--theme')
const themeName = themeIndex !== -1 ? args[themeIndex + 1] : null

fs.mkdirSync(distDir, { recursive: true })

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
        `@import "./src/mapping.css";`,
        `@import "./src/overrides.css";`,
        `@import "./src/tangerine-base.css";`,
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

async function buildStandalone() {
    const parts = []

    // Inline handfish tokens
    const tokensPath = path.join(handfishStylesDir, 'tokens.css')
    if (!fs.existsSync(tokensPath)) {
        console.error(`Handfish tokens not found at: ${tokensPath}`)
        console.error('Ensure the handfish repo is checked out at ../handfish/')
        process.exit(1)
    }
    parts.push(fs.readFileSync(tokensPath, 'utf8'))

    // Inline theme if specified
    if (themeName) {
        const themePath = path.join(handfishStylesDir, 'themes', `${themeName}.css`)
        if (!fs.existsSync(themePath)) {
            console.error(`Handfish theme not found: ${themePath}`)
            console.error('Available themes: cyberpunk, terminal, organic, earthy, corporate, neutral, gray')
            process.exit(1)
        }
        parts.push(fs.readFileSync(themePath, 'utf8'))
    }

    // Append tangerine-handfish source files
    for (const file of ['mapping.css', 'overrides.css', 'tangerine-base.css']) {
        parts.push(fs.readFileSync(path.join(srcDir, file), 'utf8'))
    }

    const suffix = themeName ? `-${themeName}` : ''
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

console.log('Building tangerine-handfish...')

if (isStandalone) {
    await buildStandalone()
} else {
    await buildModular()
}

console.log('Done.')
