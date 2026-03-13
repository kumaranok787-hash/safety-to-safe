import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In-memory store (for local dev - resets on restart)
const memoryStore: Record<string, { encrypted_payload: string; updated_at: string }> = {};

const app = express();
const PORT = 3000;

app.use(express.json());

// API routes
app.post("/api/nominatim/search", async (req, res) => {
  try {
    const { query, lat, lng } = req.body;
    let places = [];
    if (lat !== undefined && lng !== undefined) {
      try {
        // Create a bounding box around the location (~5-10km radius)
        const left = lng - 0.05;
        const right = lng + 0.05;
        const top = lat + 0.05;
        const bottom = lat - 0.05;
        const viewbox = `${left},${top},${right},${bottom}`;
        
        const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=1&limit=10`, {
          headers: { 'User-Agent': 'EmergencyPortal/1.0 (kumaranok787@gmail.com)' }
        });
        let nomData = await nomRes.json();
        
        // If no results with bounded=1, try without it but still biased by viewbox
        if (Array.isArray(nomData) && nomData.length === 0) {
          const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&limit=10`, {
            headers: { 'User-Agent': 'EmergencyPortal/1.0 (kumaranok787@gmail.com)' }
          });
          nomData = await fallbackRes.json();
        }
        
        if (Array.isArray(nomData)) {
          places = nomData.map((place: any) => ({
            title: place.display_name.split(',')[0],
            address: place.display_name.split(',').slice(1, 4).join(',').replace(/^,/, '').trim(),
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon),
            uri: `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`
          }));
        } else {
          console.error("Nominatim returned non-array data:", nomData);
        }
      } catch (e) {
        console.error("Nominatim fetch error:", e);
      }
    }
    res.json({ places });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Cloud Sync API (in-memory for local dev)
app.post("/api/cloud/sync", (req, res) => {
  try {
    const { userId, encryptedPayload } = req.body;
    if (!userId || !encryptedPayload) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    memoryStore[userId] = {
      encrypted_payload: encryptedPayload,
      updated_at: new Date().toISOString()
    };
    res.json({ success: true, message: "Data securely synced to cloud" });
  } catch (error: any) {
    console.error("Cloud sync error:", error);
    res.status(500).json({ error: "Failed to sync data" });
  }
});

app.get("/api/cloud/sync/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const row = memoryStore[userId];
    if (row) {
      res.json({ success: true, encryptedPayload: row.encrypted_payload });
    } else {
      res.json({ success: false, message: "No cloud data found" });
    }
  } catch (error: any) {
    console.error("Cloud fetch error:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  createViteServer({
    server: { 
      middlewareMode: true
    },
    appType: "spa",
  }).then((vite) => {
    app.get('/', async (req, res) => {
      try {
        const url = req.originalUrl;
        console.log(`Serving transformed index.html for: ${url}`);
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        console.error(`Error serving index.html:`, e);
        res.status(500).end(e.message);
      }
    });

    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        // Only handle HTML requests or the root path
        if (url.includes('.') && !url.endsWith('.html')) {
          return next();
        }

        console.log(`Serving transformed index.html for catch-all: ${url}`);
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        console.error(`Error serving ${url}:`, e);
        res.status(500).end(e.message);
      }
    });
  });
} else {
  // In Vercel, static files are handled by vercel.json rewrites, 
  // but we can leave this here for local production builds
  app.use(express.static('dist'));
}

// Only start the server if not running in Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
