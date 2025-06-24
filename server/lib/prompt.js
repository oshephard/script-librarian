const fs = require("fs");
const mustache = require("mustache");
const path = require("path");

const TEMPLATE_PATH = path.join(__dirname, "prompt-template.md");

function buildArchivistPromptFromTemplate(userQuery, snippets) {
  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");

  const snippetsWithIndex = snippets.map((s, idx) => ({
    ...s,
    index: idx + 1,
  }));
  const rendered = mustache.render(template, {
    userQuery,
    snippets: snippetsWithIndex,
  });

  console.log("Rendered Prompt:", rendered);

  return rendered;
}

module.exports = buildArchivistPromptFromTemplate;
