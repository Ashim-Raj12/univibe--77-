-- Fix collab_applications INSERT policy
-- Drop the existing restrictive policy and create a more permissive one

DROP POLICY IF EXISTS "Users can apply to open posts" ON collab_applications;

-- Allow authenticated users to apply to open posts that aren't their own
CREATE POLICY "Authenticated users can apply to open posts" ON collab_applications
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        applicant_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM collab_posts
            WHERE collab_posts.id = post_id
            AND collab_posts.status = 'open'
            AND collab_posts.poster_id != auth.uid()
        )
    );
