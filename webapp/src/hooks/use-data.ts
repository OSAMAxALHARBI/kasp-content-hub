import { useQuery } from "@tanstack/react-query";
import { HubData } from "../types";

export function useHubData() {
  return useQuery({
    queryKey: ["hub-data"],
    queryFn: async (): Promise<HubData> => {
      const res = await fetch("https://kasp-content-hub.vercel.app/Hub/data.json");
      if (!res.ok) {
        throw new Error("Failed to fetch hub data");
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 mins
  });
}
