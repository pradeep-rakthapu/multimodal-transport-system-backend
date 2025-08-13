import app from './src/app.js';
import { connectDB } from './src/config/db.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, '0.0.0.0',() => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
};

startServer();
