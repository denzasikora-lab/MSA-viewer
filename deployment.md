# MSA Viewer — Public Server Deployment Guide
## NAR Web Server Issue preparation

---

## Option A: Deploy on a Linux server (Ubuntu/Debian recommended)

### Prerequisites
- Root/sudo access on the server
- Domain name (or use the IP directly, but HTTPS needs a domain)
- Node.js already installed (yes — used for other tools)

### Step 1: Clone and configure

```bash
ssh user@your-server.example.com
cd /srv
git clone https://github.com/Toki-bio/MSA-viewer.git msa-server
cd msa-server
npm install
```

### Step 2: Environment configuration

Create `/srv/msa-server/.env`:
```env
PORT=3000
CORS_ORIGIN=https://toki-bio.github.io
SSH_KEY_PATH=/home/user/.ssh/id_ed25519
MAFFT_PATH=/usr/bin/mafft  # adjust
BLAST_PATH=/usr/bin        # adjust — NOTE: only affects the unused real-blastn REST routes (POST /api/blast, /api/blast-all); the actual "BLAST Search" UI is a client-side JS engine that needs no BLAST+ install at all, see features-inventory.md
SAMTOOLS_PATH=/usr/bin     # adjust
USAGE_STATS=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

### Step 3: Nginx reverse proxy + HTTPS

Install nginx and certbot:
```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
```

Nginx config `/etc/nginx/sites-available/msa-viewer`:
```nginx
server {
    listen 80;
    server_name msa-viewer.example.com;  # your domain

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;  # MAFFT can take time
        client_max_body_size 10m;
    }
}
```

Enable and get certificate:
```bash
sudo ln -s /etc/nginx/sites-available/msa-viewer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d msa-viewer.example.com
```

### Step 4: Process management (PM2)

```bash
npm install -g pm2
cd /srv/msa-server
pm2 start server.js --name msa-viewer --max-memory-restart 500M
pm2 save
pm2 startup systemd
```

### Step 5: Health check endpoint

Add to `server.js`:
```js
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), version: '1.0' });
});
```

### Step 6: Usage statistics (for NAR submission)

Add to `server.js`:
```js
let usageCounter = { total: 0, unique_ips: new Set(), endpoints: {} };

app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        usageCounter.total++;
        const ip = req.ip || req.connection.remoteAddress;
        usageCounter.unique_ips.add(ip);
        usageCounter.endpoints[req.path] = (usageCounter.endpoints[req.path] || 0) + 1;
    }
    next();
});

app.get('/api/stats', (req, res) => {
    res.json({
        total_requests: usageCounter.total,
        unique_visitors: usageCounter.unique_ips.size,
        endpoints: usageCounter.endpoints,
        uptime: process.uptime()
    });
});
```

### Step 7: Update client to point to server

In `script.js`, change the server URL from `localhost:3000` to the public URL:
```js
const SERVER_URL = 'https://msa-viewer.example.com';
```

Or better — make it configurable with a setting in the UI.

---

## Option B: Deploy on a fresh cloud VPS

Identical steps to Option A, but on a dedicated VM:

| Provider | Cheapest VM | Monthly cost |
|----------|------------|--------------|
| Hetzner | CX22 (2 vCPU, 4 GB) | ~€4 |
| DigitalOcean | Basic (1 vCPU, 1 GB) | ~$6 |
| Vultr | Regular (1 vCPU, 1 GB) | ~$6 |

### Quick Hetzner setup

```bash
# Create CX22 VM with Ubuntu 24.04
# SSH in and:
apt update && apt install -y nodejs npm nginx certbot python3-certbot-nginx build-essential
# Add mafft
apt install -y mafft
# Add samtools
apt install -y samtools
# Then follow Steps 1-7 from Option A
```

---

## Option C: Simplified — GitHub Pages + serverless

If deploying a full server is too much overhead, consider:

1. **Keep the client on GitHub Pages** (already done)
2. **Use serverless functions** for compute-heavy operations:
   - Fly.io free tier for MAFFT/BLAST endpoints
   - Or Cloudflare Workers

This is less NAR-appropriate but simpler to maintain.

---

## What changes in the paper for NAR

If targeting NAR Web Server Issue, shift emphasis:

| Section | Change |
|---------|--------|
| **Title** | "MSA Viewer: a web server for..." (not "a browser-based platform") |
| **Abstract** | Lead with server URL and online availability |
| **Introduction** | Frame as a web service, not a desktop replacement |
| **Features** | Server endpoints first, client second |
| **Usage** | "Accessed by 500+ unique users..." (need to track) |
| **Submit pre-approval** | 1-page summary to Dr. Gary Benson by Dec 20 |

---

## Pre-approval deadline for NAR

December 20 — send a one-page summary to the NAR Web Server editor describing:
1. What the server does
2. Why it's novel
3. Who the audience is
4. URL (must be live)
5. Basic usage statistics

Format: email to the editor with description as PDF attachment.

---

## My recommendation

| Question | Answer |
|----------|--------|
| Is NAR worth the effort? | Yes — IF ~16 impact factor matters and December deadline is feasible |
| Can we deploy in a day? | Yes — on existing KIT server or a €4/month Hetzner VM |
| What's the blocking item? | Domain name (need to buy/configure one) |
| Fallback? | Bioinformatics Application Note — year-round, no server requirement, still IF ~6 |

The manuscript is written for Bioinformatics. Adapting it for NAR takes ~1 hour of rewriting to shift the focus from "platform" to "web server." The deployment takes ~2-3 hours. The pre-approval summary takes ~30 minutes.
