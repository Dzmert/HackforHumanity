import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    const inThirtyDays = new Date(today.getTime() + 30 * 86400000);
    const [requirements, stock, alerts] = await Promise.all([
      base44.asServiceRole.entities.GrantRequirement.filter({ status: { $ne: 'complete' } }),
      base44.asServiceRole.entities.InventoryItem.list(),
      base44.asServiceRole.entities.Alert.filter({ resolved: false })
    ]);
    const existing = new Set(alerts.map((a) => `${a.module}:${a.source_id}`));
    const next = [];
    for (const r of requirements) if (new Date(r.due_date) <= inThirtyDays && !existing.has(`grants:${r.id}`)) next.push({ module: 'grants', title: 'Grant action approaching', message: r.title, priority: new Date(r.due_date) < today ? 'high' : 'medium', due_date: r.due_date, source_id: r.id });
    for (const item of stock) if (item.quantity <= item.minimum_level && !existing.has(`supply:${item.id}`)) next.push({ module: 'supply', title: `${item.name} is running low`, message: `${item.quantity} ${item.unit} remaining; preferred level is ${item.minimum_level}.`, priority: item.quantity === 0 ? 'high' : 'medium', source_id: item.id });
    if (next.length) await base44.asServiceRole.entities.Alert.bulkCreate(next);
    return Response.json({ created: next.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}