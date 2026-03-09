# Money Flow Roadmap - Okolea Loan App

## Overview

This document explains how money flows through the Okolea Loan System - from funding to disbursement to repayment.

---

## 1. LOAN DISBURSEMENT FLOW (Admin → Borrower)

### Step-by-Step:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Admin     │     │   Backend   │     │  M-Pesa API │     │  Borrower   │
│  Approves  │────▶│   Server    │────▶│   (B2C)     │────▶│   Phone     │
│   Loan      │     │             │     │              │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      │  POST /approve   │   Call B2C API   │  Send Money      │
      │                   │                   │                   │
```

### Detailed Flow:

1. **Admin clicks "Approve"** 
   - Frontend sends POST to `/api/admin/loans/{id}/approve`

2. **Backend validates & processes:**
   ```
   admin.py → approve_loan()
   ├── Lock loan row (prevent concurrent)
   ├── Check balance eligibility
   ├── Create DISBURSEMENT transaction (PROCESSING)
   └── Call M-Pesa B2C API
   ```

3. **M-Pesa B2C Payment:**
   ```
   balance_service.process_disbursement()
   └── mpesa_service.b2c_payment()
       ├── Send to M-Pesa API
       └── Return transaction_id
   ```

4. **On Success:**
   - Loan status → ACTIVE
   - Transaction status → CONFIRMED
   - Create audit log
   - Send notification to borrower

5. **On Failure:**
   - Loan status → PENDING (revert)
   - Transaction status → FAILED
   - Return error to admin

---

## 2. LOAN REPAYMENT FLOW (Borrower → Company)

### Step-by-Step:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Borrower   │     │   Backend   │     │  M-Pesa API │     │   Company   │
│  Repays     │────▶│   Server    │────▶│  (STK Push) │────▶│   Account   │
│             │     │             │     │              │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      │  Enter amount    │  Create payment   │  Pull money      │
      │  & pay          │  request          │  from phone      │
```

### Detailed Flow:

1. **User initiates repayment:**
   - Goes to `/repay` page
   - Selects loan & enters amount
   - Clicks "Pay"

2. **Backend creates payment:**
   ```
   transactions_api.initiate()
   └── Create STK Push request
       ├── Save REPAYMENT transaction (PROCESSING)
       └── Send to M-Pesa
   ```

3. **M-Pesa STK Push:**
   - Sends prompt to borrower's phone
   - User enters PIN
   - Money deducted from phone

4. **M-Pesa Callback:**
   - M-Pesa calls your callback URL
   - `mpesa_webhook.py` handles response
   - Update transaction status (CONFIRMED/FAILED)
   - Update loan outstanding balance

5. **On Success:**
   - Transaction status → CONFIRMED
   - Loan balance reduced
   - Send receipt notification

---

## 3. COMPANY BALANCE TRACKING

### Account Balance Flow:

```
┌──────────────────┐
│  Company Wallet  │
│   (Database)     │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ ADD   │ │ MINUS │
│Funds  │ │Disbur-│
│       │ │sements│
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
```

### Key Endpoints:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/balance` | Get company balance |
| `POST /api/balance/fund` | Add funds to company |
| `GET /api/balance/check` | Check if enough for disbursement |

### Balance Check Logic:

```python
# Before disbursement
eligible, message = balance_service.check_disbursement_eligibility(amount)
if not eligible:
    raise error("Insufficient company funds")
```

---

## 4. TRANSACTION TYPES

| Type | Direction | Description |
|------|-----------|-------------|
| DISBURSEMENT | Out → | Loan money to borrower |
| REPAYMENT | In ← | Borrower paying back loan |
| INTEREST | In ← | Interest charged on loan |
| FEE | In ← | Any additional fees |

---

## 5. STATUS FLOW DIAGRAM

### Loan Status:
```
PENDING ──▶ PROCESSING ──▶ ACTIVE
    │              │             │
    │              │             │
    └──────────────┴─────────────┘
              (on fail)
```

### Transaction Status:
```
PENDING ──▶ PROCESSING ──▶ CONFIRMED
    │              │             │
    │              │             │
    └──────────────┴─────────────┘
              (on fail)
```

---

## 6. API ENDPOINTS SUMMARY

### Admin - Loan Management:
```
POST   /api/admin/loans/{id}/approve   → Approve & disburse
POST   /api/admin/loans/{id}/reject    → Reject application
GET    /api/admin/pending-approvals    → List pending loans
```

### Transactions:
```
POST   /api/transactions/initiate       → Start repayment (STK Push)
GET    /api/transactions               → List transactions
GET    /api/transactions/{id}          → Get transaction details
```

### Balance:
```
GET    /api/balance                    → Get company balance
GET    /api/balance/check              → Check eligibility
```

### M-Pesa Webhooks:
```
POST   /api/mpesa/callback             → M-Pesa payment callback
POST   /api/mpesa/timeout             → M-Pesa timeout handler
```

---

## 7. KEY FILES

| File | Purpose |
|------|---------|
| `backend/api/admin.py` | Loan approval logic |
| `backend/api/transactions.py` | Payment/repayment logic |
| `backend/services/balance_service.py` | Company balance management |
| `backend/services/mpesa_service.py` | M-Pesa API integration |
| `backend/api/mpesa_webhook.py` | Handle M-Pesa callbacks |

---

## 8. ENVIRONMENT VARIABLES NEEDED

```env
# Database
DATABASE_URL=postgresql://...

# M-Pesa Credentials
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=...
MPESA_INITIATOR_NAME=...
MPESA_SECURITY_CREDENTIAL=...
MPESA_CALLBACK_URL=...
```

---

## 9. TESTING MONEY FLOW

### Without Real M-Pesa:

1. **Reset stuck loans:**
   ```bash
   cd backend
   python scripts/reset_stuck_loans.py
   ```

2. **Add test mode** (optional - can add simulation)

### With Real M-Pesa:

1. Get credentials from https://developer.safaricom.co.ke
2. Add to `.env` file
3. Use sandbox for testing
4. Switch to production when ready

---

## Summary

1. **Disbursement:** Admin approves → Money goes OUT from company → TO borrower via B2C
2. **Repayment:** Borrower pays → Money comes IN to company → Via STK Push
3. **Tracking:** All transactions logged in database with status tracking
4. **Safety:** Balance checks before every disbursement
