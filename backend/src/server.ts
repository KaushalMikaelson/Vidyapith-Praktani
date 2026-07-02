import dotenv from 'dotenv';
import path from 'path';

// Load env before importing the app tree. Several services read process.env at
// module initialization time, including browser push and email delivery.
const isProduction = process.env.NODE_ENV === 'production';
const envFile = isProduction ? '.env' : '.env.local';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'LOCAL DEV'} (loaded: ${envFile})`);

const { app } = await import('./app.js');

let PORT = 8000;
if (process.env.PORT) {
  const parsed = parseInt(process.env.PORT, 10);
  if (!Number.isNaN(parsed) && parsed > 0) {
    PORT = parsed;
  }
}

app.listen(PORT, () => {
  console.log(`Vidyapith Connect API Server running successfully on port ${PORT}`);
  console.log(`Endpoint Mapping: http://localhost:${PORT}/api/v1/*`);
});
