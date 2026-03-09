# Okolea - Quick Loans for Kenya

A fast, transparent consumer lending platform built with Next.js and FastAPI.

## Overview

Okolea is a loan management application designed for the Kenyan market, allowing users to apply for short-term loans, track their credit profile, and manage repayments. The platform features a tier-based credit system that rewards timely repayments with increased loan limits.

## Features

### For Borrowers
- **Quick Loan Applications**: Apply for loans up to KSh 50,000
- **Fast Disbursement**: Quick approval and disbursement process
- **Credit Tier System**: Progress through tiers (Bronze → Silver → Gold → Platinum → Diamond) based on repayment history
- **Credit Score Tracking**: Monitor your credit score as you build your borrowing history
- **Loan Management**: View active loans, payment history, and due dates
- **Repayment Tracking**: Track repayments and maintain perfect payment streaks

### For Administrators
- **User Management**: Manage borrower accounts and permissions
- **Loan Management**: View, approve, and manage all loan applications
- **Analytics Dashboard**: Overview of platform metrics and user activity
- **Audit Logs**: Complete trail of all user and loan activities
- **System Settings**: Configure loan parameters and platform settings

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion for animations

### Backend
- Python 3.11+
- FastAPI
- SQLAlchemy
- SQLite (development) / PostgreSQL (production)
- Pydantic

### Security
- JWT authentication
- Role-based access control (RBAC)
- Input validation with Pydantic

## Project Structure

```
/loan-app
├── /frontend               # Next.js application
│   ├── /app               # App Router pages
│   ├── /components        # Reusable UI components
│   ├── /context           # React context (Auth, Notifications)
│   ├── /lib               # Utilities and API clients
│   └── /types             # TypeScript types
│
└── /backend               # FastAPI application
    ├── /api               # API endpoints
    ├── /core              # Core configuration
    ├── /services          # Business logic services
    ├── /models            # SQLAlchemy models
    ├── /schemas           # Pydantic schemas
    └── /scripts           # Database utilities
```

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate on Windows
venv\Scripts\activate

# Activate on Mac/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the development server
uvicorn main:app --reload --port 8000
```

The backend will be available at http://localhost:8000

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at http://localhost:3000

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## User Roles

| Role | Description |
|------|-------------|
| BORROWER | Regular user who can apply for loans and manage their account |
| ADMIN | Administrator with full access to manage users, loans, and system settings |

## Loan Parameters

| Parameter | Value |
|-----------|-------|
| Loan Term | 9 days |
| Interest Rate | 4% annual |
| Late Penalty | 6.8% of principal |
| Minimum Loan | KSh 500 |
| Maximum Loan | KSh 50,000 |

## Credit Tier System

Users progress through tiers based on their repayment history:

| Tier | Name | Requirements |
|------|------|--------------|
| 1 | Bronze | Initial tier |
| 2-3 | Silver | Good repayment history |
| 4-5 | Gold | Strong repayment streak |
| 6-7 | Platinum | Excellent repayment history |
| 8 | Diamond | Perfect repayment streak |

Each tier upgrade increases the user's maximum loan limit.

## Key Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Loans
- `POST /api/loans/apply` - Apply for a loan
- `GET /api/loans/my-loans` - Get user's loans
- `GET /api/loans/search` - Search loans

### Transactions
- `POST /api/transactions/repay` - Make a loan repayment

### Admin
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/{id}` - Update user
- `GET /api/admin/loans` - List all loans with filters

## Environment Variables

### Backend (.env)
```
DATABASE_URL=sqlite:///./okolea.db
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Security Considerations

- All API endpoints protected with JWT authentication
- Role-based access control enforced at application level
- Input validation at all layers
- Password hashing with bcrypt
- Audit logs for all critical operations

## License

Proprietary - All Rights Reserved
