import { Mounting } from './mounting.js';
import { getCanvas, getGame, getToken } from './utils.js';

// Temporary shim
type hudToken = {
  _id: string;
};

export class MountingHud {
  static async render(app: TokenHUD, html: JQuery, hudToken: hudToken) {
    this.addButton(app, html, hudToken);
  }

  static addSlash(button: JQuery) {
    button.find('i').eq(1).show();
  }

  static removeSlash(button: JQuery) {
    button.find('i').eq(1).hide();
  }

  static createMountButton(tooltip: string): JQuery {
    const button = $(
      `<div class="control-icon ${Mounting.ID} fa-stack" title="${tooltip}">
        <i class="fas fa-horse fa-stack-1x"></i>
        <i class="fas fa-slash fa-stack-1x" style="position: absolute; color: tomato;"></i>
      </div>`,
    );

    button.find('i').eq(1).hide();

    return button;
  }

  static createDismountButton(tooltip: string): JQuery {
    const button = this.createMountButton(tooltip);
    this.addSlash(button);
    return button;
  }

  static setTooltip(button: JQuery, tooltip: string) {
    button.attr('title', tooltip);
  }

  static addButton(app: TokenHUD, html: JQuery, hudToken: hudToken) {
    let button: JQuery;
    let riderToken: Token | undefined, mountToken: Token | undefined;
    let mounted: boolean;

    const selectedToken = getToken(hudToken._id);
    if (selectedToken == undefined) {
      ui?.notifications?.error('Error selecting tokens.');
      return;
    }

    if (hasProperty(selectedToken?.document, `flags.${Mounting.ID}.mount_id`)) {
      riderToken = selectedToken;
      mountToken = getToken(
        // @ts-ignore
        selectedToken?.document.getFlag(Mounting.ID, 'mount_id'),
      );
      mounted = true;
    } else if (hasProperty(selectedToken?.document, `flags.${Mounting.ID}.rider_id`)) {
      riderToken = getToken(
        // @ts-ignore
        selectedToken?.document.getFlag(Mounting.ID, 'rider_id'),
      );
      mountToken = selectedToken;
      mounted = true;
    } else {
      riderToken = selectedToken;
      mountToken = getCanvas().tokens?.controlled.find((t) => t.id != selectedToken?.id);
      mounted = false;
    }

    const tooltipData = {
      rider_name: riderToken?.name,
      mount_name: mountToken?.name
    };

    if (mounted === true) {
      button = this.createDismountButton(getGame().i18n.format('MOUNTING.info.DismountTooltip', tooltipData));
    } else {
      button = this.createMountButton(getGame().i18n.format('MOUNTING.info.MountTooltip', tooltipData));
    }

    const errorData = {
      rider_id: riderToken?.id,
      mount_id: mountToken?.id,
    };

    button.find('i').on('click', async function (event) {
      if (riderToken?.document.getFlag(Mounting.ID, 'mount_id') != undefined) {
        // Attempt to dismount...
        await Mounting.unmount(riderToken);
        // If dismount succeeded, then update the hud.
        // Otherwise, print an error.
        if (riderToken?.document.getFlag(Mounting.ID, 'mount_id') == undefined) {
          MountingHud.removeSlash(button);
          MountingHud.setTooltip(button, getGame().i18n.format('MOUNTING.info.MountTooltip', tooltipData));
        } else {
          ui?.notifications?.error(getGame().i18n.format('MOUNTING.error.DismountUnsuccessful', errorData));
        }
      } else {
        // Attempt to mount...
        await Mounting.mount(riderToken);
        // If mount succeeded, then update the hud.
        // Otherwise, print an error.
        if (riderToken?.document.getFlag(Mounting.ID, 'mount_id') != undefined) {
          MountingHud.addSlash(button);
          MountingHud.setTooltip(button, getGame().i18n.format('MOUNTING.info.DismountTooltip', tooltipData));
        } else {
          ui?.notifications?.error(getGame().i18n.format('MOUNTING.error.MountUnsuccessful', errorData));
        }
      }
    });

    const col = html.find('.col.right');
    col.append(button);
    return button;
  }
}
