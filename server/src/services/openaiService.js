import { AppError } from '../utils/AppError.js';

/**
 * Calls OpenAI chat completions endpoint (gpt-4o) using native fetch.
 *
 * @param {object} params
 * @param {string} params.systemPrompt - System instructions for the model
 * @param {object[]} params.messages - User/assistant conversational history
 * @param {string} params.apiKey - User supplied OpenAI API key
 */
export async function generateOpenAIChatResponse({ systemPrompt, messages, apiKey, model }) {
  if (!apiKey) {
    throw new AppError(400, 'OpenAI API key is required for BYOK.');
  }

  const selectedModel = model || 'gpt-5.5';

  const conversation = [];
  if (systemPrompt) {
    conversation.push({ role: 'system', content: systemPrompt });
  }
  conversation.push(...messages);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        temperature: 0.7,
        messages: conversation
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new AppError(502, 'OpenAI chat request failed.', {
        statusCode: response.status,
        payload
      });
    }

    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new AppError(502, 'OpenAI returned an empty or invalid response.');
    }

    return {
      message: content,
      metadata: {
        model: payload.model || selectedModel,
        usage: payload.usage
      }
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new AppError(504, 'OpenAI chat request timed out.');
    }
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'OpenAI chat failed.', { cause: error.message });
  } finally {
    clearTimeout(timeout);
  }
}
