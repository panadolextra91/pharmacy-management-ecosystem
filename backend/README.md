# Pharmacy Management System - Backend API

Backend API for the Pharmacy Management System built with Node.js, Express, TypeScript, Prisma, and PostgreSQL.

## Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Docker services:**
   ```bash
   docker-compose up -d
   ```

4. **Run Prisma migrations:**
   ```bash
   npm run prisma:migrate
   ```

5. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

6. **Start development server:**
   ```bash
   npm run dev
   ```

## Project Structure

```
backend/
├── src/
│   ├── modules/          # Domain modules
│   ├── shared/            # Shared utilities, middleware, config
│   ├── workers/           # Background job workers
│   └── server.ts          # Express app entry point
├── prisma/
│   └── schema.prisma      # Database schema
└── docker-compose.yml     # Docker services
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm test` - Run tests

## API Documentation

API documentation will be available at `/api/docs` (Swagger) once implemented.

## Environment Variables

See `.env.example` for required environment variables.

## Database

The database uses PostgreSQL with Prisma ORM. All migrations are stored in `prisma/migrations/`.

## License

ISC

