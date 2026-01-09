# Project Setup Guide

This guide will help you set up the backend project from scratch.

## Prerequisites

Before starting, make sure you have installed:
- **Node.js** (v20 or higher) - [Download](https://nodejs.org/)
- **MySQL** (v8.0 or higher) - [Download](https://dev.mysql.com/downloads/mysql/)
- **npm** or **yarn** (comes with Node.js)

## Step 1: Install Dependencies

Navigate to the backend directory and install all dependencies:

```bash
cd backend
npm install
```

This will install all required packages including:
- Fastify framework
- Prisma ORM
- Authentication libraries
- Validation libraries
- And more...

## Step 2: Set Up Database

1. **Create MySQL Database:**

```sql
CREATE DATABASE chatter_sales CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. **Configure Database Connection:**

Copy the environment example file:
```bash
cp env.example .env
```

Edit `.env` and update the `DATABASE_URL`:
```
DATABASE_URL="mysql://your_username:your_password@localhost:3306/chatter_sales?schema=public"
```

Replace:
- `your_username` with your MySQL username
- `your_password` with your MySQL password
- `localhost:3306` if your MySQL runs on a different host/port

## Step 3: Set Up Environment Variables

Edit `.env` file and configure all necessary variables:

- `JWT_SECRET` - Generate a strong random secret for JWT tokens
- Email configuration (for sending invitations)
- Application URLs
- Other settings as needed

**Generate a secure JWT secret:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## Step 4: Initialize Database Schema

1. **Generate Prisma Client:**
```bash
npm run prisma:generate
```

2. **Run Database Migrations:**
```bash
npm run prisma:migrate
```

This will create all database tables based on the Prisma schema.

3. **(Optional) Open Prisma Studio to view/edit data:**
```bash
npm run prisma:studio
```

## Step 5: Start Development Server

Start the development server with hot reload:

```bash
npm run dev
```

The server should start on `http://localhost:3000` (or the port you configured).

## Step 6: Verify Installation

1. **Health Check:**
   Open your browser or use curl:
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **API Documentation:**
   Open Swagger UI in your browser:
   ```
   http://localhost:3000/docs
   ```

## Next Steps

After successful setup:

1. **Create your first admin user** - You'll need to implement the user creation endpoint or use Prisma Studio to create an initial admin user.

2. **Implement API routes** - The project structure is set up, but routes need to be implemented:
   - Authentication routes (`/api/auth`)
   - Sales routes (`/api/sales`)
   - User management routes (`/api/users`)
   - Shift routes (`/api/shifts`)
   - Creator routes (`/api/creators`)
   - Dashboard routes (`/api/dashboard`)

3. **Test the API** - Use Swagger UI or tools like Postman to test endpoints.

## Troubleshooting

### Database Connection Issues

- Verify MySQL is running: `mysql -u your_username -p`
- Check the connection string format in `.env`
- Ensure the database exists: `SHOW DATABASES;`
- Check MySQL user permissions

### Port Already in Use

If port 3000 is already in use, change the `PORT` in `.env`:
```
PORT=3001
```

### Prisma Migration Issues

If migrations fail:
- Check database connection
- Verify Prisma schema syntax
- Try resetting: `npx prisma migrate reset` (⚠️ This will delete all data)

### Type Errors

If you see TypeScript errors:
- Run `npm run prisma:generate` to regenerate Prisma Client
- Ensure all dependencies are installed: `npm install`
- Check `tsconfig.json` configuration

## Project Structure Overview

```
backend/
├── src/
│   ├── config/          # Database configuration
│   ├── controllers/     # Route handlers (to be created)
│   ├── middleware/      # Auth, validation, error handling
│   ├── routes/          # API route definitions (to be created)
│   ├── services/        # Business logic
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── validations/     # Zod validation schemas
│   └── server.ts        # Server entry point
├── prisma/
│   └── schema.prisma    # Database schema
├── .env                 # Environment variables (create from env.example)
├── package.json
└── tsconfig.json
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint

## Development Tips

1. **Use Prisma Studio** for quick database inspections: `npm run prisma:studio`
2. **Check Swagger UI** for API documentation: `http://localhost:3000/docs`
3. **Watch logs** in the terminal for debugging
4. **Use TypeScript** - The project is fully typed for better development experience

## Support

If you encounter issues, check:
- Node.js and MySQL versions
- Environment variable configuration
- Database connection settings
- Error logs in the terminal

