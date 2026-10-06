import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize GoogleGenAI server-side client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// System instruction for the Gas Spring AI Engineering Assistant
const SYSTEM_INSTRUCTION = `Sen uzman bir Gazlı Amortisör (Gas Spring) ve Mekanik CAD Tasarım Mühendisliği Danışmanısın (AI Engineering Specialist).
Kullanıcılara gazlı amortisör seçiminde, boru/mil çapı optimizasyonunda, strok-açık boy-kapalı boy hesaplarında, Boyle-Mariotte gaz sıkışması ve azot dolum basıncı (Bar) hesaplarında, Euler mil burkulma sınırı kontrollerinde, K-faktörü ilerleyişinde ve ERP BOM ürün ağacı reçetelerinde profesyonel mühendislik desteği verirsin.

Kurallar:
1. Kullanıcı Türkçe konuştuğunda açık, teknik ve samimi bir Türkçe ile yanıt ver.
2. Formülleri ve fiziksel gerekçeleri açıkla:
   - Basınç formülü: P = (F1 / [π × (d/2)²]) × 10 Bar
   - Kapalı boy sınırı: L_kapalı = L - S ≥ S + Ölü Boy
   - K-faktörü: F2 = F1 × K (genelde 1.30 - 1.40)
   - Montaj kuralı: Mil normal dinlenme konumunda aşağı bakmalıdır (keçe yağlaması ve son konum hidrolik sönümlemesi için).
3. Kullanıcının üzerinde çalıştığı güncel amortisör CAD parametreleri mesajla birlikte gönderildiğinde, bu değerleri doğrudan değerlendirerek spesifik tavsiyeler sun.`;

// API Endpoint for Gemini multi-turn chat
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, cadContext, model = 'gemini-3.5-flash' } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY ortam değişkeni tanımlı değil. Lütfen Secrets panelini kontrol edin.',
      });
    }

    // Valid model selection according to skill guidelines
    const selectedModel =
      model === 'gemini-3.1-pro-preview' || model === 'gemini-3.1-flash-lite'
        ? model
        : 'gemini-3.5-flash';

    // Format conversation history for Gemini API
    const formattedContents: { role: string; parts: { text: string }[] }[] = [];

    // Inject current CAD context if available
    let contextHeader = '';
    if (cadContext) {
      contextHeader = `[GÜNCEL CAD TASARIM BAĞLAMI]:
Model Kodu: ${cadContext.partNumber || 'Belirtilmedi'}
Amortisör Tipi: ${cadContext.springTypeName || 'Standart İtme'}
Boru Dış Çapı (D): ${cadContext.tubeOd} mm
Mil Çapı (d): ${cadContext.rodOd} mm
Strok (S): ${cadContext.stroke} mm
Açık Boy (L): ${cadContext.extLength} mm
Kapalı Boy: ${cadContext.closedLength} mm
Nominal İtme Kuvveti (F1): ${cadContext.forceN} N (~${(cadContext.forceN / 9.81).toFixed(1)} kgf)
Hesaplanan İç Gaz Basıncı (N2): ${cadContext.pressureBar} Bar
Mil Ucu: ${cadContext.rodFittingName || '-'}
Gövde Ucu: ${cadContext.tubeFittingName || '-'}
Fiziksel Durum: ${cadContext.isValid ? 'GEÇERLİ' : 'UYARILI / HATALI'}
--------------------------------------------------\n`;
    }

    if (Array.isArray(messages) && messages.length > 0) {
      messages.forEach((msg, idx) => {
        const isLastUserMsg = idx === messages.length - 1 && msg.role === 'user';
        const textContent = isLastUserMsg && contextHeader ? `${contextHeader}\nKullanıcı Sorusu: ${msg.text}` : msg.text;

        formattedContents.push({
          role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: textContent }],
        });
      });
    } else {
      formattedContents.push({
        role: 'user',
        parts: [{ text: 'Merhaba, bana gazlı amortisör tasarımı hakkında bilgi verebilir misin?' }],
      });
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: formattedContents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const reply = response.text || 'Üzgünüm, bir yanıt üretilemedi.';
    res.json({ reply });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({
      error: error.message || 'Gemini API çağrısı sırasında bir hata oluştu.',
    });
  }
});

// Mount Vite middleware in development or serve static build in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Gas Spring CAD Server running on port ${PORT}`);
  });
}

startServer();
