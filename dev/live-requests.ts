import { nextRequestId, type RequestRecord } from "./request-log";

export interface LiveRecord extends RequestRecord {
  data?: unknown;
}

/** Adapt the userscript's GM transport to the local authenticated proxy. */
export function installLiveRequests(onUpdate: (record: LiveRecord) => void) {
  Object.assign(globalThis, {
    GM_xmlhttpRequest(options: Tampermonkey.Request<undefined>) {
      if (typeof options.url !== "string")
        throw new Error("Expected a request URL");
      const url = new URL(options.url);
      const path = url.pathname + url.search;
      const record = { id: nextRequestId(), path, scenario: "live" as const };
      const controller = new AbortController();
      const state = { settled: false };
      const timer = setTimeout(() => {
        if (state.settled) return;
        state.settled = true;
        controller.abort();
        onUpdate({ ...record, status: "timeout" });
        options.ontimeout?.();
      }, options.timeout ?? 15_000);
      onUpdate({ ...record, status: "pending" });
      void (async () => {
        try {
          const response = await fetch("/dandanplay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path }),
            signal: controller.signal,
          });
          const text = await response.text();
          if (state.settled) return;
          let data: unknown;
          try {
            data = JSON.parse(text);
          } catch {
            data = {
              errorMessage: "The API returned a non-JSON response",
              body: text.slice(0, 2000),
            };
          }
          state.settled = true;
          onUpdate({ ...record, status: String(response.status), data });
          const result: Tampermonkey.Response<undefined> = {
            response: data,
            responseText: text,
            responseXML: null,
            responseHeaders: "",
            readyState: 4,
            status: response.status,
            statusText: response.statusText,
            finalUrl: url.toString(),
            context: undefined,
          };
          options.onload?.call(result, result);
        } catch {
          if (state.settled) return;
          state.settled = true;
          onUpdate({
            ...record,
            status: "connection failed",
            data: { errorMessage: "Cannot reach the local proxy" },
          });
          const result = {
            response: null,
            responseText: "",
            responseXML: null,
            responseHeaders: "",
            readyState: 4,
            status: 0,
            statusText: "",
            finalUrl: url.toString(),
            context: undefined,
            error: "Local proxy unavailable",
          };
          options.onerror?.call(result, result);
        } finally {
          clearTimeout(timer);
        }
      })();
      return {
        abort() {
          if (state.settled) return;
          state.settled = true;
          clearTimeout(timer);
          controller.abort();
          onUpdate({ ...record, status: "aborted" });
          options.onabort?.();
        },
      };
    },
  });
}
