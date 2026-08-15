import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getSqliteDb } from './db/sqlite-db';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';

export async function bootstrap(port = 3000) {
  // Initialize SQLite database
  await getSqliteDb();
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
    expressApp.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    expressApp.use(express.static(distPath));
  }

  await app.listen(port, '0.0.0.0');
  console.log(`Saman NestJS Server running on http://0.0.0.0:${port}`);
  return app;
}
