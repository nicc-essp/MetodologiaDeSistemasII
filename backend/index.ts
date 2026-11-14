import { createApp } from './app';
import { parsearOrigenes } from './config/app.config';

const port = 3001;
const allowedOrigins = parsearOrigenes(process.env.CORS_ORIGINS);
createApp({ allowedOrigins }).listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
