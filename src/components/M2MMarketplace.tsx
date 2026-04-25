// Agent-to-Agent (M2M) Marketplace — two real Gemini agents trade per request.
// Each successful trade is settled on Arc as a real DB-backed USDC nanopayment
// and shows up in the realtime transactions feed.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Cloud,
  DollarSign,
  Eye,
  EyeOff,
  KeyRound,
  Languages,
  LineChart,
  Loader2,
  Play,
  Receipt,
  ShoppingBag,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { runM2MTrade, createWallet, type M2MTrade } from "@/lib/api";

interface Props {
  apiKey: string;
  onApiKeyChange?: (k: string) => void;
}

const LS_KEY = "promptpay.apiKey";

const SERVICES = [
  { key: "weather", name: "WeatherOracle", price: 0.0008, icon: Cloud, accent: "text-cyan" },
  { key: "stock", name: "StockTickerBot", price: 0.0012, icon: LineChart, accent: "text-green" },
  { key: "translate", name: "TranslateAgent", price: 0.0006, icon: Languages, accent: "text-purple" },
  { key: "summarize", name: "SummarizerAgent", price: 0.0009, icon: Sparkles, accent: "text-orange" },
] as const;

type ServiceKey = (typeof SERVICES)[number]["key"];

export function M2MMarketplace({ apiKey, onApiKeyChange }: Props) {
  const [service, setService] = useState<ServiceKey>("weather");
  const [rounds, setRounds] = useState(3);
  const [running, setRunning] = useState(false);
  const [trades, setTrades] = useState<M2MTrade[]>([]);
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [localKey, setLocalKey] = useState(apiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [provisioning, setProvisioning] = useState(false);

  const selected = SERVICES.find((s) => s.key === service)!;

  // Sync external key in
  useEffect(() => {
    if (apiKey && apiKey !== localKey) setLocalKey(apiKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // Hydrate from localStorage on mount if nothing provided
  useEffect(() => {
    if (!apiKey) {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        setLocalKey(saved);
        onApiKeyChange?.(saved);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commitKey = (k: string) => {
    setLocalKey(k);
    if (k.trim()) localStorage.setItem(LS_KEY, k.trim());
    onApiKeyChange?.(k.trim());
  };

  const pasteKey = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) return toast.error("Clipboard is empty");
      commitKey(text);
      toast.success("Key pasted");
    } catch {
      toast.error("Could not read clipboard");
    }
  };

  const provisionKey = async () => {
    setProvisioning(true);
    try {
      const r = await createWallet();
      commitKey(r.apiKey);
      toast.success("New wallet · 10 USDC funded", {
        description: "Key generated and stored locally.",
      });
    } catch (e: any) {
      toast.error("Provision failed", { description: e?.message });
    } finally {
      setProvisioning(false);
    }
  };

  const start = async () => {
    const key = localKey.trim();
    if (!key) {
      toast.error("API key required", {
        description: "Paste your wallet API key or click Generate to fund a new one.",
      });
      return;
    }
    setRunning(true);
    setTrades([]);
    setNewBalance(null);
    try {
      const res = await runM2MTrade({ apiKey: key, service, rounds });
      setTrades(res.trades);
      setNewBalance(res.newBalance);
      const ok = res.trades.filter((t) => t.ok).length;
      toast.success(`${ok} M2M trade${ok === 1 ? "" : "s"} settled on Arc`, {
        description: `Buyer paid ${selected.name} via USDC nanopayments. New balance $${res.newBalance.toFixed(6)}.`,
      });
    } catch (e: any) {
      toast.error("M2M trade failed", { description: e?.message ?? "Unknown" });
    } finally {
      setRunning(false);
    }
  };

  const totalSpent = trades.filter((t) => t.ok).reduce((s, t) => s + (t.price ?? 0), 0);
  const totalTokens = trades.filter((t) => t.ok).reduce((s, t) => s + (t.tokens ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-lg border border-purple bg-surface-2 p-4 glow-purple">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-purple">
              M2M Marketplace · Live Gemini Agents
            </div>
            <h3 className="mt-1 font-display text-2xl font-extrabold text-foreground">
              Agent-to-Agent USDC Commerce
            </h3>
            <p className="mt-2 max-w-2xl font-mono text-[12px] leading-6 text-muted">
              <span className="text-foreground">AutoBuyer</span> autonomously requests a service from
              a <span className="text-foreground">{selected.name}</span> seller agent. Each fulfilled
              request settles as a real USDC nanopayment on Arc, recorded on-chain at sub-cent gas.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-purple text-white">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Service picker */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((s) => {
          const Icon = s.icon;
          const active = s.key === service;
          return (
            <button
              key={s.key}
              onClick={() => setService(s.key)}
              disabled={running}
              className={`group rounded-lg border p-3 text-left transition ${
                active ? "border-purple glow-purple bg-surface-2" : "border-soft bg-surface hover:border-purple"
              } disabled:opacity-50`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`h-5 w-5 ${s.accent}`} />
                <span className="font-mono text-[10px] uppercase text-muted">
                  ${s.price.toFixed(4)}
                </span>
              </div>
              <div className="mt-2 font-display text-sm font-bold text-foreground">{s.name}</div>
              <div className="mt-0.5 font-mono text-[10px] text-muted">per request · USDC</div>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="rounded-lg border border-soft bg-surface p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              Rounds
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRounds(n)}
                  disabled={running}
                  className={`h-9 w-9 rounded-md border font-mono text-[12px] transition ${
                    rounds === n
                      ? "border-purple bg-gradient-purple text-white"
                      : "border-soft text-muted hover:border-purple hover:text-foreground"
                  } disabled:opacity-50`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Estimated cost
              </div>
              <div className="font-mono text-sm tabular-nums text-foreground">
                ${(selected.price * rounds).toFixed(6)} USDC
              </div>
            </div>
            <button
              onClick={start}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-purple px-5 py-2.5 font-mono text-[12px] uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Trading…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Start M2M Trade
                </>
              )}
            </button>
          </div>
        </div>

        {newBalance !== null && (
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-soft pt-4">
            <div>
              <div className="font-mono text-[10px] uppercase text-muted">Trades settled</div>
              <div className="mt-1 font-display text-xl font-bold text-foreground tabular-nums">
                {trades.filter((t) => t.ok).length}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-muted">USDC spent</div>
              <div className="mt-1 font-display text-xl font-bold text-cyan tabular-nums">
                ${totalSpent.toFixed(6)}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-muted">Wallet balance</div>
              <div className="mt-1 font-display text-xl font-bold text-green tabular-nums">
                ${newBalance.toFixed(4)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trade timeline */}
      <div className="rounded-lg border border-soft bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            <Receipt className="h-4 w-4 text-purple" /> Live trade timeline
          </div>
          <div className="font-mono text-[10px] text-muted">
            {totalTokens} tokens · {trades.filter((t) => t.ok).length} on-chain receipts
          </div>
        </div>

        {trades.length === 0 && !running && (
          <div className="rounded-md border border-dashed border-soft p-8 text-center">
            <Bot className="mx-auto mb-2 h-8 w-8 text-muted" />
            <div className="font-mono text-[12px] text-muted">
              No trades yet. Pick a service and hit start — two Gemini agents will negotiate live.
            </div>
          </div>
        )}

        {running && trades.length === 0 && (
          <div className="flex items-center gap-3 rounded-md border border-soft bg-surface-2 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-purple" />
            <div className="font-mono text-[12px] text-muted">
              AutoBuyer is composing a request to {selected.name}…
            </div>
          </div>
        )}

        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {trades.map((t, idx) => (
              <motion.div
                key={`${t.round}-${t.arcTxHash ?? t.error ?? idx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                className={`rounded-lg border p-3 ${
                  t.ok ? "border-soft bg-surface-2" : "border-red bg-[hsl(0_100%_64%_/_0.05)]"
                }`}
              >
                {!t.ok ? (
                  <div className="font-mono text-[12px] text-red">
                    Round {t.round} failed: {t.error}
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                        <span className="rounded bg-gradient-purple px-1.5 py-0.5 text-white">
                          #{t.settlementNumber}
                        </span>
                        <span>Round {t.round}</span>
                        <span className="text-purple">→ {t.seller}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[10px]">
                        <span className="flex items-center gap-1 text-cyan">
                          <DollarSign className="h-3 w-3" />
                          {t.price?.toFixed(6)} USDC
                        </span>
                        <span className="flex items-center gap-1 text-muted">
                          <Zap className="h-3 w-3" />
                          {t.tokens} tok
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
                      <div className="rounded-md border border-soft bg-surface p-2.5">
                        <div className="mb-1 flex items-center gap-1 font-mono text-[9px] uppercase text-purple">
                          <Wallet className="h-3 w-3" /> AutoBuyer
                        </div>
                        <div className="font-mono text-[12px] leading-5 text-foreground">
                          {t.buyerRequest}
                        </div>
                      </div>
                      <div className="hidden items-center justify-center md:flex">
                        <ArrowRight className="h-4 w-4 text-purple" />
                      </div>
                      <div className="rounded-md border border-soft bg-surface p-2.5">
                        <div className="mb-1 flex items-center gap-1 font-mono text-[9px] uppercase text-cyan">
                          <Bot className="h-3 w-3" /> {t.seller}
                        </div>
                        <div className="font-mono text-[12px] leading-5 text-foreground">
                          {t.sellerResponse}
                        </div>
                      </div>
                    </div>

                    {t.arcTxHash && (
                      <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-muted">
                        <span className="rounded bg-[hsl(152_100%_50%_/_0.12)] px-1.5 py-0.5 text-green">
                          ARC SETTLED
                        </span>
                        <span className="truncate">{t.arcTxHash}</span>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
