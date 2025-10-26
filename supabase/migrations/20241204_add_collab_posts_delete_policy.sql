-- Allow posters to delete their own collab posts only if status is 'open' or 'cancelled'
CREATE POLICY "Posters can delete their own open or cancelled posts" ON collab_posts
    FOR DELETE USING (
        auth.uid() = poster_id AND
        status IN ('open', 'cancelled')
    );
