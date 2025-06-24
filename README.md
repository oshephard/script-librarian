# Project README

## Overview

This is the Script Librarian. It sifts through your code, picks out useful snippets, and then searches through your archives to give you relevant, real-world code examples that YOU wrote.

## Features

- Extracts code "Snippets" from desired git repositories (\*\*Note: Only public repos are supported at this time.)
- Determines relevant "Snippets" using Google AI's `gemini-embedding-exp-03-07` model for embedding.
- Prompts LLM (Google AI's `gemini-2.5-flash`) to ultimately determine the most useful code sample based on the user's query.

## Getting Started

### Prerequisites

- Start a postgres server and set `DATABASE_URL` under `.env`

```
CREATE TABLE code_snippets (
	id text,
	file_path text,
	function_name text,
	code text,
	"type" text,
	tags _text,
	embedding jsonb
);
```

- Generate a Google AI Key and set `GOOGLE_API_KEY` under `.env`

### Installation

1. Install Client-Side Dependencies: `cd client && npm install`
2. Install Server-Side Dependencies: `cd server && npm install`

### Usage

1. To run the Client: `cd client && npm start`
2. To run the Server: `cd server && npm run dev`
3. Ensure your postgres DB is running
4. Ensure that your `.env` is filled out

In the UI:

1. Upload a git repository (PUBLIC ONLY) and wait for code snippets to generate.
2. Ask the LLM for an example from your codebase (e.g. "Give me an example POST API")
