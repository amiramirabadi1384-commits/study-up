export interface Pkg {
  id: string;
  title: string;
  description?: string | null;
}

export interface PkgList {
  pkgs: Pkg[];
  nextPage: boolean;
}
