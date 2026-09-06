import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fileUrl } = await req.json();
    if (!fileUrl || typeof fileUrl !== 'string') {
      return Response.json({ error: 'A scanned donation form (fileUrl) is required' }, { status: 400 });
    }

    // Give the model the existing stock names so it can match items to what we already track
    // instead of inventing near-duplicate names ("tinned beans" vs "Tinned Beans").
    const existingItems = await base44.asServiceRole.entities.InventoryItem.list('-created_date', 200);
    const knownNames = existingItems.map(item => item.name).filter(Boolean);

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are reading a scanned or photographed donation form for Lou's Place, a support service.

Extract only what is actually written on the form. Never invent a donor, an item, or a number. If a field is blank, unreadable, or missing, leave it empty (or null for numbers) and add a short note in "warnings" describing what could not be read.

For each donated item, read its name, the quantity, and the unit of measure (for example items, kg, packs, boxes, litres). If no unit is written, use "items". If a quantity is written as a word ("three"), convert it to a number. If a quantity is unreadable, set quantity to null and add a warning.

Match each item to one of these existing stock names when it clearly refers to the same thing, and return that exact existing name in "matched_stock_name". If there is no clear match, leave "matched_stock_name" empty so a new stock item can be created.
Existing stock names: ${knownNames.length ? knownNames.join(', ') : '(none yet)'}

Also read the donor's name and email address, the date on the form, and any monetary (cash) amount donated. A monetary amount is money only, never a count of goods.`,
      file_urls: [fileUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          donor_name: { type: 'string', description: 'Donor name exactly as written, or empty if not readable.' },
          donor_email: { type: 'string', description: 'Donor email exactly as written, or empty if not readable.' },
          donation_date: { type: 'string', description: 'Date on the form in YYYY-MM-DD if determinable, otherwise empty.' },
          monetary_amount: { type: ['number', 'null'], description: 'Cash amount donated, or null if none written.' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Item name as written on the form.' },
                matched_stock_name: { type: 'string', description: 'Exact existing stock name this refers to, or empty when there is no clear match.' },
                quantity: { type: ['number', 'null'], description: 'Quantity donated, or null if unreadable.' },
                unit: { type: 'string', description: 'Unit of measure, defaulting to "items".' }
              },
              required: ['name', 'matched_stock_name', 'quantity', 'unit']
            }
          },
          warnings: {
            type: 'array',
            items: { type: 'string' },
            description: 'Anything blank, ambiguous, or unreadable that a person should check before the stock is updated.'
          }
        },
        required: ['donor_name', 'donor_email', 'donation_date', 'monetary_amount', 'items', 'warnings']
      }
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
