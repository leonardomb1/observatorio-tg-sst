import { isToolUIPart, type UIMessage, type UIMessageChunk } from 'ai';

const HIDDEN_ERROR = 'A consulta não pôde ser executada.';

function withoutSql(input: unknown): unknown {
	if (!input || typeof input !== 'object') return input;
	return Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'sql'));
}

/**
 * The browser never sees the SQL the model wrote nor the database's error text.
 * The full calls stay in Postgres, where the model needs them on the next turn.
 */
export function redactChunk(chunk: UIMessageChunk): UIMessageChunk | null {
	switch (chunk.type) {
		case 'tool-input-delta':
			return null;
		case 'tool-input-available':
			return { ...chunk, input: withoutSql(chunk.input) };
		case 'tool-input-error':
			return { ...chunk, input: withoutSql(chunk.input), errorText: HIDDEN_ERROR };
		case 'tool-output-error':
			return { ...chunk, errorText: HIDDEN_ERROR };
		default:
			return chunk;
	}
}

export function redactMessages<Message extends UIMessage>(messages: Message[]): Message[] {
	return messages.map((message) => ({
		...message,
		parts: message.parts.map((part) => {
			if (!isToolUIPart(part)) return part;
			const rest = Object.fromEntries(Object.entries(part).filter(([key]) => key !== 'rawInput'));
			return {
				...rest,
				input: withoutSql(part.input),
				...(part.state === 'output-error' ? { errorText: HIDDEN_ERROR } : {})
			} as typeof part;
		})
	}));
}
