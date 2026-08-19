# Production Deployment Guide - Hostinger KVM2 VPS

## VPS Configuration Recommendations

### Operating System
- **Ubuntu 22.04 LTS** or **Ubuntu 24.04 LTS**
  - Long-term support until 2027/2029
  - Excellent Node.js ecosystem support
  - Regular security updates
  - Large community and documentation

### Web Server
- **Nginx** (recommended)
  - High performance, low memory footprint
  - Excellent reverse proxy capabilities
  - Built-in SSL/TLS termination
  - Static file serving with caching
  - Superior to Apache for Node.js applications

### Node.js Version
- **Node.js 20.x LTS** (Current Long Term Support)
  - Stable and well-tested
  - Performance improvements over 18.x
  - Security patches until April 2026
  - Install via NodeSource for latest LTS

### Process Manager
- **PM2** (recommended)
  - Automatic restarts on crashes
  - Cluster mode for multi-core utilization
  - Log management and rotation
  - Zero-downtime reloads
  - Startup script generation
  - Better than systemd for Node.js apps

### Firewall
- **UFW** (Uncomplicated Firewall)
  - Simple to configure
  - Ubuntu default
  - Blocks all incoming by default
  - Easy port management

### SSL Certificate
- **Let's Encrypt** via Certbot
  - Free, automated SSL/TLS certificates
  - Auto-renewal configuration
  - Trusted by all major browsers
  - Industry standard for HTTPS

### Deployment Architecture
```
Internet → Nginx (443/80) → Node.js App (5173) → Supabase
                    ↓
               SSL Termination
               Static Files
               Gzip Compression
               Security Headers
```

## Server Setup Commands

### 1. Initial Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl git ufw nginx

# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Configure Firewall
```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 3. Deploy Application
```bash
# Clone repository (or upload files)
cd /var/www
git clone <your-repo-url> socialdiscovery
cd socialdiscovery

# Install dependencies
npm install

# Build application
npm run build

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup
```

### 4. Configure Nginx
```bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/socialdiscovery

# Replace your-domain.com with actual domain
sudo nano /etc/nginx/sites-available/socialdiscovery

# Enable site
sudo ln -s /etc/nginx/sites-available/socialdiscovery /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 5. Setup SSL with Let's Encrypt
```bash
# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 6. Environment Configuration
```bash
# Copy .env file
cp .env.example .env

# Edit with production values
nano .env

# Important: Update APP_DOMAIN to your actual domain
# APP_DOMAIN=https://your-domain.com
```

## Production Commands

### Start/Stop/Restart
```bash
# Start application
pm2 start socialdiscovery

# Stop application
pm2 stop socialdiscovery

# Restart application
pm2 restart socialdiscovery

# Reload (zero downtime)
pm2 reload socialdiscovery
```

### Monitoring
```bash
# View logs
pm2 logs socialdiscovery

# Monitor status
pm2 monit

# List all processes
pm2 list

# Show details
pm2 show socialdiscovery
```

### Updates
```bash
# Pull latest changes
git pull

# Install new dependencies
npm install

# Rebuild
npm run build

# Restart PM2
pm2 restart socialdiscovery
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
pm2 logs socialdiscovery --lines 100

# Check if port is in use
sudo netstat -tulpn | grep 5173

# Check Node.js version
node --version
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

### Emergency Contacts:
- Hostinger Support: 24/7 live chat
- Supabase Support: Community forums
- Node.js: Documentation and community
