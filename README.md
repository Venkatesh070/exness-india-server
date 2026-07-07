# exness-india-server

Express API for Exness India auth and user profiles.

## Render environment variables

Set these in **Render → your service → Environment**:

| Variable | Required | Example |
|----------|----------|---------|
| `MONGODB_URI` | Yes | `mongodb+srv://user:pass@cluster.mongodb.net/exness_india` |
| `FIREBASE_PROJECT_ID` | Yes | `exness-india` |
| `FIREBASE_WEB_API_KEY` | Yes | Same as `VITE_FIREBASE_API_KEY` in frontend |
| `FRONTEND_URL` | Yes | `https://your-frontend-domain.com` |
| `RESEND_API_KEY` | Yes | Resend API key (`re_...`) for OTP emails |
| `RESEND_FROM_EMAIL` | Yes | Verified sender in Resend (e.g. `noreply@exness-india.com`) |

`FIREBASE_WEB_API_KEY` must match the Web API key from Firebase Console → Project settings → Your apps.

Check deployment health: `GET /health` — if `missingEnv` includes `FIREBASE_WEB_API_KEY`, add it in Render and redeploy.

## Dashboard APIs

All dashboard routes require `Authorization: Bearer <accessToken>`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard` | Full dashboard payload (summary, equity curve, movers, trades, news) |
| `GET` | `/api/dashboard/summary` | Balance, equity, profit today, margin, leverage, `isFunded` |
| `GET` | `/api/dashboard/equity-curve?points=60` | Equity sparkline points (last 30 days) |
| `GET` | `/api/dashboard/market-movers?limit=6` | Top symbols by % move today |
| `GET` | `/api/dashboard/recent-trades?limit=4` | Latest closed positions |
| `GET` | `/api/dashboard/news?limit=4` | Latest market headlines |

`isFunded` is `true` when balance ≥ ₹5,000 (unlocks live prices in the UI).

## Admin dashboard APIs

All routes require `Authorization: Bearer <admin Firebase idToken or JWT>` and admin role.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/dashboard` | Full overview — stats + 60-day active users chart |
| `GET` | `/api/admin/dashboard/stats` | Total users, active today, 24h volume, 24h deposits |
| `GET` | `/api/admin/dashboard/daily-active-users?days=60` | Daily active user counts for chart |

## Admin users APIs

All routes require admin auth.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/users?page=1&limit=50&search=&status=` | Paginated user list with balance and KYC status |
| `GET` | `/api/admin/users/:userId` | Single user detail |

## Admin deposits APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/deposits/payment-settings` | UPI QR, account name, UPI ID |
| `PUT` | `/api/admin/deposits/payment-settings` | Update payment settings (`qrImage`, `upiId`, `accountName`) |
| `GET` | `/api/admin/deposits/requests?status=all` | List deposit requests (`pending`, `approved`, `rejected`) |
| `POST` | `/api/admin/deposits/requests/:id/approve` | Approve and credit user wallet |
| `POST` | `/api/admin/deposits/requests/:id/reject` | Reject deposit request |
| `GET` | `/api/admin/deposits/withdrawal-requests?status=all` | List withdrawal requests |
| `POST` | `/api/admin/deposits/withdrawal-requests/:id/approve` | Approve bank withdrawal |
| `POST` | `/api/admin/deposits/withdrawal-requests/:id/reject` | Reject withdrawal and refund balance |

## Admin news APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/news` | List all news articles |
| `GET` | `/api/admin/news/:id` | Get single article |
| `POST` | `/api/admin/news` | Publish new article |
| `PUT` | `/api/admin/news/:id` | Update article |
| `DELETE` | `/api/admin/news/:id` | Delete article |

### `POST /api/admin/news` body
```json
{
  "title": "Gold steadies near record highs",
  "category": "Metals",
  "body": "Spot gold hovered above $2,400/oz..."
}
```

Published articles appear on the user dashboard via `GET /api/dashboard/news`.

## Wallet APIs (users)

All wallet routes except payment settings require `Authorization: Bearer <accessToken>`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/wallet` | Balance, transactions, `isFunded` (balance ≥ ₹5,000) |
| `GET` | `/api/wallet/transactions` | Transaction list + current balance |
| `GET` | `/api/wallet/payment-settings` | UPI QR, account name, UPI ID (public) |
| `GET` | `/api/wallet/deposit-requests` | User's deposit request history |
| `POST` | `/api/wallet/deposit-requests` | Submit UPI deposit with UTR + screenshot |
| `POST` | `/api/wallet/withdrawals` | Bank withdrawal (account number + IFSC) |

### `GET /api/wallet` response
```json
{
  "wallet": {
    "balance": 5000,
    "isFunded": true,
    "minTradingBalance": 5000,
    "transactions": [
      {
        "id": "uuid",
        "type": "Deposit",
        "method": "UPI · QR",
        "amount": 5000,
        "status": "Completed",
        "date": "Jul 7, 2026",
        "referenceId": "428901234567"
      }
    ]
  }
}
```

### `POST /api/wallet/deposit-requests` body
```json
{
  "amount": 5000,
  "referenceId": "428901234567",
  "screenshot": "data:image/jpeg;base64,..."
}
```

### `POST /api/wallet/withdrawals` body
```json
{
  "amount": 5000,
  "accountNumber": "123456789012",
  "ifsc": "HDFC0001234"
}
```

Withdrawals deduct balance immediately and create a `Pending` bank transfer transaction.

## Local development

```bash
cp .env.example .env
# Set MONGODB_URI in .env
npm install
npm run db:migrate
npm run db:seed-admin   # optional — creates admin in Firebase + MongoDB
npm run dev
```
