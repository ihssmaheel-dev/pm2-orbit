declare module 'better-sqlite3' {
  interface Statement {
    run(...params: unknown[]): void;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  }

  interface Transaction {
    (fn: () => void): void;
  }

  interface DatabaseConstructor {
    new(path: string): Database;
  }

  interface Database {
    prepare(sql: string): Statement;
    exec(sql: string): void;
    pragma(pragma: string): void;
    transaction(fn: () => void): Transaction;
    close(): void;
  }

  const Database: DatabaseConstructor;
  export default Database;
}
