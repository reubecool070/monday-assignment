// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bodyParser from 'body-parser';
import routes from './routes/index';
import { connectToDatabase } from './services/db-service';

const { PORT: port } = process.env;
const app = express();

// Initialize MongoDB connection
connectToDatabase()
  .then(() => {
    console.log('MongoDB connection established');
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
  });

app.use(bodyParser.json());
app.use(routes);
app.listen(port, () => {
  console.log(`Transform text integration listening on port ${port}`);
});

export default app;
