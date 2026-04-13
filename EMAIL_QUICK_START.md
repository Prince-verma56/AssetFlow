# Email System - Quick Start ⚡

## TL;DR: 3 Steps to Enable Post-Payment Emails

### 1️⃣ Get Your Resend API Key
- Go to https://resend.com → Sign up (free)
- Dashboard → API Keys → Copy `re_xxxxx`

### 2️⃣ Update `.env.local`
```env
RESEND_API_KEY=re_xxxxx_YOUR_KEY_HERE
RESEND_FROM_EMAIL="AssetFlow <noreply@assetflow.dev>"
```

### 3️⃣ Test It
```bash
# Restart dev server
npm run dev

# Visit test page
http://localhost:3000/admin/email-test

# Or trigger via checkout flow
```

---

## Current Status

### ✅ Already Implemented:
- Email templates created (buyer receipt + farmer alert)
- Razorpay checkout wired to send emails after payment
- Server action `processOrderCommunication` ready
- Comprehensive logging added
- Test page available

### ⏳ Waiting For:
- Your Resend API key in `.env.local`
- Optionally: Domain verification in Resend (for production)

### 🔍 In Mock Mode Right Now:
Without API key, emails are logged instead of sent:
```
[EMAIL_SERVICE] Mock Mode - Buyer Receipt Email: { ... }
[EMAIL_SERVICE] Mock Mode - Farmer Sale Alert: { ... }
```

---

## What Emails Get Sent?

### After Payment Success:

#### 📧 Buyer Gets:
- **Invoice** with order details
- **Delivery address** confirmation
- **Rental period** and pricing breakdown
- **Link to track order**

#### 📧 Farmer Gets:
- **New order alert** notification
- **Buyer name** and rental amount
- **Equipment details**
- **Link to fulfill order**

---

## Testing the System

### Option A: Test Page (Easiest)
1. Visit `http://localhost:3000/admin/email-test`
2. Enter your email
3. Click "Send Buyer Receipt Email" or "Send Farmer Alert"
4. Check console for logs

### Option B: Full Checkout Flow
1. Add item to cart on marketplace
2. Complete checkout with test payment (4111111111111111)
3. Email should be sent immediately
4. Check server logs for `[Checkout]` and `[OrderCommunication]` logs

### Option C: Check Logs Directly
```bash
# When payment completes, look for:
[Checkout] Payment successful, creating order...
[OrderCommunication] Sending emails for order ORD-123...
[EMAIL_SERVICE] Mock Mode - Buyer Receipt Email: {...}
```

---

## File Structure

```
.env.local                           <- ADD YOUR API KEY HERE
├── RESEND_API_KEY=re_xxxxx
└── RESEND_FROM_EMAIL="..."

app/
├── admin/
│   └── email-test/
│       └── page.tsx                 <- Test UI
├── api/
│   └── test-email/
│       ├── buyer/route.ts           <- Test endpoint
│       └── farmer/route.ts          <- Test endpoint
├── features/
│   └── emails/
│       └── components/
│           ├── BuyerReceiptEmail.tsx
│           └── FarmerSaleEmail.tsx
├── actions/
│   └── order-communication.ts       <- Orchestrates email sending

lib/
└── mails/
    └── mails.ts                     <- Email service with Resend
```

---

## Troubleshooting

### Emails not sending?
- [ ] Check `RESEND_API_KEY` is in `.env.local`
- [ ] Verify key is valid at https://resend.com/docs/dashboard/api-keys
- [ ] Restart dev server after adding env var
- [ ] Check server console for errors

### Use test page to debug:
Visit `/admin/email-test` to send test emails and see detailed results

### Wrong sender address?
Update `RESEND_FROM_EMAIL` in `.env.local`

### Emails going to spam?
Verify domain in Resend dashboard (production)

---

## What's Happening Behind the Scenes

```
User Completes Payment
    ↓
Razorpay Success Callback
    ↓
handleSuccess() in checkout-modal.tsx logs: [Checkout] Payment successful...
    ↓
createOrder() mutation creates order in database
    ↓
processOrderCommunication() server action called
    ↓
├─ sendBuyerReceiptEmail() logs: [EMAIL_SERVICE] Mock Mode...
├─ OR sends real email via Resend (if API key configured)
│
└─ sendFarmerSaleAlert() logs: [EMAIL_SERVICE] Mock Mode...
   OR sends real email via Resend (if API key configured)
    ↓
Success screen shown to user
```

---

## Production Checklist

- [ ] Domain verified in Resend
- [ ] `RESEND_API_KEY` configured in production
- [ ] `RESEND_FROM_EMAIL` uses verified domain
- [ ] Tested full checkout flow end-to-end
- [ ] Emails reach both buyer and farmer inboxes
- [ ] Emails not marked as spam
- [ ] Invoice PDF generation (optional)
- [ ] Email bounce handling (optional)

---

## Need Help?

### 📖 Full Documentation:
See `EMAIL_SETUP.md` for comprehensive guide

### 🔗 Resend Documentation:
https://resend.com/docs

### 🧪 Local Testing:
1. Use `.env.local` with test API key
2. Visit `/admin/email-test` to verify
3. Check server console for `[EMAIL_SERVICE]` logs

---

**Summary:** Everything is built and working. Just add your Resend API key and emails start flowing automatically after checkout! 🚀
