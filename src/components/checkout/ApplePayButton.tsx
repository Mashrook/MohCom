import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ApplePayButtonProps {
  planId: string;
  planName: string;
  price: number;
  onSuccess?: () => void;
  onClose?: () => void;
}

export const ApplePayButton = ({ 
  planId, 
  planName, 
  price, 
  onSuccess, 
  onClose 
}: ApplePayButtonProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isApplePayAvailable, setIsApplePayAvailable] = useState(false);

  useEffect(() => {
    // Check if Apple Pay is available
    const checkApplePayAvailability = async () => {
      try {
        // Check if we're in a browser that supports Apple Pay
        if (typeof window !== 'undefined' && 'ApplePaySession' in window) {
          // Check if Apple Pay can make payments
          const canMakePayments = await (window as any).ApplePaySession.canMakePayments();
          setIsApplePayAvailable(canMakePayments);
        }
      } catch (error) {
        console.log("Apple Pay not available:", error);
        setIsApplePayAvailable(false);
      }
    };

    checkApplePayAvailability();
  }, []);

  const handleApplePayClick = async () => {
    if (!isApplePayAvailable) {
      // Fallback to regular checkout
      handleRegularCheckout();
      return;
    }

    setIsLoading(true);

    try {
      const ApplePaySession = (window as any).ApplePaySession;
      
      const paymentRequest = {
        countryCode: 'SA',
        currencyCode: 'SAR',
        supportedNetworks: ['visa', 'masterCard', 'mada'],
        merchantCapabilities: ['supports3DS', 'supportsDebit', 'supportsCredit'],
        total: {
          label: `محامي كوم - ${planName}`,
          amount: price.toString(),
          type: 'final'
        },
        requiredBillingContactFields: ['email'],
        requiredShippingContactFields: []
      };

      const session = new ApplePaySession(3, paymentRequest);

      session.onvalidatemerchant = async (event: any) => {
        try {
          // Call your server to validate the merchant
          const { data, error } = await supabase.functions.invoke("validate-apple-pay", {
            body: { 
              validationURL: event.validationURL,
              domainName: window.location.hostname
            }
          });

          if (error || !data?.merchantSession) {
            throw new Error("فشل في التحقق من التاجر");
          }

          session.completeMerchantValidation(data.merchantSession);
        } catch (err) {
          console.error("Merchant validation error:", err);
          session.abort();
          toast({
            title: "خطأ في Apple Pay",
            description: "فشل في التحقق من التاجر. جاري التحويل للدفع العادي...",
            variant: "destructive",
          });
          // Fallback to regular checkout
          handleRegularCheckout();
        }
      };

      session.onpaymentauthorized = async (event: any) => {
        try {
          // Process the payment with your server
          const { data, error } = await supabase.functions.invoke("process-apple-pay", {
            body: { 
              paymentToken: event.payment.token,
              planId: planId
            }
          });

          if (error || !data?.success) {
            session.completePayment(ApplePaySession.STATUS_FAILURE);
            throw new Error(data?.error || "فشل في معالجة الدفع");
          }

          session.completePayment(ApplePaySession.STATUS_SUCCESS);
          
          toast({
            title: "تم الدفع بنجاح! 🎉",
            description: `تم تفعيل اشتراكك في ${planName}`,
          });

          onSuccess?.();
          onClose?.();
          
          // Redirect to success page
          window.location.href = `/subscription-success?plan=${planId}`;
        } catch (err) {
          console.error("Payment processing error:", err);
          toast({
            title: "خطأ في الدفع",
            description: err instanceof Error ? err.message : "حدث خطأ أثناء معالجة الدفع",
            variant: "destructive",
          });
        }
      };

      session.oncancel = () => {
        setIsLoading(false);
        toast({
          title: "تم إلغاء الدفع",
          description: "يمكنك المحاولة مرة أخرى في أي وقت",
        });
      };

      session.begin();
    } catch (error) {
      console.error("Apple Pay error:", error);
      setIsLoading(false);
      // Fallback to regular checkout
      handleRegularCheckout();
    }
  };

  const handleRegularCheckout = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { planId },
      });

      if (error) throw new Error(error.message || "فشل في إنشاء جلسة الدفع");

      if (data?.url) {
        window.open(data.url, "_blank");
        onClose?.();
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast({
        title: "خطأ في الدفع",
        description: err instanceof Error ? err.message : "حدث خطأ",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Only show if Apple Pay is available
  if (!isApplePayAvailable) {
    return null;
  }

  return (
    <Button
      onClick={handleApplePayClick}
      disabled={isLoading}
      className="w-full bg-black hover:bg-black/90 text-white h-12 rounded-lg flex items-center justify-center gap-2"
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M17.0498 3.14001C15.7298 3.14001 14.5698 3.76001 13.8298 4.74001C13.1898 5.57001 12.7698 6.68001 12.8698 7.82001C14.3198 7.87001 15.6998 7.12001 16.4298 6.06001C17.0798 5.10001 17.4498 3.97001 17.0498 3.14001Z"/>
            <path d="M21.8298 17.0799C21.2998 18.3099 20.9398 18.8199 20.3098 19.9499C19.4498 21.4699 18.2298 23.3499 16.5898 23.3699C15.1298 23.3899 14.7498 22.4499 12.7798 22.4599C10.8098 22.4799 10.3898 23.3999 8.92977 23.3799C7.28977 23.3499 6.12977 21.6499 5.26977 20.1199C2.72977 15.8899 2.45977 10.8699 4.21977 8.17991C5.45977 6.27991 7.41977 5.17991 9.26977 5.17991C10.9898 5.17991 12.1098 6.10991 13.5098 6.10991C14.8698 6.10991 15.7398 5.17991 17.7298 5.17991C19.3698 5.17991 21.1098 6.08991 22.3498 7.68991C18.0398 10.0099 18.7098 15.9999 21.8298 17.0799Z"/>
          </svg>
          <span className="font-medium">Pay</span>
        </>
      )}
    </Button>
  );
};
