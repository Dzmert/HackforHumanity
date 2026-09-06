import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { note, clientReference, letterType } = await req.json();
    if (!note || String(note).length > 12000) return Response.json({ error: 'Case note is required and must be under 12,000 characters' }, { status: 400 });
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Using trauma-informed, strengths-based language, extract structured information from this case note and draft a ${letterType || 'general'} support letter. Refer to the person only as ${clientReference || 'the client'}. Do not invent facts. Note: ${note}`,
      response_json_schema: { type: 'object', properties: { key_needs: { type: 'array', items: { type: 'string' } }, strengths: { type: 'array', items: { type: 'string' } }, safety_considerations: { type: 'array', items: { type: 'string' } }, next_steps: { type: 'array', items: { type: 'string' } }, subject: { type: 'string' }, letter_body: { type: 'string' } }, required: ['key_needs', 'strengths', 'safety_considerations', 'next_steps', 'subject', 'letter_body'] }
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}