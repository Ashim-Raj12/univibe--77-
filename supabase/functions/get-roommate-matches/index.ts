// supabase/functions/get-roommate-matches/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenAI, Type } from 'npm:@google/genai@1.24.0'
import { corsHeaders } from '../_shared/cors.ts'
import { Profile } from '../../types.ts'

declare const Deno: any;

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- START: Environment Variable and Authorization Checks ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!supabaseUrl || !supabaseAnonKey || !geminiApiKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing environment variables. Please ensure SUPABASE_URL, SUPABASE_ANON_KEY, and GEMINI_API_KEY are set.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
        });
    }
    // --- END: Checks ---

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid user session.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // 1. Fetch current user's preferences and profile
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('college')
      .eq('id', user.id)
      .single();

    const { data: userPrefs, error: prefsError } = await supabaseClient
      .from('roommate_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || prefsError || !userProfile?.college || !userPrefs) {
      throw new Error('Could not fetch your profile or roommate preferences. Please ensure you have set them on your profile.');
    }
    
    // 2. Fetch all potential roommates' preferences from the same college
    // FIX: Be explicit with column selection to avoid potential conflicts if `roommate_preferences` is a view.
    const { data: potentialRoommates, error: fetchError } = await supabaseClient
      .from('roommate_preferences')
      .select('user_id, smoking_habits, sleep_schedule, cleanliness, social_habits, guests_policy, profile:profiles!inner(*)')
      .eq('profile.college', userProfile.college)
      .neq('user_id', user.id);

    if (fetchError) throw fetchError;
    if (!potentialRoommates || potentialRoommates.length === 0) {
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Call Gemini API for matching
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const currentUserPrefsForAI = { user_id: user.id, ...userPrefs };
    const otherUsersPrefsForAI = potentialRoommates.map(p => ({
        user_id: p.user_id,
        smoking_habits: p.smoking_habits,
        sleep_schedule: p.sleep_schedule,
        cleanliness: p.cleanliness,
        social_habits: p.social_habits,
        guests_policy: p.guests_policy,
    }));

    const prompt = `You are a roommate compatibility expert. My preferences are: ${JSON.stringify(currentUserPrefsForAI)}. Here is a list of potential roommates: ${JSON.stringify(otherUsersPrefsForAI)}. For each potential roommate, calculate a compatibility score from 0 to 100 and provide 2-3 key matching reasons. Return the result as a JSON array matching the provided schema. Only return the JSON array.`;

    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          user_id: { type: Type.STRING },
          match_score: { type: Type.INTEGER },
          matching_reasons: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "One of: cleanliness, sleep_schedule, smoking_habits, social_habits, guests_policy" },
                value: { type: Type.STRING, description: "A short, user-friendly reason, e.g., 'Both are very tidy'" }
              },
              required: ["type", "value"]
            }
          }
        },
        required: ["user_id", "match_score", "matching_reasons"]
      }
    };
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema,
      }
    });

    const matchData = JSON.parse(response.text);

    // 4. Combine Gemini results with full profile data
    const profileMap = new Map(potentialRoommates.map(p => {
      const profileObject = Array.isArray(p.profile) ? p.profile[0] : p.profile;
      return [p.user_id, profileObject];
    }));

    const combinedMatches = matchData
      .map((match: any) => {
        const userProfile = profileMap.get(match.user_id) as Profile;
        if (!userProfile) return null;
        
        return {
          ...userProfile,
          match_score: match.match_score,
          matching_reasons: match.matching_reasons,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.match_score - a.match_score);

    return new Response(JSON.stringify(combinedMatches), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
