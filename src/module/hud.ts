import { Mounting } from './mounting.js';
import { getCanvas, getGame, getToken } from './utils.js';

import { MODULE_ID, RIDER_PROPERTY_NAME } from './const';
import { MountData, RiderData } from './data.js';

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
            `<div class="control-icon ${MODULE_ID} fa-stack" title="${tooltip}">
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
        let riderToken: Token, mountToken: Token;
        let mounted: boolean;

        const riderData = RiderData.fromTokenId(hudToken._id);
        if (riderData == undefined) {
            mounted = false;
            let selectedToken = getToken(hudToken._id);
            if (selectedToken != undefined)
                riderToken = selectedToken;
            else
                return; // TODO error.
            
            selectedToken = getCanvas().tokens?.controlled.find((t) => t.id != selectedToken?.id);
            if (selectedToken != undefined)
                mountToken = selectedToken;
            else
                return; // TODO error.
        } else {
            mounted = true;
            riderToken = riderData.getToken();
            const mountData = MountData.fromTokenId(riderData.mountId);
            mountToken = mountData.getToken();
        }

        const tooltipData = {
            rider_name: riderToken.name,
            mount_name: mountToken.name,
        };

        if (mounted === true) {
            button = this.createDismountButton(getGame().i18n.format('MOUNTING.info.DismountTooltip', tooltipData));
        } else {
            button = this.createMountButton(getGame().i18n.format('MOUNTING.info.MountTooltip', tooltipData));
        }

        const errorData = {
            rider_id: riderToken.id,
            mount_id: mountToken.id,
        };

        button.find('i').on('click', async function (event) {
            if (riderToken.document.getFlag(MODULE_ID, RIDER_PROPERTY_NAME) != undefined) {
                console.log(`${MODULE_ID} | DISMOUNT BUTTON CLICKED`); // TODO localization?
                // Attempt to dismount...
                await Mounting.unmount(riderToken);
                // If dismount succeeded, then update the hud.
                // Otherwise, print an error.
                if (riderToken.document.getFlag(MODULE_ID, RIDER_PROPERTY_NAME) == undefined) {
                    MountingHud.removeSlash(button);
                    MountingHud.setTooltip(button, getGame().i18n.format('MOUNTING.info.MountTooltip', tooltipData));
                } else {
                    ui?.notifications?.error(getGame().i18n.format('MOUNTING.error.DismountUnsuccessful', errorData));
                }
            } else {
                console.log(`${MODULE_ID} | MOUNT BUTTON CLICKED`); // TODO localization?
                // Attempt to mount...
                await Mounting.mount(riderToken);
                // If mount succeeded, then update the hud.
                // Otherwise, print an error.
                if (riderToken.document.getFlag(MODULE_ID, RIDER_PROPERTY_NAME) != undefined) {
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
