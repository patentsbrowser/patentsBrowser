import express from 'express';
import cors from 'cors';
import organizationRoutes from './routes/organizationRoutes.js';
// ... other imports ...

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/organization', organizationRoutes);

// ... other routes and middleware ...

export default app; 