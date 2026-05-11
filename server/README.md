# SOUNDWAVE — Backend (Node.js + Express + MariaDB)

Production-ready API for the SOUNDWAVE app. Designed to be deployed on Debian
behind Apache (reverse proxy) with PM2.

## Stack

- Node.js 20+ / Express 4 / TypeScript
- MariaDB / MySQL 8 (via `mysql2`)
- JWT auth (access 15 min + refresh 7 j) + bcrypt
- Helmet, CORS, rate-limit, compression
- Zod validation, prepared statements (anti-SQLi)

## Setup local (Debian / Ubuntu / WSL)

```bash
cd server
cp .env.example .env       # edit DB creds + JWT secrets
npm install
# 1) Initialise the DB + schema + first admin user
npx tsx src/database/init.ts
# 2) Start dev
npm run dev
```

API listens on `http://localhost:3001`. Health-check: `GET /health`.

## Generating real JWT secrets

```bash
openssl rand -hex 32   # paste into JWT_SECRET
openssl rand -hex 32   # paste into JWT_REFRESH_SECRET
```

## Deployment Debian (résumé)

```bash
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mariadb-server
sudo mysql_secure_installation

# DB user
sudo mysql <<SQL
CREATE USER 'soundwave'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON soundwave_prod.* TO 'soundwave'@'localhost';
FLUSH PRIVILEGES;
SQL

# Code
cd /var/www && sudo git clone <repo> soundwave && cd soundwave/server
npm install && npm run build
cp .env.example .env  # edit prod creds
npx tsx src/database/init.ts

# PM2
sudo npm i -g pm2
pm2 start dist/index.js --name soundwave
pm2 save && pm2 startup

# Apache reverse proxy (/etc/apache2/sites-available/soundwave.conf)
sudo a2enmod proxy proxy_http headers ssl
```

```apache
<VirtualHost *:80>
  ServerName music.example.com
  ProxyPreserveHost On
  ProxyPass        /api/  http://127.0.0.1:3001/api/
  ProxyPassReverse /api/  http://127.0.0.1:3001/api/
  # Frontend statique
  DocumentRoot /var/www/soundwave/dist
  <Directory /var/www/soundwave/dist>
    AllowOverride All
    Require all granted
    FallbackResource /index.html
  </Directory>
</VirtualHost>
```

```bash
sudo a2ensite soundwave && sudo systemctl reload apache2
sudo certbot --apache -d music.example.com   # HTTPS Let's Encrypt
```

## Endpoints

Full list in the project specification. All `/api/*` routes (except
`/api/auth/*`) require `Authorization: Bearer <token>`. Admin endpoints
require `is_admin = TRUE` on the user.

## Sécurité

- `bcryptjs` (10 rounds), `helmet`, CORS strict (origin allow-list)
- Rate-limit: login 5/15min, register 3/h, API 100/min
- Toutes les requêtes SQL utilisent des **prepared statements**
- Logs admin (table `admin_logs`) tracent chaque action sensible
