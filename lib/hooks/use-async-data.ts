"use client";

import { useCallback, useEffect, useState } from "react";

export function useAsyncData<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestId, setRequestId] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setRequestId((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    loader()
      .then((result) => { if (active) setData(result); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load data"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loader, requestId]);

  return { data, error, loading, reload };
}
