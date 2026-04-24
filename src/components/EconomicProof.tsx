export function EconomicProof() {
  const Row = ({
    label,
    value,
    valueClass = "text-foreground",
  }: {
    label: string;
    value: string;
    valueClass?: string;
  }) => (
    <div className="flex items-center justify-between py-1.5 font-mono text-[12px]">
      <span className="text-muted">{label}</span>
      <span className={`font-bold ${valueClass}`}>{value}</span>
    </div>
  );
  const Sep = () => <div className="my-1.5 border-t border-soft" />;

  return (
    <div className="bg-surface border border-orange rounded-md overflow-hidden">
      <div className="px-4 py-3 border-b border-soft">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-orange font-bold">
          ⚠ Economic Proof
        </div>
        <div className="font-display font-extrabold text-lg mt-0.5">
          Why this only works on Arc
        </div>
      </div>

      <div className="px-4 py-3">
        <Row label="Price per token" value="$0.000100 USDC" />
        <Row label="Settle every N tokens" value="50 tokens" />
        <Row label="Revenue per settlement" value="$0.005000 USDC" valueClass="text-green" />
        <Sep />
        <Row label="Gas on Ethereum L1" value="~$2.00" valueClass="text-red" />
        <Row label="Gas on Arc" value="< $0.000001" valueClass="text-green" />
        <Sep />
        <Row label="Margin on Eth L1" value="−39,900%" valueClass="text-red" />
        <Row label="Margin on Arc" value="~99.98%" valueClass="text-green" />
      </div>

      <div className="bg-warning text-warning-foreground px-4 py-2.5 font-mono text-[11px] font-bold text-center">
        This business model is economically impossible on any other chain
      </div>
    </div>
  );
}
