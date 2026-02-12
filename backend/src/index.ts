import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { employeeRouter } from './routes/employee';
import { payrollRouter } from './routes/payroll';
import { logRouter } from './routes/log';
import { trafficFineRouter } from './routes/trafficFine';
import { overtimeRouter } from './routes/overtime';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/employees', employeeRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/traffic-fines', trafficFineRouter);
app.use('/api/overtime', overtimeRouter);
app.use('/api/logs', logRouter);

// Error handling
app.use(errorHandler);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
