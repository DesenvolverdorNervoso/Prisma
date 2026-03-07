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
        JSON.stringify({ error: 'missing_fields', message: 'Campos obrigatórios ausentes (tenant_id, public_token ou data)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!data.whatsapp) {
      return new Response(
        JSON.stringify({ error: 'missing_whatsapp', message: 'WhatsApp é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 1. Validate Invite
    const { data: invite, error: inviteError } = await supabase
      .from('public_invites')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('token', public_token)
      .eq('is_active', true)
      .maybeSingle()

    if (inviteError || !invite) {
      console.error('Invite lookup error or not found:', inviteError)
      return new Response(
        JSON.stringify({ error: 'invalid_token', message: 'Link inválido ou não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check expiration
    const now = new Date()
    const expiresAt = new Date(invite.expires_at)
    if (expiresAt < now) {
      return new Response(
        JSON.stringify({ error: 'expired_token', message: 'Este link expirou' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check max_uses
    if (invite.max_uses !== null && invite.uses >= invite.max_uses) {
      return new Response(
        JSON.stringify({ error: 'max_uses_reached', message: 'Este link já foi utilizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 2. Normalize WhatsApp (digits only)
    const whatsapp = data.whatsapp.replace(/\D/g, '')

    // 3. Check if candidate already exists (for isUpdate)
    const { data: existingCandidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('whatsapp', whatsapp)
      .maybeSingle()

    const isUpdate = !!existingCandidate

    // 4. Upsert Candidate
    const profileExpiresAt = new Date()
    profileExpiresAt.setDate(profileExpiresAt.getDate() + 90)

    const candidatePayload = {
      ...data,
      whatsapp,
      tenant_id, // Ensure tenant_id is from the invite
      origin: 'Link',
      profile_expires_at: profileExpiresAt.toISOString(),
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
        JSON.stringify({ error: 'db_error', message: 'Erro ao salvar candidato no banco de dados: ' + upsertError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 5. Update Invite Uses
    const newUses = (invite.uses || 0) + 1
    let isActive = invite.is_active
    if (invite.max_uses !== null && newUses >= invite.max_uses) {
      isActive = false
    }

    const { error: updateInviteError } = await supabase
      .from('public_invites')
      .update({ uses: newUses, is_active: isActive })
      .eq('id', invite.id)

    if (updateInviteError) {
      console.error('Update invite uses error:', updateInviteError)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
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
