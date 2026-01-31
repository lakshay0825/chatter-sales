# Troubleshooting Guide

Common issues and solutions for the Chatter Sales Management Backend.

## 🔴 Prisma Client: "Invalid or unexpected token" (SyntaxError in default.js)

### Error:
```
SyntaxError: Invalid or unexpected token
    at Object.<anonymous> (backend\node_modules\.prisma\client\default.js:2:6)
```

### Cause:
The generated Prisma client in `node_modules/.prisma/client/` is corrupted or incomplete (e.g. `default.js` is empty or truncated).

### Solution:

1. **Stop the dev server** (Ctrl+C in the terminal where `npm run dev` is running).
2. In the **backend** folder, regenerate the Prisma client:
   ```bash
   npx prisma generate
   ```
3. If you see **`spawn EPERM`**: close other terminals/IDEs using this project, then run the same command again. If it still fails, try:
   - Running your terminal **as Administrator**, or
   - Temporarily excluding `backend\node_modules\.prisma` from Windows Defender/antivirus, then run `npx prisma generate` again.
4. Start the dev server again:
   ```bash
   npm run dev
   ```

If the problem persists, remove the generated client and reinstall:
```bash
cd backend
Remove-Item -Recurse -Force node_modules\.prisma
npx prisma generate
```

---

## 🔴 MySQL Authentication Plugin Error

### Error:
```
Error querying the database: Unknown authentication plugin 'sha256_password'
```

### Solution:

This happens because MySQL 8.0+ uses `caching_sha2_password` by default, but Prisma may need `mysql_native_password`.

**Option 1: Change MySQL User Authentication Plugin (Recommended)**

1. Connect to MySQL as root:
```bash
mysql -u root -p
```

2. Check current authentication plugin:
```sql
SELECT user, host, plugin FROM mysql.user WHERE user = 'your_username';
```

3. Change authentication plugin to `mysql_native_password`:
```sql
ALTER USER 'your_username'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

4. Verify the change:
```sql
SELECT user, host, plugin FROM mysql.user WHERE user = 'your_username';
```

5. Try Prisma migration again:
```bash
npm run prisma:migrate
```

**Option 2: Create New User with Native Password**

If you're creating a new database user:

```sql
CREATE USER 'chatter_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
GRANT ALL PRIVILEGES ON chatter_sales.* TO 'chatter_user'@'localhost';
FLUSH PRIVILEGES;
```

Then update your `.env`:
```env
DATABASE_URL="mysql://chatter_user:your_password@localhost:3306/chatter_sales?schema=public"
```

**Option 3: Update Connection String**

Add `?authPlugins=mysql_native_password` to your connection string:

```env
DATABASE_URL="mysql://username:password@localhost:3306/chatter_sales?schema=public&authPlugins=mysql_native_password"
```

---

## 🔴 Port Already in Use

### Error:
```
Error: listen EADDRINUSE: address already in use :::3000
```

### Solution:

**Option 1: Change Port**
Edit `.env`:
```env
PORT=3001
```

**Option 2: Kill Process Using Port**

Windows PowerShell:
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

Linux/Mac:
```bash
lsof -ti:3000 | xargs kill -9
```

---

## 🔴 Prisma Client Not Generated

### Error:
```
Cannot find module '@prisma/client'
```

### Solution:

```bash
npm run prisma:generate
```

If that doesn't work:
```bash
rm -rf node_modules/.prisma
npm run prisma:generate
```

---

## 🔴 Database Connection Refused

### Error:
```
Can't reach database server at 'localhost:3306'
```

### Solution:

1. **Check if MySQL is running:**
   ```bash
   # Windows
   services.msc
   # Look for MySQL service and start it
   
   # Linux
   sudo systemctl status mysql
   sudo systemctl start mysql
   
   # Mac
   brew services list
   brew services start mysql
   ```

2. **Verify connection:**
   ```bash
   mysql -u root -p -h localhost -P 3306
   ```

3. **Check firewall settings** (if using remote database)

---

## 🔴 Migration Errors

### Error:
```
Migration failed to apply
```

### Solution:

**Option 1: Reset Database (⚠️ Deletes all data)**
```bash
npx prisma migrate reset
```

**Option 2: Create Fresh Migration**
```bash
npx prisma migrate dev --name init
```

**Option 3: Check for Existing Tables**
```sql
SHOW TABLES;
```
If tables exist, you may need to drop them first or use `prisma migrate deploy` instead.

---

## 🔴 TypeScript Errors

### Error:
```
Cannot find module '@prisma/client'
```

### Solution:

1. Generate Prisma Client:
   ```bash
   npm run prisma:generate
   ```

2. Restart TypeScript server in your IDE

3. If still failing:
   ```bash
   rm -rf node_modules
   npm install
   npm run prisma:generate
   ```

---

## 🔴 JWT Secret Not Set

### Error:
```
JWT secret is required
```

### Solution:

1. Generate a secure JWT secret:
   ```bash
   # Linux/Mac
   openssl rand -base64 32
   
   # Windows PowerShell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
   ```

2. Add to `.env`:
   ```env
   JWT_SECRET=your-generated-secret-here
   ```

---

## 🔴 Email Not Sending

### Error:
Email invitations not being sent

### Solution:

1. **Check email configuration in `.env`:**
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password  # Not regular password!
   ```

