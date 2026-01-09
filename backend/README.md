# Chatter Sales Management Backend API

Backend API for OnlyFans Agency Sales & Shift Management System built with Fastify, Prisma, and MySQL.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp env.example .env
# Edit .env with your database credentials

# Set up database
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# Start development server
npm run dev
```

See [QUICK_START.md](./QUICK_START.md) for detailed setup instructions.

## 📋 Tech Stack

- **Runtime:** Node.js (v20+)
- **Framework:** Fastify
- **Database:** MySQL
- **ORM:** Prisma
- **Authentication:** JWT tokens
- **Validation:** Zod
- **API Documentation:** OpenAPI/Swagger UI
- **Language:** TypeScript

## 📚 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Get started in minutes
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API reference
- **[PROJECT_SETUP.md](./PROJECT_SETUP.md)** - Detailed setup guide
- **[IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)** - Implementation overview
- **[ADDITIONAL_FEATURES.md](./ADDITIONAL_FEATURES.md)** - Additional features
- **Swagger UI:** `http://localhost:3000/docs` (when server is running)

## 🔑 API Endpoints

### Authentication (`/api/auth`)
- `POST /login` - Login
- `POST /register` - Register with invitation token
- `GET /me` - Get current user
- `POST /change-password` - Change password

### Users (`/api/users`)
- `GET /` - List users
- `GET /:id` - Get user
- `POST /` - Create user (Admin)
- `PUT /:id` - Update user (Admin)
- `DELETE /:id` - Delete user (Admin)

### Sales (`/api/sales`)
- `GET /` - List sales (with filters & pagination)
- `GET /export` - Export to CSV
- `GET /:id` - Get sale
- `POST /` - Create sale
- `PUT /:id` - Update sale
- `DELETE /:id` - Delete sale (Manager/Admin)

### Shifts (`/api/shifts`)
- `GET /` - List shifts
- `GET /:id` - Get shift
- `POST /` - Create shift (Manager/Admin)
- `PUT /:id` - Update shift (Manager/Admin)
- `DELETE /:id` - Delete shift (Manager/Admin)

### Creators (`/api/creators`)
- `GET /` - List creators
- `GET /:id` - Get creator
- `POST /` - Create creator (Admin)
- `PUT /:id` - Update creator (Admin)
- `DELETE /:id` - Delete creator (Admin)

### Dashboard (`/api/dashboard`)
- `GET /chatter` - Chatter dashboard
- `GET /admin` - Admin dashboard (Admin only)
- `GET /sales-stats` - Sales statistics

### Monthly Financials (`/api/monthly-financials`)
- `GET /` - List monthly financials
- `GET /:creatorId/:year/:month` - Get specific monthly financial
- `PUT /:creatorId/:year/:month` - Create/update (Admin)

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 👥 Roles & Permissions

- **ADMIN:** Full access to all features
- **CHATTER_MANAGER:** Can manage sales, shifts, view all data (except commission percentages)
- **CHATTER:** Can only view/edit their own sales (within 24 hours), view shifts (read-only)

## 📦 Available Scripts

```bash
npm run dev              # Start development server with hot reload
npm run build            # Build for production
npm start                # Start production server
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio (database GUI)
npm run prisma:seed      # Seed database with initial data
npm run type-check       # Run TypeScript type checking
npm run lint             # Run ESLint
```

## 🗄️ Database Schema

The application uses the following main models:
- **User** - Users with roles (Admin, Chatter Manager, Chatter)
- **Creator** - OnlyFans creators with compensation models
- **Sale** - Sales entries with types, status, timestamps
- **Shift** - Work shifts with time slots
- **MonthlyFinancial** - Monthly financial data per creator

See `prisma/schema.prisma` for full schema definition.

## 🔧 Environment Variables

Required environment variables (see `env.example`):

- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `FRONTEND_URL` - Frontend URL for CORS
- Email configuration (for invitations)

## 🎯 Features

- ✅ JWT-based authentication
- ✅ Role-based access control (RBAC)
- ✅ Request validation with Zod
- ✅ Error handling
- ✅ Commission calculations
- ✅ Timezone handling (Italian timezone)
- ✅ Email notifications (invitations)
- ✅ CSV export
- ✅ Pagination
- ✅ Soft deletes
- ✅ Comprehensive API documentation (Swagger)

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, validation, error handling
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── validations/     # Zod validation schemas
│   └── server.ts        # Server entry point
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Database seed script
├── .env                 # Environment variables (create from env.example)
├── package.json
└── tsconfig.json
```

## 🧪 Testing

You can test the API using:
- **Swagger UI** at `/docs` - Interactive API documentation
- **Postman** - Import the OpenAPI schema
- **curl** - Command-line testing
- **Frontend** - React.js application

## 🔒 Security Features

- JWT-based authentication
- Password hashing (bcrypt)
- CORS configuration
- Input validation
- SQL injection protection (Prisma)
- Role-based authorization

## 📝 Default Credentials

After running the seed script:

- **Email:** `admin@creatoradvisor.it`
- **Password:** `admin123`

**⚠️ Change this password immediately after first login!**

## 🤝 Contributing

This is a private project. Please follow the coding standards and update documentation when making changes.

## 📄 License

ISC

---

**Status:** ✅ Production Ready

For detailed API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

For setup instructions, see [QUICK_START.md](./QUICK_START.md)
