import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { 
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem 
} from "@/components/ui/command";
import { Search, Folder, FolderTree, Home, ListTree, List, Activity, Moon, Sun, RefreshCw, History, X } from "lucide-react";
import { useHubData } from "@/hooks/use-data";
import { cn, fuzzyMatch, getEffectiveFileKind, getFileColorAccent, getFileUrl, formatBytes, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HighlightText } from "@/components/highlight-text";
import { HubFile, HubSection, HubTreeNode } from "@/types";

const RECENT_SEARCHES_KEY = "kasp-recent-searches";
const MAX_RECENT = 6;

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (!query.trim()) return;
  try {
    const existing = loadRecentSearches().filter(q => q.toLowerCase() !== query.toLowerCase());
    const next = [query, ...existing].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors (e.g. private browsing)
  }
}

interface FolderEntry { name: string; path: string; }

function collectFolders(node: HubTreeNode, acc: FolderEntry[] = []): FolderEntry[] {
  if (node.type === "folder" && node.path) {
    acc.push({ name: node.name, path: node.path });
  }
  node.children?.forEach(child => collectFolders(child, acc));
  return acc;
}

export function GlobalSearch({ variant = "full" }: { variant?: "full" | "icon" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const { data } = useHubData();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const isSlash = e.key === "/" && !e.ctrlKey && !e.metaKey;
      if (isCmdK || isSlash) {
        if (isSlash && (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA")) return;
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open) {
      setRecent(loadRecentSearches());
      setQuery("");
    }
  }, [open]);

  const allFolders = useMemo(() => data ? collectFolders(data.tree) : [], [data]);

  const results = useMemo(() => {
    if (!data || !query.trim()) return null;

    const sections = data.sections
      .map(section => ({ item: section, match: fuzzyMatch(query, section.name) }))
      .filter((r): r is { item: HubSection; match: NonNullable<ReturnType<typeof fuzzyMatch>> } => !!r.match)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 4);

    const folders = allFolders
      .map(folder => ({ item: folder, match: fuzzyMatch(query, folder.name) }))
      .filter((r): r is { item: FolderEntry; match: NonNullable<ReturnType<typeof fuzzyMatch>> } => !!r.match)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 4);

    const files = data.files
      .map(file => {
        const nameMatch = fuzzyMatch(query, file.name);
        const dirMatch = fuzzyMatch(query, file.dir);
        const best = nameMatch && dirMatch
          ? (nameMatch.score >= dirMatch.score ? nameMatch : dirMatch)
          : (nameMatch || dirMatch);
        if (!best) return null;
        return { item: file, match: best, matchedDir: !nameMatch && !!dirMatch };
      })
      .filter((r): r is { item: HubFile; match: NonNullable<ReturnType<typeof fuzzyMatch>>; matchedDir: boolean } => !!r)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 8);

    return { sections, folders, files, total: sections.length + folders.length + files.length };
  }, [data, query, allFolders]);

  const openFolder = useCallback((path: string) => {
    saveRecentSearch(query);
    setLocation(`/browse/${encodeURIComponent(path)}`);
    setOpen(false);
  }, [query, setLocation]);

  const openFile = useCallback((file: HubFile) => {
    saveRecentSearch(query);
    window.open(getFileUrl(file.rel), "_blank", "noopener,noreferrer");
    setOpen(false);
  }, [query]);

  const removeRecent = useCallback((q: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = loadRecentSearches().filter(r => r !== q);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    setRecent(next);
  }, []);

  return (
    <>
      {variant === "icon" ? (
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          onClick={() => setOpen(true)}
          aria-label="Search hub"
        >
          <Search className="w-4 h-4" />
        </Button>
      ) : (
        <Button 
          variant="outline" 
          className="w-full justify-start text-muted-foreground font-normal bg-card/50"
          onClick={() => setOpen(true)}
        >
          <Search className="mr-2 h-4 w-4" />
          <span>Search hub...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">/</span>
          </kbd>
        </Button>
      )}
      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput 
          placeholder="Search files, folders, sections..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.trim() ? (
            <>
              {results && results.total === 0 && (
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-1 py-2">
                    <Search className="w-5 h-5 text-muted-foreground/50" />
                    <span>No results for "{query}"</span>
                    <span className="text-xs text-muted-foreground/70">Try a different name, folder, or extension</span>
                  </div>
                </CommandEmpty>
              )}
              {results && results.sections.length > 0 && (
                <CommandGroup heading="Sections">
                  {results.sections.map(({ item: section, match }) => (
                    <CommandItem 
                      key={section.path}
                      value={`section-${section.path}`}
                      onSelect={() => openFolder(section.path)}
                    >
                      <Folder className="mr-2 h-4 w-4 text-primary shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate"><HighlightText text={section.name} indices={match.indices} /></span>
                        <span className="text-xs text-muted-foreground">{section.fileCount} files · {formatBytes(section.size)}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {results && results.folders.length > 0 && (
                <CommandGroup heading="Folders">
                  {results.folders.map(({ item: folder, match }) => (
                    <CommandItem 
                      key={folder.path}
                      value={`folder-${folder.path}`}
                      onSelect={() => openFolder(folder.path)}
                    >
                      <FolderTree className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate"><HighlightText text={folder.name} indices={match.indices} /></span>
                        <span className="text-xs text-muted-foreground truncate">{folder.path}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {results && results.files.length > 0 && (
                <CommandGroup heading="Files">
                  {results.files.map(({ item: file, match, matchedDir }) => {
                    const kind = getEffectiveFileKind(file);
                    const accentClass = getFileColorAccent(kind);
                    const ext = (file.ext || "").replace(/^\./, "").toUpperCase();
                    return (
                      <CommandItem 
                        key={file.rel}
                        value={`file-${file.rel}`}
                        onSelect={() => openFile(file)}
                      >
                        <span className={cn("mr-2 shrink-0 rounded-md border px-1.5 py-1 text-[9px] font-mono font-bold leading-none", accentClass)}>
                          {ext || "?"}
                        </span>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate">
                            {matchedDir ? file.name : <HighlightText text={file.name} indices={match.indices} />}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {matchedDir ? <HighlightText text={file.dir} indices={match.indices} /> : file.dir}
                            {" · "}{formatBytes(file.size)} · {formatRelativeTime(file.mtime)}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </>
          ) : (
            <>
              {recent.length > 0 ? (
                <CommandGroup heading="Recent searches">
                  {recent.map((q) => (
                    <CommandItem key={q} value={`recent-${q}`} onSelect={() => setQuery(q)}>
                      <History className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{q}</span>
                      <button
                        onClick={(e) => removeRecent(q, e)}
                        className="text-muted-foreground/50 hover:text-foreground shrink-0 p-0.5"
                        aria-label={`Remove "${q}" from recent searches`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Search className="w-5 h-5 mx-auto mb-2 text-muted-foreground/50" />
                  Start typing to search files, folders, and sections
                </div>
              )}
              {data && data.sections.length > 0 && (
                <CommandGroup heading="Jump to section">
                  {data.sections.slice(0, 5).map((section) => (
                    <CommandItem 
                      key={section.path}
                      value={`quick-${section.path}`}
                      onSelect={() => openFolder(section.path)}
                    >
                      <Folder className="mr-2 h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">{section.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isDark, setIsDark] = useState(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("theme") !== "light";
    }
    return true; // Default dark
  });
  const { refetch, isFetching } = useHubData();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(isDark ? "dark" : "light");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const navItems = [
    { href: "/", icon: Home, label: "Dashboard" },
    { href: "/browse", icon: ListTree, label: "Browse" },
    { href: "/files", icon: List, label: "All Files" },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-sidebar flex-col hidden md:flex z-10">
        <div className="p-4 border-b h-14 flex items-center gap-2 font-semibold text-primary">
          <Activity className="w-5 h-5" />
          KASP Ops Hub
        </div>
        <div className="p-4 border-b">
          <GlobalSearch />
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 px-2">Views</div>
          {navItems.map((item) => {
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="block">
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}>
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className="text-muted-foreground">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="text-muted-foreground font-mono text-xs">
            <RefreshCw className={cn("w-3 h-3 mr-2", isFetching && "animate-spin")} />
            {isFetching ? "SYNCING..." : "SYNC"}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="h-14 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur z-10 md:hidden">
          <div className="font-semibold text-primary flex items-center gap-2">
            <Activity className="w-5 h-5" />
            KASP Ops
          </div>
          <div className="flex items-center gap-1">
            <GlobalSearch variant="icon" />
            <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto pb-20">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
