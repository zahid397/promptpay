export const fmtUsdc = (n: number, dp = 6) =>
  `$${n.toFixed(dp)}`;

export const fmtNum = (n: number) => n.toLocaleString("en-US");

export const fmtTime = (d: Date | string) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleTimeString("en-US", { hour12: false });
};

export const truncMid = (s: string, head = 12, tail = 6) =>
  s.length <= head + tail ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
