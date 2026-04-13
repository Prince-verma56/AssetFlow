/**
 * FarmDirect Email Service (Scaffold)
 * 
 * This service handles order confirmations and logistics alerts.
 * Plug in your Resend, SendGrid, or Postmark API keys here.
 */

interface EmailParams {
  to: string;
  subject: string;
  body?: string;
  buyerName: string;
  farmerName: string;
  orderAmount: number;
  cropName: string;
}

export async function sendOrderConfirmation({
  to,
  subject,
  buyerName,
  farmerName,
  orderAmount,
  cropName
}: EmailParams) {
  console.log(`[EmailService] Sending confirmation to ${to}...`);
  console.log(`
    Hi ${buyerName},
    
    Your acquisition of ${cropName} is confirmed!
    Total Paid: ₹${orderAmount.toLocaleString()}
    
    Your Farmer, ${farmerName}, has been notified and is preparing the delivery manifest.
    
    Track your shipment here: http://localhost:3000/marketplace/orders
  `);

  // Integration Point: Resend.com
  // await resend.emails.send({
  //   from: 'FarmDirect <logistics@farmdirect.ai>',
  //   to: [to],
  //   subject: subject,
  //   react: <OrderEmailTemplate ... />
  // });

  return { success: true };
}

export async function sendFarmerAlert({
  to,
  buyerName,
  cropName,
  amount
}: { 
  to: string; 
  buyerName: string; 
  cropName: string; 
  amount: number; 
}) {
  console.log(`[EmailService] Alerting Farmer at ${to}...`);
  console.log(`
    Acquisition Alert!
    
    ${buyerName} has purchased ${cropName} for ₹${amount.toLocaleString()}.
    
    Please log in to your dashboard to view the Delivery Manifest and GPS coordinates.
    Dashboard: http://localhost:3000/admin/orders-received
  `);
  
  return { success: true };
}
