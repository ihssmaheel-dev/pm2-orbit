export function StatusBar() {
  return (
    <footer className="h-7 border-t border-border flex items-center px-4 text-xs text-muted-foreground gap-4">
      <div className="w-2 h-2 rounded-full bg-success" />
      <span>Connected</span>
      <span>·</span>
      <span>PM2 v5.3.0</span>
      <span>·</span>
      <span>Node v22</span>
      <span>·</span>
      <span>v0.1.0</span>
    </footer>
  );
}
