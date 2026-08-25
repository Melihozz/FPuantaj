// .env EN BAŞTA yüklenmeli: aşağıdaki modüller (auth.service, payroll.config)
// import edildikleri anda process.env'i okuyor.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { employeeRouter } from './routes/employee';
import { payrollRouter } from './routes/payroll';
import { logRouter } from './routes/log';
import { trafficFineRouter } from './routes/trafficFine';
import { overtimeRouter } from './routes/overtime';
import { configRouter } from './routes/config';
import { categoryRouter } from './routes/category';
import { errorHandler, AppError } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

// İzin verilen origin'ler: CORS_ORIGIN env'i (virgülle ayrılmış).
// Tanımsızsa local dev adresleri kullanılır.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // origin yoksa istek same-origin veya tarayıcı dışı (curl, health check) demektir
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      // AppError ile: 500 + stack trace yerine anlamlı 403
      callback(new AppError(403, 'CORS_NOT_ALLOWED', `CORS: ${origin} izinli değil`));
    },
    credentials: true,
  })
);
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/employees', employeeRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/traffic-fines', trafficFineRouter);
app.use('/api/overtime', overtimeRouter);
app.use('/api/logs', logRouter);
app.use('/api/config', configRouter);
app.use('/api/categories', categoryRouter);

// 404 - tanımsız route'lar
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    code: 'NOT_FOUND',
    message: 'Endpoint bulunamadı',
  });
});

// Error handling (en sonda olmalı)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
