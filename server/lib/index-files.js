const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

function scanYamlSnippets(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  let parsedDocs = [];
  try {
    yaml.loadAll(content, (doc) => {
      if (doc !== null && doc !== undefined) {
        parsedDocs.push(doc);
      }
    });
  } catch (e) {
    console.error(`Failed to parse YAML: ${filePath}`, e);
  }

  return parsedDocs.map((parsed, idx) => ({
    type: "yaml_document",
    code: yaml.dump(parsed) || "",
    parsed,
    file: filePath,
    name:
      path.basename(filePath) + (parsedDocs.length > 1 ? `#${idx + 1}` : ""),
    tags: Array.isArray(parsed && parsed.tags) ? parsed.tags : [],
  }));
}

function scanFileAst(filePath, code) {
  let found = [];
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: "unambiguous",
      plugins: [
        "jsx",
        "typescript",
        "classProperties",
        "objectRestSpread",
        "dynamicImport",
      ],
    });
  } catch (e) {
    console.error(`Parse error in ${filePath}:`, e.message);
    return found;
  }

  traverse(ast, {
    // Match standalone function declarations: function foo(...) { ... }
    FunctionDeclaration(path) {
      found.push({
        type: "function_declaration",
        name: path.node.id?.name,
        params: path.node.params
          .map((p) => (p.name ? p.name : "arg"))
          .join(", "),
        code: code.slice(path.node.start, path.node.end),
        file: filePath,
        tags: generateTags(
          path.node.id?.name || "",
          code.slice(path.node.start, path.node.end)
        ),
      });
    },
    // Match const foo = (...) => { ... }, let/var allowed too
    VariableDeclarator(path) {
      // Arrow function: const <name> = (<args>) => { ... }
      if (path.node.init && path.node.init.type === "ArrowFunctionExpression") {
        found.push({
          type: "arrow_function",
          name: path.node.id.name,
          params: path.node.init.params
            .map((p) => (p.name ? p.name : "arg"))
            .join(", "),
          code: code.slice(path.node.start, path.node.end),
          file: filePath,
          tags: generateTags(
            path.node.id.name,
            code.slice(path.node.start, path.node.end)
          ),
        });
      }
      // function expression: const <name> = function (...) { ... }
      if (path.node.init && path.node.init.type === "FunctionExpression") {
        found.push({
          type: "function_expression",
          name: path.node.id.name,
          params: path.node.init.params
            .map((p) => (p.name ? p.name : "arg"))
            .join(", "),
          code: code.slice(path.node.start, path.node.end),
          file: filePath,
          tags: generateTags(
            path.node.id.name,
            code.slice(path.node.start, path.node.end)
          ),
        });
      }
    },
    // Class methods (including static): class Foo { bar() {...} }
    ClassMethod(path) {
      found.push({
        type: "class_method",
        name: path.node.key.name,
        params: path.node.params
          .map((p) => (p.name ? p.name : "arg"))
          .join(", "),
        code: code.slice(path.node.start, path.node.end),
        file: filePath,
        tags: generateTags(
          path.node.key.name,
          code.slice(path.node.start, path.node.end)
        ),
      });
    },
    // Object methods: const obj = { foo() { ... }, bar: function() {...}, baz: () => {...} }
    ObjectMethod(path) {
      found.push({
        type: "object_method",
        name: path.node.key.name,
        params: path.node.params
          .map((p) => (p.name ? p.name : "arg"))
          .join(", "),
        code: code.slice(path.node.start, path.node.end),
        file: filePath,
        tags: generateTags(
          path.node.key.name,
          code.slice(path.node.start, path.node.end)
        ),
      });
    },
    // Call expressions, e.g. app.get("/foo", ...)
    CallExpression(path) {
      const callee = path.node.callee;
      if (
        callee &&
        callee.type === "MemberExpression" &&
        ["app", "router"].includes(callee.object.name) &&
        ["get", "post", "put", "delete", "patch", "head", "options"].includes(
          callee.property.name
        )
      ) {
        const verb = callee.property.name.toUpperCase();
        const arg = path.node.arguments?.[0];
        const route =
          arg &&
          (arg.type === "StringLiteral" || arg.type === "TemplateLiteral")
            ? arg.value || arg.quasis?.[0].value.raw
            : "";
        found.push({
          type: "api_route",
          verb: verb,
          path: route,
          code: code.slice(path.node.start, path.node.end),
          file: filePath,
          tags: [
            "api",
            verb,
            route ? route.replace(/^\//, "").split("/")[0] : "",
          ],
        });
      }
    },
  });

  return found;
}

// Simple tag inference (expand as desired!)
function generateTags(name, code) {
  const tags = [];
  if (
    /app\.(get|post|put|delete|patch|head|options)/.test(code) ||
    /router\.(get|post|put|delete|patch|head|options)/.test(code)
  )
    tags.push("api");
  if (/get/i.test(name)) tags.push("GET");
  if (/post/i.test(name)) tags.push("POST");
  if (/user/i.test(name)) tags.push("users");
  if (/order/i.test(name)) tags.push("orders");
  if (/auth|login|logout/i.test(name + code)) tags.push("auth");
  // Add more rules as needed!
  return tags;
}

function scanDirForFunctions(dir) {
  let result = [];
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat && stat.isDirectory()) {
      result = result.concat(scanDirForFunctions(fullPath));
    } else if (/\.(js|jsx|ts|tsx)$/.test(fullPath)) {
      const code = fs.readFileSync(fullPath, "utf8");
      result = result.concat(scanFileAst(fullPath, code));
    } else if (/\.ya?ml$/i.test(fullPath)) {
      result = result.concat(scanYamlSnippets(fullPath));
    }
  });
  return result;
}

module.exports = scanDirForFunctions;
