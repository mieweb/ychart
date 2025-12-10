# Running the Documentation

The YChart documentation is built with [Docusaurus](https://docusaurus.io/).

## Quick Start

```bash
cd docs
npm install
npm start
```

The documentation will open at `http://localhost:3000`.

## Available Commands

### Development

```bash
npm start
```

Starts the development server with hot reloading.

### Build

```bash
npm run build
```

Builds the static site for production in the `build/` directory.

### Serve

```bash
npm run serve
```

Serves the production build locally for testing.

### Deploy

```bash
npm run deploy
```

Builds and deploys to GitHub Pages (requires proper Git configuration).

## Documentation Structure

The documentation is organized into these main sections:

- **Getting Started** - Installation and quick start guides
- **Framework Integration** - Guides for Vanilla JS, React, Svelte, Vue, and other frameworks
- **API Reference** - Complete API documentation with configuration options and methods
- **Guides** - In-depth guides for YAML front matter and custom templates
- **Examples** - Real-world usage examples

## Writing Documentation

All documentation files are in `docs/docs/` as Markdown files. Each file should have front matter:

```markdown
---
sidebar_position: 1
---

# Page Title

Content here...
```

## Editing Configuration

- **Site config**: Edit `docusaurus.config.ts`
- **Sidebar**: Edit `sidebars.ts`
- **Homepage**: Edit `src/pages/index.tsx`
- **Styling**: Edit `src/css/custom.css`

## Browser Support

The documentation site works on all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)

## Troubleshooting

### Port Already in Use

```bash
PORT=3001 npm start
```

### Clear Cache

```bash
npm run clear
npm start
```

### Reinstall Dependencies

```bash
rm -rf node_modules package-lock.json
npm install
```

For more information, see the [Docusaurus documentation](https://docusaurus.io/docs).
