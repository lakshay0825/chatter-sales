# Frontend Quick Start Guide

Get the React frontend up and running in minutes!

## 🚀 Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file
cp env.example .env

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 📝 Environment Setup

The `.env` file is already configured with defaults. If you need to change the API URL:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=Chatter Sales Management
```

## 🔑 Default Login

After seeding the backend database, you can login with:

- **Email:** `admin@creatoradvisor.it`
- **Password:** `admin123`

⚠️ **Change the password after first login!**

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── Header.tsx   # Top navigation bar
│   │   ├── Sidebar.tsx  # Side navigation
│   │   ├── Layout.tsx   # Main layout wrapper
│   │   └── ProtectedRoute.tsx  # Route protection
│   ├── pages/           # Page components
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── SalesPage.tsx
│   │   ├── ShiftsPage.tsx
│   │   ├── UsersPage.tsx
│   │   ├── CreatorsPage.tsx
│   │   └── AdminDashboardPage.tsx
│   ├── services/        # API service layer
│   │   ├── api.ts       # Axios instance
│   │   └── auth.service.ts  # Auth API calls
│   ├── store/           # State management (Zustand)
│   │   └── authStore.ts # Authentication state
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles (Tailwind)
└── package.json
```

## ✅ What's Implemented

- ✅ Project structure and configuration
- ✅ Authentication system (Login/Logout)
- ✅ Protected routes
- ✅ Role-based navigation
- ✅ API client setup with token injection
- ✅ State management (Zustand)
- ✅ Routing (React Router)
- ✅ Form validation (React Hook Form + Zod)
- ✅ Toast notifications
- ✅ Responsive layout
- ✅ Tailwind CSS styling

## 🎯 Next Steps

The following pages need implementation:

1. **Dashboard Page** - Show chatter performance metrics and charts
2. **Sales Page** - Sales list, filters, create/edit forms
3. **Shifts Page** - Calendar view with drag & drop
4. **Users Page** - User list, create/invite users
5. **Creators Page** - Creator management
6. **Admin Dashboard** - Financial overview and reports

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🌐 API Integration

The frontend is configured to:
- Proxy API requests to `http://localhost:3000/api` during development
- Automatically inject JWT tokens in request headers
- Handle 401 errors and redirect to login
- Show toast notifications for errors

## 🎨 Styling

- **Tailwind CSS** for utility-first styling
- **Custom components** defined in `src/index.css`
- **Responsive design** with mobile support
- **Dark mode ready** (can be added later)

## 📚 Documentation

- Check `README.md` for more details
- API endpoints are documented in `../backend/API_DOCUMENTATION.md`

---

**Ready to develop!** 🎉

