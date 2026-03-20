# Open Source Release Prep — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare tangerine-handfish for public release with proper metadata, documentation, CI, and contributor guidance.

**Architecture:** Six small tasks — package.json metadata, .gitignore fix, CHANGELOG, contributor docs, CI workflow, and README updates. All are independent documentation/config changes.

**Tech Stack:** Markdown, JSON, YAML (GitHub Actions), CSS (build verification)

---

## File Map

| Action | File |
|--------|------|
| Modify | `package.json` — add `repository`, `homepage`, `bugs` fields |
| Modify | `.gitignore` — add `.DS_Store` |
| Create | `CHANGELOG.md` — initial release notes |
| Create | `CONTRIBUTING.md` — contributor guide |
| Create | `.github/workflows/build.yml` — CI build check |
| Modify | `README.md` — add contributor build prereqs section |

---

### Task 1: Add repository metadata to package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add repository, homepage, and bugs fields**

Add after the `"license"` line:

```json
"repository": {
  "type": "git",
  "url": "https://github.com/noisedeck/tangerine-handfish.git"
},
"homepage": "https://github.com/noisedeck/tangerine-handfish",
"bugs": {
  "url": "https://github.com/noisedeck/tangerine-handfish/issues"
},
```

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "require('./package.json')"`
Expected: no output (valid JSON)

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add repository metadata to package.json"
```

---

### Task 2: Fix .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add .DS_Store to .gitignore**

Add `.DS_Store` as the first line of `.gitignore`.

- [ ] **Step 2: Remove untracked .DS_Store if present**

Run: `git rm --cached .DS_Store 2>/dev/null; true`

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add .DS_Store to .gitignore"
```

---

### Task 3: Create CHANGELOG.md

**Files:**
- Create: `CHANGELOG.md`

- [ ] **Step 1: Write initial changelog**

```markdown
# Changelog

## 0.1.0 — 2026-03-17

Initial release.

- TangerineUI v2.5.3 ported to the Handfish design system
- OKLCH token mapping bridges Handfish variables to TangerineUI expectations
- Icon recoloring — SVG data URIs adapt to theme accent colors
- Modular and standalone build modes via esbuild
- 11 Handfish themes supported: dark, light, cyberpunk, terminal, organic, earthy, corporate, neutral-dark, neutral-light, gray-dark, gray-light
- Custom font stack (Nunito, Noto Sans Mono) via Noise Factor CDN
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add CHANGELOG for v0.1.0"
```

---

### Task 4: Create CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Write contributor guide**

```markdown
# Contributing

Thanks for your interest in tangerine-handfish!

## Build Prerequisites

This project's standalone build inlines design tokens from the [Handfish](https://github.com/noisedeck/handfish) repo. Clone it as a sibling directory:

```
parent/
├── handfish/              # git clone https://github.com/noisedeck/handfish
└── tangerine-handfish/    # this repo
```

The **modular** build (`npm run build`) does not require the Handfish repo — it outputs CSS that expects Handfish tokens loaded separately.

## Development

```bash
npm install
npm run build              # modular (no handfish repo needed)
npm run build:standalone   # standalone (requires ../handfish/)
npm run build:all          # all theme variants
```

## Pull Requests

- Keep changes focused — one concern per PR.
- Test your changes on a live Mastodon instance or with a local dev setup.
- If you're updating the upstream TangerineUI base, note the new version and commit in `package.json`'s `tangerineUI` field.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
```

- [ ] **Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add CONTRIBUTING guide"
```

---

### Task 5: Add GitHub Actions CI

**Files:**
- Create: `.github/workflows/build.yml`

- [ ] **Step 1: Write CI workflow**

This workflow only runs the modular build (no Handfish repo needed), verifying that the CSS bundles without errors.

```yaml
name: Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: add build verification workflow"
```

---

### Task 6: Update README with contributor build prereqs

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Contributing section and build prereq note to README**

After the "Available Themes" section and before the "License" section, add:

```markdown
## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for build prerequisites and guidelines.

**Note:** The standalone build requires the [Handfish](https://github.com/noisedeck/handfish) repo cloned as a sibling directory (`../handfish/`). The modular build (`npm run build`) works without it.
```

- [ ] **Step 2: Verify README renders correctly**

Run: `head -60 README.md` — confirm structure looks correct.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add contributing section to README"
```

---

## Final Step: Squash & Push

After all tasks are complete:

- [ ] **Squash all local commits into one**

```bash
git reset --soft HEAD~6
git commit -m "chore: prepare for open source release"
```

- [ ] **Push**

```bash
git push origin main
```
