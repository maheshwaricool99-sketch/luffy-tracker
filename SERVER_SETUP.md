# Luffy Tracker server install

## 1) Fresh server prep (Ubuntu / Debian)

```bash
apt update && apt upgrade -y
apt install -y curl unzip rsync nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
```

Check versions:

```bash
node -v
npm -v
pm2 -v
```

## 2) Upload project

Upload this project zip to the server, then:

```bash
mkdir -p /opt/luffy-tracker-src
cd /opt/luffy-tracker-src
unzip luffy-tracker-deployable-ready.zip
cd luffyfix
```

## 3) Configure env

```bash
cp .env.example .env
nano .env
```

Set Binance keys only if you want exchange execution. The app can start with paper trading disabled.

## 4) Deploy

```bash
bash deploy.sh
```

This will:
- copy the app into `/opt/luffy-tracker`
- install dependencies
- build production assets
- start it with PM2

## 5) Nginx reverse proxy

```bash
cat >/etc/nginx/sites-available/luffy-tracker <<'NGINX'
server {
  listen 80;
  server_name _;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
NGINX
ln -sf /etc/nginx/sites-available/luffy-tracker /etc/nginx/sites-enabled/luffy-tracker
nginx -t && systemctl restart nginx
```

## 6) Useful commands

```bash
pm2 logs luffy-tracker
pm2 restart luffy-tracker
pm2 status
cd /opt/luffy-tracker && npm run build
```

## Fixes included in this package

- Trend Breakout return typing fixed so `bias` matches `SignalItem`
- Missing `publicCooldownActive()` helper restored in paper exchange
- Safe fallback for optional `state.universePairs`
- Added `.env.example`, `deploy.sh`, `ecosystem.config.cjs`, and this setup guide


## Backend paper trading config

Edit `.runtime/paper-config.json` on the server and paste your Binance credentials there.
The frontend settings page has been removed.

You can copy from `paper-config.server.example.json` if needed.
