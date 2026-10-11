import { Injectable } from '@angular/core';
import type * as Monaco from 'monaco-editor'; // types only: nothing is bundled

export type MonacoApi = typeof Monaco;

interface AmdRequire {
  (deps: string[], onLoad: () => void, onError: (err: unknown) => void): void;
  config(options: { paths: Record<string, string> }): void;
}
interface MonacoWindow {
  require?: AmdRequire;
  monaco?: MonacoApi;
}

const BASE = '/assets/monaco/vs'; // copied from node_modules by angular.json

/** Loads Monaco once, on first use, and shares the result. */
@Injectable({ providedIn: 'root' })
export class MonacoLoader {
  private promise: Promise<MonacoApi> | null = null;

  load(): Promise<MonacoApi> {
    this.promise ??= this.fetchMonaco().catch((err) => {
      this.promise = null; // allow a retry after a failure
      throw err;
    });
    return this.promise;
  }

  private fetchMonaco(): Promise<MonacoApi> {
    const win = window as unknown as MonacoWindow;

    return new Promise<MonacoApi>((resolve, reject) => {
      if (win.monaco) {
        resolve(win.monaco);
        return;
      }

      const script = document.createElement('script');
      script.src = `${BASE}/loader.js`;
      script.onerror = () => reject(new Error('Could not load the editor files'));
      script.onload = () => {
        const amd = win.require;
        if (!amd) {
          reject(new Error('The editor loader is unavailable'));
          return;
        }
        amd.config({ paths: { vs: BASE } });
        amd(
          ['vs/editor/editor.main'],
          () => (win.monaco ? resolve(win.monaco) : reject(new Error('Monaco did not initialise'))),
          (err) => reject(err),
        );
      };
      document.head.appendChild(script);
    });
  }
}