# Chatter Manager Permissions Documentation

## ✅ Capabilities

### 1. Sales Management
- ✅ **View all sales**: Can view sales and reports for all chatters
- ✅ **Add sales**: Can insert new sales (same as all users)
- ✅ **Edit any sale**: Can edit any sale (amount, sale type, creator, timestamp)
  - No 24-hour restriction (unlike chatters)
  - Implemented via `canEditSale()` utility
- ✅ **Reassign sales**: Can reassign sales to different chatters
  - Implemented via `canReassignSales()` utility
  - Dropdown visible in EditSaleModal for managers

### 2. Shift Management
- ✅ **Modify shifts**: Can drag & drop chatters between shifts
  - Implemented via `canModifyShifts()` utility
  - Drag & drop enabled in ShiftsPage
- ✅ **Daily switches**: Can make daily shift adjustments
- ✅ **Monthly calendar**: Can adjust monthly calendar view

### 3. Dashboard Access
- ✅ **Own dashboard**: Can view their own performance dashboard
- ✅ **All sales data**: Can see all sales in Sales Report page

## ❌ Restrictions (Enforced)

### 1. User Management
- ❌ **Cannot invite users**: Users page is admin-only (`canManageChatters()`)
- ❌ **Cannot remove users**: Users page is admin-only
- ❌ **Cannot change commission percentages**: Users page is admin-only
- ❌ **Cannot change fixed salaries**: Users page is admin-only
- ❌ **Cannot see other chatters' commission percentages**: 
  - Commission percentages only displayed in UsersPage (admin-only)
  - Dashboard shows only own commission
  - Settings page shows only own profile (no commission info)

### 2. Creator Management
- ❌ **Cannot manage creators**: Creators page is admin-only (`canManageCreators()`)

### 3. Commission Viewing
- ❌ **Cannot view others' commissions**: 
  - `canViewOthersCommissions()` returns false for managers
  - Admin dashboard is admin-only
  - Chatter dashboard shows only own commission

## 📍 Implementation Details

### Permission Functions (`frontend/src/utils/permissions.ts`)

```typescript
// Managers can edit any sale
canEditSale(user, saleUserId, saleDate) // Returns true for managers

// Managers can reassign sales
canReassignSales(user) // Returns true for managers

// Managers can modify shifts
canModifyShifts(user) // Returns true for managers

// Managers CANNOT view others' commissions
canViewOthersCommissions(user) // Returns false for managers (admin only)

// Managers CANNOT manage users
canManageChatters(user) // Returns false for managers (admin only)

// Managers CANNOT manage creators
canManageCreators(user) // Returns false for managers (admin only)
```

### Page Access

- **Dashboard** (`/dashboard`): ✅ Accessible - Shows own data only
- **Sales Report** (`/sales`): ✅ Accessible - Shows all sales
- **Shifts** (`/shifts`): ✅ Accessible - Can modify (drag & drop)
- **Users** (`/users`): ❌ Admin only - Redirects if accessed
- **Creators** (`/creators`): ❌ Admin only - Redirects if accessed
- **Admin Dashboard** (`/admin`): ❌ Admin only - Redirects if accessed
- **Settings** (`/settings`): ✅ Accessible - Own profile only

### Backend Enforcement

All permissions are also enforced on the backend for security. The frontend restrictions provide better UX by hiding unavailable features.

## 🔐 Security Notes

1. **Double Protection**: Both frontend and backend enforce permissions
2. **Commission Privacy**: Managers cannot access commission percentage data
3. **User Management**: Users page completely inaccessible to managers
4. **Creator Management**: Creators page completely inaccessible to managers

---

**Status**: ✅ All Chatter Manager permissions correctly implemented and enforced

