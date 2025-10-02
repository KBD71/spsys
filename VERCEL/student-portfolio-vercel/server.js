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

  // URL 파싱 (쿼리 파라미터 지원)
  const url = new URL(req.url, `http://localhost:${PORT}`);
  req.query = Object.fromEntries(url.searchParams);

  // API 라우팅
  if (url.pathname === '/api/login') {
    const loginHandler = require('./api/login.js');
    return loginHandler(req, wrappedRes);
  }

  if (url.pathname === '/api/change-password') {
    const changePasswordHandler = require('./api/change-password.js');
    return changePasswordHandler(req, wrappedRes);
  }

  if (url.pathname === '/api/assignments') {
    const assignmentsHandler = require('./api/assignments.js');
    return assignmentsHandler(req, wrappedRes);
  }

  if (url.pathname === '/api/assignment-detail') {
    const assignmentDetailHandler = require('./api/assignment-detail.js');
    return assignmentDetailHandler(req, wrappedRes);
  }

  if (url.pathname === '/api/submit-assignment') {
    const submitAssignmentHandler = require('./api/submit-assignment.js');
    return submitAssignmentHandler(req, wrappedRes);
  }

  if (url.pathname === '/api/my-records') {
    const myRecordsHandler = require('./api/my-records.js');
    return myRecordsHandler(req, wrappedRes);
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
