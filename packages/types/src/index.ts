export interface NavItem {
  title: string;
  href?: string;
  disabled?: boolean;
  external?: boolean;
}

export interface SiteConfig {
  title?: string;
  name?: string;
  description: string;
  url?: string;
  mainNav?: NavItem[];
  links?: Record<string, string>;
}
