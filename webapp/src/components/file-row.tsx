import { 
  Download,
  Clock, Folder
} from "lucide-react";
import { HubFile } from "@/types";
import { formatBytes, formatRelativeTime, getFileColorAccent, cn, formatDate, getFileUrl, getEffectiveFileKind } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

const typeLabelMap: Record<string, string> = {
  pdf: "PDF Document",
  doc: "Word Document",
  ppt: "Presentation",
  xls: "Spreadsheet",
  image: "Image",
  video: "Video",
  audio: "Audio",
  archive: "Archive",
  code: "Code File",
  text: "Text File",
  md: "Markdown Document",
  pcap: "Network Capture",
  file: "File"
};

interface FileRowProps {
  file: HubFile | (HubFile & { event?: string, time?: string });
  onClick: (file: HubFile) => void;
  showDir?: boolean;
}

export function FileRow({ file, onClick, showDir = true }: FileRowProps) {
  const kind = getEffectiveFileKind(file);
  const accentClass = getFileColorAccent(kind);
  const isRemoved = 'event' in file && file.event === 'removed';
  const url = getFileUrl(file.rel);

  const typeLabel = typeLabelMap[kind] || "File";
  const ext = (file.ext || "").replace(/^\./, "").toUpperCase();

  return (
    <div 
      className={cn(
        "group flex items-center gap-4 p-4 rounded-lg border transition-all",
        isRemoved ? "opacity-50 grayscale cursor-not-allowed border-transparent" : cn("cursor-pointer hover:shadow-sm", accentClass)
      )}
      onClick={() => !isRemoved && onClick(file as HubFile)}
    >
      <div className={cn("w-10 h-10 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center shrink-0 border shadow-sm bg-background/60", accentClass)}>
        <span className="font-mono font-extrabold text-[11px] sm:text-sm uppercase leading-none">
          {ext || "?"}
        </span>
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-start sm:items-center gap-2 flex-wrap sm:flex-nowrap">
          <h4 className={cn(
            "font-semibold text-sm break-words whitespace-normal sm:truncate min-w-0",
            isRemoved && "line-through"
          )}>
            {file.name}
          </h4>
          {!isRemoved && file.status === "new" && (
            <Badge variant="default" className="h-5 px-1.5 text-[10px] uppercase tracking-wider bg-primary text-primary-foreground border-transparent shrink-0">New</Badge>
          )}
          {!isRemoved && file.status === "updated" && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase tracking-wider text-blue-500 border-blue-500/30 bg-blue-500/10 shrink-0">Updated</Badge>
          )}
          {isRemoved && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase tracking-wider shrink-0">Removed</Badge>
          )}
        </div>

        <div className="text-xs font-medium text-muted-foreground/80">
          {typeLabel}
        </div>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
          <span className="shrink-0">{formatBytes(file.size)}</span>
          <span className="w-1 h-1 rounded-full bg-border shrink-0" />
          <Tooltip>
            <TooltipTrigger className="cursor-default shrink-0 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {'time' in file ? file.time : formatRelativeTime(file.mtime)}
            </TooltipTrigger>
            <TooltipContent>
              {formatDate(file.mtime)}
            </TooltipContent>
          </Tooltip>
          {showDir && (
            <>
              <span className="w-1 h-1 rounded-full bg-border shrink-0" />
              <span className="flex items-center gap-1 min-w-0">
                <Folder className="w-3 h-3 shrink-0" />
                <span className="truncate">{file.dir}</span>
              </span>
            </>
          )}
        </div>
      </div>

      {!isRemoved && (
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 h-9 w-9 text-foreground border-border hover:text-primary hover:border-primary hover:bg-primary/10"
          onClick={(e) => e.stopPropagation()}
          asChild
        >
          <a href={url} download={file.name} aria-label={`Download ${file.name}`}>
            <Download className="w-4 h-4" />
          </a>
        </Button>
      )}
    </div>
  );
}
