import { createAnthropic, type AnthropicLanguageModelOptions } from '@ai-sdk/anthropic';
import {
	convertToModelMessages,
	createIdGenerator,
	createUIMessageStreamResponse,
	isStepCount,
	isToolUIPart,
	streamText,
	toUIMessageStream,
	validateUIMessages,
	type LanguageModel,
	type UIMessage
} from 'ai';
import { datamartColumns } from '../catalog/consulta.ts';
import { systemPrompt } from './prompt.ts';
import { createTools, type ToolDeps } from './tools.ts';

export const MODEL = 'claude-sonnet-5-5';
const MAX_STEPS = 10;

interface Totals {
	inputTokens: number;
	outputTokens: number;
	cacheReadTokens: number;
	cacheWriteTokens: number;
	steps: number;
	finishReason: string | null;
}

interface Turn {
	history: UIMessage[];
	message: UIMessage;
	/** Receives the whole conversation; complete is false when the stream failed or was cut. */
	onMessages: (messages: UIMessage[], complete: boolean) => Promise<void>;
	onTotals: (totals: Totals) => Promise<void>;
	signal: AbortSignal;
}

/** Citation numbers keep growing across the conversation, so [n] never points at two sources. */
function citedSoFar(messages: readonly UIMessage[]): number {
	let total = 0;
	for (const message of messages) {
		for (const part of message.parts) {
			if (!isToolUIPart(part) || part.type !== 'tool-buscar_documentos') continue;
			if (part.state !== 'output-available') continue;
			total += (part.output as { results: unknown[] }).results.length;
		}
	}
	return total;
}

export function anthropicModel(apiKey: string): LanguageModel {
	return createAnthropic({ apiKey })(MODEL);
}

/** One assistant turn as a UI message stream. Free of SvelteKit so evals can drive it directly. */
export async function runAgent(model: LanguageModel, deps: ToolDeps, turn: Turn) {
	const tools = createTools(deps, citedSoFar(turn.history) + 1);
	const messages = await validateUIMessages({ messages: [...turn.history, turn.message], tools });
	const system = systemPrompt(await datamartColumns(deps.query));

	const result = streamText({
		model,
		instructions: system,
		messages: await convertToModelMessages(messages, { tools }),
		tools,
		stopWhen: isStepCount(MAX_STEPS),
		maxOutputTokens: 16_000,
		abortSignal: turn.signal,
		providerOptions: {
			anthropic: {
				thinking: { type: 'adaptive', display: 'updates' },
				effort: 'medium',
				cacheControl: { type: 'ephemeral' },
				fallbacks: 'default'
			} satisfies AnthropicLanguageModelOptions
		},
		onEnd: async ({ usage, steps, finishReason }) => {
			await turn.onTotals({
				inputTokens: usage.inputTokens ?? 0,
				outputTokens: usage.outputTokens ?? 0,
				cacheReadTokens: usage.inputTokenDetails.cacheReadTokens ?? 0,
				cacheWriteTokens: usage.inputTokenDetails.cacheWriteTokens ?? 0,
				steps: steps.length,
				finishReason
			});
		}
	});

	return createUIMessageStreamResponse({
		stream: toUIMessageStream({
			stream: result.stream,
			tools,
			originalMessages: messages,
			generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
			onError: () => 'Não foi possível concluir a resposta. Tente de novo em instantes.',
			onEnd: async ({ messages: all, isAborted, outcome }) => {
				await turn.onMessages(all, !isAborted && outcome.status === 'completed');
			}
		})
	});
}
