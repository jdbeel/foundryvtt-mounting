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
      ui?.notifications?.error(
        'Please select exactly two tokens and click the mount button on the token you wish to be the rider.',
      );
      return;
    }

    // This is mainly fall-back, wackiness is the only reason this should ever be true.
    if (riderToken == undefined) {
      ui?.notifications?.error('Unable to load rider token.');
      return;
    }

    // Likewise here. The token should be selected at this point.
    const mountToken: Token | undefined = getCanvas().tokens?.controlled.find((t) => t.id != riderToken.id);
    if (mountToken == undefined) {
      ui?.notifications?.error('Unable to load mount token.');
      return;
    }

    // Shim is used while we wait for the types to be updated.
    const riderTokenDocument = riderToken.document as ShimTokenDocument;
    const mountTokenDocument = mountToken.document as ShimTokenDocument;
    await riderTokenDocument.setFlag('foundryvtt-mounting', 'mount_id', mountToken.id);
    await mountTokenDocument.setFlag('foundryvtt-mounting', 'rider_id', riderToken.id);
    riderTokenDocument.update({ name: riderTokenDocument.name + ' | ' + mountTokenDocument.name.slice(0, 8) + '...' });
    mountTokenDocument.update({ name: mountTokenDocument.name + ' | ' + riderTokenDocument.name.slice(0, 8) + '...' });

    // This currently is detected as an error, but will stop doing so when the
    // foundryvtttypes module is updated.
    await riderToken.document.update({
      // @ts-ignore
      x: mountToken.document.x,
      // @ts-ignore
      y: mountToken.document.y,
    });

    // @ts-ignore
    await window['tokenAttacher'].attachElementToToken(mountToken, riderToken, true);

    const chatData: ChatMessageDataConstructorData = {
      type: 4,
      user: getGame().user,
      speaker: { alias: 'Mounting' },
      content: `${riderToken.document.name} mounts ${mountToken?.document.name}.`,
      // whisper: [game.users.find((u) => u.isGM && u.active).id, game.user]
    };
    ChatMessage.create(chatData);
    console.log('foundryvtt-mounting | ' + `${riderToken.document.name} mounts ${mountToken?.document.name}.`);
  }

  static async unmount(riderToken: Token | undefined) {
    if (riderToken == undefined) {
      ui?.notifications?.error('Rider Token is undefined.');
      return;
    }

    const mount_id = riderToken.document.getFlag('foundryvtt-mounting', 'mount_id') as string;
    const mountToken = getToken(mount_id);
    if (mountToken == undefined) {
      ui?.notifications?.error('Mount token is undefined.');
      return;
    }

    const riderTokenDocument = riderToken.document as ShimTokenDocument;
    const mountTokenDocument = mountToken.document as ShimTokenDocument;
    await riderTokenDocument.unsetFlag('foundryvtt-mounting', 'mount_id');
    await mountTokenDocument.unsetFlag('foundryvtt-mounting', 'rider_id');
    riderTokenDocument.update({ name: riderTokenDocument.name.slice(0, riderTokenDocument.name.indexOf('|') - 1) });
    mountTokenDocument.update({ name: mountTokenDocument.name.slice(0, mountTokenDocument.name.indexOf('|') - 1) });

    // @ts-ignore
    await window['tokenAttacher'].detachAllElementsFromToken(riderToken, true);

    const chatData: ChatMessageDataConstructorData = {
      type: 4,
      user: getGame().user,
      speaker: { alias: 'Mounting' },
      content: `${riderToken.document.name} dismounts ${mountToken?.document.name}.`,
      // whisper: [game.users.find((u) => u.isGM && u.active).id, game.user]
    };
    ChatMessage.create(chatData);
    console.log('foundryvtt-mounting | ' + `${riderToken.document.name} dismounts ${mountToken?.document.name}.`);
  }
}
