// PM2 config for TimeWeb Cloud
module.exports = {
  apps: [{
    name: 'haircalendar',
    script: 'node_modules/.bin/next',
    args: 'start -p 3000 -H 0.0.0.0',
    cwd: __dirname,
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '512M',
  }]
};
