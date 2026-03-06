import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    // Create Supabase client with Service Role Key to bypass RLS for writes
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the session user from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'missing_jwt', message: 'Authorization header ausente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'invalid_jwt', message: 'JWT inválido ou expirado: ' + (authError?.message || 'usuário não encontrado') }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Get user's tenant_id from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_not_found', message: 'Usuário sem tenant_id no profiles' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const tenant_id = profile.tenant_id
    const { job_id } = await req.json().catch(() => ({}))

    // Generate 8 chars alfanum token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 8; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invite
    const { data: invite, error: inviteError } = await supabase
      .from('public_invites')
      .insert({
        tenant_id,
        job_id: job_id || null,
        token,
        mode: job_id ? 'job' : 'general',
        expires_at: expiresAt.toISOString(),
        max_uses: 1,
        uses: 0,
        is_active: true,
        created_by: user.id
      })
      .select('token, tenant_id, job_id, expires_at, max_uses, uses, is_active')
      .single()

    if (inviteError) {
      console.error('Invite creation error:', inviteError)
      return new Response(
        JSON.stringify({ error: 'insert_failed', message: inviteError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ invite }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'server_error', message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
