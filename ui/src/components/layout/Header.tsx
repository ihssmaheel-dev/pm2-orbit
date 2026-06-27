export function Header() {
  return (
    <header className="h-14 border-b border-border flex items-center px-4 gap-4">
      <div className="font-sans font-light text-lg tracking-wider text-primary">
        PM2 ORBIT
      </div>
      <nav className="flex gap-4 text-sm text-muted-foreground">
        <span>Processes</span>
        <span>Logs</span>
        <span>Alerts</span>
        <span>History</span>
        <span>Settings</span>
      </nav>
    </header>
  );
}
