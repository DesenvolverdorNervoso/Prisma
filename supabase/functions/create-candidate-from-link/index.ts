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

    let tenant_id, public_token, data, resumeFile;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      tenant_id = formData.get('tenant_id') as string;
      public_token = formData.get('public_token') as string;
      const dataStr = formData.get('data') as string;
      data = JSON.parse(dataStr);
      resumeFile = formData.get('resume') as File | null;
    } else {
      const body = await req.json();
      tenant_id = body.tenant_id;
      public_token = body.public_token;
      data = body.data;
    }

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
      .select('id, resume_path')
      .eq('tenant_id', tenant_id)
      .eq('whatsapp', whatsapp)
      .maybeSingle()

    const isUpdate = !!existingCandidate

    // 4. Handle Resume Upload if present
    let resumePath = existingCandidate?.resume_path || null;

    if (resumeFile && resumeFile instanceof File) {
      // Validate file size (10MB)
      if (resumeFile.size > 10 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: 'file_too_large', message: 'Arquivo muito grande. Máximo 10MB.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];
      if (!allowedTypes.includes(resumeFile.type)) {
        return new Response(
          JSON.stringify({ error: 'invalid_file_type', message: 'Formato inválido. Use PDF, DOC ou DOCX.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const sanitizedFileName = resumeFile.name.replace(/[^a-zA-Z0-9.]/g, '_')
      const timestamp = Date.now()
      const path = `${tenant_id}/${whatsapp}/${timestamp}-${sanitizedFileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(path, resumeFile, {
          contentType: resumeFile.type,
          upsert: true
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return new Response(
          JSON.stringify({ error: 'upload_failed', message: 'Erro ao fazer upload do currículo.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      resumePath = uploadData.path
    }

    // 5. Upsert Candidate
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

    const candidatePayload = {
      ...data,
      whatsapp,
      tenant_id,
      origin: 'Link',
      profile_expires_at: expiresAt.toISOString(),
      status: data.status || 'Novo',
      updated_at: new Date().toISOString(),
      resume_path: resumePath
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

    // 6. Mark invite as used if not multiple
    if (!invite.allow_multiple) {
      await supabase
        .from('public_invites')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invite.id)
    }

    return new Response(
      JSON.stringify({ 
        candidate,
        isUpdate,
        resume_path: resumePath
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
