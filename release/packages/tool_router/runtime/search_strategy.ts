export interface StrategyStep {
  name: string;
  url: string;
}

export class SearchStrategy {
  // Parses target query search term from a search engine URL
  public static parseQueryFromUrl(urlStr: string): string {
    try {
      const url = new URL(urlStr);
      const query = url.searchParams.get("q") || url.searchParams.get("query");
      if (query) return query;
      
      // Check if it's maps search format
      if (url.pathname.includes("/maps/search/")) {
        const parts = url.pathname.split("/maps/search/");
        if (parts[1]) {
          return decodeURIComponent(parts[1].split("/")[0]);
        }
      }
      return urlStr;
    } catch (e) {
      return urlStr;
    }
  }

  public getSteps(originalUrl: string): StrategyStep[] {
    const queryTerm = SearchStrategy.parseQueryFromUrl(originalUrl);
    const steps: StrategyStep[] = [];
    
    const isSearchUrl = originalUrl.includes("google.com/search") || 
                         originalUrl.includes("bing.com/search") || 
                         originalUrl.includes("google.com/maps") ||
                         originalUrl.includes("maps/search") ||
                         originalUrl.includes("yelp.com");

    if (isSearchUrl && queryTerm) {
      steps.push({ name: "Google Search", url: `https://www.google.com/search?q=${encodeURIComponent(queryTerm)}` });
      steps.push({ name: "Bing Search", url: `https://www.bing.com/search?q=${encodeURIComponent(queryTerm)}` });
      steps.push({ name: "Google Maps Search", url: `https://www.google.com/maps/search/${encodeURIComponent(queryTerm)}` });
      steps.push({ name: "Yelp Directory", url: `https://www.yelp.com/search?find_desc=${encodeURIComponent(queryTerm)}` });
    } else {
      // Direct website visits execute exactly that URL
      steps.push({ name: "Direct Site Visit", url: originalUrl });
    }

    return steps;
  }
}
