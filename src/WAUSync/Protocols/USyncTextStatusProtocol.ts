import type { USyncQueryProtocol } from '../../Types/USync'
import { assertNodeErrorFree, getBinaryNodeChild, type BinaryNode } from '../../WABinary'

export type TextStatusData = {
	text: string | null
	emoji: string | null
	setAt: Date
	expiresAt: Date | null
}

export class USyncTextStatusProtocol implements USyncQueryProtocol {
	name = 'text_status'

	getQueryElement(): BinaryNode {
		return {
			tag: 'text_status',
			attrs: {}
		}
	}

	getUserElement(): null {
		return null
	}

	parser(node: BinaryNode): TextStatusData | null {
		if (node.tag !== 'text_status') return null
		assertNodeErrorFree(node)
		const lastUpdateTimeSec = node.attrs?.last_update_time ? +node.attrs.last_update_time : 0
		const ephemeralDurationSec = node.attrs?.ephemeral_duration_sec ? +node.attrs.ephemeral_duration_sec : 0
		const text = node.attrs?.text ?? null
		const emojiNode = getBinaryNodeChild(node, 'emoji')
		const emoji = emojiNode?.attrs?.content ?? null
		const expiresAt =
			ephemeralDurationSec > 0 ? new Date((lastUpdateTimeSec + ephemeralDurationSec) * 1000) : null

		return {
			text,
			emoji,
			setAt: new Date(lastUpdateTimeSec * 1000),
			expiresAt
		}
	}
}
