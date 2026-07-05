import { useQuery } from "@tanstack/react-query";
import { HubData } from "../types";

export function useHubData() {
  return useQuery({
    queryKey: ["hub-data"],
    queryFn: async (): Promise<HubData> => {
      // Relative (same-origin) so the app works on any domain it's hosted at.
      const res = await fetch("/Hub/data.json");
      if (!res.ok) {
        throw new Error("Failed to fetch hub data");
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 mins
  });
}
