# Documentation Deployment

## Quick Start

Deploy documentation to **orgchart.opensource.mieweb.org/docs/**:

```bash
cd docs
pnpm run deploy:server
```

Or directly:

```bash
cd docs
./deploy.sh
```

## What the Script Does

1. ✅ Builds the documentation with `pnpm run build`
2. ✅ Creates `/var/www/html/docs` on the server
3. ✅ Backs up existing files to `/tmp/docs.backup.TIMESTAMP`
4. ✅ Deploys via rsync over SSH (port 2298)
5. ✅ Sets correct permissions (www-data:www-data)
6. ✅ Tests and reloads Nginx

## Access

After deployment, visit: **https://orgchart.opensource.mieweb.org/docs/**

## Development

```bash
# Local development server
pnpm start

# Test production build locally
pnpm run build
pnpm run serve
```

## Troubleshooting

### Permission Issues

If you get permission errors, ensure you can SSH without sudo:

```bash
ssh -p 2298 pralambomanarivo@orgchart.opensource.mieweb.org "sudo ls /var/www/html"
```

### Nginx Not Reloading

Check Nginx logs on the server:

```bash
ssh -p 2298 pralambomanarivo@orgchart.opensource.mieweb.org "sudo journalctl -u nginx -n 50"
```

### Rollback

To rollback to a previous version:

```bash
ssh -p 2298 pralambomanarivo@orgchart.opensource.mieweb.org "ls -la /tmp/docs.backup*"
ssh -p 2298 pralambomanarivo@orgchart.opensource.mieweb.org "sudo rm -rf /var/www/html/docs && sudo mv /tmp/docs.backup.TIMESTAMP /var/www/html/docs"
```

## Manual Deployment

See the main [DEPLOYMENT.md](../DEPLOYMENT.md) for alternative deployment methods.
