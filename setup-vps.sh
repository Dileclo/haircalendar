#!/bin/bash
set -e
echo "=== HairCalendar VPS Setup ==="

# Install Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install nodejs -y
npm install -g pm2

# Clone the repo
cd /opt
if [ -d haircalendar ]; then
  cd haircalendar
  git pull
else
  git clone https://github.com/Dileclo/haircalendar.git
  cd haircalendar
fi

# Install deps and build
npm install
npm run build

# Create .env.local
cat > .env.local << 'ENVEOF'
VAPID_PUBLIC_KEY=BLRrJ4FSNIG7-xcaIclT-pV_N71ggallGoH0P7uCyQmiqJpvVbVejEtGUSieufWyulQwQLBnOvRCL85DevTS-b4
VAPID_PRIVATE_KEY=eV98DP3e2PFBGmNdFzckOAxkpVmWwJCbPzyCp4o1Pvs
VAPID_SUBJECT=mailto:admin@haircalendar.ru
PORT=3000
NODE_ENV=production
ENVEOF

# Stop old PM2 process if exists
pm2 delete haircalendar 2>/dev/null || true

# Start with PM2
pm2 start npm --name haircalendar -- run start
pm2 save
pm2 startup systemd -u root --hp /root

echo "=== Setup complete ==="
echo "Check: pm2 status"
echo "Logs: pm2 logs haircalendar"
echo "Site: http://147.45.138.49:3000"
