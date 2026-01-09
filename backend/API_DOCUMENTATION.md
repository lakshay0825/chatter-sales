# API Documentation

Complete API reference for the Chatter Sales Management System.

**Base URL:** `http://localhost:3000/api`

**Authentication:** Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication (`/api/auth`)

### POST `/api/auth/login`
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "userId": "user-id",
      "email": "user@example.com",
      "role": "CHATTER"
    }
  }
}
```

---

### POST `/api/auth/register`
Register/activate account with invitation token.

**Request:**
```json
{
  "token": "invitation-token",
  "password": "new-password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "userId": "user-id",
      "email": "user@example.com",
      "role": "CHATTER"
    }
  },
  "message": "Account activated successfully"
}
```

---

### GET `/api/auth/me`
Get current authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "user-id",
    "email": "user@example.com",
    "role": "CHATTER"
  }
}
```

---

### POST `/api/auth/change-password`
Change password for authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 👥 Users (`/api/users`)

All routes require authentication. Admin-only routes are marked.

### GET `/api/users`
Get all users (with optional filters).

**Query Parameters:**
- `role` (optional): `ADMIN | CHATTER_MANAGER | CHATTER`
- `isActive` (optional): `true | false`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-id",
      "email": "user@example.com",
      "name": "User Name",
      "role": "CHATTER",
      "avatar": null,
      "commissionPercent": 10,
      "fixedSalary": 0,
      "isActive": true,
      "emailVerified": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### GET `/api/users/:id`
Get user by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "CHATTER",
    "avatar": null,
    "commissionPercent": 10,
    "fixedSalary": 0,
    "isActive": true,
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### POST `/api/users` (Admin only)
Create and invite a new user.

**Request:**
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "role": "CHATTER",
  "commissionPercent": 10,
  "fixedSalary": 0
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "newuser@example.com",
    "name": "New User",
    "role": "CHATTER",
    "invitationToken": "token-here"
  },
  "message": "User created and invitation email sent"
}
```

---

### PUT `/api/users/:id` (Admin only)
Update user.

**Request:**
```json
{
  "name": "Updated Name",
  "role": "CHATTER_MANAGER",
  "commissionPercent": 15,
  "fixedSalary": 500,
  "isActive": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "Updated Name",
    "role": "CHATTER_MANAGER",
    "commissionPercent": 15,
    "fixedSalary": 500,
    "isActive": true,
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "User updated successfully"
}
```

---

### DELETE `/api/users/:id` (Admin only)
Delete user (soft delete).

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## 💰 Sales (`/api/sales`)

All routes require authentication. Permissions vary by role.

### GET `/api/sales`
Get sales with filters and pagination.

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `creatorId` (optional): Creator ID
- `saleType` (optional): `CAM | TIP | PPV | INITIAL | CUSTOM`
- `status` (optional): `ONLINE | OFFLINE`
- `userId` (optional): User ID (Managers/Admins only)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "sale-id",
        "amount": 100.50,
        "saleType": "CAM",
        "status": "ONLINE",
        "note": "Optional note",
        "saleDate": "2024-01-01T10:00:00.000Z",
        "createdAt": "2024-01-01T10:00:00.000Z",
        "user": {
          "id": "user-id",
          "name": "User Name",
          "email": "user@example.com"
        },
        "creator": {
          "id": "creator-id",
          "name": "Creator Name"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

### GET `/api/sales/export`
Export sales to CSV.

**Query Parameters:** Same as GET `/api/sales`

**Response:** CSV file download

---

### GET `/api/sales/:id`
Get sale by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "sale-id",
    "amount": 100.50,
    "saleType": "CAM",
    "status": "ONLINE",
    "note": "Note here",
    "saleDate": "2024-01-01T10:00:00.000Z",
    "user": {
      "id": "user-id",
      "name": "User Name",
      "email": "user@example.com"
    },
    "creator": {
      "id": "creator-id",
      "name": "Creator Name"
    }
  }
}
```

---

### POST `/api/sales`
Create a new sale.

**Request:**
```json
{
  "creatorId": "creator-id",
  "amount": 100.50,
  "saleType": "CAM",
  "note": "Optional note",
  "saleDate": "2024-01-01T10:00:00.000Z"
}
```

