# Email System Setup Guide

## Current Status
✅ Email infrastructure is **fully implemented** and wired to send after payment success
✅ Both buyer receipt and farmer notification templates are created
✅ `processOrderCommunication` server action triggers after payment

## What's Missing
The system needs Resend API configuration to actually send emails.

## Setup Steps

### 1. Get Your Resend API Key
1. Go to [https://resend.com](https://resend.com)
2. Sign up (free tier available)
3. Go to API Keys section
4. Copy your API key (starts with `re_`)

### 2. Configure Environment Variables
Update `.env.local` with:

```env
# Email Service (Resend.com)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL="AssetFlow <noreply@assetflow.dev>"
```

### 3. Set Domain for Email Sending
In Resend dashboard:
1. Go to Domains section
2. Add your domain (e.g., `assetflow.dev`)
3. Follow verification steps (DNS records)
4. Use verified domain in `RESEND_FROM_EMAIL`

Alternatively, use Resend's default domain during testing:
```env
RESEND_FROM_EMAIL="AssetFlow <onboarding@resend.dev>"
```

## How It Works

### Payment Flow
```
1. User completes payment → Razorpay callback
2. Razorpay success handler → createOrder mutation
3. Order created → processOrderCommunication server action triggered
4. Two emails sent simultaneously:
   ├─ Buyer Receipt Email (to buyer/renter)
   └─ Farmer Sale Alert Email (to farmer/owner)
```

### Email Templates Included

#### 📧 Buyer Receipt Email
- **File**: `app/features/emails/components/BuyerReceiptEmail.tsx`
- **Sent to**: Buyer/Renter email
- **Contains**:
  - Invoice number and date
  - Equipment details with image
  - Pricing breakdown (unit price, quantity, total)
  - Delivery address
  - Payment method confirmation
  - Action button: "View Order Status"

#### 📧 Farmer Sale Alert Email
- **File**: `app/features/emails/components/FarmerSaleEmail.tsx`
- **Sent to**: Farmer/Owner email
- **Contains**:
  - New order notification
  - Buyer name and rental amount
  - Equipment details
  - Action button: "View Order & Track"

## Current Status Without API Key
Until `RESEND_API_KEY` is configured:
- ✅ All email logic works but in **mock mode**
- ✅ Emails are **logged to console** with full details
- ✅ No actual emails sent (intentional for safety)
- ✅ System ready to send once configured

Check server logs after payment:
```
[EMAIL_SERVICE] Mock Mode - Buyer Receipt Email: { ... }
[EMAIL_SERVICE] Mock Mode - Farmer Sale Alert: { ... }
```

## Testing Locally

### Step 1: Add dummy Resend key to .env.local
```env
RESEND_API_KEY=re_test_dummy_key
```

### Step 2: Trigger payment flow
1. Search for equipment on marketplace
2. Click "Book Now" → Checkout modal
3. Complete Razorpay payment (test mode: 4111111111111111)

### Step 3: Check logs
Check server console for:
- `[EMAIL_SERVICE]` logs showing emails were processed
- If real key: emails appear in Resend dashboard

## Production Checklist

- [ ] Real Resend API key configured
- [ ] Domain verified in Resend
- [ ] `RESEND_FROM_EMAIL` uses verified domain
- [ ] Test complete payment flow end-to-end
- [ ] Verify emails arrive in inboxes (spam folder check)
- [ ] Set up email forwarding for farmer notifications
- [ ] Monitor Resend dashboard for delivery issues
- [ ] Configure bounce/complaint handling

## Troubleshooting

### Emails not sending?
1. Check if `RESEND_API_KEY` is set: `echo $RESEND_API_KEY`
2. Verify key is valid in Resend dashboard
3. Check server logs for `[EMAIL_SERVICE]` output
4. Verify `RESEND_FROM_EMAIL` format is correct

### Wrong sender email?
- Update `RESEND_FROM_EMAIL` in `.env.local`
- Format: `"Company Name <sender@domain.com>"`

### Emails going to spam?
- Domain must be verified in Resend
- Add SPF, DKIM, DMARC records
- Use consistent sender name and domain

## Files Involved

| File | Purpose |
|------|---------|
| `lib/mails/mails.ts` | Email service with Resend integration |
| `app/features/emails/components/BuyerReceiptEmail.tsx` | Buyer invoice template |
| `app/features/emails/components/FarmerSaleEmail.tsx` | Farmer notification template |
| `app/actions/order-communication.ts` | Server action sending both emails |
| `components/marketplace/checkout-modal.tsx` | Triggers email after payment success |
| `.env.local` | Configuration file with API keys |

## Next Steps

1. **Immediate**: Get Resend API key and update `.env.local`
2. **Optional**: Customize email templates with your branding
3. **Production**: Set up domain verification and monitoring

Once configured, emails will automatically send to both buyer and farmer after payment completion! 🚀
