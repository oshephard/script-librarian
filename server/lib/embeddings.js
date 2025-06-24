const axios = require("axios");

const API_KEY = process.env.GOOGLE_API_KEY;

async function createGoogleEmbeddings(texts, taskType) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-exp-03-07:embedContent?key=${API_KEY}`;

  try {
    const resp = await axios.post(endpoint, {
      model: "models/gemini-embedding-exp-03-07",
      content: {
        parts: texts.map((text) => ({
          text,
        })),
      },
      taskType,
    });

    // The API returns embeddings for all inputs (just one here)
    const embedding = resp.data.embedding.values;
    if (!embedding) throw new Error("No embedding found in response.");
    return embedding; // array of floats (vector)
  } catch (err) {
    console.error(
      "Google Embeddings API error:",
      err?.response?.data?.error || err.message
    );
    throw err;
  }
}

async function generateEmbeddings(snippets) {
  if (!snippets.length) return [];

  // Prepare all texts to embed
  const texts = snippets.map((s) => s.code);
  console.log(`Generating embeddings for ${texts.length} snippets...`);

  try {
    // Call the Google API in parallel for all snippets
    const batchEmbeddings = await createGoogleEmbeddings(
      texts,
      "RETRIEVAL_DOCUMENT"
    );

    // Attach embeddings back to each snippet
    return snippets.map((snippet, idx) => ({
      ...snippet,
      embedding: batchEmbeddings[idx],
    }));
  } catch (err) {
    console.error("Failed to generate embeddings:", err);
    throw err;
  }
}

module.exports = { createGoogleEmbeddings, generateEmbeddings };
