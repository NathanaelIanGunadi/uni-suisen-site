import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes';
import submissionRoutes from './routes/submissionRoutes';
import reviewRoutes from './routes/reviewRoutes';
import { apiRoutes } from './routes/apiRoutes';

dotenv.config();

const app: Application = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/reviews', reviewRoutes);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

apiRoutes(app);

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
