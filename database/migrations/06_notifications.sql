-- Notifications system migration
-- Creates comprehensive notification system with settings

-- Create notification_settings table for user preferences
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quote_created BOOLEAN DEFAULT true,
  quote_approved BOOLEAN DEFAULT true,
  quote_rejected BOOLEAN DEFAULT true,
  quote_expiring BOOLEAN DEFAULT true,
  project_created BOOLEAN DEFAULT true,
  project_status_changed BOOLEAN DEFAULT true,
  project_deadline_approaching BOOLEAN DEFAULT true,
  settlement_due BOOLEAN DEFAULT true,
  settlement_completed BOOLEAN DEFAULT true,
  settlement_overdue BOOLEAN DEFAULT true,
  system_user_joined BOOLEAN DEFAULT true,
  system_permission_changed BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  browser_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Extend notifications table if not exists
DO $$ 
BEGIN
  -- Check if notifications table exists, if not create it
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
    CREATE TABLE notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN (
        'quote_created', 'quote_approved', 'quote_rejected', 'quote_expiring',
        'project_created', 'project_status_changed', 'project_deadline_approaching',
        'settlement_due', 'settlement_completed', 'settlement_overdue',
        'system_user_joined', 'system_permission_changed', 'general'
      )),
      link_url TEXT,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      -- Additional fields for notification context
      entity_type TEXT, -- quote, project, transaction, user
      entity_id UUID,
      priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
    );
  ELSE
    -- Add new columns if they don't exist
    BEGIN
      ALTER TABLE notifications ADD COLUMN title TEXT;
    EXCEPTION
      WHEN duplicate_column THEN
        -- Column already exists, do nothing
    END;
    
    BEGIN
      ALTER TABLE notifications ADD COLUMN type TEXT CHECK (type IN (
        'quote_created', 'quote_approved', 'quote_rejected', 'quote_expiring',
        'project_created', 'project_status_changed', 'project_deadline_approaching',
        'settlement_due', 'settlement_completed', 'settlement_overdue',
        'system_user_joined', 'system_permission_changed', 'general'
      ));
    EXCEPTION
      WHEN duplicate_column THEN
        -- Column already exists, do nothing
    END;
    
    BEGIN
      ALTER TABLE notifications ADD COLUMN entity_type TEXT;
    EXCEPTION
      WHEN duplicate_column THEN
        -- Column already exists, do nothing
    END;
    
    BEGIN
      ALTER TABLE notifications ADD COLUMN entity_id UUID;
    EXCEPTION
      WHEN duplicate_column THEN
        -- Column already exists, do nothing
    END;
    
    BEGIN
      ALTER TABLE notifications ADD COLUMN priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
    EXCEPTION
      WHEN duplicate_column THEN
        -- Column already exists, do nothing
    END;
    
    -- Update existing notification_type to type if needed
    BEGIN
      UPDATE notifications SET type = notification_type WHERE type IS NULL AND notification_type IS NOT NULL;
    EXCEPTION
      WHEN others THEN
        -- Handle any errors gracefully
    END;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- Add updated_at trigger for notification_settings
CREATE TRIGGER update_notification_settings_updated_at 
  BEFORE UPDATE ON notification_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create notification with settings check
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_link_url TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  setting_enabled BOOLEAN := true;
BEGIN
  -- Check if user has this notification type enabled
  CASE p_type
    WHEN 'quote_created' THEN
      SELECT quote_created INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
    WHEN 'quote_approved' THEN
      SELECT quote_approved INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
    WHEN 'quote_rejected' THEN
      SELECT quote_rejected INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
    WHEN 'quote_expiring' THEN
      SELECT quote_expiring INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
    WHEN 'project_created' THEN
      SELECT project_created INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
    WHEN 'project_status_changed' THEN
      SELECT project_status_changed INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
    WHEN 'project_deadline_approaching' THEN
      SELECT project_deadline_approaching INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
    WHEN 'settlement_due' THEN
      SELECT settlement_due INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
    WHEN 'settlement_completed' THEN
      SELECT settlement_completed INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
    WHEN 'settlement_overdue' THEN
      SELECT settlement_overdue INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
    WHEN 'system_user_joined' THEN
      SELECT system_user_joined INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
    WHEN 'system_permission_changed' THEN
      SELECT system_permission_changed INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
    ELSE
      setting_enabled := true; -- Default to enabled for general notifications
  END CASE;
  
  -- If setting is NULL (no preferences set), default to enabled
  IF setting_enabled IS NULL THEN
    setting_enabled := true;
  END IF;
  
  -- Only create notification if enabled
  IF setting_enabled THEN
    INSERT INTO notifications (
      user_id, title, message, type, link_url, entity_type, entity_id, priority
    ) VALUES (
      p_user_id, p_title, p_message, p_type, p_link_url, p_entity_type, p_entity_id, p_priority
    ) RETURNING id INTO notification_id;
  END IF;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create default notification settings for new users
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_settings (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default notification settings for new users
-- Note: This will trigger when users are created in the users table
DO $$
BEGIN
  -- Only create trigger if users table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    DROP TRIGGER IF EXISTS trigger_create_notification_settings ON users;
    CREATE TRIGGER trigger_create_notification_settings
      AFTER INSERT ON users
      FOR EACH ROW EXECUTE FUNCTION create_default_notification_settings();
  END IF;
END $$;

-- Create notification settings for existing users
INSERT INTO notification_settings (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_settings)
ON CONFLICT (user_id) DO NOTHING;