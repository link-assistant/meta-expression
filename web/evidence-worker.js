import { createWikimediaEvidenceClient } from '../src/index.js';

const client = createWikimediaEvidenceClient();

self.addEventListener('message', async (event) => {
  const { id, statement } = event.data ?? {};
  if (!id || !statement) {
    return;
  }

  try {
    const evidence = await client.resolveEvidence(statement);
    self.postMessage({ id, evidence });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
