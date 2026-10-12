export interface CodePreferences {
  version: 1; dialect: 'kalm' | 'kalms'; style: 'indentation' | 'braces';
  os: 'auto' | 'windows' | 'macos' | 'linux'; shell: 'auto' | 'powershell' | 'cmd' | 'bash' | 'zsh'; spaces: 4;
}
export function applyPreferences(record?: Partial<CodePreferences>): CodePreferences;
