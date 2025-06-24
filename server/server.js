require("dotenv").config({ path: ".env.local" });

const express = require("express");
const axios = require("axios");
const app = express();
const simpleGit = require("simple-git");
const { saveSnippets } = require("./lib/db");
const scanDirForFunctions = require("./lib/index-files");
const path = require("path");
const fs = require("fs");
const { generateEmbeddings } = require("./lib/embeddings");
const findMostRelevantSnippets = require("./lib/snippets");
const buildArchivistPromptFromTemplate = require("./lib/prompt");

const port = 5008;

const API_KEY = process.env.GOOGLE_API_KEY;

app.use(express.json());

app.post("/api/index", async (req, res) => {
  console.error("Respuesta req:", req.body.repoUrl);
  const url = req.body.repoUrl;
  const repoName = url.split("/").pop().replace(".git", "");
  const tmpFolderName = `${repoName}_${Date.now()}`;
  const localPath = path.join(__dirname, "repos", tmpFolderName);

  try {
    await simpleGit().clone(url, localPath, ["--depth=1"]);
    console.debug(`Cloned repository to: ${localPath}`);

    const extracted = scanDirForFunctions(localPath);
    console.debug(
      `Extracted ${extracted.length} code snippets from repository`
    );

    const embeddedSnippets = await generateEmbeddings(extracted);
    console.debug(
      `Generated embeddings for ${embeddedSnippets.length} snippets`
    );

    await saveSnippets(embeddedSnippets);
    console.debug(`Saved ${embeddedSnippets.length} snippets to database`);

    res.json({ status: "success", count: extracted.length });
  } catch (e) {
    // console.error(e);
    res.status(500).json({ error: "Something went wrong" });
  } finally {
    fs.rm(localPath, { recursive: true, force: true }, (err) => {
      if (err) {
        console.error(`Error removing repository: ${err}`);
      }
    });
    console.debug(`Removed repository: ${localPath}`);
  }
});

app.post("/api/search", async (req, res) => {
  const userQuery = req.body.inputValue;

  const relatedSnippets = await findMostRelevantSnippets(userQuery);

  if (!relatedSnippets || relatedSnippets.length === 0) {
    return res.status(404).json({ error: "No relevant snippets found" });
  }

  const prompt = await buildArchivistPromptFromTemplate(
    userQuery,
    relatedSnippets
  );

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
    {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  res.json({ value: [response.data.candidates[0].content.parts[0].text] });
  console.error(
    "Respuesta server:",
    response.data.candidates[0].content.parts[0].text
  );
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
