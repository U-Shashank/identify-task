import express, { Request, Response } from 'express';
import 'dotenv/config';

import identifyRouter from './routers/identifyRouter';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/api', (req: Request, res: Response) => {
    res.send('Welcome to the Contact Identification API');
});

app.use('/api/identify', identifyRouter);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});