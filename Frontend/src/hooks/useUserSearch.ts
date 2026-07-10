import { useEffect, useState } from "react";
import { searchUsers } from "@/lib/backend";
import { toUIUser } from "@/lib/adapters";
import type { UIUser } from "@/lib/adapters";

export function useUserSearch(query: string, minChars = 2) {
  const [results, setResults] = useState<UIUser[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (query.trim().length < minChars) {
      setResults([]);
      return;
    }
    setSearching(true);
    searchUsers(query.trim())
      .then((data) => {
        if (!cancelled) setResults(data.map(toUIUser));
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => { cancelled = true; };
  }, [query, minChars]);

  return { results, searching };
}
