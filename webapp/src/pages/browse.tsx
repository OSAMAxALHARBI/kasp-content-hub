import { useHubData } from "@/hooks/use-data";
import { AppLayout } from "@/components/layout";
import { Link, useRoute } from "wouter";
import { Folder, ChevronRight, ArrowLeft } from "lucide-react";
import { FileRow } from "@/components/file-row";
import { HubFile, HubTreeNode } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getFileUrl, getWeekNumber, getCurrentWeekNumber, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const CAMPUS_GROUPS = [
  { label: "Abha", range: [1, 3] as [number, number] },
  { label: "Glasgow", range: [4, 8] as [number, number] },
];

function findNodeByPath(node: HubTreeNode, targetPath: string): HubTreeNode | null {
  if (node.path === targetPath) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeByPath(child, targetPath);
      if (found) return found;
    }
  }
  return null;
}

export function Browse() {
  const { data, isLoading } = useHubData();
  const [, params] = useRoute("/browse/*?");
  const currentPath = params?.["*"] ? decodeURIComponent(params["*"]) : "";

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!data) return <AppLayout><div>Error loading data.</div></AppLayout>;

  // Root node is data.tree, which has name "." or similar, and children are the sections.
  // If currentPath is empty, we show data.tree.children.
  let currentNode = currentPath ? findNodeByPath(data.tree, currentPath) : data.tree;

  if (!currentNode) {
    return (
      <AppLayout>
        <div className="py-12 text-center">
          <h2 className="text-xl font-bold mb-2">Folder not found</h2>
          <Button asChild variant="outline">
            <Link href="/browse">Go back to root</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const pathSegments = currentPath ? currentPath.split("/") : [];
  const isRoot = !currentPath;
  const currentWeek = getCurrentWeekNumber();

  const folders = currentNode.children?.filter(c => c.type === "folder").sort((a, b) => a.name.localeCompare(b.name)) || [];
  const files = currentNode.children?.filter(c => c.type === "file").sort((a, b) => (b.mtime || 0) - (a.mtime || 0)) || [];

  function renderFolderCard(folder: HubTreeNode) {
    const weekNum = getWeekNumber(folder.name);
    const isCurrent = isRoot && weekNum !== null && weekNum === currentWeek;
    return (
      <Link key={folder.path} href={`/browse/${encodeURIComponent(folder.path)}`}>
        <div className={cn(
          "flex items-center gap-3 p-4 rounded-lg border bg-card hover:border-primary/50 hover:shadow-sm cursor-pointer transition-all group",
          isCurrent && "border-primary shadow-[0_0_0_1px] shadow-primary/30"
        )}>
          <Folder className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          <div className="font-medium group-hover:text-primary transition-colors flex-1">{folder.name}</div>
          {isCurrent && (
            <Badge className="h-5 px-1.5 text-[10px] uppercase tracking-wider bg-primary text-primary-foreground border-transparent shrink-0">Current</Badge>
          )}
        </div>
      </Link>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4">
        {currentPath && (
          <Button variant="ghost" size="sm" asChild className="self-start -ml-3 text-muted-foreground">
            <Link href={pathSegments.length > 1 ? `/browse/${encodeURIComponent(pathSegments.slice(0, -1).join("/"))}` : "/browse"}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Link>
          </Button>
        )}

        <div className="flex flex-wrap items-center gap-2 text-sm font-mono text-muted-foreground">
          <Link href="/browse" className="hover:text-primary transition-colors">Root</Link>
          {pathSegments.map((seg, idx) => {
            const upToHere = pathSegments.slice(0, idx + 1).join("/");
            return (
              <div key={upToHere} className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                <Link href={`/browse/${encodeURIComponent(upToHere)}`} className="hover:text-primary transition-colors">
                  {seg}
                </Link>
              </div>
            );
          })}
        </div>
        <h1 className="text-2xl font-bold">{currentNode.name === "." ? "Content Browse" : currentNode.name}</h1>
      </div>

      {isRoot ? (
        <div className="space-y-6 mb-8">
          {CAMPUS_GROUPS.map((group) => {
            const groupFolders = folders.filter((f) => {
              const n = getWeekNumber(f.name);
              return n !== null && n >= group.range[0] && n <= group.range[1];
            });
            if (groupFolders.length === 0) return null;
            return (
              <div key={group.label} className="space-y-3">
                <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                  {group.label} · Week {group.range[0]}-{group.range[1]}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupFolders.map(renderFolderCard)}
                </div>
              </div>
            );
          })}
          {(() => {
            const ungrouped = folders.filter((f) => getWeekNumber(f.name) === null);
            if (ungrouped.length === 0) return null;
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ungrouped.map(renderFolderCard)}
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {folders.map(renderFolderCard)}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Files</h3>
          <div className="flex flex-col gap-2">
            {files.map(file => (
              <FileRow 
                key={file.rel} 
                file={file as unknown as HubFile} 
                onClick={(f) => window.open(getFileUrl(f.rel), "_blank", "noopener,noreferrer")} 
                showDir={false}
              />
            ))}
          </div>
        </div>
      )}

      {folders.length === 0 && files.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          This folder is empty.
        </div>
      )}
    </AppLayout>
  );
}
