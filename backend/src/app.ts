import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api.routes.js';

export const app = express();

// Middlewares
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'https://vidyapithconnect.in'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));


app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Routing Gateway
app.use('/api/v1', apiRouter);

// Chrome devtools & Service Worker stubs to prevent 404 errors in background logs
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.status(200).send('// Service worker stub');
});

app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({});
});

// Global 404 Error handler
app.use((req, res) => {
  res.status(404).json({ error: `Path not found: ${req.originalUrl}` });
});

// Global Exception handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Internal Server Exception Context: ", err.stack);
  res.status(500).json({ error: "A server-side critical error occurred. Please contact network administrator." });
});
