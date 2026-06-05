import 'dotenv/config';
import { app } from './app.js';

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`🏵️ Vidyapith Connect API Server running successfully on port ${PORT}`);
  console.log(`Endpoint Mapping: http://localhost:${PORT}/api/v1/*`);
});
