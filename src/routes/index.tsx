import { createFileRoute } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AirbnbDataProvider, useAirbnb } from "@/lib/airbnb/context";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { PriceDistributionChart } from "@/components/dashboard/PriceDistributionChart";
import { NeighborhoodChart } from "@/components/dashboard/NeighborhoodChart";
import { HostTable } from "@/components/dashboard/HostTable";
import { DataError } from "@/components/dashboard/DataError";
import { AIInsight } from "@/components/dashboard/AIInsight";
import {
  ChartSkeleton,
  MetricCardsSkeleton,
} from "@/components/dashboard/DashboardSkeleton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Estate Intel — Real Estate Market Dashboard" },
      {
        name: "description",
        content:
          "Interactive Airbnb market intelligence dashboard: pricing, neighborhood analysis, and host performance.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AirbnbDataProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <DashboardSidebar />
          <div className="flex w-full flex-1 flex-col">
            <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
              <SidebarTrigger />
              <div className="flex flex-col leading-tight">
                <h1 className="text-sm font-semibold tracking-tight">
                  Real Estate Market Intelligence
                </h1>
                <p className="text-[11px] text-muted-foreground">
                  Airbnb Open Data · cleaned pipeline output
                </p>
              </div>
            </header>
            <main className="flex-1 p-4 sm:p-6">
              <DashboardBody />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AirbnbDataProvider>
  );
}

function DashboardBody() {
  const { loading, error, rows } = useAirbnb();

  if (loading) {
    return (
      <div className="space-y-6">
        <MetricCardsSkeleton />
        <ChartSkeleton height={360} />
      </div>
    );
  }

  if (error) {
    return (
      <DataError
        title="Dataset not available"
        message={`${error}. Place cleaned_airbnb_data.csv in /public/data/ and reload.`}
      />
    );
  }

  if (rows.length === 0) {
    return <DataError title="Empty dataset" message="The CSV parsed without rows." />;
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full max-w-xl grid-cols-3">
        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
        <TabsTrigger value="neighborhoods">Análise de Bairros</TabsTrigger>
        <TabsTrigger value="hosts">Anfitriões</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <AIInsight />
        <MetricCards />
        <PriceDistributionChart />
      </TabsContent>

      <TabsContent value="neighborhoods" className="space-y-6">
        <MetricCards />
        <NeighborhoodChart />
      </TabsContent>

      <TabsContent value="hosts" className="space-y-6">
        <MetricCards />
        <HostTable />
      </TabsContent>
    </Tabs>
  );
}