**Note:** `saleDate` is optional. If not provided, uses current time (ONLINE). If provided, marks as OFFLINE.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "sale-id",
    "amount": 100.50,
    "saleType": "CAM",
    "status": "ONLINE",
    "saleDate": "2024-01-01T10:00:00.000Z",
    "user": { ... },
    "creator": { ... }
  },
  "message": "Sale created successfully"
}
```

---

### PUT `/api/sales/:id`
Update sale.

**Permissions:**
- Chatters: Can only edit their own sales within 24 hours
- Managers/Admins: Can always edit any sale

**Request:**
```json
{
  "amount": 150.00,
  "saleType": "TIP",
  "note": "Updated note",
  "userId": "user-id"
}
```

**Note:** `userId` can only be changed by Managers/Admins (for reassigning sales).

**Response (200):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Sale updated successfully"
}
```

---

### DELETE `/api/sales/:id` (Manager/Admin only)
Delete sale.

**Response (200):**
```json
{
  "success": true,
  "message": "Sale deleted successfully"
}
```

---

## 📅 Shifts (`/api/shifts`)

All routes require authentication. View routes are accessible to all, modify routes require Manager/Admin.

### GET `/api/shifts`
Get shifts with filters.

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `userId` (optional): User ID

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "shift-id",
      "date": "2024-01-01T00:00:00.000Z",
      "startTime": "09:00",
      "endTime": "14:30",
      "user": {
        "id": "user-id",
        "name": "User Name",
        "email": "user@example.com",
        "avatar": null
      }
    }
  ]
}
```

---

### GET `/api/shifts/:id`
Get shift by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "shift-id",
    "date": "2024-01-01T00:00:00.000Z",
    "startTime": "09:00",
    "endTime": "14:30",
    "user": { ... }
  }
}
```

---

### POST `/api/shifts` (Manager/Admin only)
Create a new shift.

**Request:**
```json
{
  "userId": "user-id",
  "date": "2024-01-01",
  "startTime": "09:00",
  "endTime": "14:30"
}
```

**Valid times:** `09:00`, `14:30`, `20:00` (start) / `14:30`, `20:00`, `01:00` (end)

**Response (201):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Shift created successfully"
}
```

---

### PUT `/api/shifts/:id` (Manager/Admin only)
Update shift (for drag & drop).

**Request:**
```json
{
  "userId": "user-id",
  "date": "2024-01-02",
  "startTime": "14:30",
  "endTime": "20:00"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Shift updated successfully"
}
```

---

### DELETE `/api/shifts/:id` (Manager/Admin only)
Delete shift.

**Response (200):**
```json
{
  "success": true,
  "message": "Shift deleted successfully"
}
```

---

## 👤 Creators (`/api/creators`)

All routes require authentication. View routes accessible to all, modify routes require Admin.

### GET `/api/creators`
Get all creators.

**Query Parameters:**
- `isActive` (optional): `true | false`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "creator-id",
      "name": "Creator Name",
      "avatar": null,
      "compensationType": "PERCENTAGE",
      "revenueSharePercent": 50,
      "fixedSalaryCost": null,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### GET `/api/creators/:id`
Get creator by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "creator-id",
    "name": "Creator Name",
    "compensationType": "PERCENTAGE",
    "revenueSharePercent": 50,
    "isActive": true
  }
}
```

---

### POST `/api/creators` (Admin only)
Create a new creator.

**Request (Percentage):**
```json
{
  "name": "New Creator",
  "compensationType": "PERCENTAGE",
  "revenueSharePercent": 50
}
```

**Request (Salary):**
```json
{
  "name": "New Creator",
  "compensationType": "SALARY",
  "fixedSalaryCost": 1000
}
```

**Response (201):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Creator created successfully"
}
```

---

### PUT `/api/creators/:id` (Admin only)
Update creator.

**Request:**
```json
{
  "name": "Updated Name",
  "compensationType": "SALARY",
  "fixedSalaryCost": 1500,
  "isActive": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Creator updated successfully"
}
```

---

### DELETE `/api/creators/:id` (Admin only)
Delete creator (soft delete).

**Response (200):**
```json
{
  "success": true,
  "message": "Creator deleted successfully"
}
```

---

## 📊 Dashboard (`/api/dashboard`)

All routes require authentication.

### GET `/api/dashboard/chatter`
Get chatter dashboard (monthly performance).

**Query Parameters:**
- `userId` (optional): User ID (defaults to current user, chatters can only see their own)
- `month` (optional, default: current month): 1-12
- `year` (optional, default: current year)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "salesChartData": [
      { "date": "2024-01-01", "amount": 500.00 },
      { "date": "2024-01-02", "amount": 750.00 }
    ],
    "commissionsChartData": [
      { "date": "2024-01-01", "amount": 50.00 },
      { "date": "2024-01-02", "amount": 75.00 }
    ],
    "totalSales": 5000.00,
    "totalCommissions": 500.00,
    "user": {
      "id": "user-id",
      "name": "User Name",
      "commissionPercent": 10,
      "fixedSalary": 0
    }
  }
}
```

