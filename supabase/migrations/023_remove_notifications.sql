-- Migration: Remove notification system
-- Description: Drop all notification-related tables and functions
-- Author: System
-- Date: 2025-01-06

-- Drop notification-related tables
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Drop notification-related views if any
DROP VIEW IF EXISTS public.unread_notifications CASCADE;
DROP VIEW IF EXISTS public.notification_summary CASCADE;

-- Drop notification-related functions
DROP FUNCTION IF EXISTS public.create_notification CASCADE;
DROP FUNCTION IF EXISTS public.mark_notification_read CASCADE;
DROP FUNCTION IF EXISTS public.get_unread_notifications CASCADE;
DROP FUNCTION IF EXISTS public.delete_old_notifications CASCADE;

-- Drop notification-related triggers
DROP TRIGGER IF EXISTS trigger_new_quote_notification ON public.quotes;
DROP TRIGGER IF EXISTS trigger_status_change_notification ON public.quotes;
DROP TRIGGER IF EXISTS trigger_payment_notification ON public.transactions;

-- Drop notification-related indexes if any
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_notifications_is_read;
DROP INDEX IF EXISTS idx_notification_preferences_user_id;

-- Remove notification-related columns from profiles if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' 
               AND column_name = 'notification_enabled') THEN
        ALTER TABLE public.profiles DROP COLUMN notification_enabled;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' 
               AND column_name = 'email_notifications') THEN
        ALTER TABLE public.profiles DROP COLUMN email_notifications;
    END IF;
END $$;

-- Drop notification-related types if any
DROP TYPE IF EXISTS public.notification_type CASCADE;
DROP TYPE IF EXISTS public.notification_priority CASCADE;

-- Clean up any remaining notification references in comments
COMMENT ON TABLE public.quotes IS 'Quote management table';
COMMENT ON TABLE public.transactions IS 'Financial transaction records';