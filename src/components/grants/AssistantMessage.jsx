import { ArrowUpRight, Sparkles } from 'lucide-react';

/** One turn of the Grant Assistant conversation. */
export default function AssistantMessage({ message, onOpenGrant }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#A45846] px-4 py-2.5 text-sm text-white">{message.text}</p>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Sparkles className="mt-2 shrink-0 text-[#A45846]" size={16} />
      <div className="min-w-0 max-w-[90%]">
        <div className={`rounded-2xl rounded-bl-sm px-4 py-3 text-sm ${message.failed ? 'bg-[#FCF3F1] text-[#8A2E1D]' : 'bg-white text-[#3D342F]'}`}>
          {message.text.split('\n').map((line, index) => (
            <p key={index} className={index ? 'mt-1' : ''}>{line}</p>
          ))}
        </div>

        {!!message.references?.length && (
          <ul className="mt-2 grid gap-1.5">
            {message.references.map((reference, index) => (
              <li key={`${reference.grantId}-${index}`}>
                <button
                  onClick={() => onOpenGrant(reference.grantId)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#E5D6C8] bg-white px-3 py-2 text-left text-sm text-[#7D4037] hover:border-[#A45846]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{reference.label}</span>
                    {reference.detail && <span className="block truncate text-xs text-[#756760]">{reference.detail}</span>}
                  </span>
                  <ArrowUpRight size={16} className="shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}