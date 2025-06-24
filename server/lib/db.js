const { Pool } = require("pg");
const format = require("pg-format/lib/index");

const pool = new Pool({
  connectionString: "postgresql://postgres:password@127.0.0.1/script-librarian", // or your config
});

async function saveSnippets(snippets) {
  if (!snippets.length) return;

  const arrToPgArray = (arr) => "{" + arr.map(String).join(",") + "}";

  const data = snippets.map((snippet) => [
    snippet.file,
    snippet.name,
    snippet.code,
    snippet.type,
    arrToPgArray(Array.isArray(snippet.tags) ? snippet.tags : []),
    JSON.stringify(snippet.embedding),
  ]);

  console.log("Preparing to insert snippets:", data);

  // Note: pg-format will safely interpolate the %L with properly formatted literals!
  const query = format(
    "INSERT INTO code_snippets (file_path, function_name, code, type, tags, embedding) VALUES %L",
    data
  );

  console.log("Executing query:", query);

  await pool.query(query);
}

async function getSnippets() {
  const res = await pool.query(
    "SELECT id, file_path, function_name, code, embedding FROM code_snippets WHERE embedding IS NOT NULL"
  );
  // Convert embedding from JSON to array (pg auto-parses JSONB columns)
  return res.rows.map((row) => ({
    ...row,
    embedding: Array.isArray(row.embedding)
      ? row.embedding
      : JSON.parse(row.embedding),
  }));
}

module.exports = { saveSnippets, getSnippets };
