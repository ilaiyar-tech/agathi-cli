export const actions = {
  hello: async (params: { name: string }, sdk: any) => {
    sdk.logger.info(`Action hello triggered for ${params.name}`);
    sdk.logger.info(`Data directory path: ${sdk.storage.dataDir}`);
    return `Hello, ${params.name}! Mock plugin is working. SDK version is ${sdk.apiVersion}`;
  }
};

export const events = {
  "ZIP_CREATED": async (event: any) => {
    console.log(`[Mock Plugin Listener] Received ZIP_CREATED event! path: ${event.payload.zipPath}`);
  }
};
