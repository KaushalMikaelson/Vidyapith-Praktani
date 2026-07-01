import dotenv from 'dotenv';
import path from 'path';

// Load the correct env file:
//   development  →  .env.local  (demo defaults, no real credentials)
//   production   →  .env        (real credentials)
const isProduction = process.env.NODE_ENV === 'production';
const envFile = isProduction ? '.env' : '.env.local';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

console.log(`🔧 Environment: ${isProduction ? 'PRODUCTION' : 'LOCAL DEV'} (loaded: ${envFile})`);

import { app } from './app.js';

let PORT = 8000;
if (process.env.PORT) {
  const parsed = parseInt(process.env.PORT, 10);
  if (!isNaN(parsed) && parsed > 0) {
    PORT = parsed;
  }
}

app.listen(PORT, () => {
  console.log(`🏵️ Vidyapith Connect API Server running successfully on port ${PORT}`);
  console.log(`Endpoint Mapping: http://localhost:${PORT}/api/v1/*`);
});

