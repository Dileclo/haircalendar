#!/bin/bash
cd /opt/haircalendar
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "$(date): Deploying..."
  git pull origin master
  npm install --silent
  pm2 stop haircalendar
  npm run build && pm2 start haircalendar || pm2 start haircalendar
  echo "$(date): Done"
fi
