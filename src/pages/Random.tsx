import { DashboardLayout } from "@/components/DashboardLayout";
import { Panel } from "@/components/PageCard";
import { RandomApiPanel } from "@/components/RandomApiPanel";

const Random = () => (
  <DashboardLayout
    title="Paid Random API"
    subtitle="POST /api/random · $0.001 USDC per call · Settled on Arc"
  >
    <Panel title="Per-API Monetization Demo">
      <RandomApiPanel />
    </Panel>
  </DashboardLayout>
);

export default Random;
