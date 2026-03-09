# Okolea Platform - Landing Pages Roadmap

> Comprehensive guide to all landing pages based on user roles and verification status

---

## Overview

The Okolea platform handles multiple user states that determine what users see when they land on the application. This roadmap documents all possible landing pages based on:

- **Authentication status** (logged in vs not logged in)
- **User role** (BORROWER vs ADMIN)
- **KYC verification status** (PENDING, SUBMITTED, VERIFIED, REJECTED)
- **Account status** (active vs suspended)

---

## User States Matrix

| State | Authentication | Role | KYC Status | Account Status |
|-------|---------------|------|------------|----------------|
| A | Not logged in | - | - | - |
| B | Logged in | ADMIN | Any | Active |
| C | Logged in | BORROWER | VERIFIED | Active |
| D | Logged in | BORROWER | SUBMITTED | Active |
| E | Logged in | BORROWER | PENDING | Active |
| F | Logged in | BORROWER | REJECTED | Active |
| G | Logged in | BORROWER | Any | Suspended |

---

## Landing Pages Detail

### State A: Not Logged In (Unauthenticated User)

**Landing Page:** [`/`](/) (Marketing/Home Page)

```
Landing Page: `/` (Marketing/Home Page)
├── Hero section with platform overview
├── Features (9-Day Loans, Secure & Safe, 25K+ Customers, 4% Interest)
├── Call-to-action buttons: [Login] [Register]
└── Footer with links, terms, privacy
```

**Alternative Routes:**
- [`/login`](/login) - Login form
- [`/register`](/register) - Registration form

---

### State B: Logged In as ADMIN (Any KYC Status)

**Landing Page:** [`/admin`](/admin) (Admin Dashboard)

```
Admin Dashboard: `/admin`
├── Stats Cards: Active Loans, Disbursed Today, Default Rate, Total Users
├── Pending Approvals list with approve/reject buttons
├── Recent Activity feed from audit logs
├── Quick Actions: All Users, Loan Reports, CRB Upload, Analytics
└── Quick Stats Links: Users, Loans, Pending, Analytics, CRB, Settings
```

**Navigation:** Full admin sidebar with all admin sections

**Admin Sections:**
- [`/admin`](/admin) - Dashboard
- [`/admin/users`](/admin/users) - User Management
- [`/admin/loans`](/admin/loans) - Loan Management
- [`/admin/approvals`](/admin/approvals) - Pending Approvals
- [`/admin/analytics`](/admin/analytics) - Analytics
- [`/admin/crb`](/admin/crb) - CRB Management
- [`/admin/tiers`](/admin/tiers) - Tier Management
- [`/admin/audit`](/admin/audit) - Audit Logs
- [`/admin/settings`](/admin/settings) - Settings

---

### State C: BORROWER - KYC VERIFIED + Account Active

**Landing Page:** [`/dashboard`](/dashboard) (Borrower Dashboard)

```
Borrower Dashboard (VERIFIED): `/dashboard`
├── Welcome message with user name
├── Stats Cards: Credit Limit, Credit Score, Active Loans, Total Borrowed
├── Tier Card: Shows current tier and progress to next tier
├── Quick Actions: Apply for Loan, Repay Loan, My Loans, Transactions
└── Recent Loans list (last 5 loans)
```

**✅ Full Access:**
- ✅ Can apply for loans
- ✅ Full platform access
- ✅ All navigation items visible

**Quick Actions Available:**
- [Apply for Loan](/apply) - Navigate to loan application
- [Repay Loan](/repay) - Navigate to repayment page
- [My Loans](/myloans) - View all loans
- [Transactions](/transactions) - View transaction history
- [Settings](/settings) - Account settings

---

### State D: BORROWER - KYC SUBMITTED + Account Active

**Landing Page:** [`/dashboard`](/dashboard) (Borrower Dashboard)

```
Borrower Dashboard (SUBMITTED): `/dashboard`
├── ⚠️ Banner: "Your KYC verification is pending admin review"
├── Stats Cards (limited - credit limit/score may be hidden)
├── Tier Card: Shows current tier
├── Quick Actions: My Loans, Transactions only (Apply and Repay disabled)
└── Recent Loans list
```

**⚠️ Restrictions:**
- ❌ Apply for Loan button hidden/disabled
- ❌ Repay button hidden/disabled (no active loans yet)
- ✅ Can view existing loans
- ✅ Can view transactions
- ✅ Can view settings (but fields locked)

---

### State E: BORROWER - KYC PENDING + Account Active

