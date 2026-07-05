import { useHubData } from "@/hooks/use-data";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes, formatRelativeTime, getWeekNumber, getCurrentWeekNumber } from "@/lib/utils";
import { FileRow } from "@/components/file-row";
import { Link } from "wouter";
import { Folder, HardDrive, FileType2, Clock, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HubSection } from "@/types";

const CAMPUS_GROUPS = [
  { label: "Abha", range: [1, 3] as [number, number] },
  { label: "Glasgow", range: [4, 8] as [number, number] },
];

export function Dashboard() {
  const { data, isLoading, isError, refetch } = useHubData();
  const currentWeek = getCurrentWeekNumber();

  if (isError) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[50vh] text-center max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">Connection Failed</h2>
          <p className="text-muted-foreground mb-6">Unable to establish connection to the telemetry feed. Please check your network and try again.</p>
          <Button onClick={() => refetch()}>Retry Connection</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Ops Dashboard</h1>
          <p className="text-muted-foreground font-mono text-sm">SYSTEM STATUS: NOMINAL • LAST SYNC: {data ? formatRelativeTime(data.stats.lastModified) : '...'}</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Files" value={data?.stats.files.toString() || '0'} icon={FileType2} isLoading={isLoading} />
          <StatCard title="Total Size" value={data ? formatBytes(data.stats.totalSize) : '0 B'} icon={HardDrive} isLoading={isLoading} />
          <StatCard title="Recent Updates" value={data?.stats.updatedCount.toString() || '0'} icon={Clock} valueColor="text-blue-500" isLoading={isLoading} />
          <StatCard title="New Objects" value={data?.stats.newCount.toString() || '0'} icon={Folder} valueColor="text-primary" isLoading={isLoading} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Sections / Weeks */}
          <div className="xl:col-span-2 space-y-6">
            <h2 className="text-xl font-bold border-b pb-2">Active Modules</h2>
            {isLoading ? (
              <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
            ) : (
              <>
                {CAMPUS_GROUPS.map((group) => {
                  const sections = (data?.sections || []).filter((s) => {
                    const n = getWeekNumber(s.name);
                    return n !== null && n >= group.range[0] && n <= group.range[1];
                  });
                  if (sections.length === 0) return null;
                  return (
                    <div key={group.label} className="space-y-3">
                      <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                        {group.label} · Week {group.range[0]}-{group.range[1]}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sections.map((section) => {
                          const isCurrent = getWeekNumber(section.name) === currentWeek;
                          return (
                            <Link key={section.path} href={`/browse/${encodeURIComponent(section.path)}`}>
                              <Card className={`hover:border-primary/50 transition-colors cursor-pointer group ${isCurrent ? "border-primary shadow-[0_0_0_1px] shadow-primary/30" : ""}`}>
                                <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                                  <CardTitle className="text-base font-medium flex items-center gap-2 group-hover:text-primary transition-colors">
                                    <Folder className="w-4 h-4" />
                                    {section.name}
                                  </CardTitle>
                                  <div className="flex items-center gap-2">
                                    {isCurrent && (
                                      <Badge className="h-5 px-1.5 text-[10px] uppercase tracking-wider bg-primary text-primary-foreground border-transparent">Current</Badge>
                                    )}
                                    {section.newCount > 0 && (
                                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-mono">
                                        {section.newCount}
                                      </span>
                                    )}
                                  </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                  <div className="text-sm text-muted-foreground font-mono flex items-center gap-3">
                                    <span>{section.fileCount} files</span>
                                    <span>{formatBytes(section.size)}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground/70 mt-2 font-mono">
                                    Updated {formatRelativeTime(section.lastModified)}
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Recent Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-xl font-bold">Telemetry Feed</h2>
              <Link href="/activity" className="text-sm text-primary hover:underline font-mono">View All</Link>
            </div>
            {isLoading ? (
              <div className="space-y-4">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : (
              <div className="bg-card border rounded-lg p-2 flex flex-col gap-1 max-h-[500px] overflow-y-auto">
                {data?.whatsNew.slice(0, 10).map((item, idx) => (
                  <div key={`${item.rel}-${idx}`} className="flex items-start gap-3 p-2 text-sm border-b last:border-0 border-border/50">
                    <div className="shrink-0 mt-0.5">
                      {item.event === 'added' ? <div className="w-2 h-2 rounded-full bg-primary" /> : 
                       item.event === 'updated' ? <div className="w-2 h-2 rounded-full bg-blue-500" /> : 
                       <div className="w-2 h-2 rounded-full bg-destructive" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{item.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-1">
                        <span className="uppercase tracking-wider">{item.event}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(new Date(item.time).getTime() / 1000)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ title, value, icon: Icon, valueColor, isLoading }: { title: string, value: string, icon: any, valueColor?: string, isLoading?: boolean }) {
  return (
    <Card className="bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground/50" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? <Skeleton className="h-8 w-20" /> : (
          <div className={`text-2xl font-bold font-mono ${valueColor || ''}`}>{value}</div>
        )}
      </CardContent>
    </Card>
  );
}
