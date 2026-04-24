import { Link } from "react-router-dom";
import { CHAT_URL, CREATE_WALLET_URL } from "@/lib/api";

const Code = ({ children }: { children: React.ReactNode }) => (
  <pre className="bg-surface-2 border border-soft rounded-sm p-4 font-mono text-[12px] overflow-x-auto text-foreground whitespace-pre-wrap break-words">
    {children}
  </pre>
);

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-display font-extrabold text-xl mt-10 mb-3 text-cyan">{children}</h2>
);

const Docs = () => {
  return (
    <div className="min-h-screen">
      <header className="border-b border-soft bg-surface/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between py-3">
          <Link to="/" className="font-display font-extrabold text-lg">
            ← PromptPay
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted">API Reference</span>
        </div>
      </header>

      <main className="container py-10 max-w-3xl">
        <h1 className="font-display font-extrabold text-4xl">PromptPay API</h1>
        <p className="text-muted font-mono text-[12px] mt-2">
          A pay-per-token LLM gateway. Bring an API key, stream tokens, settle USDC every 50 tokens on Arc.
        </p>

        <H>1 · How it works</H>
        <ol className="list-decimal pl-5 space-y-2 font-mono text-[13px]">
          <li>Create an account → receive an API key + 10 USDC testnet balance.</li>
          <li>POST to <code className="text-cyan">/chat</code> with your messages.</li>
          <li>Tokens stream back via Server-Sent Events.</li>
          <li>Every 50 tokens we record a USDC settlement row in the database. The dashboard updates live via Supabase Realtime.</li>
          <li>Final <code>done</code> event includes a full economic proof comparing Arc vs. Ethereum L1.</li>
        </ol>

        <H>2 · Endpoints</H>
        <Code>{`# Create account
POST ${CREATE_WALLET_URL}

# Chat (SSE stream)
POST ${CHAT_URL}
Headers:
  X-API-Key: pp_your_key
Body:
  { "messages": [{ "role": "user", "content": "Hello" }] }`}</Code>

        <H>3 · SSE event types</H>
        <p className="font-mono text-[12px] text-muted mb-2">Each line is <code>data: &#123;...&#125;\n\n</code>.</p>
        <Code>{`// type: "token"
{ "type":"token", "text":"Hello", "chunkTokens":2, "totalTokens":2 }

// type: "settlement"  (every 50 tokens)
{ "type":"settlement",
  "settlementNumber":1,
  "tokens":50,
  "usdcAmount":"0.005000",
  "totalUsdcPaid":"0.005000",
  "totalTokens":50,
  "transferId":"arc_a3f9b2c1d4e5f0a1b2c3d4e5",
  "status":"complete",
  "timestamp":"2025-01-01T00:00:00.000Z" }

// type: "done"  (final summary + economic proof)
{ "type":"done",
  "summary": { "totalTokens":214, "totalUsdcPaid":"0.021400", "settlementCount":5, ... },
  "economicProof": { "gasCostOnArc":"$0.0000000050",
                     "gasCostOnEthL1":"$10.00",
                     "verdict":"IMPOSSIBLE on Ethereum L1: ..." } }

// type: "error"
{ "type":"error", "message":"..." }`}</Code>

        <H>4 · Pricing</H>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-[12px] border border-soft">
            <thead className="bg-surface-2">
              <tr><th className="text-left p-2">Model</th><th className="text-left p-2">Price / Token</th><th className="text-left p-2">Settlement Batch</th></tr>
            </thead>
            <tbody>
              <tr className="border-t border-soft">
                <td className="p-2">gemini-2.0-flash</td>
                <td className="p-2 text-green">$0.000100</td>
                <td className="p-2">50 tokens ($0.005000)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <H>5 · Economic proof</H>
        <Code>{`At 50-token settlements:

  Revenue / settlement   $0.005000 USDC
  Gas on Arc             ~$0.000000001  (negligible)
  Gas on Ethereum L1     ~$2.00

  Margin on Arc          ~99.98%
  Margin on Ethereum L1  −39,900%

This is why pay-per-token billing only works on Arc.`}</Code>

        <H>6 · Quick example</H>
        <Code>{`const res = await fetch("${CHAT_URL}", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-API-Key": "pp_..." },
  body: JSON.stringify({ messages: [{ role: "user", content: "Hi" }] }),
});

const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buf = "";
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  for (const part of buf.split("\\n\\n")) {
    if (!part.startsWith("data: ")) continue;
    const evt = JSON.parse(part.slice(6));
    console.log(evt.type, evt);
  }
}`}</Code>

        <div className="mt-10 mb-12">
          <Link to="/" className="font-mono text-[12px] uppercase tracking-wider text-cyan">
            ← Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Docs;
