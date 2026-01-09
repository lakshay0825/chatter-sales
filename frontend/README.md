# Chatter Sales Management - Frontend

React.js frontend application for the OnlyFans Agency Sales & Shift Management System.

## 🚀 Quick Start

### Prerequisites

- Node.js v18 or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── store/           # State management (Zustand)
│   ├── types/           # TypeScript types
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── package.json
└── vite.config.ts       # Vite configuration
```

## 🛠️ Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Routing
- **Zustand** - State management
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Recharts** - Charts
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=Chatter Sales Management
```

## 🔐 Authentication

The app uses JWT tokens stored in localStorage. The authentication state is managed with Zustand and persisted.

## 📱 Features

- ✅ User authentication (Login/Logout)
- ✅ Protected routes
- ✅ Role-based navigation
- ✅ Responsive design
- ✅ API integration ready
- ✅ Form validation
- ✅ Toast notifications

## 🎨 Styling

The project uses Tailwind CSS for styling. Custom components are defined in `src/index.css`.

## 🔗 API Integration

API calls are made through services in `src/services/`. The base API client is configured in `src/services/api.ts` with automatic token injection and error handling.

## 📚 Next Steps

1. Implement dashboard with charts
2. Build sales management interface
3. Create shift calendar component
4. Implement user management
5. Add creator management
6. Build admin dashboard

## 🤝 Development

The frontend is configured to proxy API requests to `http://localhost:3000` during development. Make sure the backend server is running.

---

**Status:** 🚧 In Development

