const { createGoogleEmbeddings } = require("./embeddings");
const { getSnippets } = require("./db");

function cosineSimilarity(a, b) {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function findMostRelevantSnippets(userQuery, topN = 5) {
  const snippets = await getSnippets();

  const queryEmbedding = await createGoogleEmbeddings(
    [userQuery],
    "CODE_RETRIEVAL_QUERY"
  );

  const scored = snippets.map((snip) => ({
    ...snip,
    similarity: cosineSimilarity(snip.embedding, queryEmbedding),
  }));

  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, topN);
}

module.exports = findMostRelevantSnippets;
