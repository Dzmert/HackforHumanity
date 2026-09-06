import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { PROVISIONAL_CHECKLISTS, resolveChecklists } from '../../shared/specialisationChecklists.ts';

/**
 * Returns one specialisation's checklist plus, where the client is known, what
 * has already been established for her — so a caseworker working outside her own
 * specialisation can see what usually matters here without waiting on anyone.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'caseworker', 'project_services_manager'].includes(user.role)) {
      return Response.json({ error: 'Not permitted' }, { status: 403 });
    }
    const service = base44.asServiceRole;

    const { specialisation, clientId } = await req.json();
    if (!PROVISIONAL_CHECKLISTS[specialisation]) {
      return Response.json({ error: 'Unknown specialisation' }, { status: 400 });
    }

    const authored = await service.entities.SpecialisationChecklistItem.list('-created_date', 300);
    const items = resolveChecklists([specialisation], authored)[specialisation];

    let coverage = [];
    if (clientId) {
      coverage = await service.entities.ClientCoverage.filter({ client_id: clientId, specialisation }, '-created_date', 200);
    }

    return Response.json({
      specialisation,
      items: items.map(item => ({
        key: item.key,
        label: item.label,
        status: coverage.find(record => record.item_key === item.key)?.status || 'Not yet covered'
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}