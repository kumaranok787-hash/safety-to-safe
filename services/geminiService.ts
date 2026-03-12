import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

/**
 * Helper to retry a function with exponential backoff
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isQuotaError = error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('429') || error?.message?.includes('quota');
      if (!isQuotaError) throw error;
      
      console.warn(`Gemini Quota hit. Attempt ${i + 1}/${maxRetries}. Retrying in ${Math.pow(2, i)}s...`);
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  throw lastError;
}

export async function getSearchGroundedContent(query: string) {
  const fetchContent = async () => {
    try {
      // Primary attempt with Google Search
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: query,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      return response.text;
    } catch (error: any) {
      const isQuotaError = error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('429') || error?.message?.includes('quota');
      if (isQuotaError) {
        console.warn("Gemini Search Quota hit. Trying without tools...");
        // Fallback: Try without tools (often has separate/higher quota)
        const fallbackResponse = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Provide general information about: ${query}. (Note: Live search is currently limited)`,
        });
        return `⚠️ **Live Search Limited**\n\n${fallbackResponse.text}`;
      }
      throw error;
    }
  };

  try {
    return await withRetry(fetchContent);
  } catch (error: any) {
    console.error("Gemini Search Error:", error);
    return `⚠️ **AI Search Unavailable**\n\nLive updates are temporarily unavailable due to high demand. Please try again later.`;
  }
}

const placesCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function getSmartSearchContent(query: string, lat?: number, lng?: number) {
  const cacheKey = `smart-${query}-${lat}-${lng}`;
  if (placesCache[cacheKey] && Date.now() - placesCache[cacheKey].timestamp < CACHE_DURATION) {
    return placesCache[cacheKey].data;
  }

  const fetchContent = async () => {
    try {
      const config: any = {
        tools: [{ googleMaps: {} }],
      };

      if (lat && lng) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        };
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: query,
        config
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const places: any[] = [];

      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.maps && chunk.maps.uri) {
            places.push({
              title: chunk.maps.title || 'Location',
              uri: chunk.maps.uri,
              snippets: chunk.maps.placeAnswerSources?.reviewSnippets || []
            });
          }
        });
      }

      if (places.length > 0) {
        return { text: response.text, places };
      } else {
        return { text: response.text };
      }
    } catch (error: any) {
      const isQuotaError = error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('429') || error?.message?.includes('quota');
      if (isQuotaError) {
        console.warn("Smart Search Quota hit. Trying text-only fallback...");
        const fallbackResponse = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Provide helpful information about: ${query}. (Note: Map-based search is currently limited)`,
        });
        return { text: fallbackResponse.text };
      }
      throw error;
    }
  };

  try {
    const result = await withRetry(fetchContent);
    placesCache[cacheKey] = { data: result, timestamp: Date.now() };
    return result;
  } catch (error: any) {
    console.error("Smart Search Error:", error);
    return { error: 'QUOTA_EXCEEDED', text: "AI Search quota exceeded. Please try again in a few minutes." };
  }
}

export async function getNearbyPlaces(query: string, lat?: number, lng?: number) {
  const cacheKey = `nearby-${query}-${lat}-${lng}`;
  if (placesCache[cacheKey] && Date.now() - placesCache[cacheKey].timestamp < CACHE_DURATION) {
    return placesCache[cacheKey].data;
  }

  const fetchContent = async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Find the nearest ${query} around me. Provide a list of names and addresses.`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: lat && lng ? { latitude: lat, longitude: lng } : undefined
            }
          }
        },
      });

      const text = response.text;
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      const googlePlaces = groundingChunks
        .filter(chunk => chunk.maps)
        .map(chunk => ({
          title: chunk.maps?.title || 'Nearby Location',
          address: chunk.maps?.title || 'Address not available',
          uri: chunk.maps?.uri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(chunk.maps?.title || query)}`,
          lat: lat || 0,
          lng: lng || 0
        }));

      if (googlePlaces.length > 0) {
        const placesWithCoords = await Promise.all(googlePlaces.slice(0, 5).map(async (place) => {
          try {
            const searchRes = await fetch('/api/nominatim/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: place.title, lat, lng })
            });
            if (searchRes.ok) {
              const { places: results } = await searchRes.json();
              if (results.length > 0) {
                return {
                  ...place,
                  lat: parseFloat(results[0].lat),
                  lng: parseFloat(results[0].lng),
                  address: results[0].address || place.address
                };
              }
            }
          } catch (e) {}
          return place;
        }));
        
        // Filter out places that still have 0,0 coordinates if they were defaulted
        const validPlaces = placesWithCoords.filter(p => p.lat !== 0 || p.lng !== 0);
        return { text, places: validPlaces };
      }
      
      // Fallback to Nominatim if no Google places found
      const nomRes = await fetch('/api/nominatim/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, lat, lng })
      });
      if (nomRes.ok) {
        const { places: nomPlaces } = await nomRes.json();
        return { text: `Found ${nomPlaces.length} nearby ${query}.`, places: nomPlaces };
      }
      return { text, places: [] };
    } catch (error: any) {
      const isQuotaError = error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('429') || error?.message?.includes('quota');
      if (isQuotaError) {
        console.warn("Nearby Places Quota hit. Falling back to Nominatim.");
        const nomRes = await fetch('/api/nominatim/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, lat, lng })
        });
        if (nomRes.ok) {
          const { places } = await nomRes.json();
          return { text: `Standard search results for ${query}`, places };
        }
      }
      throw error;
    }
  };

  try {
    const result = await withRetry(fetchContent);
    placesCache[cacheKey] = { data: result, timestamp: Date.now() };
    return result;
  } catch (error: any) {
    console.error("Nearby Places Error:", error);
    return { text: "Error fetching nearby places", places: [] };
  }
}
