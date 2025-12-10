# YChart Documentation Deployment Guide

## Quick Deploy to orgchart.opensource.mieweb.org/docs/

### Prerequisites

- SSH access to `orgchart.opensource.mieweb.org` (port 2298)
- `pnpm` installed locally
- `rsync` installed locally

### Deployment Steps

1. **Build and deploy in one command:**

```bash
cd docs
chmod +x deploy.sh
./deploy.sh
```

This script will:
- Build the documentation
- Create the `/var/www/html/docs` directory on the server
- Backup existing files
- Deploy via rsync
- Set correct permissions
- Reload Nginx

2. **Verify deployment:**

Visit: https://orgchart.opensource.mieweb.org/docs/

### Manual Deployment (if needed)

If the script doesn't work, deploy manually:

```bash
# 1. Build locally
cd docs
pnpm install
pnpm run build

# 2. Create remote directory
ssh -p 2298 pralambomanarivo@orgchart.opensource.mieweb.org "sudo mkdir -p /var/www/html/docs && sudo chown -R \$USER:\$USER /var/www/html/docs"

# 3. Deploy files
rsync -avz --delete -e "ssh -p 2298" ./build/ pralambomanarivo@orgchart.opensource.mieweb.org:/var/www/html/docs/

# 4. Set permissions
ssh -p 2298 pralambomanarivo@orgchart.opensource.mieweb.org "sudo chown -R www-data:www-data /var/www/html/docs && sudo chmod -R 755 /var/www/html/docs"

# 5. Reload Nginx
ssh -p 2298 pralambomanarivo@orgchart.opensource.mieweb.org "sudo nginx -t && sudo systemctl reload nginx"
```

### Nginx Configuration

Your existing Nginx setup should automatically serve the `/docs/` subdirectory. If you encounter issues, ensure your Nginx config includes:

```nginx
location /docs/ {
    root /var/www/html;
    index index.html;
    try_files $uri $uri/ /docs/index.html;
}
```

If this location block doesn't exist, add it to your Nginx configuration and reload.

---

## Alternative Deployment Options

#### 1. Copy Build Files

Copy the `build/` directory contents to your web server:

```bash
# From your local machine
cd /Users/pralambomanarivo/Desktop/REPO/orgchart/docs
scp -r build/* user@yourserver:/var/www/ychart-docs/
```

Or directly on the server:

```bash
# On the server
cd /var/www/
sudo mkdir -p ychart-docs
sudo chown $USER:$USER ychart-docs
cd /path/to/orgchart/docs
cp -r build/* /var/www/ychart-docs/
```

#### 2. Nginx Configuration

Create an Nginx configuration file:

```nginx
# /etc/nginx/sites-available/ychart-docs

server {
    listen 80;
    server_name docs.ychart.com;  # Replace with your domain
    
    root /var/www/ychart-docs;
    index index.html;
    
    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
    
    # Handle routing for single-page application
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Custom 404 page
    error_page 404 /404.html;
}
```

#### 3. Enable the Site

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/ychart-docs /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### 4. SSL with Let's Encrypt (Optional but Recommended)

```bash
sudo certbot --nginx -d docs.ychart.com
```

### Option 2: Subdirectory Deployment

If deploying to a subdirectory (e.g., `yourdomain.com/ychart-docs/`):

#### 1. Update `docusaurus.config.ts`

```typescript
baseUrl: '/ychart-docs/',  // Change this to match your subdirectory
```

#### 2. Rebuild

```bash
npm run build
```

#### 3. Nginx Configuration

```nginx
location /ychart-docs {
    alias /var/www/ychart-docs;
    index index.html;
    try_files $uri $uri/ /ychart-docs/index.html;
}
```

### Option 3: Apache

If using Apache instead of Nginx:

```apache
# /etc/apache2/sites-available/ychart-docs.conf

<VirtualHost *:80>
    ServerName docs.ychart.com
    DocumentRoot /var/www/ychart-docs
    
    <Directory /var/www/ychart-docs>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Enable routing
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # Enable compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
    </IfModule>
    
    # Cache control
    <IfModule mod_expires.c>
        ExpiresActive On
        ExpiresByType image/jpg "access plus 1 year"
        ExpiresByType image/jpeg "access plus 1 year"
        ExpiresByType image/gif "access plus 1 year"
        ExpiresByType image/png "access plus 1 year"
        ExpiresByType text/css "access plus 1 month"
        ExpiresByType application/javascript "access plus 1 month"
    </IfModule>
</VirtualHost>
```