**Landing Page:** [`/dashboard`](/dashboard) (Borrower Dashboard)

```
Borrower Dashboard (PENDING): `/dashboard`
├── ⚠️ Banner: "Complete your profile to start borrowing"
├── [Complete Profile] button linking to `/settings`
├── Stats Cards (basic only)
├── Tier Card: Shows current tier
├── Quick Actions: My Loans, Settings only
└── Educational content about KYC process
```

**⚠️ Restrictions:**
- ❌ Apply for Loan hidden/disabled
- ❌ Repay hidden/disabled
- ✅ Settings page fields are EDITABLE
- ✅ Can submit profile for verification
- ✅ Can view own loans

---

### State F: BORROWER - KYC REJECTED + Account Active

**Landing Page:** [`/dashboard`](/dashboard) (Borrower Dashboard)

```
Borrower Dashboard (REJECTED): `/dashboard`
├── ❌ Banner: "Your KYC verification was rejected"
├── Rejection reason displayed
├── [Update Profile] button linking to `/settings`
├── [Contact Support] button
├── Stats Cards (limited)
└── Quick Actions: Settings only
```

**⚠️ Restrictions:**
- ❌ All loan features disabled
- ✅ Can update profile and resubmit
- ✅ Can contact support
- ✅ Can view settings

---

### State G: BORROWER - Account Suspended (Any KYC)

**Landing Page:** [`/suspended`](/suspended) (Suspension Page)

```
Suspension Page: `/suspended`
├── ⚠️ Account Suspended message
├── Reason for suspension (if available)
├── Contact support information
├── [Logout] button
└── No access to any platform features
```

**⚠️ Restrictions:**
- ❌ No access to any platform features
- ✅ Can only view suspension page
- ✅ Can logout

**Redirect Rules:**
- Any attempt to access other pages redirects to `/suspended`

---

## URL Redirect Rules

| From URL | User State | Redirect To |
|----------|-----------|-------------|
| `/`, `/login`, `/register` | Already logged in | Role-appropriate dashboard |
| Any protected route | Not logged in | `/login` |
| `/admin` | Not admin | `/dashboard` |
| `/apply`, `/repay` | KYC not VERIFIED | `/dashboard` with warning |
| Any page | Account suspended | `/suspended` |

### Detailed Redirect Logic

```typescript
// Auth Redirect Logic
if (isAuthenticated && (path === '/login' || path === '/register' || path === '/')) {
  if (userRole === 'ADMIN') redirect('/admin');
  redirect('/dashboard');
}

// Protected Route Redirect
if (!isAuthenticated && isProtectedRoute(path)) {
  redirect('/login');
}

// Admin Route Redirect
if (isAuthenticated && path.startsWith('/admin') && userRole !== 'ADMIN') {
  redirect('/dashboard');
}

// KYC Verification Redirect
if (isAuthenticated && userRole === 'BORROWER' && 
    (path === '/apply' || path === '/repay') && 
    kycStatus !== 'VERIFIED') {
  redirect('/dashboard');
}

// Suspended Account Redirect
if (isAuthenticated && accountStatus === 'SUSPENDED') {
  redirect('/suspended');
}
```

---

## Navigation Visibility Matrix

| Navigation Item | Not Logged In | ADMIN | VERIFIED | SUBMITTED | PENDING | REJECTED | Suspended |
|-----------------|---------------|-------|----------|-----------|---------|----------|-----------|
| Home | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Dashboard | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Apply for Loan | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| My Loans | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Repay | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transactions | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Settings | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Admin Panel | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Component Implementation Guide

### AuthGuard Component

The [`AuthGuard`](/frontend/components/AuthGuard.tsx) component handles authentication and role-based routing.

```typescript
// AuthGuard checks:
// 1. Is user authenticated?
// 2. What is user role?
// 3. What is KYC status?
// 4. Is account active?
```

### ProtectedRoute Component

The [`ProtectedRoute`](/frontend/components/ProtectedRoute.tsx) component wraps protected pages.

```typescript
// ProtectedRoute properties:
// - requiredAuth: boolean
// - requiredRole: 'ADMIN' | 'BORROWER'
// - requiredKyc: KYCStatus[]
// - requiresActiveAccount: boolean
```

### AppGate Component

The [`AppGate`](/frontend/components/AppGate.tsx) component determines the appropriate landing page based on user state.

---

