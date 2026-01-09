# 🚀 Quick Start Guide

Get up and running with the Chatter Sales Management Backend in minutes!

## Prerequisites

- **Node.js** v20 or higher
- **MySQL** v8.0 or higher
- **npm** or **yarn**

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

## Step 2: Configure Environment

Copy the environment example file:
```bash
cp env.example .env
```

Edit `.env` and configure:

```env
# Database - Update with your MySQL credentials
DATABASE_URL="mysql://username:password@localhost:3306/chatter_sales?schema=public"

# JWT Secret - Generate a secure random string
JWT_SECRET="your-super-secret-jwt-key-change-this"

# Email Configuration (for invitations)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@creatoradvisor.it

# Application URLs
FRONTEND_URL=http://localhost:5173
API_BASE_URL=http://localhost:3000
```

**Generate JWT Secret:**
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## Step 3: Create Database

Connect to MySQL and create the database:

```sql
CREATE DATABASE chatter_sales CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Step 4: Run Database Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations (creates all tables)
npm run prisma:migrate
```

## Step 5: Seed Initial Data

```bash
npm run prisma:seed
```

This creates:
- Admin user: `admin@creatoradvisor.it` / `admin123`
- Creator: MELISA (50% revenue share)
- Creator: BIANCA ($1000/month fixed salary)

**⚠️ Important:** Change the admin password after first login!

## Step 6: Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Step 7: Verify Installation

1. **Health Check:**
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **API Documentation:**
   Open in browser: `http://localhost:3000/docs`
   
   You can test the API directly from Swagger UI!

3. **Login Test:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@creatoradvisor.it","password":"admin123"}'
   ```

## 🎯 Next Steps

1. **Change Admin Password:**
   - Login with default credentials
   - Use `/api/auth/change-password` endpoint

2. **Create Users:**
   - Use `/api/users` (POST) to create new users
   - Users will receive invitation emails

3. **Start Using the API:**
   - Check `API_DOCUMENTATION.md` for complete endpoint reference
   - Use Swagger UI at `/docs` for interactive testing

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── middleware/      # Auth & validation
│   ├── validations/     # Zod schemas
│   └── utils/           # Utilities
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Seed data
└── .env                 # Environment variables
```

## 🔧 Available Scripts

```bash
npm run dev              # Start dev server (hot reload)
npm run build            # Build for production
npm start                # Start production server
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio (database GUI)
npm run prisma:seed      # Seed database
npm run type-check       # TypeScript type checking
npm run lint             # Run ESLint
```

## 🐛 Troubleshooting

### Database Connection Issues

- Verify MySQL is running: `mysql -u root -p`
- Check connection string in `.env`
- Ensure database exists: `SHOW DATABASES;`
- Check user permissions

### Port Already in Use

Change `PORT` in `.env`:
```env
PORT=3001
```

### Prisma Issues

```bash
# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Regenerate Prisma Client
npm run prisma:generate
```

### Type Errors

```bash
# Regenerate Prisma Client
npm run prisma:generate

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📚 Documentation

- **API_DOCUMENTATION.md** - Complete API reference
- **PROJECT_SETUP.md** - Detailed setup instructions
- **IMPLEMENTATION_COMPLETE.md** - Implementation overview
- **Swagger UI** - Interactive API docs at `/docs`

## 🔐 Default Credentials

**Admin User:**
- Email: `admin@creatoradvisor.it`
- Password: `admin123`

**⚠️ CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!**

## ✅ Verification Checklist

- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Database created
- [ ] Migrations run successfully
- [ ] Seed data loaded
- [ ] Server starts without errors
- [ ] Health check returns OK
- [ ] Swagger UI accessible
- [ ] Can login with admin credentials

## 🎉 You're Ready!

Your backend is now running and ready to use. Start building your frontend or test the API using Swagger UI!

---

**Need Help?** Check the documentation files or review the code comments for detailed explanations.

