import express from "express";

const app = express();
app.use(express.json());

// Simple in-memory store (ephemeral on Vercel - resets on each cold start)
const memoryStore: Record<string, { encrypted_payload: string; updated_at: string }> = {};

// API routes
app.post("/api/nominatim/search", async (req, res) => {
  try {
    const { query, lat, lng } = req.body;
    let places: any[] = [];
    if (lat !== undefined && lng !== undefined) {
      try {
        const left = lng - 0.05;
        const right = lng + 0.05;
        const top = lat + 0.05;
        const bottom = lat - 0.05;
        const viewbox = `${left},${top},${right},${bottom}`;
        
        const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=1&limit=10`, {
          headers: { 'User-Agent': 'EmergencyPortal/1.0 (kumaranok787@gmail.com)' }
        });
        let nomData = await nomRes.json();
        
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

// Cloud Sync API (in-memory, ephemeral)
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

export default app;
