const http = require('http');
const { exec } = require('child_process');

const PORT = 9000;
const SECRET = 'haircalendar-deploy-secret';

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/deploy') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      console.log(`[Webhook] Deploy triggered at ${new Date().toISOString()}`);
      res.writeHead(200);
      res.end('OK');

      exec('cd /opt/haircalendar && git pull origin master && npm install --silent && pm2 stop haircalendar && npm run build && pm2 start haircalendar',
        (err, stdout, stderr) => {
          if (err) {
            console.error(`[Webhook] FAIL: ${err.message}`);
            return;
          }
          console.log(`[Webhook] Deploy OK`);
        });
    });
  } else if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, () => console.log(`[Webhook] Listening on :${PORT}`));
