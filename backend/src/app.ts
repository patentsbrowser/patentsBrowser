import express from 'express';
import cors from 'cors';
import proxyRoutes from './routes/proxyRoutes';
// ... other imports ...

const app = express();

app.use(cors());
app.use(express.json());

// Add proxy routes
app.use('/api/proxy', proxyRoutes);

// ... other routes and middleware ...

export default app; 