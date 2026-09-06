import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isCaseworker } from '../../shared/grants.js';
import { answerFromData, llmContext, referencesFromText, NOT_FOUND } from '../../shared/grantAssistant.js';

// Read-only assistant: it never writes, deletes or sends anything.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isCaseworker(user)) {
      return Response.json({ error: 'The Grant Assistant is available to caseworkers only' }, { status: 403 });
    }

    const body = await req.json();
    const question = String(body.question || '').trim();
    if (!question) return Response.json({ error: 'A question is required' }, { status: 400 });
    if (question.length > 500) return Response.json({ error: 'Please shorten the question.' }, { status: 400 });

    const [grants, requirements] = await Promise.all([
      base44.asServiceRole.entities.Grant.list('-created_date', 200),
      base44.asServiceRole.entities.GrantRequirement.list('-created_date', 500)
    ]);

    if (!grants.length) {
      return Response.json({ answer: NOT_FOUND, references: [], source: 'data' });
    }

    // Dates, amounts, counts, statuses, people and deadlines are calculated here.
    const computed = answerFromData(question, grants, requirements);
    if (computed.handled) {
      return Response.json({ answer: computed.answer, references: computed.references, source: 'data' });
    }

    // Open-ended wording only: the model interprets the question and must answer
    // strictly from the records supplied below.
    const context = llmContext(grants, requirements);
    let answer = '';
    try {
      answer = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: [
        "You are the Grant Assistant for Lou's Place, a small non-profit. Answer only from the JSON grant records supplied below.",
        'Rules:',
        '- Use only the supplied records. Never invent grants, funders, people, amounts or dates.',
        `- If the records do not contain the answer, or only partly contain it, reply with exactly this and nothing else: ${NOT_FOUND}`,
        '- Never guess, estimate or draw on outside knowledge. No answer is better than an uncertain one.',
        '- Be concise: at most 5 short lines. Refer to grants by their exact recorded name.',
        `- Today is ${context.today} (Australia/Sydney). Amounts are AUD.`,
        '- You are read-only: never suggest that you have changed, sent or completed anything.',
        '',
        'RECORDS:',
        JSON.stringify(context),
        '',
        'QUESTION:',
        question
      ].join('\n')
      });
    } catch {
      // A model failure must still give the caseworker a clear, honest answer.
      answer = '';
    }

    const text = typeof answer === 'string' ? answer.trim() : String(answer ?? '').trim();
    return Response.json({
      answer: text || NOT_FOUND,
      references: text ? referencesFromText(text, grants) : [],
      source: 'ai'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}