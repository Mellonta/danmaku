export class PendingRequest {
  aborted = false;

  constructor(readonly options: Tampermonkey.Request<undefined>) {}

  get url(): URL {
    if (typeof this.options.url !== "string")
      throw new Error("Expected a string request URL");
    return new URL(this.options.url);
  }

  private response(
    data: unknown,
    status = 200,
  ): Tampermonkey.Response<undefined> {
    return {
      response: data,
      responseText: JSON.stringify(data),
      responseXML: null,
      responseHeaders: "",
      readyState: 4,
      status,
      statusText: "",
      finalUrl: this.url.toString(),
      context: undefined,
    };
  }

  respond(data: unknown, status = 200): void {
    const response = this.response(data, status);
    this.options.onload?.call(response, response);
  }

  fail(): void {
    const response = { ...this.response(null, 0), error: "Network error" };
    this.options.onerror?.call(response, response);
  }

  timeout(): void {
    this.options.ontimeout?.();
  }

  abort(): void {
    this.aborted = true;
    this.options.onabort?.();
  }
}

export function mockRequests() {
  const original = Object.getOwnPropertyDescriptor(
    globalThis,
    "GM_xmlhttpRequest",
  );
  const requests: PendingRequest[] = [];
  Object.assign(globalThis, {
    GM_xmlhttpRequest(options: Tampermonkey.Request<undefined>) {
      const request = new PendingRequest(options);
      requests.push(request);
      return {
        abort: () => {
          request.abort();
        },
      };
    },
  });
  return {
    requests,
    at(index: number): PendingRequest {
      const request = requests[index];
      if (!request) throw new Error(`Missing request ${index}`);
      return request;
    },
    restore() {
      if (original)
        Object.defineProperty(globalThis, "GM_xmlhttpRequest", original);
      else Reflect.deleteProperty(globalThis, "GM_xmlhttpRequest");
    },
  };
}

export function searchResult(episodeId: number) {
  return { success: true, animes: [{ episodes: [{ episodeId }] }] };
}

export function commentResult(text: string) {
  return { comments: [{ cid: 1, p: "1,1,16777215", m: text }] };
}
