import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const PRICE_PER_TOKEN = 0.0001; // $0.0001 USDC per token
const SETTLE_EVERY_N_TOKENS = 50;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Validate API key
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Missing X-API-Key header" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("api_key", apiKey)
    .is("revoked_at", null)
    .maybeSingle();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Invalid or revoked API key" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Parse request
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { messages, model = "gemini-2.0-flash", sessionId: resumeSessionId, resume } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "messages array required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // 3. Create or resume session
  const promptPreview =
    messages[messages.length - 1]?.content?.slice(0, 100) || "";

  let session: any = null;
  if (resume && resumeSessionId) {
    const { data: existing } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", resumeSessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) session = existing;
  }
  if (!session) {
    const { data: created, error: sessionError } = await supabase
      .from("sessions")
      .insert({ user_id: user.id, model, prompt_preview: promptPreview })
      .select()
      .single();
    if (sessionError || !created) {
      return new Response(
        JSON.stringify({ error: "Failed to create session" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    session = created;
  }

  // 4. SSE stream
  const encoder = new TextEncoder();
  let totalTokens = 0;
  let pendingTokens = 0;
  let totalUsdcPaid = 0;
  let settlementCount = 0;
  let runningBalance = parseFloat(user.balance_usdc);
  let runningSpent = parseFloat(user.total_spent_usdc || 0);

  // Map model -> Lovable AI Gateway model id
  const gatewayModel =
    model === "gemini-2.0-flash" || model === "gemini-2.5-flash"
      ? "google/gemini-2.5-flash"
      : `google/${model}`;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      const triggerSettlement = async (tokenCount: number) => {
        settlementCount++;
        const usdcAmountNum = tokenCount * PRICE_PER_TOKEN;
        const usdcAmount = usdcAmountNum.toFixed(6);
        totalUsdcPaid += usdcAmountNum;
        runningBalance -= usdcAmountNum;
        runningSpent += usdcAmountNum;

        const transferId = `arc_${crypto
          .randomUUID()
          .replace(/-/g, "")
          .slice(0, 24)}`;

        const { data: tx } = await supabase
          .from("transactions")
          .insert({
            session_id: session.id,
            user_id: user.id,
            settlement_number: settlementCount,
            tokens: tokenCount,
            usdc_amount: usdcAmount,
            circle_transfer_id: transferId,
            status: "complete",
            gas_cost_arc: 0.000000001,
            gas_cost_eth_l1: 2.0,
          })
          .select()
          .single();

        await supabase
          .from("users")
          .update({
            balance_usdc: runningBalance,
            total_spent_usdc: runningSpent,
          })
          .eq("id", user.id);

        sendEvent({
          type: "settlement",
          settlementNumber: settlementCount,
          tokens: tokenCount,
          usdcAmount,
          totalUsdcPaid: totalUsdcPaid.toFixed(6),
          totalTokens,
          transferId: tx?.circle_transfer_id || transferId,
          status: "complete",
          timestamp: new Date().toISOString(),
        });
      };

      try {
        // Call Lovable AI Gateway (OpenAI-compatible, supports streaming Gemini)
        const aiResponse = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: gatewayModel,
              messages,
              stream: true,
            }),
          }
        );

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          if (aiResponse.status === 429) {
            sendEvent({
              type: "error",
              message: "Rate limit reached. Please try again shortly.",
            });
          } else if (aiResponse.status === 402) {
            sendEvent({
              type: "error",
              message:
                "AI Gateway requires credits. Add credits in Lovable Cloud settings.",
            });
          } else {
            sendEvent({
              type: "error",
              message: `AI Gateway error (${aiResponse.status}): ${errText}`,
            });
          }
          controller.close();
          return;
        }

        const reader = aiResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          let nl = buffer.indexOf("\n");
          while (nl !== -1) {
            const rawLine = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            nl = buffer.indexOf("\n");

            if (!rawLine || !rawLine.startsWith("data: ")) continue;
            const jsonStr = rawLine.slice(6).trim();
            if (jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const delta =
                parsed.choices?.[0]?.delta?.content ??
                parsed.choices?.[0]?.message?.content ??
                "";
              if (!delta) continue;

              const chunkTokens = Math.max(1, Math.ceil(delta.length / 4));
              totalTokens += chunkTokens;
              pendingTokens += chunkTokens;

              sendEvent({
                type: "token",
                text: delta,
                chunkTokens,
                totalTokens,
              });

              while (pendingTokens >= SETTLE_EVERY_N_TOKENS) {
                pendingTokens -= SETTLE_EVERY_N_TOKENS;
                await triggerSettlement(SETTLE_EVERY_N_TOKENS);
              }
            } catch {
              /* skip malformed */
            }
          }
        }

        if (pendingTokens > 0) {
          await triggerSettlement(pendingTokens);
          pendingTokens = 0;
        }

        await supabase
          .from("sessions")
          .update({
            total_tokens: totalTokens,
            total_usdc_paid: totalUsdcPaid.toFixed(6),
            settlement_count: settlementCount,
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", session.id);

        const gasArc = settlementCount * 0.000000001;
        const gasEth = settlementCount * 2;
        sendEvent({
          type: "done",
          sessionId: session.id,
          summary: {
            totalTokens,
            totalUsdcPaid: totalUsdcPaid.toFixed(6),
            settlementCount,
            model,
            pricePerToken: PRICE_PER_TOKEN,
            settleEveryNTokens: SETTLE_EVERY_N_TOKENS,
          },
          economicProof: {
            revenueGenerated: `$${totalUsdcPaid.toFixed(6)} USDC`,
            onChainTxCount: settlementCount,
            gasCostOnArc: `$${gasArc.toFixed(10)}`,
            gasCostOnEthL1: `$${gasEth.toFixed(2)}`,
            profitOnArc: `$${(totalUsdcPaid - gasArc).toFixed(6)}`,
            profitOnEthL1: `$${(totalUsdcPaid - gasEth).toFixed(6)}`,
            verdict:
              settlementCount > 0
                ? `IMPOSSIBLE on Ethereum L1: gas fees alone = $${gasEth.toFixed(
                    2
                  )} to earn $${totalUsdcPaid.toFixed(6)}`
                : "No settlements yet",
          },
        });
      } catch (err) {
        sendEvent({ type: "error", message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
