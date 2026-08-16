import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { seedDatabase } from './db/seed';

export async function bootstrap(port = 3000) {
  try {
    await seedDatabase();
  } catch (err: any) {
    console.warn('⚠️ Seed warning:', err?.message || err);
  }

  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.use(express.json());
  expressApp.use(express.urlencoded({ extended: true }));

  // Vite Middleware in Dev & Static Serving in Prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    expressApp.use((req, res, next) => {
      if (req.url.startsWith('/api')) {
        next();
      } else {
        vite.middlewares(req, res, next);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    expressApp.use((req, res, next) => {
      if (req.url.startsWith('/api')) {
        next();
      } else {
        express.static(distPath)(req, res, next);
      }
    });

    // Add a catch-all for SPA in production for non-api routes
    expressApp.use((req, res, next) => {
      if (!req.url.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
      } else {
        next();
      }
    });
  }

  await app.listen(port, '0.0.0.0');
  console.log(`Saman NestJS Server running on http://0.0.0.0:${port}`);
  return app;
}
