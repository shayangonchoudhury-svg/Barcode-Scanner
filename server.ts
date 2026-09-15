import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API routes FIRST
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Gemini Search Grounding Lookup for Barcodes
 */
async function handleGeminiLookup(req: express.Request, res: express.Response) {
  try {
    const { barcode } = req.body;
    if (!barcode || typeof barcode !== 'string') {
      return res.status(400).json({ error: 'Barcode parameter is required' });
    }

    const cleanCode = barcode.trim();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not configured');
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not set. Please configure it in AI Studio settings.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Prompt with manufacturer/company and address lookup per requirements
    const prompt = `Look up the product associated with barcode ${cleanCode} using web search.
Report only information you find in search results:
- Brand
- Product Name
- Company / Manufacturer Name
- Manufacturing Location / Company Address
- Country of Origin
- Category
- Typical Price Range
- Two-Sentence Description
If search returns nothing reliable for this exact barcode, say clearly
that no verified product information was found. Do not guess or infer
a product from the barcode number pattern alone.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawText = response.text || '';

    // Extract grounding sources/citations
    const candidate = response.candidates?.[0];
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
    const sources: Array<{ title: string; url: string }> = [];

    for (const chunk of groundingChunks) {
      if (chunk.web?.uri) {
        sources.push({
          title: chunk.web.title || chunk.web.uri,
          url: chunk.web.uri,
        });
      }
    }

    // Deduplicate sources
    const uniqueSources = sources.filter(
      (item, idx, arr) => arr.findIndex((t) => t.url === item.url) === idx
    );

    // Analyze if product was found or if no verified info was found
    const lower = rawText.toLowerCase();
    const notFoundIndicators = [
      'no verified product information was found',
      'no verified product information',
      'no verified product info',
      'no reliable information was found',
      'no reliable product information',
      'no reliable information',
      'no information found for this barcode',
      'no verified information found',
      'could not find any verified product',
      'no product could be found',
      'nothing reliable for this exact barcode',
      'could not find reliable product',
      'not found in search results',
      'no results found for barcode',
      'no verified product',
    ];

    let isNotFound = notFoundIndicators.some((indicator) => lower.includes(indicator));

    // Structured field extraction
    let brand = '';
    let productName = '';
    let category = '';
    let priceRange = '';
    let description = '';
    let companyName = '';
    let manufacturingPlaces = '';
    let origins = '';

    if (!isNotFound) {
      const brandMatch = rawText.match(/(?:[-*•#\d.]*\s*)?(?:\*\*Brand\*\*|Brand)[:\-–]\s*([^\n]+)/i);
      if (brandMatch) brand = brandMatch[1].replace(/\*\*/g, '').trim();

      const nameMatch = rawText.match(
        /(?:[-*•#\d.]*\s*)?(?:\*\*Product Name\*\*|Product Name|\*\*Name\*\*|Name)[:\-–]\s*([^\n]+)/i
      );
      if (nameMatch) productName = nameMatch[1].replace(/\*\*/g, '').trim();

      const companyMatch = rawText.match(
        /(?:[-*•#\d.]*\s*)?(?:\*\*Company\s*(?:\/\s*Manufacturer)?\s*Name\*\*|Company\s*Name|Manufacturer\s*Name|\*\*Manufacturer\*\*|Manufacturer)[:\-–]\s*([^\n]+)/i
      );
      if (companyMatch) companyName = companyMatch[1].replace(/\*\*/g, '').trim();

      const locationMatch = rawText.match(
        /(?:[-*•#\d.]*\s*)?(?:\*\*Manufacturing\s*Location\s*(?:\/\s*Company\s*Address)?\*\*|Manufacturing\s*Location|Company\s*Address|Address)[:\-–]\s*([^\n]+)/i
      );
      if (locationMatch) manufacturingPlaces = locationMatch[1].replace(/\*\*/g, '').trim();

      const originMatch = rawText.match(
        /(?:[-*•#\d.]*\s*)?(?:\*\*Country\s*of\s*Origin\*\*|Country\s*of\s*Origin|Origin)[:\-–]\s*([^\n]+)/i
      );
      if (originMatch) origins = originMatch[1].replace(/\*\*/g, '').trim();

      const categoryMatch = rawText.match(
        /(?:[-*•#\d.]*\s*)?(?:\*\*Category\*\*|Category)[:\-–]\s*([^\n]+)/i
      );
      if (categoryMatch) category = categoryMatch[1].replace(/\*\*/g, '').trim();

      const priceMatch = rawText.match(
        /(?:[-*•#\d.]*\s*)?(?:\*\*Typical Price Range\*\*|Typical Price Range|\*\*Price Range\*\*|Price Range|\*\*Price\*\*|Price)[:\-–]\s*([^\n]+)/i
      );
      if (priceMatch) priceRange = priceMatch[1].replace(/\*\*/g, '').trim();

      const descMatch = rawText.match(
        /(?:[-*•#\d.]*\s*)?(?:\*\*Description\*\*|Description|\*\*Two-Sentence Description\*\*|Two-sentence description)[:\-–]\s*([\s\S]+?)(?=\n\s*[-*•#\d.]*\s*\*\*|\n\n\s*[A-Z]|$)/i
      );
      if (descMatch) description = descMatch[1].replace(/\*\*/g, '').trim();

      // Fallback description if not parsed separately
      if (!description && rawText) {
        description = rawText.trim();
      }

      // If no product name or brand could be found, and text indicates no match
      if (!brand && !productName && (rawText.length < 150 || sources.length === 0)) {
        if (lower.includes('no') || lower.includes('not') || lower.includes('unable')) {
          isNotFound = true;
        }
      }
    }

    const hasMfr = Boolean(companyName || brand || manufacturingPlaces || origins);
    const manufacturer = hasMfr
      ? {
          companyName: companyName || brand || undefined,
          manufacturingPlaces: manufacturingPlaces || undefined,
          origins: origins || undefined,
          source: 'gemini_web' as const,
        }
      : {
          source: 'not_available' as const,
        };

    return res.json({
      barcode: cleanCode,
      found: !isNotFound,
      rawText,
      brand: brand || undefined,
      productName: productName || undefined,
      category: category || undefined,
      priceRange: priceRange || undefined,
      description: description || undefined,
      manufacturer,
      sources: uniqueSources,
    });
  } catch (error: any) {
    console.error('Error during Gemini barcode lookup:', error);
    return res.status(500).json({
      error: error.message || 'Gemini web search failed',
    });
  }
}

app.post('/api/barcode/gemini', handleGeminiLookup);
app.post('/api/lookup-gemini', handleGeminiLookup);

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Barcode Scanner Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
