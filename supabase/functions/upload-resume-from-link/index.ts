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
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const tenantId = formData.get('tenant_id') as string
    const publicToken = formData.get('public_token') as string
    const candidateTempId = formData.get('candidate_temp_id') as string

    if (!file || !tenantId || !publicToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 1. Validate Token (Security Check)
    const { data: invite, error: inviteError } = await supabase
      .from('public_invites')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('public_token', publicToken)
      .gt('expires_at', new Date().toISOString())
      .or('used_at.is.null,allow_multiple.eq.true')
      .single()

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: 'invalid_token', message: 'Link inválido ou expirado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // 2. Upload to Storage
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_')
    const path = `${tenantId}/candidates/${candidateTempId || 'temp'}/${Date.now()}_${sanitizedFileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(path, file, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(
        JSON.stringify({ error: 'upload_failed', message: uploadError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 3. Generate Signed URL (7 days)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('resumes')
      .createSignedUrl(path, 60 * 60 * 24 * 7)

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError)
    }

    return new Response(
      JSON.stringify({
        path: uploadData.path,
        url: signedUrlData?.signedUrl,
        name: file.name,
        size: file.size,
        mime: file.type
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
