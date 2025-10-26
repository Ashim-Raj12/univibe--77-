-- Add triggers for collab application notifications

-- Function to create notification when application is received
CREATE OR REPLACE FUNCTION notify_collab_application_received()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for the poster when someone applies
  INSERT INTO notifications (user_id, actor_id, type, entity_id)
  VALUES (
    (SELECT poster_id FROM collab_posts WHERE id = NEW.post_id),
    NEW.applicant_id,
    'collab_application_received',
    NEW.post_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification when application is accepted
CREATE OR REPLACE FUNCTION notify_collab_application_accepted()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for the applicant when their application is accepted
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, actor_id, type, entity_id)
    VALUES (
      NEW.applicant_id,
      (SELECT poster_id FROM collab_posts WHERE id = NEW.post_id),
      'collab_application_accepted',
      NEW.post_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification when application is declined
CREATE OR REPLACE FUNCTION notify_collab_application_declined()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for the applicant when their application is declined
  IF NEW.status = 'declined' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, actor_id, type, entity_id)
    VALUES (
      NEW.applicant_id,
      (SELECT poster_id FROM collab_posts WHERE id = NEW.post_id),
      'collab_application_declined',
      NEW.post_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER trigger_collab_application_received
  AFTER INSERT ON collab_applications
  FOR EACH ROW EXECUTE FUNCTION notify_collab_application_received();

CREATE TRIGGER trigger_collab_application_accepted
  AFTER UPDATE ON collab_applications
  FOR EACH ROW EXECUTE FUNCTION notify_collab_application_accepted();

CREATE TRIGGER trigger_collab_application_declined
  AFTER UPDATE ON collab_applications
  FOR EACH ROW EXECUTE FUNCTION notify_collab_application_declined();
