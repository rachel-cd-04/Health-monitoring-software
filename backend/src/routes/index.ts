import type { Express } from 'express';
import assistantRoutes from './assistant.routes.js';
import astronautsRoutes from './astronauts.routes.js';
import alertsRoutes from './alerts.routes.js';
import authRoutes from './auth.routes.js';
import crewRoutes from './crew.routes.js';
import emergencyRoutes from './emergency.routes.js';
import healthRoutes from './health.routes.js';
import radiationRoutes from './radiation.routes.js';
import sourcesRoutes from './sources.routes.js';

export function registerRoutes(app: Express) {
  app.use(healthRoutes);
  app.use('/api', authRoutes);
  app.use('/api', astronautsRoutes);
  app.use('/api', crewRoutes);
  app.use('/api', alertsRoutes);
  app.use('/api', emergencyRoutes);
  app.use('/api', radiationRoutes);
  app.use('/api', sourcesRoutes);
  app.use('/api', assistantRoutes);
}