---

### GET `/api/dashboard/admin` (Admin only)
Get admin recap dashboard.

**Query Parameters:**
- `month` (optional, default: current month): 1-12
- `year` (optional, default: current year)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "month": 1,
    "year": 2024,
    "chatterRevenue": [
      {
        "chatterId": "user-id",
        "chatterName": "User Name",
        "revenue": 5000.00,
        "commission": 500.00
      }
    ],
    "totalCommissions": 1500.00,
    "creatorFinancials": [
      {
        "creatorId": "creator-id",
        "creatorName": "Creator Name",
        "compensationType": "PERCENTAGE",
        "revenueSharePercent": 50,
        "grossRevenue": 10000.00,
        "creatorEarnings": 5000.00,
        "marketingCosts": 500.00,
        "toolCosts": 200.00,
        "otherCosts": 100.00,
        "netRevenue": 4200.00
      }
    ]
  }
}
```

---

### GET `/api/dashboard/sales-stats`
Get sales statistics.

**Query Parameters:**
- `month` (optional, default: current month): 1-12
- `year` (optional, default: current year)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalSales": 150,
    "totalAmount": 15000.00,
    "byType": [
      {
        "type": "CAM",
        "count": 50,
        "amount": 5000.00
      },
      {
        "type": "TIP",
        "count": 100,
        "amount": 10000.00
      }
    ],
    "byStatus": [
      {
        "status": "ONLINE",
        "count": 120,
        "amount": 12000.00
      },
      {
        "status": "OFFLINE",
        "count": 30,
        "amount": 3000.00
      }
    ]
  }
}
```

---

## 💵 Monthly Financials (`/api/monthly-financials`)

All routes require authentication. Modify routes require Admin.

### GET `/api/monthly-financials`
Get all monthly financials with filters.

**Query Parameters:**
- `creatorId` (optional): Creator ID
- `year` (optional): Year
- `month` (optional): 1-12

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "financial-id",
      "year": 2024,
      "month": 1,
      "grossRevenue": 10000.00,
      "marketingCosts": 500.00,
      "toolCosts": 200.00,
      "otherCosts": 100.00,
      "creator": {
        "id": "creator-id",
        "name": "Creator Name",
        "compensationType": "PERCENTAGE",
        "revenueSharePercent": 50
      }
    }
  ]
}
```

---

### GET `/api/monthly-financials/:creatorId/:year/:month`
Get monthly financial for specific creator, year, and month.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "financial-id",
    "year": 2024,
    "month": 1,
    "grossRevenue": 10000.00,
    "marketingCosts": 500.00,
    "toolCosts": 200.00,
    "otherCosts": 100.00,
    "creator": { ... }
  }
}
```

**Note:** Returns default structure (all zeros) if not found.

---

### PUT `/api/monthly-financials/:creatorId/:year/:month` (Admin only)
Create or update monthly financial data.

**Request:**
```json
{
  "grossRevenue": 10000.00,
  "marketingCosts": 500.00,
  "toolCosts": 200.00,
  "otherCosts": 100.00
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Monthly financial data saved successfully"
}
```

---

## ❌ Error Responses

All endpoints may return error responses in the following format:

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "path": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Resource not found"
}
```

**409 Conflict:**
```json
{
  "success": false,
  "error": "A record with this value already exists"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## 📚 Interactive API Documentation

For interactive API documentation, visit:
- **Swagger UI:** `http://localhost:3000/docs`

The Swagger UI provides:
- Interactive API testing
- Request/response examples
- Schema definitions
- Authentication testing

---

## 🔐 Role-Based Permissions Summary

### ADMIN
- Full access to all endpoints
- Can manage users, creators, monthly financials
- Can view all data and statistics

### CHATTER_MANAGER
- Can view all sales and reports
- Can edit/delete any sale
- Can manage shifts
- Cannot manage users or creators
- Cannot view commission percentages

### CHATTER
- Can only view/edit their own sales (within 24 hours)
- Can view shifts (read-only)
- Can view their own dashboard
- Cannot view other chatters' data

---

**Last Updated:** 2024
**API Version:** 1.0.0

