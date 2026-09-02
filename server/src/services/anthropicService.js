import { AppError } from '../utils/AppError.js';

/**
 * Calls Anthropic messages endpoint (claude-3-5-sonnet-20241022) using native fetch.
 *
 * @param {object} params
 * @param {string} params.systemPrompt - System instructions for the model
 * @param {object[]} params.messages - User/assistant conversational history
 * @param {string} params.apiKey - User supplied Anthropic API key
 */
export async function generateAnthropicChatResponse({ systemPrompt, messages, apiKey, model }) {
  if (!apiKey) {
    throw new AppError(400, 'Anthropic API key is required for BYOK.');
  }

  const selectedModel = model || 'claude-fable-5';

  // Filter messages to only contain user and assistant roles (Anthropic does not allow system messages in messages array)
  const anthropicMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 4096,
        temperature: 0.7,
        system: systemPrompt || undefined,
        messages: anthropicMessages
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new AppError(502, 'Anthropic chat request failed.', {
        statusCode: response.status,
        payload
      });
    }

    const content = payload.content?.[0]?.text;
    if (typeof content !== 'string') {
      throw new AppError(502, 'Anthropic returned an empty or invalid response.');
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
      throw new AppError(504, 'Anthropic chat request timed out.');
    }
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'Anthropic chat failed.', { cause: error.message });
  } finally {
    clearTimeout(timeout);
  }
}
