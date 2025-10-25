-- Create collab_applications table
CREATE TABLE collab_applications (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES collab_posts(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(post_id, applicant_id)
);

-- Add RLS policies
ALTER TABLE collab_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view applications for posts they created
CREATE POLICY "Users can view applications for their posts" ON collab_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM collab_posts
            WHERE collab_posts.id = collab_applications.post_id
            AND collab_posts.poster_id = auth.uid()
        )
    );

-- Policy: Users can view their own applications
CREATE POLICY "Users can view their own applications" ON collab_applications
    FOR SELECT USING (applicant_id = auth.uid());

-- Policy: Users can insert applications for posts that are open and not their own
CREATE POLICY "Users can apply to open posts" ON collab_applications
    FOR INSERT WITH CHECK (
        applicant_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM collab_posts
            WHERE collab_posts.id = collab_applications.post_id
            AND collab_posts.status = 'open'
            AND collab_posts.poster_id != auth.uid()
        )
    );

-- Policy: Posters can update application status for their posts
CREATE POLICY "Posters can update application status" ON collab_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM collab_posts
            WHERE collab_posts.id = collab_applications.post_id
            AND collab_posts.poster_id = auth.uid()
        )
    );

-- Create indexes for performance
CREATE INDEX idx_collab_applications_post_id ON collab_applications(post_id);
CREATE INDEX idx_collab_applications_applicant_id ON collab_applications(applicant_id);
CREATE INDEX idx_collab_applications_status ON collab_applications(status);

-- Function to handle accepting an application
CREATE OR REPLACE FUNCTION accept_collab_application(p_application_id INTEGER, p_poster_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Update the application status
    UPDATE collab_applications
    SET status = 'accepted', responded_at = NOW()
    WHERE id = p_application_id AND post_id IN (
        SELECT id FROM collab_posts WHERE poster_id = p_poster_id
    );

    -- Update the collab post to assign the helper
    UPDATE collab_posts
    SET helper_id = (SELECT applicant_id FROM collab_applications WHERE id = p_application_id),
        status = 'in_progress'
    WHERE id = (SELECT post_id FROM collab_applications WHERE id = p_application_id)
    AND poster_id = p_poster_id;

    -- Decline all other applications for this post
    UPDATE collab_applications
    SET status = 'declined', responded_at = NOW()
    WHERE post_id = (SELECT post_id FROM collab_applications WHERE id = p_application_id)
    AND id != p_application_id;

    -- Insert notification for accepted applicant
    INSERT INTO notifications (user_id, actor_id, type, entity_id)
    VALUES (
        (SELECT applicant_id FROM collab_applications WHERE id = p_application_id),
        p_poster_id,
        'collab_application_accepted',
        p_application_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle declining an application
CREATE OR REPLACE FUNCTION decline_collab_application(p_application_id INTEGER, p_poster_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE collab_applications
    SET status = 'declined', responded_at = NOW()
    WHERE id = p_application_id AND post_id IN (
        SELECT id FROM collab_posts WHERE poster_id = p_poster_id
    );

    -- Insert notification for declined applicant
    INSERT INTO notifications (user_id, actor_id, type, entity_id)
    VALUES (
        (SELECT applicant_id FROM collab_applications WHERE id = p_application_id),
        p_poster_id,
        'collab_application_declined',
        p_application_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to create notification when application is submitted
CREATE OR REPLACE FUNCTION notify_application_submitted()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, actor_id, type, entity_id)
    VALUES (
        (SELECT poster_id FROM collab_posts WHERE id = NEW.post_id),
        NEW.applicant_id,
        'collab_application_received',
        NEW.id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_application_submitted
    AFTER INSERT ON collab_applications
    FOR EACH ROW EXECUTE FUNCTION notify_application_submitted();
