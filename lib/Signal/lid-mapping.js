"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIDMappingStore = void 0;
const lru_cache_1 = require("lru-cache");
const jid_utils_1 = require("../WABinary/jid-utils");

class LIDMappingStore {
    constructor(keys, logger, pnToLIDFunc) {
        this.mappingCache = new lru_cache_1.LRUCache({
            ttl: 3 * 24 * 60 * 60 * 1000,
            ttlAutopurge: true,
            updateAgeOnGet: true
        });
        this.inflightLIDLookups = new Map();
        this.inflightPNLookups = new Map();
        this.keys = keys;
        this.logger = logger;
        this.pnToLIDFunc = pnToLIDFunc;
    }

    async storeLIDPNMappings(pairs) {
        const pairMap = {};
        for (const { lid, pn } of pairs) {
            const lidDecoded = (0, jid_utils_1.jidDecode)(lid);
            const pnDecoded = (0, jid_utils_1.jidDecode)(pn);
            if (!lidDecoded || !pnDecoded) continue;
            const pnUser = pnDecoded.user;
            const lidUser = lidDecoded.user;
            if (!pnUser || !lidUser) continue;
            let existingLidUser = this.mappingCache.get(`pn:${pnUser}`);
            if (!existingLidUser) {
                try {
                    const stored = await this.keys.get('lid-mapping', [pnUser]);
                    existingLidUser = stored[pnUser];
                    if (existingLidUser) {
                        this.mappingCache.set(`pn:${pnUser}`, existingLidUser);
                        this.mappingCache.set(`lid:${existingLidUser}`, pnUser);
                    }
                } catch (e) {}
            }
            if (existingLidUser === lidUser) continue;
            pairMap[pnUser] = lidUser;
        }
        if (Object.keys(pairMap).length === 0) return;
        try {
            await this.keys.transaction(async () => {
                for (const [pnUser, lidUser] of Object.entries(pairMap)) {
                    await this.keys.set({
                        'lid-mapping': {
                            [pnUser]: lidUser,
                            [`${lidUser}_reverse`]: pnUser
                        }
                    });
                    this.mappingCache.set(`pn:${pnUser}`, lidUser);
                    this.mappingCache.set(`lid:${lidUser}`, pnUser);
                }
            }, 'lid-mapping');
        } catch (e) {
            if (this.logger) this.logger.warn({ e }, 'failed to store LID-PN mappings');
        }
    }

    async getLIDForPN(pn) {
        return (await this.getLIDsForPNs([pn]))?.[0]?.lid || null;
    }

    async getLIDsForPNs(pns) {
        const usyncFetch = {};
        const successfulPairs = {};
        for (const pn of pns) {
            const decoded = (0, jid_utils_1.jidDecode)(pn);
            if (!decoded) continue;
            const pnUser = decoded.user;
            let lidUser = this.mappingCache.get(`pn:${pnUser}`);
            if (!lidUser) {
                try {
                    const stored = await this.keys.get('lid-mapping', [pnUser]);
                    lidUser = stored[pnUser];
                    if (lidUser) {
                        this.mappingCache.set(`pn:${pnUser}`, lidUser);
                        this.mappingCache.set(`lid:${lidUser}`, pnUser);
                    } else {
                        const device = decoded.device || 0;
                        const normalizedPn = `${pnUser}@s.whatsapp.net`;
                        if (!usyncFetch[normalizedPn]) {
                            usyncFetch[normalizedPn] = [device];
                        } else {
                            usyncFetch[normalizedPn].push(device);
                        }
                        continue;
                    }
                } catch (e) { continue; }
            }
            lidUser = lidUser.toString();
            if (!lidUser) continue;
            const pnDevice = decoded.device !== undefined ? decoded.device : 0;
            const deviceSpecificLid = `${lidUser}${pnDevice ? `:${pnDevice}` : ''}@lid`;
            successfulPairs[pn] = { lid: deviceSpecificLid, pn };
        }
        if (Object.keys(usyncFetch).length > 0) {
            try {
                const result = await this.pnToLIDFunc?.(Object.keys(usyncFetch));
                if (result && result.length > 0) {
                    await this.storeLIDPNMappings(result);
                    for (const pair of result) {
                        const pnDecoded = (0, jid_utils_1.jidDecode)(pair.pn);
                        const pnUser = pnDecoded?.user;
                        if (!pnUser) continue;
                        const lidUser = (0, jid_utils_1.jidDecode)(pair.lid)?.user;
                        if (!lidUser) continue;
                        for (const device of (usyncFetch[pair.pn] || [])) {
                            const deviceSpecificLid = `${lidUser}${device ? `:${device}` : ''}@lid`;
                            const deviceSpecificPn = `${pnUser}${device ? `:${device}` : ''}@s.whatsapp.net`;
                            successfulPairs[deviceSpecificPn] = { lid: deviceSpecificLid, pn: deviceSpecificPn };
                        }
                    }
                } else {
                    return null;
                }
            } catch (e) {
                return null;
            }
        }
        return Object.values(successfulPairs);
    }

    async getPNsForLIDs(lids) {
        const result = [];
        const missingLids = [];
        for (const lid of lids) {
            const decoded = (0, jid_utils_1.jidDecode)(lid);
            if (!decoded) continue;
            const lidUser = decoded.user;
            const pnUser = this.mappingCache.get(`lid:${lidUser}`);
            if (!pnUser || typeof pnUser !== 'string') {
                missingLids.push(lidUser);
            } else {
                const lidDevice = decoded.device !== undefined ? decoded.device : 0;
                const pnJid = `${pnUser}${lidDevice ? `:${lidDevice}` : ''}@s.whatsapp.net`;
                result.push({ lid, pn: pnJid });
            }
        }
        if (missingLids.length > 0) {
            try {
                const keys = missingLids.map(l => `${l}_reverse`);
                const stored = await this.keys.get('lid-mapping', keys);
                for (const lidUser of missingLids) {
                    const pnUser = stored[`${lidUser}_reverse`];
                    if (pnUser && typeof pnUser === 'string') {
                        this.mappingCache.set(`lid:${lidUser}`, pnUser);
                        for (const lid of lids) {
                            if (lid.startsWith(lidUser)) {
                                const decoded = (0, jid_utils_1.jidDecode)(lid);
                                if (decoded) {
                                    const lidDevice = decoded.device !== undefined ? decoded.device : 0;
                                    const pnJid = `${pnUser}${lidDevice ? `:${lidDevice}` : ''}@s.whatsapp.net`;
                                    result.push({ lid, pn: pnJid });
                                }
                            }
                        }
                    }
                }
            } catch (e) {}
        }
        return result;
    }

    async getPNForLID(lid) {
        const results = await this.getPNsForLIDs([lid]);
        return results?.[0]?.pn || null;
    }
}

exports.LIDMappingStore = LIDMappingStore;
