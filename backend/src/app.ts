import express, { Application } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { activityRouter } from './routes/activities';
import { contentRouter } from './routes/content';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/activities', activityRouter);
app.use('/api/content', contentRouter);

export default app;
