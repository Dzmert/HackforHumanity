import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { filterCountableMovements } from '../../shared/movementCountability.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { supply_item, storage_location } = await req.json();
    if (typeof supply_item !== 'string' || !supply_item.trim() || typeof storage_location !== 'string' || !storage_location.trim()) {
      return Response.json({ error: 'supply_item and storage_location are required' }, { status: 400 });
    }

    const snapshots = await base44.entities.StockBalance.filter(
      { supply_item, storage_location },
      '-last_movement_timestamp_included',
      1
    );
    const snapshot = snapshots[0] || null;
    const snapshotBalance = snapshot ? Number(snapshot.balance) || 0 : 0;
    const movementFilter = { supply_item, storage_location };
    if (snapshot?.last_movement_timestamp_included) {
      movementFilter.timestamp = { $gt: snapshot.last_movement_timestamp_included };
    }

    let newerMovementDelta = 0;
    let skip = 0;
    const pageSize = 500;
    while (true) {
      const movements = await base44.entities.StockMovement.filter(movementFilter, 'timestamp', pageSize, skip);
      const countable = await filterCountableMovements(base44, movements);
      newerMovementDelta += countable.reduce((sum, movement) => sum + (Number(movement.quantity_delta) || 0), 0);
      if (movements.length < pageSize) break;
      skip += pageSize;
    }

    return Response.json({ quantity_on_hand: snapshotBalance + newerMovementDelta });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to calculate quantity on hand' }, { status: 500 });
  }
}