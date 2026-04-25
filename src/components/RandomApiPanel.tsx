// Paid Random Number API demo panel.
// Three-step flow with optional 50-call bulk test that streams settlements
// into the existing realtime transactions feed.

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Dice5,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Play,
  Receipt,
  Rocket,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { callPaidRandom, createWallet, type RandomPayResponse } from "@/lib/api";

const LS_KEY = "promptpay.apiKey";

interface Result {
  idx: number;
  ok: boolean;
  random?: number;
  txHash?: string;
  amount?: number;
  settlementNumber?: number;
  error?: string;
  ms: number;
}

interface Props {
  compact?: boolean; // compact = dashboard widget mode
}

export function RandomApiPanel({ compact = false }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [running, setRunning] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<Result[]>([]);
  const [latest, setLatest] = useState<RandomPayResponse | null>(null);

  // Hydrate key
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) setApiKey(saved);
  }, []);

  const commitKey = (k: string) => {
    setApiKey(k);
    if (k.trim()) localStorage.setItem(LS_KEY, k.trim());
  };

  const provisionKey = async () => {
    setProvisioning(true);
    try {
      const r = await createWallet();
      commitKey(r.apiKey);
      toast.success("New wallet · 10 USDC funded");
    } catch (e: any) {
      toast.error("Provision failed", { description: e?.message });
    } finally {
      setProvisioning(false);
    }
  };

  const requireKey = (): string | null => {
    const k = apiKey.trim();
    if (!k) {
      toast.error("API key required", {
        description: "Paste a key or click Generate to fund a new wallet.",
      });
      return null;
    }
    return k;
  };

  const callOnce = async () => {
    const key = requireKey();
    if (!key) return;
    setRunning(true);
    const t0 = performance.now();
    try {
      const r = await callPaidRandom(key);
      const ms = Math.round(performance.now() - t0);
      setLatest(r);
      setResults((prev) => [
        {
          idx: (prev[0]?.idx ?? 0) + 1,
          ok: true,
          random: r.random,
          txHash: r.txHash,
          amount: r.amountPaid,
          settlementNumber: r.settlementNumber,
          ms,
        },
        ...prev,
      ].slice(0, 60));
      toast.success("Paid random delivered", {
        description: `$${r.amountPaid.toFixed(4)} settled on Arc · #${r.settlementNumber}`,
      });
    } catch (e: any) {
      toast.error("Call failed", { description: e?.message });
    } finally {
      setRunning(false);
    }
  };

  const bulk50 = async () => {
    const key = requireKey();
    if (!key) return;
    const total = 50;
    setBulkRunning(true);
    setBulkProgress({ done: 0, total });
    setResults([]);
    let okCount = 0;
    for (let i = 1; i <= total; i++) {
      const t0 = performance.now();
      try {
        const r = await callPaidRandom(key);
        const ms = Math.round(performance.now() - t0);
        okCount++;
        setLatest(r);
        setResults((prev) => [
          {
            idx: i,
            ok: true,
            random: r.random,
            txHash: r.txHash,
            amount: r.amountPaid,
            settlementNumber: r.settlementNumber,
            ms,
          },
          ...prev,
        ].slice(0, 60));
      } catch (e: any) {
        const ms = Math.round(performance.now() - t0);
        setResults((prev) => [
          { idx: i, ok: false, error: e?.message ?? "fail", ms },
          ...prev,
        ].slice(0, 60));
      }
      setBulkProgress({ done: i, total });
    }
    setBulkRunning(false);
    toast.success(`Bulk complete · ${okCount}/${total} on-chain`, {
      description: `Total spent ~$${(okCount * 0.001).toFixed(3)} USDC`,
    });
  };

  const totalSpent = useMemo(
    () => results.filter((r) => r.ok).reduce((s, r) => s + (r.amount ?? 0), 0),
    [results]
  );
  const okCount = results.filter((r) => r.ok).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg border border-purple bg-surface-2 p-4 glow-purple">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-purple">
              POST /api/random · Per-API Monetization
              <span className="rounded bg-[hsl(16_100%_60%_/_0.15)] px-1.5 py-0.5 text-orange">
                Arc Testnet (Mocked)
              </span>
            </div>
            <h3 className="mt-1 font-display text-2xl font-extrabold text-foreground">
              Pay $0.001 USDC → Get Random Number
            </h3>
            <p className="mt-2 max-w-2xl font-mono text-[12px] leading-6 text-muted">
              3-step flow: <span className="text-foreground">/api/challenge</span> issues a payment ID,
              <span className="text-foreground"> arcSDK.createPayment</span> settles via Arc,
              <span className="text-foreground"> POST /api/random</span> verifies and returns a
              cryptographically secure random number with the on-chain tx hash.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-purple text-white">
            <Dice5 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* API Key */}
      <div className="rounded-lg border border-soft bg-surface p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            <KeyRound className="h-3.5 w-3.5 text-purple" /> Caller Wallet API Key
          </div>
          <button
            type="button"
            onClick={provisionKey}
            disabled={running || bulkRunning || provisioning}
            className="font-mono text-[10px] uppercase tracking-wider text-purple hover:underline disabled:opacity-50"
          >
            {provisioning ? "Generating…" : "Generate new"}
          </button>
        </div>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => commitKey(e.target.value)}
            placeholder="pp_your_api_key"
            autoComplete="off"
            spellCheck={false}
            disabled={running || bulkRunning}
            className="w-full rounded-md border border-soft bg-surface-2 px-3 py-2 pr-10 font-mono text-[12px] text-foreground placeholder:text-muted focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-foreground"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={callOnce}
          disabled={running || bulkRunning}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-purple px-5 py-2.5 font-mono text-[12px] uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Call API once
        </button>
        <button
          onClick={bulk50}
          disabled={running || bulkRunning}
          className="inline-flex items-center gap-2 rounded-lg border border-purple bg-surface-2 px-5 py-2.5 font-mono text-[12px] uppercase tracking-wider text-purple transition hover:bg-surface disabled:opacity-50"
        >
          {bulkRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          Bulk Test (50 calls)
        </button>
        <div className="ml-auto flex items-center gap-3 font-mono text-[10px] uppercase text-muted">
          <span>cost/call <span className="text-foreground">$0.001</span></span>
          <span>·</span>
          <span>spent <span className="text-foreground">${totalSpent.toFixed(4)}</span></span>
          <span>·</span>
          <span>ok <span className="text-foreground">{okCount}</span></span>
        </div>
      </div>

      {/* Bulk progress */}
      {bulkRunning && (
        <div className="rounded-md border border-soft bg-surface p-3">
          <div className="mb-1 flex justify-between font-mono text-[10px] uppercase text-muted">
            <span>Bulk progress</span>
            <span>
              {bulkProgress.done}/{bulkProgress.total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-gradient-purple-cyan transition-all"
              style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Latest big-number reveal */}
      {latest && !compact && (
        <div className="rounded-lg border border-soft bg-surface p-4">
          <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase text-muted">
            <Zap className="h-3.5 w-3.5 text-cyan" /> Latest secure random
          </div>
          <div className="font-display text-3xl font-extrabold tabular-nums text-foreground md:text-5xl">
            {latest.random.toLocaleString()}
          </div>
          <div className="mt-1 truncate font-mono text-[10px] text-muted">
            tx {latest.txHash} · #{latest.settlementNumber} · bal ${latest.newBalance.toFixed(4)}
          </div>
        </div>
      )}

      {/* History */}
      <div className="rounded-lg border border-soft bg-surface">
        <div className="flex items-center justify-between border-b border-soft px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          <span className="flex items-center gap-2">
            <Receipt className="h-3.5 w-3.5 text-purple" /> Call log
          </span>
          <span>{results.length} entries</span>
        </div>
        {results.length === 0 ? (
          <div className="p-8 text-center font-mono text-[12px] text-muted">
            No calls yet. Hit "Call API once" or "Bulk Test (50 calls)".
          </div>
        ) : (
          <div className="max-h-[340px] overflow-y-auto">
            <AnimatePresence initial={false}>
              {results.map((r) => (
                <motion.div
                  key={`${r.idx}-${r.txHash ?? r.error}`}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-[36px_70px_1fr_auto] items-center gap-3 border-b border-soft px-4 py-2 last:border-0"
                >
                  {r.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-green" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red" />
                  )}
                  <span className="font-mono text-[11px] text-muted">#{r.idx}</span>
                  {r.ok ? (
                    <div className="min-w-0">
                      <div className="font-mono text-[12px] tabular-nums text-foreground">
                        {r.random?.toLocaleString()}
                      </div>
                      <div className="truncate font-mono text-[10px] text-muted">
                        tx {r.txHash}
                      </div>
                    </div>
                  ) : (
                    <span className="truncate font-mono text-[11px] text-red">{r.error}</span>
                  )}
                  <div className="text-right font-mono text-[10px] text-muted">
                    {r.ok ? `$${r.amount?.toFixed(4)}` : "—"} · {r.ms}ms
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
