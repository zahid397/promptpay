import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  // Authenticated users only — wallets are bound to an auth account
  const authHeader = req.headers.get("Authorization");
  let authUserId: string | null = null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabase.auth.getUser(token);
    if (data?.user) authUserId = data.user.id;
  }

  if (!authUserId) {
    return new Response(
      JSON.stringify({
        error: "Sign in required to create an API key",
      }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const apiKey = `pp_${crypto.randomUUID().replace(/-/g, "")}`;
    const walletId = `wallet_arc_${crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 20)}`;

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        api_key: apiKey,
        circle_wallet_id: walletId,
        balance_usdc: 10.0,
        auth_user_id: authUserId,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        apiKey,
        walletId,
        userId: user.id,
        balance: "10.000000 USDC",
        message:
          "Account created. You have 10 USDC testnet balance to start chatting.",
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
