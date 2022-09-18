import { Mounting } from './mounting.js';
import { getCanvas, getToken } from './utils.js';

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
      `<div class="control-icon mounting fa-stack" title="${tooltip}">
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

  static createTooltip(riderName: string, mountName: string, mount = true): string {
    if (mount === true) {
      return `Mount ${riderName} onto ${mountName}`;
    } else {
      return `Dismount ${riderName} from ${mountName}`;
    }
  }

  static setTooltip(button: JQuery, tooltip: string) {
    button.attr('title', tooltip);
  }

  static addButton(app: TokenHUD, html: JQuery, hudToken: hudToken) {
    let button: JQuery;
    let tooltip: string;
    let riderToken: Token | undefined, mountToken: Token | undefined;
    let mounted: boolean;

    const selectedToken = getToken(hudToken._id);
    if (selectedToken == undefined) {
      ui?.notifications?.error('Error selecting tokens.');
      return;
    }

    if (hasProperty(selectedToken?.document, 'flags.foundryvtt-mounting.mount_id')) {
      riderToken = selectedToken;
      mountToken = getToken(
        // @ts-ignore
        selectedToken?.document.getFlag(Mounting.ID, 'mount_id'),
      );
      mounted = true;
    } else if (hasProperty(selectedToken?.document, 'flags.foundryvtt-mounting.rider_id')) {
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

    tooltip = this.createTooltip(selectedToken?.name ?? '<undefined>', mountToken?.name ?? '<undefined>', !mounted);
    if (mounted === true) {
      button = this.createDismountButton(tooltip);
    } else {
      button = this.createMountButton(tooltip);
    }

    button.find('i').on('click', async function (event) {
      if (riderToken?.document.getFlag(Mounting.ID, 'mount_id') != undefined) {
        // Attempt to dismount...
        await Mounting.unmount(riderToken);
        // If dismount succeeded, then update the hud.
        if (riderToken?.document.getFlag(Mounting.ID, 'mount_id') == undefined) {
          MountingHud.removeSlash(button);
          tooltip = MountingHud.createTooltip(riderToken?.name ?? '<undefined>', mountToken?.name ?? '<undefined>');
          MountingHud.setTooltip(button, tooltip);
        }
      } else {
        // Attempt to mount...
        await Mounting.mount(riderToken);
        // If mount succeeded, then update the hud.
        if (riderToken?.document.getFlag(Mounting.ID, 'mount_id') != undefined) {
          MountingHud.addSlash(button);
          tooltip = MountingHud.createTooltip(
            riderToken?.name ?? '<undefined>',
            mountToken?.name ?? '<undefined>',
            false,
          );
          MountingHud.setTooltip(button, tooltip);
        }
      }
    });

    const col = html.find('.col.right');
    col.append(button);
    return button;
  }
}
