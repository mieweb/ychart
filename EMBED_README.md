# Embedding YChart Editor from Local HTTPS Development Server

This guide explains how to load the YChart Editor library from your local HTTPS development server into your production site at `https://mie.webchartnow.com/webchart.cgi`.

## Prerequisites

1. Local dev server running with HTTPS on `https://localhost:5173/`
2. Browser must accept the self-signed certificate from localhost

## Step 1: Accept the Self-Signed Certificate

Before embedding, you must accept the localhost certificate in your browser:

1. Open `https://localhost:5173/` in your browser
2. Click **"Advanced"** or **"Show Details"**
3. Click **"Proceed to localhost (unsafe)"** or **"Accept the Risk and Continue"**
4. You should see the YChart Editor demo page

**Important:** This only needs to be done once per browser session.

## Step 2: Start the Development Server

```bash
cd /Users/pralambomanarivo/Documents/CODE/ychart
pnpm run dev
```

The server will start at `https://localhost:5173/`

## Step 3: Load the Library in Your Production Site

### Option A: Using the Built IIFE Library (Recommended for Production-like Testing)

First, rebuild the library:

```bash
pnpm run build
```

This creates `/Users/pralambomanarivo/Documents/CODE/ychart/dist/ychart-editor.js`

Then serve it locally. Add this to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [basicSsl()],
  server: {
    cors: true, // Enable CORS for cross-origin requests
    host: 'localhost',
    port: 5173
  },
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/ychartEditor.ts',
      name: 'YChartEditor',
      fileName: () => 'ychart-editor.js',
      formats: ['iife']
    },
    minify: false,
    target: 'es2015'
  }
});
```

Then access the built file at: `https://localhost:5173/dist/ychart-editor.js`

### Option B: Using Vite's Development Build

Access the development build at: `https://localhost:5173/src/ychartEditor.ts`

This is automatically compiled by Vite on-the-fly.

## Step 4: Embed in Your Production Page

Add this script tag to your page at `https://mie.webchartnow.com/webchart.cgi`:

```html
<!-- Load YChart Editor from local dev server -->
<script src="https://localhost:5173/dist/ychart-editor.js"></script>

<script>
    // Sample organizational data
    var yamlData = `---
options:
  nodeWidth: 220
  nodeHeight: 110
  childrenMargin: 50
schema:
  id: number | required
  name: string | required
  title: string | optional
  email: string | required
---

- id: 1
  name: Sarah Johnson
  title: CEO
  email: sarah.johnson@company.com

- id: 2
  name: Michael Chen
  title: CTO
  email: michael.chen@company.com
  parentId: 1
`;

    function initializeYChartEditor() {
        console.log('Initializing YChart Editor from localhost...');
        
        // Initialize YChart Editor
        var editor = new window.YChartEditor({
            nodeWidth: 220,
            nodeHeight: 110,
            editorTheme: 'dark',
            collapsible: true
        });

        // Setup the editor with builder pattern
        editor
            .initView('container', yamlData)
            .enableSwapBtn('swap-btn')
            .toggleViewBtn('view-btn')
            .resetBtn('reset-btn')
            .exportSVGBtn('export-btn');

        console.log('✅ YChart Editor initialized successfully!');
    }
    
    // Initialize after page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeYChartEditor);
    } else {
        initializeYChartEditor();
    }
</script>

<style>
    #container {
        width: 100%;
        height: 600px;
        border: 1px solid #ccc;
    }
</style>

<div id="container"></div>

<!-- Control buttons -->
<button id="swap-btn">Enable Swap Mode</button>
<button id="view-btn">Force Graph</button>
<button id="reset-btn">Reset</button>
<button id="export-btn">Export SVG</button>
```

## Step 5: For WCINCLUDE System

If you're using the WCINCLUDE module system, update your module reference:

```html
{{#include MASTER, YChartEditorJS}}
```

Where `YChartEditorJS` points to:
```
https://localhost:5173/dist/ychart-editor.js
```

## Troubleshooting

### Mixed Content Errors

If you see "Mixed Content" errors (loading HTTPS localhost from HTTPS production), this is normal browser security. Solutions:

1. **Development Mode:** Use browser flags to allow insecure localhost
   - Chrome: `chrome://flags/#allow-insecure-localhost` (enable this)
   - Firefox: Click the shield icon in address bar → Disable protection for this page

2. **Production Mode:** Deploy the built file to your production server instead

### CORS Errors

If you see CORS errors, ensure `cors: true` is in your `vite.config.ts` server settings (see Step 3, Option A).

### Certificate Errors

- **ERR_SSL_VERSION_OR_CIPHER_MISMATCH:** Accept the certificate by visiting `https://localhost:5173/` directly first
- **NET::ERR_CERT_AUTHORITY_INVALID:** This is expected for self-signed certs; accept it in browser

### Constructor Not Found

If you see "window.YChartEditor is not a constructor":

1. Check browser console for script loading errors
2. Verify the script loaded by typing `window.YChartEditor` in console
3. Ensure you've built the library: `pnpm run build`
4. Check the file exists: `ls -lh dist/ychart-editor.js`

## Alternative: Production Deployment

For production use, instead of loading from localhost:

1. **Build the library:**
   ```bash
   pnpm run build
   ```

2. **Upload to your server:**
   ```bash
   scp dist/ychart-editor.js user@mie.webchartnow.com:/path/to/web/assets/
   ```

3. **Update script src:**
   ```html
   <script src="https://mie.webchartnow.com/assets/ychart-editor.js"></script>
   ```

## File Sizes

- **Unminified (current):** ~1.25 MB (289 KB gzipped)
- **Contains:** D3.js, CodeMirror, d3-org-chart, js-yaml (all bundled)
- **Format:** IIFE (Immediately Invoked Function Expression)
- **Global Export:** `window.YChartEditor` (constructor class)

## Development Tips

- **Hot Reload:** Changes to source files automatically rebuild (in dev mode)
- **Production Testing:** Always run `pnpm run build` before testing the built file
- **Debug Mode:** Check browser console for initialization messages
- **Live Demo:** Visit `https://localhost:5173/` to see the working demo

## Quick Command Reference

```bash
# Start dev server with HTTPS
pnpm run dev

# Build production library
pnpm run build

# Check built file size
ls -lh dist/ychart-editor.js

# Verify IIFE export
tail -n 5 dist/ychart-editor.js
```

---

**Current Status:** Library is built as unminified IIFE with `window.YChartEditor` constructor ready to use.
