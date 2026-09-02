import { AppError } from '../utils/AppError.js';

/**
 * Calls Google Gemini generateContent API (gemini-1.5-pro) using native fetch.
 *
 * @param {object} params
 * @param {string} params.systemPrompt - System instructions for the model
 * @param {object[]} params.messages - User/assistant conversational history
 * @param {string} params.apiKey - User supplied Google Gemini API key
 */
export async function generateGeminiChatResponse({ systemPrompt, messages, apiKey, model }) {
  if (!apiKey) {
    throw new AppError(400, 'Google Gemini API key is required for BYOK.');
  }

  const selectedModel = model || 'gemini-3.5-flash';

  // Gemini uses "model" instead of "assistant" for the assistant's role
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const systemInstruction = systemPrompt ? {
    parts: [{ text: systemPrompt }]
  } : undefined;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          temperature: 0.7
        }
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new AppError(502, 'Gemini chat request failed.', {
        statusCode: response.status,
        payload
      });
    }

    const content = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof content !== 'string') {
      throw new AppError(502, 'Gemini returned an empty or invalid response.');
    }

    return {
      message: content,
      metadata: {
        model: selectedModel,
        usage: payload.usageMetadata
      }
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new AppError(504, 'Gemini chat request timed out.');
    }
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'Gemini chat failed.', { cause: error.message });
  } finally {
    clearTimeout(timeout);
  }
}
