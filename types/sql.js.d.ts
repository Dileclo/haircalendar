declare module 'sql.js' {
  interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }

  interface QueryExecResult {
    columns: string[];
    values: any[][];
  }

  interface Statement {
    bind(params?: any[]): boolean;
    step(): boolean;
    reset(): void;
    getAsObject(): Record<string, any>;
    free(): boolean;
  }

  class Database {
    run(sql: string, params?: any[]): Database;
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  type DbConstructor = new (data?: ArrayLike<number> | Buffer | null) => Database;

  interface SqlJsInit {
    Database: DbConstructor;
  }

  function initSqlJs(config?: SqlJsConfig): Promise<SqlJsInit>;
  export default initSqlJs;
  export { Database, DbConstructor };
}
