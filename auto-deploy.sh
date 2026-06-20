#!/bin/bash
cd /opt/haircalendar
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "$(date): New commits found, deploying..."
  git pull origin master
  npm install --silent
  npm run build
  pm2 restart haircalendar
  echo "$(date): Deploy complete"
fi
