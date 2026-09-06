import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(authError => {
      console.error('[extractDonationForm] auth.me() failed:', authError.message);
      throw authError;
    });
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fileUrl } = await req.json();
    if (!fileUrl || typeof fileUrl !== 'string') {
      return Response.json({ error: 'A scanned donation form (fileUrl) is required' }, { status: 400 });
    }

    // Give the model the existing stock names so it can match items to what we already track
    // instead of inventing near-duplicate names ("tinned beans" vs "Tinned Beans").
    const existingItems = await base44.asServiceRole.entities.InventoryItem.list('-created_date', 200).catch(listError => {
      console.error('[extractDonationForm] InventoryItem.list() failed:', listError.message);
      throw listError;
    });
    const knownNames = existingItems.map(item => item.name).filter(Boolean);

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are reading a scanned or photographed donation form for Lou's Place, a support service.

Extract only what is actually written on the form. Never invent a donor, an item, or a number. If a field is blank, unreadable, or missing, leave text fields empty and use 0 for numbers, then add a short note in "warnings" describing what could not be read.

For each donated item, read its name, the quantity, and the unit of measure (for example items, kg, packs, boxes, litres). If no unit is written, use "items". If a quantity is written as a word ("three"), convert it to a number. If a quantity is blank or unreadable, set quantity to 0 and add a warning so a person fills it in.

Match each item to one of these existing stock names when it clearly refers to the same thing, and return that exact existing name in "matched_stock_name". If there is no clear match, leave "matched_stock_name" empty so a new stock item can be created.
Existing stock names: ${knownNames.length ? knownNames.join(', ') : '(none yet)'}

Also read the donor's name and email address, the date on the form, and any monetary (cash) amount donated. A monetary amount is money only, never a count of goods. Use 0 when no cash amount is written.`,
      file_urls: [fileUrl],
      // Every field is a plain scalar type. Nullable unions (["number", "null"]) are not
      // carried through the structured-output pipeline, so unreadable numbers come back
      // as 0 and are flagged in "warnings" instead, the same way the case note analysis
      // uses a "Not stated" sentinel rather than a null.
      response_json_schema: {
        type: 'object',
        properties: {
          donor_name: { type: 'string', description: 'Donor name exactly as written, or empty if not readable.' },
          donor_email: { type: 'string', description: 'Donor email exactly as written, or empty if not readable.' },
          donation_date: { type: 'string', description: 'Date on the form in YYYY-MM-DD if determinable, otherwise empty.' },
          monetary_amount: { type: 'number', description: 'Cash amount donated, or 0 if no money was donated.' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Item name as written on the form.' },
                matched_stock_name: { type: 'string', description: 'Exact existing stock name this refers to, or empty when there is no clear match.' },
                quantity: { type: 'number', description: 'Quantity donated, or 0 if it is blank or unreadable.' },
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
    console.error('[extractDonationForm] failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
