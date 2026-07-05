import { useHubData } from "@/hooks/use-data";
import { AppLayout } from "@/components/layout";
import { FileRow } from "@/components/file-row";
import { useMemo, useState } from "react";
import { HubFile, FileType } from "@/types";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getFileUrl } from "@/lib/utils";

export function Files() {
  const { data, isLoading } = useHubData();
  
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [newOnly, setNewOnly] = useState(false);

  const filteredFiles = useMemo(() => {
    if (!data) return [];
    let result = [...data.files];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q) || f.dir.toLowerCase().includes(q));
    }

    if (typeFilter !== "all") {
      result = result.filter(f => f.type === typeFilter);
    }

    if (newOnly) {
      result = result.filter(f => f.status === "new" || f.status === "updated");
    }

    if (sortBy === "recent") {
      result.sort((a, b) => b.mtime - a.mtime);
    } else if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "size") {
      result.sort((a, b) => b.size - a.size);
    }

    return result;
  }, [data, search, typeFilter, sortBy, newOnly]);

  if (isLoading) return <AppLayout><div className="p-8 text-center text-muted-foreground font-mono">LOADING...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Files</h1>
          <p className="text-muted-foreground font-mono text-sm mt-2">{data?.files.length || 0} objects indexed</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center bg-card border rounded-lg p-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter by name or path..." 
              className="pl-9" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="doc">Document</SelectItem>
                <SelectItem value="ppt">Presentation</SelectItem>
                <SelectItem value="xls">Spreadsheet</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="code">Code/Data</SelectItem>
                <SelectItem value="archive">Archive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="size">Size (Large-Small)</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Switch id="new-only" checked={newOnly} onCheckedChange={setNewOnly} />
              <Label htmlFor="new-only" className="font-mono text-xs cursor-pointer">Updates Only</Label>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {filteredFiles.length > 0 ? (
            filteredFiles.map(file => (
              <FileRow 
                key={file.rel} 
                file={file} 
                onClick={(f) => window.open(getFileUrl(f.rel), "_blank", "noopener,noreferrer")} 
              />
            ))
          ) : (
            <div className="py-12 text-center text-muted-foreground font-mono">
              NO RESULTS MATCHING QUERY
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
