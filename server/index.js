const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3001;

app.use(
  cors({
    origin: ['http://localhost:4200'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/coach', async (req, res) => {
  try {
    const { instructions, input, maxTokens = 900 } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'Falta OPENAI_API_KEY en server/.env',
      });
    }

    if (!input || typeof input !== 'string') {
      return res.status(400).json({
        error: 'El campo input es obligatorio',
      });
    }

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: instructions || 'Eres un coach ejecutivo útil y concreto.',
          },
          {
            role: 'user',
            content: input,
          },
        ],
        max_tokens: maxTokens,
        stream: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || 'Error al llamar a DeepSeek',
      });
    }

    const text = data?.choices?.[0]?.message?.content?.trim() || '';

    return res.json({ text });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'Error interno del coach',
    });
  }
});

app.listen(port, () => {
  console.log(`Coach backend escuchando en http://localhost:${port}`);
});