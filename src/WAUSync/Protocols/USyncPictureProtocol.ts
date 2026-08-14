import type { USyncQueryProtocol } from '../../Types/USync'
import { assertNodeErrorFree, type BinaryNode } from '../../WABinary'
import type { USyncUser } from '../USyncUser'

export type PictureData = {
	id: string | null
	directPath: string | null
	hash: string | null
}

export class USyncPictureProtocol implements USyncQueryProtocol {
	name = 'picture'
	type: 'image' | 'preview'

	constructor(type: 'image' | 'preview' = 'image') {
		this.type = type
	}

	getQueryElement(): BinaryNode {
		return {
			tag: 'picture',
			attrs: { type: this.type }
		}
	}

	getUserElement(user: USyncUser): BinaryNode | null {
		const attrs: Record<string, string> = {}
		if (user.pictureId != null) attrs.id = String(user.pictureId)
		return Object.keys(attrs).length > 0 ? { tag: 'picture', attrs } : null
	}

	parser(node: BinaryNode): PictureData | null {
		if (node.tag !== 'picture') return null
		assertNodeErrorFree(node)
		const id = node.attrs?.id ?? null
		const directPath = node.attrs?.direct_path ?? null
		const hash = node.attrs?.hash ?? null
		if (!id && !directPath) return null
		return { id, directPath, hash }
	}
}
