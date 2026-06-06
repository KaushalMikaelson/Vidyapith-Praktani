import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api.routes.js';

export const app = express();

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'https://vidyapithconnect.in'],
  credentials: true
}));


app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Routing Gateway
app.use('/api/v1', apiRouter);

// Global 404 Error handler
app.use((req, res) => {
  res.status(404).json({ error: `Path not found: ${req.originalUrl}` });
});

// Global Exception handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Internal Server Exception Context: ", err.stack);
  res.status(500).json({ error: "A server-side critical error occurred. Please contact network administrator." });
});
