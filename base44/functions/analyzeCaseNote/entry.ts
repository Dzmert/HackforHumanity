import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { analyseNarrative } from '../../shared/caseNoteAnalysis.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { narrative } = await req.json();
    if (!narrative || String(narrative).length > 20000) {
      return Response.json({ error: 'A narrative is required and must be under 20,000 characters' }, { status: 400 });
    }

    const result = await analyseNarrative(base44, narrative);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}