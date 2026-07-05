export type FileType = "pdf"|"doc"|"ppt"|"xls"|"image"|"video"|"audio"|"archive"|"code"|"text"|"file";

export interface HubStats {
  files: number;
  folders: number;
  totalSize: number;
  newCount: number;
  updatedCount: number;
  lastModified: number;
}

export interface HubSection {
  name: string;
  path: string;
  fileCount: number;
  folderCount: number;
  size: number;
  lastModified: number;
  newCount: number;
}

export interface HubTreeNode {
  name: string;
  path: string;
  type: "folder" | "file";
  children?: HubTreeNode[];
  rel?: string;
  ext?: string;
  ftype?: string;
  size?: number;
  mtime?: number;
  status?: "new" | "updated" | null;
}

export interface HubFile {
  name: string;
  rel: string;
  dir: string;
  size: number;
  mtime: number;
  ext: string;
  type: FileType;
  status: "new" | "updated" | null;
}

export interface HubWhatsNew {
  rel: string;
  name: string;
  event: "added" | "updated" | "removed";
  time: string;
  type: string;
  size: number;
}

export interface HubData {
  stats: HubStats;
  sections: HubSection[];
  tree: HubTreeNode;
  files: HubFile[];
  whatsNew: HubWhatsNew[];
}
