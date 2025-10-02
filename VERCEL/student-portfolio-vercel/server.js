// 로컬 테스트용 간단한 서버
const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PORT = 3000;

const server = http.createServer(async (req, res) => {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // req.body 파싱
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    await new Promise(resolve => {
      req.on('end', () => {
        try {
          req.body = JSON.parse(body);
        } catch (e) {
          req.body = {};
        }
        resolve();
      });
    });
  }

  // Vercel-style response wrapper
  const wrapResponse = (originalRes) => {
    return {
      status: (code) => {
        return {
          json: (data) => {
            originalRes.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
            originalRes.end(JSON.stringify(data));
          }
        };
      },
      setHeader: originalRes.setHeader.bind(originalRes)
    };
  };

  const wrappedRes = wrapResponse(res);

  // API 라우팅
  if (req.url.startsWith('/api/login')) {
    const loginHandler = require('./api/login.js');
    return loginHandler(req, wrappedRes);
  }

  if (req.url.startsWith('/api/change-password')) {
    const changePasswordHandler = require('./api/change-password.js');
    return changePasswordHandler(req, wrappedRes);
  }

  // 정적 파일 (index.html)
  if (req.url === '/' || req.url === '/index.html') {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n✅ 로컬 서버 시작됨!`);
  console.log(`\n🌐 브라우저에서 접속: http://localhost:${PORT}`);
  console.log(`\n종료하려면 Ctrl+C를 누르세요.\n`);
});
