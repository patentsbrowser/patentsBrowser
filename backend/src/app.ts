import express from 'express';
import cors from 'cors';
// ... other imports ...

const app = express();

app.use(cors());
app.use(express.json());


// ... other routes and middleware ...

export default app; 