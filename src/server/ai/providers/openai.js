/**
 * RetroWebLauncher - OpenAI Provider
 * Cloud AI using OpenAI API
 */

let apiKey = null;
let model = 'gpt-4o-mini';
let initialized = false;

/**
 * Initialize OpenAI provider
 */
async function init(config) {
  apiKey = config.openaiKey || process.env.OPENAI_API_KEY;
  model = config.openaiModel || 'gpt-4o-mini';

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Test connection with a simple request
  try {
    await generate('Hello', { maxTokens: 5 });
    initialized = true;
    console.log(`OpenAI connected using model ${model}`);
  } catch (error) {
    throw new Error(`Failed to connect to OpenAI: ${error.message}`);
  }
}

/**
 * Send a prompt to OpenAI
 */
async function generate(prompt, options = {}) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful retro gaming assistant. Be concise and output JSON when requested.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens || 500
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`OpenAI request failed: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Parse natural language search query
 */
async function parseSearchQuery(query) {
  const prompt = `Parse this retro gaming search query into structured filters.

Query: "${query}"

Extract (JSON format):
- text: main search keyword
- genre: genre (action, platformer, racing, rpg, shooter, puzzle, sports, fighting)
- players: player count (1, 2, or "multiplayer")
- decade: time period (80s, 90s, 2000s)
- system: console/system name
- quality: quality filter (best, hidden gems, classics, underrated)

Output ONLY valid JSON:`;

  try {
    const response = await generate(prompt);
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

  const sample = games.slice(0, 30).map(g => ({
    name: g.name,
    genre: g.genre,
    players: g.players,
    year: g.releasedate?.substring(0, 4)
  }));

  const prompt = `Suggest 5 smart game collections based on these retro games:

${JSON.stringify(sample)}

Output as JSON array with: name, description, criteria`;

  try {
    const response = await generate(prompt, { maxTokens: 800 });
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
  const candidates = allGames
    .filter(g => g.id !== game.id)
    .filter(g =>
      g.genre === game.genre ||
      g.developer === game.developer
    )
    .slice(0, 50);

  if (candidates.length === 0) return [];

  const prompt = `Game: ${game.name} (${game.genre || 'Unknown'})

Rank these by similarity (indices only):
${candidates.slice(0, 20).map((g, i) => `${i}: ${g.name} (${g.genre})`).join('\n')}

Output JSON array of indices:`;

  try {
    const response = await generate(prompt, { maxTokens: 100 });
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

  return candidates.slice(0, limit);
}

/**
 * Generate game description
 */
async function generateDescription(game) {
  const prompt = `Write a brief (under 80 words), engaging catalog description for:

${game.name}
Genre: ${game.genre || 'Unknown'}
Developer: ${game.developer || 'Unknown'}
Year: ${game.releasedate?.substring(0, 4) || 'Unknown'}`;

  try {
    return await generate(prompt, { temperature: 0.7, maxTokens: 150 });
  } catch (error) {
    console.error('Failed to generate description:', error);
    return null;
  }
}

module.exports = {
  init,
  parseSearchQuery,
  suggestCollections,
  findSimilarGames,
  generateDescription
};
