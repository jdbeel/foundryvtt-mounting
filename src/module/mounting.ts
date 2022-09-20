import { ChatMessageDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData';
import { getCanvas, getGame, getToken } from './utils';

// This is used as a shim until foundry-vtt-types is updated to v10
interface ShimTokenDocument extends TokenDocument {
  height: number;
  width: number;
}

export class Mounting {
  static ID = 'foundryvtt-mounting';

  static async mount(riderToken: Token | undefined) {
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

    // Shim is used while we wait for the types to be updated.
    const riderTokenDocument = riderToken.document as ShimTokenDocument;
    const mountTokenDocument = mountToken.document as ShimTokenDocument;
    await riderTokenDocument.setFlag(this.ID, 'mount_id', mountToken.id);
    await mountTokenDocument.setFlag(this.ID, 'rider_id', riderToken.id);

    // This currently is detected as an error, but will stop doing so when the
    // foundryvtttypes module is updated.
    await mountToken.document.update({
      // @ts-ignore
      x: riderToken.document.x,
      // @ts-ignore
      y: riderToken.document.y,
    });

    // Push token to front of token "stack"
    // This makes some fairly heavy assumptions. There has to be a better practice here...
    
    // Code shamlessly borrowed from: https://github.com/David-Zvekic/pushTokenBack/blob/main/pushTokenBack.js#L61
    // @ts-ignore
    const riderIndex = getCanvas().tokens?.children[0].children.findIndex((t) => t.id == mountToken.id);
    // @ts-ignore
    canvas?.tokens.children[0].children.splice(riderIndex, 1);
    // @ts-ignore
    canvas?.tokens.children[0].children.unshift(mountToken);

    // @ts-ignore
    await window['tokenAttacher'].attachElementToToken(mountToken, riderToken, true);

    const messageData = {
      rider_name: riderToken.name,
      mount_name: mountToken.name,
    };
    const message = getGame().i18n.format('MOUNTING.info.Mount', messageData);
    const chatData: ChatMessageDataConstructorData = {
      type: 4,
      user: getGame().user,
      speaker: { alias: 'Mounting' },
      content: message,
      // whisper: [game.users.find((u) => u.isGM && u.active).id, game.user]
    };
    ChatMessage.create(chatData);
    console.log(`${this.ID} | ` + message);
  }

  static async unmount(riderToken: Token | undefined) {
    if (riderToken == undefined) {
      ui?.notifications?.error(getGame().i18n.format('MOUNTING.error.RiderTokenUndefined'));
      return;
    }

    const mount_id = riderToken.document.getFlag(this.ID, 'mount_id') as string;
    const mountToken = getToken(mount_id);
    if (mountToken == undefined) {
      ui?.notifications?.error(getGame().i18n.format('MOUNTING.error.MountTokenUndefined'));
      return;
    }

    const riderTokenDocument = riderToken.document as ShimTokenDocument;
    const mountTokenDocument = mountToken.document as ShimTokenDocument;
    await riderTokenDocument.unsetFlag(this.ID, 'mount_id');
    await mountTokenDocument.unsetFlag(this.ID, 'rider_id');

    // @ts-ignore
    await window['tokenAttacher'].detachElementFromToken(mountToken, riderToken, true);

    const messageData = {
      rider_name: riderToken.name,
      mount_name: mountToken.name,
    };
    console.log(messageData);
    const message = getGame().i18n.format('MOUNTING.info.Dismount', messageData);
    console.log(message);
    const chatData: ChatMessageDataConstructorData = {
      type: 4,
      user: getGame().user,
      speaker: { alias: 'Mounting' },
      content: message,
      // whisper: [game.users.find((u) => u.isGM && u.active).id, game.user]
    };
    ChatMessage.create(chatData);
    console.log(`${this.ID} | ` + message);
  }
}
