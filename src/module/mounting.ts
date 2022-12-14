import { ChatMessageDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData';
import { getCanvas, getGame } from './utils';

import { MountData, RiderData } from './data';

import { MODULE_ID, TOKEN_Z_ID } from './const';

export class Mounting {
    static ID = 'foundryvtt-mounting';
    dataMap = Map<string, MountData>;

    static async mount(riderToken: Token) {
        // In order to mount the user must select exactly two tokens.
        if (getCanvas().tokens?.controlled.length != 2) {
            ui?.notifications?.error(getGame().i18n.format('MOUNTING.error.TwoNotSelected'));
            return;
        }

        // This is mainly fall-back, wackiness is the only reason this should ever be true.
        if (riderToken == undefined) {
            ui?.notifications?.error(getGame().i18n.format('MOUNTING.error.RiderTokenUndefined'));
            return;
        }

        // Likewise here. The token should be selected at this point.
        const mountToken: Token | undefined = getCanvas().tokens?.controlled.find((t) => t.id != riderToken.id);
        if (mountToken == undefined) {
            ui?.notifications?.error(getGame().i18n.format('MOUNTING.error.MountTokenUndefined'));
            return;
        }

        if (!hasProperty(mountToken.document, `flags.${TOKEN_Z_ID}.zIndex`))
            await mountToken.document.setFlag(TOKEN_Z_ID, 'zIndex', -1);

        const mountData = MountData.fromTokenId(mountToken.id);
        await mountData.addRiderById(riderToken.id);

        const message = getGame().i18n.format('MOUNTING.info.Mount', {
            rider_name: riderToken.name,
            mount_name: mountToken.name,
        });
        const chatData: ChatMessageDataConstructorData = {
            type: 4,
            user: getGame().user,
            speaker: { alias: 'Mounting' },
            content: message,
            // whisper: [game.users.find((u) => u.isGM && u.active).id, game.user]
        };
        ChatMessage.create(chatData);
        console.log(`${MODULE_ID} | ` + message);
    }

    static async unmount(riderToken: Token) {
        if (riderToken == undefined) {
            ui?.notifications?.error(getGame().i18n.format('MOUNTING.error.RiderTokenUndefined'));
            return;
        }

        const riderData = RiderData.fromTokenId(riderToken.id);
        if (riderData == undefined) return; // TODO error
        const mountTokenId = riderData.mountId;

        if (mountTokenId == undefined) {
            ui?.notifications?.error(getGame().i18n.format('MOUNTING.error.MountTokenUndefined'));
            return;
        }

        const mountData = MountData.fromTokenId(mountTokenId);
        if (mountData.hasRider(riderToken.id)) {
            await mountData.removeRiderById(riderToken.id);
        }

        const message = getGame().i18n.format('MOUNTING.info.Dismount', {
            rider_name: riderToken.name,
            mount_name: mountData.getToken().name,
        });
        const chatData: ChatMessageDataConstructorData = {
            type: 4,
            user: getGame().user,
            speaker: { alias: 'Mounting' },
            content: message,
            // whisper: [game.users.find((u) => u.isGM && u.active).id, game.user]
        };
        ChatMessage.create(chatData);
        console.log(`${MODULE_ID} | ` + message);
    }
}
