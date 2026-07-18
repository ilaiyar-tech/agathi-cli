export interface ScoreResult {
  score: number;
  reason: string;
  nameMatched: boolean;
  locationMatched: boolean;
  hasContactInfo: boolean;
}

export class ConfidenceScorer {
  public async scoreResult(userQuery: string, pageText: string): Promise<ScoreResult> {
    try {
      const response = await fetch("http://127.0.0.1:8012/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a search result validator and confidence scorer.
Analyze the webpage text against the user query.
Determine if the page contains actual relevant information (like address, phone, website, business name match, or location match) for the specific target business mentioned in the user query.

Assign a Confidence Score (0 to 100) based on:
- Name Match (does it contain the target business name?)
- Location Match (does it match the requested town/city/surroundings?)
- Contact Info (does it have a phone number, address, or map details?)
- Avoid false positives like internet speed tests, CAPTCHAs, error pages, or generic search result pages with no matching listings.

Output JSON only in this exact format:
{
  "score": <0-100>,
  "reason": "short explanation of the score",
  "nameMatched": <true|false>,
  "locationMatched": <true|false>,
  "hasContactInfo": <true|false>
}`
            },
            {
              role: "user",
              content: `USER QUERY: ${userQuery}\n\nPAGE TEXT: ${pageText.substring(0, 3000)}`
            }
          ],
          temperature: 0.1,
          max_tokens: 150
        })
      });

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content?.trim() || "";
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          score: parsed.score ?? 0,
          reason: parsed.reason ?? "No reason provided",
          nameMatched: parsed.nameMatched ?? false,
          locationMatched: parsed.locationMatched ?? false,
          hasContactInfo: parsed.hasContactInfo ?? false
        };
      }

      const hasYes = content.toUpperCase().includes("YES");
      return {
        score: hasYes ? 90 : 10,
        reason: "Fallback heuristic match",
        nameMatched: hasYes,
        locationMatched: hasYes,
        hasContactInfo: false
      };
    } catch (e: any) {
      return {
        score: 50,
        reason: `Confidence scoring error: ${e.message}`,
        nameMatched: true,
        locationMatched: true,
        hasContactInfo: false
      };
    }
  }
}
