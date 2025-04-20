// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bodyParser from 'body-parser';
import routes from './routes/index';

const { PORT: port } = process.env;
const app = express();

app.use(bodyParser.json());
app.use(routes);
app.listen(port, () => {
  console.log(`Transform text integration listening on port ${port}`);
});

export default app;
