interface Props {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: Props) {
  return (
    <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
      <span
        className={`h-2 w-2 rounded-full ${
          isConnected ? "bg-success pulse-dot" : "bg-danger"
        }`}
      />
      <span className={isConnected ? "text-green" : "text-red"}>
        {isConnected ? "Realtime · Live" : "Disconnected"}
      </span>
    </div>
  );
}
