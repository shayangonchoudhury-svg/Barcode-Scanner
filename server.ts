import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// API routes FIRST
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * UPCItemDB Lookup Endpoint
 * Trial tier: https://api.upcitemdb.com/prod/trial/lookup?upc={code}
 * Covers general retail (electronics, toys, household goods, books)
 */
async function handleUPCItemDBLookup(req: express.Request, res: express.Response) {
  try {
    const rawCode = req.query.upc || req.body.barcode || req.body.upc;
    if (!rawCode || typeof rawCode !== 'string') {
      return res.status(400).json({ error: 'UPC/Barcode parameter is required' });
    }

    const cleanCode = rawCode.trim();
    const upcUrl = `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(cleanCode)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    let upcRes: Response;
    try {
      upcRes = await fetch(upcUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BarcodeScannerApp/2.0',
        },
        signal: controller.signal,
      });
    } catch (networkErr: any) {
      clearTimeout(timeout);
      console.warn('UPCItemDB network/timeout error:', networkErr);
      return res.status(502).json({
        found: false,
        isNetworkError: true,
        error: 'Could not connect to UPCItemDB service. Check network connection.',
        barcode: cleanCode,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!upcRes.ok) {
      // 404 or 429 rate limit or 400
      if (upcRes.status === 404) {
        return res.json({
          barcode: cleanCode,
          found: false,
          source: 'upcitemdb',
          message: 'No item found in UPCItemDB database',
        });
      }
      if (upcRes.status === 429) {
        console.warn('UPCItemDB trial tier rate limit reached');
        return res.status(429).json({
          found: false,
          isRateLimited: true,
          error: 'UPCItemDB rate limit reached. Proceeding to web search.',
          barcode: cleanCode,
        });
      }
      return res.json({
        barcode: cleanCode,
        found: false,
        source: 'upcitemdb',
        status: upcRes.status,
      });
    }

    const data: any = await upcRes.json();

    if (data.code === 'OK' && Array.isArray(data.items) && data.items.length > 0) {
      const item = data.items[0];
      const images: string[] = Array.isArray(item.images) ? item.images : [];
      const primaryImage = images.length > 0 ? images[0] : undefined;

      const manufacturer = item.brand
        ? {
            companyName: item.brand,
            manufacturingPlaces: undefined,
            origins: undefined,
            source: 'upcitemdb' as const,
          }
        : {
            source: 'not_available' as const,
          };

      return res.json({
        barcode: cleanCode,
        found: true,
        source: 'upcitemdb',
        foundViaLabel: 'Found via: UPCItemDB',
        productName: item.title || item.model || 'Unknown Product',
        brand: item.brand || undefined,
        category: item.category || undefined,
        description: item.description || undefined,
        imageUrl: primaryImage,
        images,
        lowestPrice: item.lowest_recorded_price,
        highestPrice: item.highest_recorded_price,
        manufacturer,
      });
    }

    return res.json({
      barcode: cleanCode,
      found: false,
      source: 'upcitemdb',
      message: 'No items found in UPCItemDB',
    });
  } catch (err: any) {
    console.error('Error during UPCItemDB lookup:', err);
    return res.status(500).json({
      found: false,
      isNetworkError: true,
      error: err.message || 'Internal error querying UPCItemDB',
    });
  }
}

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

    // Exact prompt per User Requirement #2
    const prompt = `Search for the product associated with barcode ${cleanCode}. Try the exact barcode first. If that returns nothing useful, you may broaden to general web search for that exact number in combination with terms like 'barcode', 'UPC', 'product'. Report only what search results actually contain — brand, name, category, description. If nothing reliable turns up after both attempts, say clearly that no information was found. Do not infer a product from the barcode number pattern.

Format the output strictly as:
- Brand: [brand or 'Unknown']
- Product Name: [product name or 'Unknown']
- Category: [category or 'Unknown']
- Description: [two-sentence description based strictly on search results]
- Company / Manufacturer Name: [company name or 'Unknown']
- Manufacturing Location / Company Address: [manufacturing location or 'Unknown']
- Country of Origin: [country or 'Unknown']
- Typical Price Range: [typical price range or 'Not listed']`;

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
      'no information was found',
      'no verified information found',
      'could not find any verified product',
      'no product could be found',
      'nothing reliable for this exact barcode',
      'could not find reliable product',
      'not found in search results',
      'no results found for barcode',
      'no verified product',
      'no information found',
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
      if (brandMatch && !brandMatch[1].toLowerCase().includes('unknown')) {
        brand = brandMatch[1].replace(/\*\*/g, '').trim();
      }

      const nameMatch = rawText.match(
        /(?:[-*•#\d.]*\s*)?(?:\*\*Product Name\*\*|Product Name|\*\*Name\*\*|Name)[:\-–]\s*([^\n]+)/i
      );
      if (nameMatch && !nameMatch[1].toLowerCase().includes('unknown')) {
        productName = nameMatch[1].replace(/\*\*/g, '').trim();
      }

      const companyMatch = rawText.match(
        /(?:[-*•#\d.]*\s*)?(?:\*\*Company\s*(?:\/\s*Manufacturer)?\s*Name\*\*|Company\s*Name|Manufacturer\s*Name|\*\*Manufacturer\*\*|Manufacturer)[:\-–]\s*([^\n]+)/i
      );
      if (companyMatch && !companyMatch[1].toLowerCase().includes('unknown')) {
        companyName = companyMatch[1].replace(/\*\*/g, '').trim();
      }

      const locationMatch = rawText.match(
        /(?:[-*•#\d.]*\s*)?(?:\*\*Manufacturing\s*Location\s*(?:\/\s*Company\s*Address)?\*\*|Manufacturing\s*Location|Company\s*Address|Address)[:\-–]\s*([^\n]+)/i
      );
      if (locationMatch && !locationMatch[1].toLowerCase().includes('unknown')) {
        manufacturingPlaces = locationMatch[1].replace(/\*\*/g, '').trim();
      }

      const originMatch = rawText.match(
        /(?:[-*•#\d.]*\s*)?(?:\*\*Country\s*of\s*Origin\*\*|Country\s*of\s*Origin|Origin)[:\-–]\s*([^\n]+)/i
      );
      if (originMatch && !originMatch[1].toLowerCase().includes('unknown')) {
        origins = originMatch[1].replace(/\*\*/g, '').trim();
      }

      const categoryMatch = rawText.match(
        /(?:[-*•#\d.]*\s*)?(?:\*\*Category\*\*|Category)[:\-–]\s*([^\n]+)/i
      );
      if (categoryMatch && !categoryMatch[1].toLowerCase().includes('unknown')) {
        category = categoryMatch[1].replace(/\*\*/g, '').trim();
      }

      const priceMatch = rawText.match(
        /(?:[-*•#\d.]*\s*)?(?:\*\*Typical Price Range\*\*|Typical Price Range|\*\*Price Range\*\*|Price Range|\*\*Price\*\*|Price)[:\-–]\s*([^\n]+)/i
      );
      if (priceMatch && !priceMatch[1].toLowerCase().includes('not listed')) {
        priceRange = priceMatch[1].replace(/\*\*/g, '').trim();
      }

      const descMatch = rawText.match(
        /(?:[-*•#\d.]*\s*)?(?:\*\*Description\*\*|Description|\*\*Two-Sentence Description\*\*|Two-sentence description)[:\-–]\s*([\s\S]+?)(?=\n\s*[-*•#\d.]*\s*\*\*|\n\n\s*[A-Z]|$)/i
      );
      if (descMatch) description = descMatch[1].replace(/\*\*/g, '').trim();

      if (!description && rawText) {
        description = rawText.trim();
      }

      // If no product name or brand could be found, and text indicates no match
      if (!brand && !productName && (rawText.length < 150 || sources.length === 0)) {
        if (lower.includes('no information') || lower.includes('not found') || lower.includes('unable to find')) {
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
      source: 'web_search',
      foundViaLabel: 'Found via: Web search',
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
      isNetworkError: true,
    });
  }
}

/**
 * Visual Photo Identification Endpoint (User Requirement #4)
 * Multimodal visual identification using Gemini without search grounding.
 * Prompt:
 * "Identify this product from the image. Report the brand, product name, and category
 * if you can determine them from what's visible in the photo — text on the packaging,
 * distinctive logos, or shape. If you cannot identify it with reasonable confidence,
 * say so rather than guessing."
 */
async function handlePhotoIdentify(req: express.Request, res: express.Response) {
  try {
    const { imageBase64, mimeType = 'image/jpeg', barcode } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 parameter is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
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

    // Remove data URL prefix if present
    const base64Clean = imageBase64.replace(/^data:image\/\w+;base64,/, '').trim();

    const photoPrompt = `Identify this product from the image. Report the brand, product name, and category if you can determine them from what's visible in the photo — text on the packaging, distinctive logos, or shape. If you cannot identify it with reasonable confidence, say so rather than guessing.

Please format your response strictly as:
- Brand: [Identified brand, or 'Unknown' if uncertain]
- Product Name: [Identified product name, or 'Unknown' if uncertain]
- Category: [Product category like Food, Beverage, Electronics, Cosmetics, Toy, Household, etc., or 'Unknown']
- Description: [Clear two-sentence visual description of what is visible on the package]
- Confidence: [High / Medium / Low / None]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: base64Clean,
          },
        },
        {
          text: photoPrompt,
        },
      ],
    });

    const rawText = response.text || '';
    const lower = rawText.toLowerCase();

    const brandMatch = rawText.match(/(?:[-*•#\d.]*\s*)?(?:\*\*Brand\*\*|Brand)[:\-–]\s*([^\n]+)/i);
    let brand = brandMatch ? brandMatch[1].replace(/\*\*/g, '').trim() : '';
    if (brand.toLowerCase().includes('unknown')) brand = '';

    const nameMatch = rawText.match(
      /(?:[-*•#\d.]*\s*)?(?:\*\*Product Name\*\*|Product Name|\*\*Name\*\*|Name)[:\-–]\s*([^\n]+)/i
    );
    let productName = nameMatch ? nameMatch[1].replace(/\*\*/g, '').trim() : '';
    if (productName.toLowerCase().includes('unknown')) productName = '';

    const categoryMatch = rawText.match(
      /(?:[-*•#\d.]*\s*)?(?:\*\*Category\*\*|Category)[:\-–]\s*([^\n]+)/i
    );
    let category = categoryMatch ? categoryMatch[1].replace(/\*\*/g, '').trim() : '';
    if (category.toLowerCase().includes('unknown')) category = '';

    const descMatch = rawText.match(
      /(?:[-*•#\d.]*\s*)?(?:\*\*Description\*\*|Description)[:\-–]\s*([\s\S]+?)(?=\n\s*[-*•#\d.]*\s*\*\*|\n\n\s*[A-Z]|$)/i
    );
    let description = descMatch ? descMatch[1].replace(/\*\*/g, '').trim() : rawText.trim();

    const confidenceMatch = rawText.match(
      /(?:[-*•#\d.]*\s*)?(?:\*\*Confidence\*\*|Confidence)[:\-–]\s*([^\n]+)/i
    );
    const confidence = confidenceMatch ? confidenceMatch[1].replace(/\*\*/g, '').trim() : 'Medium';

    const cannotIdentify =
      lower.includes('cannot identify') ||
      lower.includes('unable to identify') ||
      lower.includes('cannot be determined') ||
      lower.includes('could not identify') ||
      confidence.toLowerCase() === 'none' ||
      (!brand && !productName);

    return res.json({
      barcode: barcode || 'VISUAL_PHOTO',
      found: !cannotIdentify,
      source: 'photo_identification',
      foundViaLabel: 'Identified from photo — verify details independently',
      confidence,
      brand: brand || undefined,
      productName: productName || (cannotIdentify ? undefined : 'Identified Product'),
      category: category || undefined,
      description: description || undefined,
      rawText,
      manufacturer: brand
        ? {
            companyName: brand,
            source: 'gemini_web' as const,
          }
        : { source: 'not_available' as const },
    });
  } catch (error: any) {
    console.error('Error during Gemini photo identification:', error);
    return res.status(500).json({
      error: error.message || 'Photo identification failed',
      isNetworkError: true,
    });
  }
}

app.get('/api/barcode/upcitemdb', handleUPCItemDBLookup);
app.post('/api/barcode/upcitemdb', handleUPCItemDBLookup);
app.post('/api/lookup-upcitemdb', handleUPCItemDBLookup);

app.post('/api/barcode/gemini', handleGeminiLookup);
app.post('/api/lookup-gemini', handleGeminiLookup);

app.post('/api/barcode/photo-identify', handlePhotoIdentify);

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
