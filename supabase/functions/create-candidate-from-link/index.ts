import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    // Create Supabase client with Service Role Key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { tenant_id, public_token, data } = await req.json()

    if (!tenant_id || !public_token || !data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 1. Validate Token
    const { data: invite, error: inviteError } = await supabase
      .from('public_invites')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('public_token', public_token)
      .gt('expires_at', new Date().toISOString())
      .or('used_at.is.null,allow_multiple.eq.true')
      .single()

    if (inviteError || !invite) {
      console.error('Invite validation error:', inviteError)
      return new Response(
        JSON.stringify({ error: 'invalid_token', message: 'Link inválido ou expirado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 2. Normalize WhatsApp (digits only)
    const whatsapp = data.whatsapp.replace(/\D/g, '')

    // 3. Check if candidate already exists to determine isUpdate
    const { data: existingCandidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('whatsapp', whatsapp)
      .single()

    const isUpdate = !!existingCandidate

    // 4. Upsert Candidate
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

    const candidatePayload = {
      ...data,
      whatsapp,
      tenant_id,
      origin: 'Link',
      profile_expires_at: expiresAt.toISOString(),
      status: data.status || 'Novo',
      updated_at: new Date().toISOString()
    }

    // Remove ID if present to avoid conflicts during upsert
    delete candidatePayload.id

    const { data: candidate, error: upsertError } = await supabase
      .from('candidates')
      .upsert(candidatePayload, { 
        onConflict: 'tenant_id,whatsapp'
      })
      .select()
      .single()

    if (upsertError) {
      console.error('Candidate upsert error:', upsertError)
      return new Response(
        JSON.stringify({ error: 'db_error', message: 'Erro ao salvar candidato no banco de dados' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 5. Mark invite as used if not multiple
    if (!invite.allow_multiple) {
      await supabase
        .from('public_invites')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invite.id)
    }

    return new Response(
      JSON.stringify({ 
        candidate,
        isUpdate
      }),
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
