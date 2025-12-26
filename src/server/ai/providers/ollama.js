/**
 * RetroWebLauncher - Ollama AI Provider
 * Local AI using Ollama (https://ollama.ai)
 */

let baseUrl = 'http://localhost:11434';
let model = 'llama3.2';

/**
 * Initialize Ollama provider
 */
async function init(config) {
  baseUrl = config.ollamaUrl || 'http://localhost:11434';
  model = config.ollamaModel || 'llama3.2';

  // Test connection
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error('Ollama not responding');
    }

    const data = await response.json();
    const hasModel = data.models?.some(m => m.name.startsWith(model));

    if (!hasModel) {
      console.warn(`Ollama model ${model} not found. Available: ${data.models?.map(m => m.name).join(', ')}`);
    }

    console.log(`Ollama connected at ${baseUrl} using model ${model}`);
  } catch (error) {
    throw new Error(`Failed to connect to Ollama: ${error.message}`);
  }
}

/**
 * Send a prompt to Ollama
 */
async function generate(prompt, options = {}) {
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature || 0.3,
        num_predict: options.maxTokens || 500
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response;
}

/**
 * Parse natural language search query
 */
async function parseSearchQuery(query) {
  const prompt = `You are a retro gaming search assistant. Parse the following search query and extract structured filters.

Query: "${query}"

Extract these fields if present (output as JSON):
- text: the main search text (game name or keyword)
- genre: genre filter (action, platformer, racing, rpg, shooter, puzzle, sports, fighting, etc.)
- players: number of players (1, 2, or "multiplayer" for 2+)
- decade: decade filter (80s, 90s, 2000s)
- system: system/console filter (snes, genesis, nes, arcade, etc.)
- quality: quality filter ("best", "hidden gems", "classics", "underrated")

Output ONLY valid JSON, nothing else:`;

  try {
    const response = await generate(prompt);

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Failed to parse search query:', error);
  }

  return { text: query };
}

/**
 * Suggest collections based on games
 */
async function suggestCollections(games) {
  if (games.length === 0) return [];

  // Sample some games for analysis
  const sample = games.slice(0, 50).map(g => ({
    name: g.name,
    genre: g.genre,
    players: g.players,
    year: g.releasedate?.substring(0, 4)
  }));

  const prompt = `Analyze these retro games and suggest 5 smart collections that would group them interestingly.

Games sample:
${JSON.stringify(sample, null, 2)}

Suggest collections with creative names that gamers would find useful. Output as JSON array with fields:
- name: collection name
- description: brief description
- criteria: how to match games

Output ONLY valid JSON array, nothing else:`;

  try {
    const response = await generate(prompt, { maxTokens: 1000 });

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Failed to suggest collections:', error);
  }

  return [];
}

/**
 * Find similar games
 */
async function findSimilarGames(game, allGames, limit = 10) {
  // Use simple heuristics + AI for best results
  const candidates = allGames
    .filter(g => g.id !== game.id)
    .filter(g =>
      g.genre === game.genre ||
      g.developer === game.developer ||
      g.publisher === game.publisher
    )
    .slice(0, 100);

  if (candidates.length === 0) return [];

  const prompt = `Given this game:
Name: ${game.name}
Genre: ${game.genre || 'Unknown'}
Description: ${game.desc || 'No description'}

Rank these games by similarity (most similar first). Return ONLY the indices as a JSON array:
${candidates.slice(0, 30).map((g, i) => `${i}: ${g.name} (${g.genre || 'Unknown'})`).join('\n')}

Output ONLY a JSON array of indices, like [0, 5, 2, ...]:`;

  try {
    const response = await generate(prompt, { maxTokens: 200 });

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const indices = JSON.parse(jsonMatch[0]);
      return indices
        .filter(i => typeof i === 'number' && i >= 0 && i < candidates.length)
        .slice(0, limit)
        .map(i => candidates[i]);
    }
  } catch (error) {
    console.error('Failed to find similar games:', error);
  }

  // Fallback to basic similarity
  return candidates.slice(0, limit);
}

/**
 * Generate game description
 */
async function generateDescription(game) {
  const prompt = `Write a brief, engaging description for this retro game. Keep it under 100 words and make it sound like it belongs in a gaming catalog.

Game: ${game.name}
Genre: ${game.genre || 'Unknown'}
Developer: ${game.developer || 'Unknown'}
Year: ${game.releasedate?.substring(0, 4) || 'Unknown'}
System: ${game.systemName || 'Unknown'}

Write the description:`;

  try {
    return await generate(prompt, { temperature: 0.7, maxTokens: 200 });
  } catch (error) {
    console.error('Failed to generate description:', error);
    return null;
  }
}

module.exports = {
  init,
  generate,
  parseSearchQuery,
  suggestCollections,
  findSimilarGames,
  generateDescription
};
