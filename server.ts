import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 4000;
  const BACKEND_PORT = 8080;

  app.use(cors());

  // Proxy API routes to Java Backend: mount on /api to preserve path prefixes
  app.use('/api', createProxyMiddleware({
    target: `http://localhost:${BACKEND_PORT}`,
    changeOrigin: true,
    pathRewrite: {
      '^/': '/api/' // rewrite root of proxy to /api/ since express strips the mount point
    },
    ws: true // Handle SSE/Websockets
  }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Serve static files in production
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Node Proxy Server (Port 4000) -> Java Backend (Port 8080)`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer();
