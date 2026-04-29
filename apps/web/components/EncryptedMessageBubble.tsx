import { LockKeyhole, ShieldCheck } from "lucide-react";

type EncryptedMessageBubbleProps = {
  sender: string;
  message: string;
  time: string;
  own?: boolean;
  status?: string;
};

export function EncryptedMessageBubble({
  sender,
  message,
  time,
  own = false,
  status = "sealed"
}: EncryptedMessageBubbleProps) {
  return (
    <div className={`flex ${own ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] border p-2 ${
          own ? "border-gold bg-gold text-black" : "border-line bg-panel text-zinc-100"
        }`}
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="mesh-label">{sender}</span>
          <span className="font-mono text-[0.62rem]">{time}</span>
        </div>
        <p className="text-xs leading-5">{message}</p>
        <div className="mt-2 flex items-center gap-1 font-mono text-[0.62rem] uppercase">
          {own ? (
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          ) : (
            <LockKeyhole className="h-3 w-3 text-paid" aria-hidden="true" />
          )}
          {status}
        </div>
      </div>
    </div>
  );
}
