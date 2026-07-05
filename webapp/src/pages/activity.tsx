import { useHubData } from "@/hooks/use-data";
import { AppLayout } from "@/components/layout";
import { formatRelativeTime, getFileUrl } from "@/lib/utils";
import { FileRow } from "@/components/file-row";

export function Activity() {
  const { data, isLoading } = useHubData();

  if (isLoading) return <AppLayout><div className="p-8 text-center text-muted-foreground font-mono">LOADING...</div></AppLayout>;

  // Group whatsNew by day
  const grouped = data?.whatsNew.reduce((acc, item) => {
    // Assuming item.time is ISO "2024-05-10T14:32:00Z"
    const date = new Date(item.time);
    const dayKey = date.toISOString().split('T')[0];
    if (!acc[dayKey]) acc[dayKey] = [];
    acc[dayKey].push(item);
    return acc;
  }, {} as Record<string, typeof data.whatsNew>);

  const sortedDays = Object.keys(grouped || {}).sort((a, b) => b.localeCompare(a));

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Telemetry Feed</h1>
          <p className="text-muted-foreground font-mono text-sm mt-2">Chronological view of all system updates</p>
        </div>

        <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {sortedDays.map((day) => {
            const dayEvents = grouped![day].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
            return (
              <div key={day} className="relative z-10 space-y-4">
                <div className="flex items-center mb-6">
                  <div className="font-mono text-xs font-bold text-muted-foreground bg-background px-3 py-1 rounded-full border">
                    {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(day))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 pl-4 border-l-2 border-border ml-5 md:ml-0 md:pl-0 md:border-0">
                  {dayEvents.map((item, idx) => {
                    // Try to find the full file object for preview if it's not removed
                    const fullFile = item.event !== "removed" 
                      ? data?.files.find(f => f.rel === item.rel)
                      : null;

                    // Reconstruct a faux file for FileRow
                    const fileObj = {
                      ...item,
                      mtime: new Date(item.time).getTime() / 1000,
                      dir: item.rel.split("/").slice(0, -1).join("/"),
                      status: item.event === "added" ? "new" : item.event === "updated" ? "updated" : null,
                    };

                    return (
                      <div key={`${item.rel}-${idx}`} className="md:ml-[50%] md:-translate-x-[50%] md:w-[600px] bg-background">
                        <FileRow 
                          file={fileObj as any} 
                          onClick={(f) => fullFile && window.open(getFileUrl(f.rel), "_blank", "noopener,noreferrer")} 
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
