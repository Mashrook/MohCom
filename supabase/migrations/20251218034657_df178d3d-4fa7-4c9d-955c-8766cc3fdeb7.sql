-- Remove Stripe columns from subscriptions table
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS stripe_subscription_id;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS stripe_customer_id_encrypted;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS stripe_subscription_id_encrypted;

-- Drop the Stripe-related function
DROP FUNCTION IF EXISTS public.get_subscription_stripe_ids(uuid);

-- Drop the encryption trigger for Stripe data
DROP FUNCTION IF EXISTS public.encrypt_subscription_data() CASCADE;