## KYC Status Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER REGISTRATION                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    KYC STATUS: PENDING                          │
│                  (User hasn't submitted KYC)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    User submits KYC documents
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   KYC STATUS: SUBMITTED                         │
│              (Awaiting admin verification)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Admin reviews documents
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    KYC STATUS:          │     │    KYC STATUS:          │
│    VERIFIED ✅          │     │    REJECTED ❌          │
│    Full access          │     │    Can resubmit         │
└─────────────────────────┘     └─────────────────────────┘
```

---

## Verification Checklist

- [ ] Unauthenticated users see marketing landing page
- [ ] Admins always go to `/admin` regardless of KYC
- [ ] VERIFIED borrowers have full access
- [ ] SUBMITTED borrowers see pending message and cannot apply
- [ ] PENDING borrowers see profile completion prompt
- [ ] REJECTED borrowers see rejection reason with resubmit option
- [ ] Suspended users see only suspension page
- [ ] Navigation adapts correctly to each state
- [ ] Protected routes redirect appropriately

---

## Implementation Priority

### Phase 1: Base Authentication Routes
1. Login page with redirect logic
2. Register page with user type selection
3. Auth context and token management
4. Logout functionality

### Phase 2: Role-Based Routing
1. Admin role detection
2. `/admin` route protection
3. Admin sidebar navigation
4. Borrower dashboard

### Phase 3: KYC Status-Based Access Control
1. KYC status in user context
2. Dashboard banner based on status
3. Apply/Repay button visibility
4. Settings field locking

### Phase 4: Suspended Account Handling
1. Suspension status check
2. `/suspended` page creation
3. Global redirect for suspended users
4. Support contact information

### Phase 5: Navigation Visibility
1. Dynamic navigation component
2. Role-based menu items
3. KYC-based action buttons
4. Loading states

---

## File Structure Reference

### Frontend Routes

```
frontend/app/
├── page.tsx                    # Marketing landing (State A)
├── login/
│   └── page.tsx               # Login form
├── register/
│   └── page.tsx               # Registration form
├── dashboard/
│   └── page.tsx               # Borrower dashboard (States C-F)
├── admin/
│   ├── layout.tsx             # Admin layout
│   ├── page.tsx               # Admin dashboard (State B)
│   ├── users/
│   │   └── page.tsx           # User management
│   ├── loans/
│   │   └── page.tsx           # Loan management
│   ├── approvals/
│   │   └── page.tsx           # KYC approvals
│   ├── analytics/
│   │   └── page.tsx           # Analytics
│   └── ...
├── apply/
│   └── page.tsx               # Loan application
├── repay/
│   └── page.tsx               # Loan repayment
├── myloans/
│   └── page.tsx               # User's loans
├── transactions/
│   └── page.tsx               # Transaction history
├── settings/
│   └── page.tsx               # User settings
└── suspended/
    └── page.tsx               # Suspension page (State G)
```

### Key Components

```
frontend/components/
├── AuthGuard.tsx              # Auth + role checking
├── ProtectedRoute.tsx         # Route protection
├── AppGate.tsx                # Landing page router
├── AdminLayout.tsx            # Admin sidebar
├── TopBar.tsx                 # Navigation
└── ...
```

### Context Providers

```
frontend/context/
├── AuthContext.tsx            # User auth state
└── NotificationContext.tsx    # Notifications
```

---

## Environment Variables

Ensure these are set in [`frontend/.env.local`](/frontend/.env.local):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## API Endpoints Reference

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### User
- `GET /api/users/me` - Current user info
- `PUT /api/users/me` - Update user profile

### KYC
- `POST /api/settings/kyc` - Submit KYC documents
- `GET /api/settings/kyc/status` - Check KYC status

### Loans
- `POST /api/loans` - Apply for loan
- `GET /api/loans` - Get user loans
- `POST /api/loans/{id}/repay` - Repay loan

---

## Troubleshooting

### Common Issues

1. **User stuck on login redirect loop**
   - Check token storage
   - Verify API response includes role/KYC status
   - Check AuthContext initialization

2. **KYC status not updating**
   - Verify admin approval workflow
   - Check database update on approval
   - Ensure context refresh after status change

3. **Suspended user can still access pages**
   - Add suspended check in ProtectedRoute
   - Verify middleware checks account status
   - Check AuthGuard redirect logic

4. **Admin can't access admin panel**
   - Verify user role in database
   - Check role in AuthContext
   - Ensure admin routes check role correctly

---

## Related Documentation

- [README.md](/README.md) - Project overview
- [API Documentation](/backend/api/) - Backend API endpoints
- [Models Reference](/backend/models/models.py) - Database models
- [Frontend Types](/frontend/types/index.ts) - TypeScript types

---

*Last Updated: 2026-02-23*
*Version: 1.0*
