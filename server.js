import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { GoogleGenAI } from '@google/genai';

const app = express();
const port = 3030;

app.use(cors());
app.use(bodyParser.json());

const ai = new GoogleGenAI({ apiKey: process.env.GENAI_API_KEY }); // your API key here

app.post('/api/ai', async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error('Gemini error:', error);
    res.status(500).json({ reply: 'Sorry, there was an error processing your request.' });
  }
});

app.listen(port, () => {
  console.log(`MaterialAI (Gemini) backend running at http://localhost:${port}`);
});