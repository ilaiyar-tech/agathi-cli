export const permissions = {
  env: ["MOCK_API_KEY"]
};

export const actions = {
  hello: async (params: { name: string }) => {
    return `Hello, ${params.name}! Mock plugin is working.`;
  }
};

export const events = {
  "ZIP_CREATED": async (event: any) => {
    console.log(`[Mock Plugin Listener] Received ZIP_CREATED event! path: ${event.payload.zipPath}`);
  }
};
