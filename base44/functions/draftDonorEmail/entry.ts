import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { donorName, itemName, quantity, minimumLevel } = await req.json();
    if (!donorName || !itemName || String(itemName).length > 100) return Response.json({ error: 'Invalid input' }, { status: 400 });
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Draft a warm, respectful donor outreach email from Lou's Place to ${donorName}. Stock of ${itemName} is ${quantity}, below the preferred level of ${minimumLevel}. Ask whether they may be able to help replenish it. Do not pressure or imply obligation. Return JSON with subject and body.`,
      response_json_schema: { type: 'object', properties: { subject: { type: 'string' }, body: { type: 'string' } }, required: ['subject', 'body'] }
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}