2. **For Gmail:**
   - Enable 2-factor authentication
   - Generate an "App Password" (not your regular password)
   - Use the app password in `EMAIL_PASS`

3. **Test email configuration:**
   The email service will log errors if configuration is wrong. Check server logs.

---

## 🔴 CORS Errors (Frontend)

### Error:
```
Access to fetch at 'http://localhost:3000/api/...' from origin 'http://localhost:5173' has been blocked by CORS policy
```

### Solution:

1. **Check `FRONTEND_URL` in `.env`:**
   ```env
   FRONTEND_URL=http://localhost:5173
   ```

2. **Restart the server** after changing `.env`

3. **For production**, update to your actual frontend URL:
   ```env
   FRONTEND_URL=https://app.creatoradvisor.it
   ```

---

## 🔴 Prisma Studio Not Opening

### Error:
```
Error: Could not find a production build
```

### Solution:

```bash
npm run prisma:generate
npm run prisma:studio
```

---

## 🔴 Module Not Found Errors

### Error:
```
Cannot find module 'fastify' or its corresponding type declarations
```

### Solution:

This usually means dependencies aren't installed:

```bash
npm install
```

If that doesn't work:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 🔴 Database Already Exists Error

### Error:
```
Database 'chatter_sales' already exists
```

### Solution:

**Option 1: Use existing database**
Just run migrations:
```bash
npm run prisma:migrate
```

**Option 2: Drop and recreate**
```sql
DROP DATABASE chatter_sales;
CREATE DATABASE chatter_sales CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 🔴 Permission Denied Errors

### Error:
```
Access denied for user 'username'@'localhost'
```

### Solution:

1. **Grant proper permissions:**
   ```sql
   GRANT ALL PRIVILEGES ON chatter_sales.* TO 'username'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Check user exists:**
   ```sql
   SELECT user, host FROM mysql.user;
   ```

---

## 📞 Getting More Help

1. **Check server logs** - They usually contain detailed error messages
2. **Check Prisma logs** - Run with `DEBUG=* npm run prisma:migrate`
3. **Verify environment variables** - Make sure `.env` is properly configured
4. **Check MySQL version** - `mysql --version`
5. **Check Node.js version** - `node --version` (should be v20+)

---

## ✅ Verification Checklist

If you're having issues, verify:

- [ ] MySQL is running
- [ ] Database exists
- [ ] User has proper permissions
- [ ] `.env` file is configured correctly
- [ ] Dependencies are installed (`npm install`)
- [ ] Prisma Client is generated (`npm run prisma:generate`)
- [ ] Port 3000 is available (or change PORT in `.env`)
- [ ] Node.js version is 20 or higher

---

**Last Updated:** 2024

