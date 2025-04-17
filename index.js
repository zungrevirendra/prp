require('dotenv').config();
const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-repl-url.repl.co' 
    : 'http://localhost:5173', // Vite default port
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Body parsing
app.use(express.json());

// API Key validation
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error('❌ Missing API_KEY in .env');
  process.exit(1);
}

const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}`;

// Cache setup
const cache = {
  rates: {},
  lastUpdated: null,
  ttl: 60 * 60 * 1000 // 1 hour
};

// Currency data
const CURRENCY_DATA = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  JPY: { symbol: '¥', name: 'Japanese Yen' }
};

// Fetch exchange rates
async function fetchExchangeRates(baseCurrency) {
  const cacheKey = baseCurrency;

  if (cache.rates[cacheKey] && (Date.now() - cache.lastUpdated) < cache.ttl) {
    return cache.rates[cacheKey];
  }

  try {
    const response = await axios.get(`${BASE_URL}/latest/${baseCurrency}`);
    if (response.data.result === 'success') {
      cache.rates[cacheKey] = response.data.conversion_rates;
      cache.lastUpdated = Date.now();
      return cache.rates[cacheKey];
    }
    throw new Error(response.data['error-type']);
  } catch (error) {
    console.error('API Error:', error.message);
    throw error;
  }
}

// API Routes
app.get('/api/currencies', (req, res) => {
  res.json({ success: true, currencies: CURRENCY_DATA });
});

app.post('/api/convert', async (req, res) => {
  try {
    const { amount, from, to } = req.body;

    if (!amount || isNaN(amount)) return res.status(400).json({ error: 'Invalid amount' });
    if (!from || !to) return res.status(400).json({ error: 'Missing currency codes' });

    const rates = await fetchExchangeRates(from.toUpperCase());
    const rate = rates[to.toUpperCase()];

    if (!rate) return res.status(400).json({ error: 'Invalid currency pair' });

    res.json({
      amount: parseFloat(amount),
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate,
      result: parseFloat((amount * rate).toFixed(4)),
      symbol: CURRENCY_DATA[to.toUpperCase()]?.symbol || '',
      lastUpdated: cache.lastUpdated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔌 CORS configured for Vite frontend (http://localhost:5173)`);
  }
});
// Serve a basic homepage
app.get('/', (req, res) => {
  res.send(`
    <h1>Currency Converter API</h1>
    <p>Available endpoints:</p>
    <ul>
      <li><a href="/api/currencies">/api/currencies</a> - List supported currencies</li>
      <li><a href="/api-docs">/api-docs</a> - Swagger documentation</li>
    </ul>
  `);
});