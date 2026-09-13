# Deployment Guide

This project is built for a single-process Node deployment using PM2 as the main production runner. The app is served from the built output in `.output/` and listens on port `5173` by default.

## Production architecture

```text
Internet
  -> Nginx (SSL / reverse proxy)
     -> 127.0.0.1:5173
         -> Node server (`server-entry.js`)
            -> built SSR app in `.output/`
               -> Supabase auth / DB
```

## Required server setup

```bash
sudo apt update
sudo apt install -y curl git ufw nginx ca-certificates
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Project setup

```bash
cd /var/www/the-intent
npm install
cp .env.example .env
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## Nginx example

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## HTTPS

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo certbot renew --dry-run
```

## Environment variables

Use a real `.env` file with these values:

```bash
NODE_ENV=production
PORT=5173
HOST=0.0.0.0
NITRO_PRESET=node_server

DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=your-project-id

APP_DOMAIN=https://your-domain.com
```

## PM2 management

```bash
pm2 start ecosystem.config.cjs
pm2 restart the-intent
pm2 reload the-intent
pm2 stop the-intent
pm2 logs the-intent
pm2 monit
```

## Important notes

- Do not leave `APP_DOMAIN` as `https://localhost:5173` in production.
- Add your production domain to Supabase Auth redirect allowlists.
- Keep `.env` local and never commit it.
- The app builds into `.output/` and is served by `server-entry.js`.
- Optional direct-run scripts remain for local fallback, but PM2 is the primary deployment method.

```

### Updates

```bash
# Pull latest changes
git pull

# Install new dependencies
npm install

# Rebuild
npm run build

# Restart with PM2
pm2 restart the-intent

# Or restart with direct Node execution
# Stop current process and run ./start-server.sh
```

## Security Best Practices

1. **SSH Security**
   - Disable password authentication
   - Use SSH keys only
   - Change default SSH port (optional)

2. **Application Security**
   - Never commit `.env` files
   - Use strong secrets
   - Keep dependencies updated
   - Enable CORS properly

3. **Server Security**
   - Regular system updates
   - Monitor logs for suspicious activity
   - Use fail2ban for SSH protection
   - Regular backups

## Performance Optimization

1. **PM2 Cluster Mode** (for multi-core servers)

   ```javascript
   // In ecosystem.config.js
   instances: 'max',
   exec_mode: 'cluster',
   ```

2. **Nginx Caching**
   - Enable static file caching
   - Configure gzip compression
   - Use HTTP/2

3. **Node.js Optimization**
   - Set `NODE_ENV=production`
   - Use worker threads for CPU-intensive tasks
   - Monitor memory usage

## Monitoring & Logging

### PM2 Monitoring

```bash
# Install PM2 Plus (optional)
pm2 plus

# Key metrics to monitor:
# - CPU usage
# - Memory usage
# - Request rate
# - Error rate
# - Response time
```

### Log Rotation

```bash
# Install logrotate
sudo apt install logrotate

# Configure for PM2 logs
sudo nano /etc/logrotate.d/pm2-socialdiscovery
```

## Backup Strategy

### Database Backup (Supabase)

- Use Supabase automated backups
- Enable point-in-time recovery
- Regular export of critical data

### Application Backup

```bash
# Backup application files
tar -czf socialdiscovery-backup-$(date +%Y%m%d).tar.gz /var/www/socialdiscovery

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 ~/pm2-backup.pm2
```

## Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs the-intent --lines 100

# Check if port is in use
sudo netstat -tulpn | grep 5173

# Check Node.js version
node --version

# Verify build exists
ls -la .output/server/
ls -la .output/client/
```

### Nginx 502 Bad Gateway

```bash
# Check if Node.js app is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/socialdiscovery-error.log

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Check Nginx SSL config
sudo nginx -t
```

## Scaling Considerations

### When to upgrade from KVM2:

- Consistent high CPU usage (>80%)
- Memory pressure (swap usage)
- Database connection limits
- Need for horizontal scaling

### Scaling Options:

1. **Vertical Scaling**: Upgrade to higher VPS tier
2. **Horizontal Scaling**: Load balancer + multiple instances
3. **Database**: Move to managed PostgreSQL if needed

## Cost Optimization

### KVM2 Plan (2GB RAM, 1 CPU Core)

- Suitable for: 100-500 concurrent users
- Estimated monthly cost: $5-10
- Monitor resource usage before upgrading

### Optimization Tips:

- Enable PM2 cluster mode when upgrading CPU
- Use CDN for static assets
- Implement database query optimization
- Cache frequently accessed data

## Support & Maintenance

### Regular Tasks:

- Weekly: Check logs and metrics
- Monthly: Security updates and dependency updates
- Quarterly: Review and optimize performance
- Annually: Review hosting costs and scaling needs

## Deployment

### Deployment Script

The automated deployment script is located at `scripts/deploy.sh` on the server. It performs:

- `git pull origin main` - Pulls latest changes
- `npm ci` - Installs dependencies
- `npm run build` - Builds the application
- `pm2 reload ecosystem.config.cjs --update-env` - Zero-downtime hot-reload

### Manual Deployment

Deploy directly from an operator machine or the VPS:

```bash
ssh your-user@your-vps-ip
cd /var/www/socialdiscovery
./scripts/deploy.sh
```

### Emergency Contacts:

- Hostinger Support: 24/7 live chat
- Supabase Support: Community forums
- Node.js: Documentation and community
