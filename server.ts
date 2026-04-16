import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy endpoint to bypass CORS for Google Apps Script
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing URL parameter" });
    }

    try {
      const urlObj = new URL(targetUrl);
      // Add all other query parameters to the target URL
      Object.entries(req.query).forEach(([key, value]) => {
        if (key !== 'url') {
          urlObj.searchParams.set(key, String(value));
        }
      });

      const finalUrl = urlObj.toString();
      console.log(`Proxying request to: ${finalUrl}`);

      const response = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow'
      });

      const contentType = response.headers.get("content-type");
      const text = await response.text();

      if (text.includes("指令碼已完成") || text.includes("Script completed but did not return")) {
        console.warn("GAS Error detected in response:", text);
        return res.status(500).json({ 
          error: "Google Script Error", 
          details: "Script completed without returning a value. Check your GAS code logic and parameters.",
          raw: text 
        });
      }

      if (contentType && contentType.includes("application/json")) {
        try {
          res.json(JSON.parse(text));
        } catch (e) {
          res.send(text);
        }
      } else {
        res.send(text);
      }
    } catch (error: any) {
      console.error("Proxy Error:", error);
      res.status(500).json({ error: "Failed to fetch from target", details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
