declare module 'razorpay' {
  interface RazorpayOptions {
    key_id: string;
    key_secret: string;
  }

  interface OrderOptions {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, any>;
  }

  interface PaymentOptions {
    payment_id: string;
    amount: number;
    currency?: string;
  }

  class Razorpay {
    constructor(options: RazorpayOptions);
    orders: {
      create: (options: OrderOptions) => Promise<any>;
      fetch: (orderId: string) => Promise<any>;
    };
    payments: {
      fetch: (paymentId: string) => Promise<any>;
      capture: (options: PaymentOptions) => Promise<any>;
    };
  }

  export default Razorpay;
} 