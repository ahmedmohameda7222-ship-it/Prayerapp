type BoundedJsonFailure = {
  ok: false;
  status: 400 | 413 | 415;
  message: string;
};

export type BoundedJsonResult<T = unknown> =
  | { ok: true; value: T }
  | BoundedJsonFailure;

type ReadBoundedJsonOptions = {
  maxBytes: number;
  allowMissingContentType?: boolean;
};

type FetchBoundedJsonOptions = RequestInit & {
  timeoutMs: number;
  maxBytes: number;
};

function validPositiveBound(value: number) {
  return Number.isInteger(value) && value > 0;
}

function isJsonContentType(value: string | null) {
  if (!value) return false;
  const mime = value.split(";", 1)[0]?.trim().toLowerCase() || "";
  return mime === "application/json" || (mime.startsWith("application/") && mime.endsWith("+json"));
}

function declaredLengthTooLarge(headers: Headers, maxBytes: number) {
  const raw = headers.get("content-length");
  if (!raw) return false;
  if (!/^\d+$/u.test(raw)) return true;
  const length = Number(raw);
  return !Number.isSafeInteger(length) || length > maxBytes;
}

async function readBoundedText(body: ReadableStream<Uint8Array> | null, maxBytes: number) {
  if (!body) return "";
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let total = 0;
  let text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) throw new Error("BODY_TOO_LARGE");
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

export async function readBoundedJson<T = unknown>(
  request: Request,
  { maxBytes, allowMissingContentType = false }: ReadBoundedJsonOptions,
): Promise<BoundedJsonResult<T>> {
  if (!validPositiveBound(maxBytes)) throw new Error("Invalid JSON body byte bound");
  const contentType = request.headers.get("content-type");
  if ((!contentType && !allowMissingContentType) || (contentType && !isJsonContentType(contentType))) {
    return { ok: false, status: 415, message: "Content-Type must be application/json" };
  }
  if (declaredLengthTooLarge(request.headers, maxBytes)) {
    return { ok: false, status: 413, message: "JSON body too large" };
  }

  try {
    const text = await readBoundedText(request.body, maxBytes);
    return { ok: true, value: JSON.parse(text) as T };
  } catch (error) {
    if (error instanceof Error && error.message === "BODY_TOO_LARGE") {
      return { ok: false, status: 413, message: "JSON body too large" };
    }
    return { ok: false, status: 400, message: "Invalid JSON body" };
  }
}

export async function fetchBoundedJson<T = unknown>(
  input: RequestInfo | URL,
  options: FetchBoundedJsonOptions,
): Promise<T> {
  const { timeoutMs, maxBytes, signal: callerSignal, ...requestInit } = options;
  if (!validPositiveBound(timeoutMs) || !validPositiveBound(maxBytes)) {
    throw new Error("Invalid upstream request bounds");
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort(callerSignal.reason);
    else callerSignal.addEventListener("abort", abortFromCaller, { once: true });
  }

  try {
    const response = await fetch(input, { ...requestInit, signal: controller.signal });
    if (!response.ok) throw new Error(`Upstream request failed with status ${response.status}`);
    if (!isJsonContentType(response.headers.get("content-type"))) {
      throw new Error("Unexpected upstream content type");
    }
    if (declaredLengthTooLarge(response.headers, maxBytes)) {
      throw new Error("Upstream response too large");
    }

    let text: string;
    try {
      text = await readBoundedText(response.body, maxBytes);
    } catch (error) {
      if (error instanceof Error && error.message === "BODY_TOO_LARGE") {
        throw new Error("Upstream response too large");
      }
      throw error;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error("Invalid upstream JSON");
    }
  } catch (error) {
    if (timedOut) throw new Error("Upstream request timed out");
    throw error;
  } finally {
    clearTimeout(timeout);
    if (callerSignal) callerSignal.removeEventListener("abort", abortFromCaller);
  }
}
