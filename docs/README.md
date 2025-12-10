# YChart Documentation

Complete documentation for YChart built with [Docusaurus](https://docusaurus.io/).

## Quick Start

```bash
npm install
npm start
```

Opens browser at `http://localhost:3000/orgchart/`

## Build for Production

```bash
npm run build
```

Generates static files in `build/` directory (2.9MB).

## Deploy

### Option 1: Nginx

```bash
# Build
npm run build

# Copy to web server
sudo cp -r build/* /var/www/ychart-docs/

# Configure Nginx to point to /var/www/ychart-docs
# See ../DEPLOYMENT.md for full Nginx config
```

### Option 2: GitHub Pages

```bash
npm run deploy
```

### Option 3: Test Locally

```bash
npm run serve
```

## Available Commands

```bash
npm start          # Development server
npm run build      # Production build
npm run serve      # Test production build locally
npm run clear      # Clear cache
npm run deploy     # Deploy to GitHub Pages
```

## What You Get

The `build/` directory contains:
- ✅ Static HTML/CSS/JS files ready to serve
- ✅ Optimized and minified assets
- ✅ SEO-ready with sitemap.xml
- ✅ 404.html error page
- ✅ Works with any web server (Nginx, Apache, etc.)

## Documentation Structure

- **Introduction** - Overview and features
- **Getting Started** - Installation and quick start
- **Framework Integration** - Vanilla JS, React, Svelte, Vue, Angular
- **API Reference** - Configuration and methods
- **Guides** - YAML front matter and custom templates
- **Examples** - Real-world usage examples

## Learn More

- [Full Deployment Guide](../DEPLOYMENT.md)
- [Build Summary](BUILD_SUMMARY.md)
- [Docusaurus Documentation](https://docusaurus.io/)

---

Made with ❤️ by [MIE](https://mieweb.com/)