Enable the site:

```bash
sudo a2ensite ychart-docs
sudo a2enmod rewrite expires deflate
sudo systemctl reload apache2
```

### Option 4: GitHub Pages

Deploy directly to GitHub Pages:

```bash
# In docs directory
npm run deploy
```

This will build and push to the `gh-pages` branch automatically.

Access at: `https://mieweb.github.io/orgchart/`

### Option 5: Docker + Nginx

Create a `Dockerfile` in the `docs/` directory:

```dockerfile
# docs/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf`:

```nginx
# docs/nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

Build and run:

```bash
cd docs
docker build -t ychart-docs .
docker run -d -p 8080:80 ychart-docs
```

### Option 6: Static Hosting Services

The `build/` directory can be deployed to:

- **Netlify**: Drag and drop the `build/` folder
- **Vercel**: `vercel --prod`
- **Cloudflare Pages**: Connect your Git repository
- **AWS S3 + CloudFront**: Upload to S3 bucket
- **Azure Static Web Apps**: Deploy via GitHub Actions

## Build Directory Structure

After running `npm run build`, you get:

```
build/
├── index.html           # Homepage
├── 404.html            # 404 error page
├── sitemap.xml         # SEO sitemap
├── .nojekyll           # Prevent GitHub Pages Jekyll processing
├── assets/             # CSS, JS bundles
├── docs/               # Documentation pages
│   ├── intro/
│   ├── getting-started/
│   ├── framework-integration/
│   ├── api/
│   ├── guides/
│   └── examples/
├── img/                # Static images
└── markdown-page/      # Additional markdown pages
```

## Quick Nginx Setup Script

```bash
#!/bin/bash
# deploy-docs.sh

# Configuration
DOCS_DIR="/var/www/ychart-docs"
BUILD_DIR="./build"

# Create directory
sudo mkdir -p $DOCS_DIR
sudo chown $USER:$USER $DOCS_DIR

# Copy files
echo "Copying files to $DOCS_DIR..."
cp -r $BUILD_DIR/* $DOCS_DIR/

# Set permissions
sudo chown -R www-data:www-data $DOCS_DIR
sudo chmod -R 755 $DOCS_DIR

echo "✅ Documentation deployed to $DOCS_DIR"
echo "Configure Nginx to point to this directory"
```

Usage:

```bash
cd /Users/pralambomanarivo/Desktop/REPO/orgchart/docs
chmod +x deploy-docs.sh
./deploy-docs.sh
```

## Local Testing

Test the production build locally:

```bash
cd docs
npm run serve
```

This serves the built site at `http://localhost:3000/orgchart/`

## Updating Documentation

When you update the documentation:

```bash
# Make your changes to files in docs/docs/
cd docs
npm run build
# Then redeploy using your chosen method
```

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/deploy-docs.yml`:

```yaml
name: Deploy Documentation

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        working-directory: docs
        run: npm ci
        
      - name: Build
        working-directory: docs
        run: npm run build
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/build
```

## Best Practices

1. **Always test locally** before deploying: `npm run serve`
2. **Enable HTTPS** in production (use Let's Encrypt)
3. **Enable gzip compression** for faster loading
4. **Set proper cache headers** for static assets
5. **Use a CDN** for better global performance (CloudFlare, AWS CloudFront)
6. **Monitor** your site with tools like Google Analytics or Plausible

## Troubleshooting

### 404 Errors on Refresh

Ensure your server is configured to serve `index.html` for all routes (see Nginx/Apache configs above).

### Assets Not Loading

Check that `baseUrl` in `docusaurus.config.ts` matches your deployment path.

### Broken Links

Run `npm run build` to check for broken links before deploying.

## Summary

**For production with Nginx:**

1. Build: `cd docs && npm run build`
2. Copy: `cp -r build/* /var/www/ychart-docs/`
3. Configure Nginx to point to `/var/www/ychart-docs`
4. Reload Nginx: `sudo systemctl reload nginx`

**The build directory contains all static files ready to serve!** 🚀
