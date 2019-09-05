export interface SpectronBuilderOptions {
  protractorConfig: string;
  electronBuilderTarget: string;
  electronExecutablePath: string;
  specs?: string[];
  suite?: string;
  elementExplorer?: boolean;
  webdriverUpdate?: boolean;
}
