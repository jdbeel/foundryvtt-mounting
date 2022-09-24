import { getCanvas, getGame } from './utils';
import { MODULE_ID, MOUNT_PROPERTY_NAME, RIDER_PROPERTY_NAME, TOKEN_ATTACHER_ID } from './const';

interface ShimTokenDocument extends TokenDocument {
    height: number;
    width: number;
}

export class RiderData {
    id: string;
    mountId: string;
    seatX: number;
    seatY: number;

    constructor(id: string, mountId: string, seatX = 0, seatY = 0) {
        this.id = id;
        this.mountId = mountId;
        this.seatX = seatX;
        this.seatY = seatY;
    }

    computeOffset(): Record<string, unknown> {
        const canvas = getCanvas();
        let gridSize: number;
        if (canvas.grid == undefined) {
            gridSize = 100;
        } else {
            gridSize = getCanvas().grid?.size ?? 100;
        }

        const mountData = MountData.fromTokenId(this.mountId);

        const result = {
            x: 0,
            y: 0,
            centerX: 0,
            centerY: 0,
        };

        const [halfHeight, halfWidth] = [mountData.height / 2, mountData.width / 2];

        // top-left quadrant
        if (this.seatX + 1 <= halfWidth && this.seatY + 1 <= halfHeight) {
            result.x = -gridSize;
            result.y = -gridSize;
            result.centerX = -gridSize / 2;
            result.centerY = -gridSize / 2;
            // top-right quadrant
        } else if (this.seatX + 1 > halfWidth && this.seatY + 1 <= halfHeight) {
            result.x = gridSize;
            result.y = -gridSize;
            result.centerX = gridSize / 2;
            result.centerY = -gridSize / 2;
            // bottom-left quadrant
        } else if (this.seatX + 1 <= halfWidth && this.seatY + 1 > halfHeight) {
            result.x = -gridSize;
            result.y = gridSize;
            result.centerX = -gridSize / 2;
            result.centerY = gridSize / 2;
            // bottom-right quadrant
        } else if (this.seatX + 1 > halfWidth && this.seatY + 1 > halfHeight) {
            result.x = gridSize;
            result.y = gridSize;
            result.centerX = gridSize / 2;
            result.centerY = gridSize / 2;
        }

        return result;
    }

    getToken(): Token {
        // @ts-ignore
        const token = getCanvas().tokens?.children[0].children.find((t) => t.id == this.id);
        return token;
    }

    static fromTokenId(id: string): RiderData | undefined {
        // @ts-ignore
        const token = getCanvas().tokens?.children[0].children.find((t) => t.id == id);
        const data = token.document.getFlag(MODULE_ID, RIDER_PROPERTY_NAME) as unknown as RiderData;

        if (data != undefined) {
            return RiderData.fromObject(data);
        }
    }

    static fromObject(input: RiderData): RiderData {
        const inputData = input;
        return new RiderData(inputData.id, inputData.mountId, inputData.seatX, inputData.seatY);
    }

    async setFlags() {
        console.log(`${MODULE_ID} | ${getGame().i18n.format("MOUNTING.info.SetFlagsRider", {id: this.id})}`);
        await this.getToken().document.setFlag(MODULE_ID, RIDER_PROPERTY_NAME, this);
    }

    async unsetFlags() {
        console.log(`${MODULE_ID} | ${getGame().i18n.format("MOUNTING.info.UnsetFlagsRider", {id: this.id})}`);
        await this.getToken().document.unsetFlag(MODULE_ID, RIDER_PROPERTY_NAME);
        await this.getToken().document.unsetFlag(TOKEN_ATTACHER_ID, 'offset');
    }

    async setPosition(newX: number, newY: number) {
        const tokenDocument = this.getToken().document as ShimTokenDocument;
        await tokenDocument.update({
            x: newX,
            y: newY,
        });
        this.getToken().document.update({
            x: newX,
            y: newY,
        });
        this.getToken().x = newX;
        this.getToken().y = newY;
    }
}

export class MountData {
    id: string;
    width: number;
    height: number;

    riders: RiderData[];
    seats: Array<boolean>[];

    constructor(id: string, riders: RiderData[] = []) {
        this.id = id;
        const tokenDocument = this.getToken().document as ShimTokenDocument;
        this.width = tokenDocument.width ?? 1;
        this.height = tokenDocument.height ?? 1;

        this.riders = new Array<RiderData>();
        for (const rider of riders) {
            this.riders.push(RiderData.fromObject(rider));
        }
        this.riders = riders;

        this.seats = Array(this.width).fill(Array(this.height));
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                this.seats[j][i] = this.seatIsOccupied(j, i);
            }
        }
    }

    seatIsOccupied(x: number, y: number): boolean {
        const riderIsSitting = this.riders.find((r) => r.seatX == x && r.seatY == y) != undefined;
        return riderIsSitting;
    }

    hasRider(id: string): boolean {
        for (const rider of this.riders) {
            if (rider.id == id) return true;
        }

        return false;
    }

    getToken(): Token {
        // @ts-ignore
        const token = getCanvas().tokens?.children[0].children.find((t) => t.id == this.id);
        return token;
    }

    getTokenOfRider(riderId: string): Token | undefined {
        // @ts-ignore
        const riderToken = this.riders.find((r) => r.id == riderId);
        if (riderToken == undefined)
            ui?.notifications?.error(getGame().i18n.format('MOUNTING.error.MountNotContain', { id: riderId }));
        else return riderToken.getToken();
    }

    async setFlags() {
        console.log(`${MODULE_ID} | ${getGame().i18n.format('MOUNTING.info.SetFlagsMount', { id: this.id })}`);
        this.getToken().document.setFlag(MODULE_ID, MOUNT_PROPERTY_NAME, this);

        for (const rider of this.riders) {
            const riderData = RiderData.fromObject(rider);
            riderData.setFlags();
        }
    }

    async unsetFlags() {
        console.log(`${MODULE_ID} | ${getGame().i18n.format('MOUNTING.info.UnsetFlagsMount', { id: this.id })}`);
        await this.getToken().document.unsetFlag(MODULE_ID, MOUNT_PROPERTY_NAME);
    }

    async addRiderById(id: string) {
        if (this.hasRider(id)) {
            ui?.notifications?.error(getGame().i18n.format('MOUNTING.error.AlreadyRiding'));
            return;
        }

        if (this.riders.length >= this.width * this.height) {
            // Mount is full. Raise an error?
            ui?.notifications?.error(getGame().i18n.format('MOUNTING.error.MountFull'));
            return;
        }

        const first: boolean = this.riders.length == 0;

        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (!this.seatIsOccupied(j, i)) {
                    console.log(`${MODULE_ID} | Adding rider ${id} to mount ${this.id}`);
                    const riderData = this.addRiderByIdToSeat(id, j, i);
                    const riderToken = riderData.getToken();

                    await riderData.setFlags();

                    if (first) {
                        const [newX, newY] = [riderData.getToken().x, riderData.getToken().y];
                        console.log(`${MODULE_ID} | Moving mount ${this.id} to ${newX},${newY}.`);
                        this.setPosition(newX, newY);
                    }

                    // @ts-ignore
                    await window['tokenAttacher'].attachElementToToken(riderToken, this.getToken(), true);

                    const oldOffset = riderToken.document.getFlag(TOKEN_ATTACHER_ID, 'offset') as Record<
                        string,
                        unknown
                    >;
                    const newOffset = {
                        ...oldOffset,
                        ...riderData.computeOffset(),
                    };
                    await riderToken.document.setFlag(TOKEN_ATTACHER_ID, 'offset', newOffset);

                    await this.setFlags();
                    return;
                }
            }
        }

        // Shouldn't get down here, but...
        ui?.notifications?.error(
            getGame().i18n.format('MOUNTING.error.MountUnsuccessful', { rider_id: id, mount_id: this.id }),
        );
    }

    private addRiderByIdToSeat(id: string, seatX: number, seatY: number): RiderData {
        let riderData = RiderData.fromTokenId(id);
        if (riderData == undefined) {
            riderData = new RiderData(id, this.id, seatX, seatY);
        } else {
            riderData.seatX = seatX;
            riderData.seatY = seatY;
        }
        this.riders.push(riderData);
        this.seats[seatX][seatY] = true;

        return riderData;
    }

    async removeRiderById(id: string) {
        if (!this.hasRider(id)) {
            ui?.notifications?.error(getGame().i18n.format('MOUNTING.error.NotRounding'));
            return;
        }

        const index = this.riders.findIndex((r) => r.id == id);
        let riderData = this.riders[index];
        riderData = RiderData.fromObject(riderData);

        await riderData.unsetFlags();
        // @ts-ignore
        await window['tokenAttacher'].detachElementFromToken(riderData.getToken(), this.getToken(), false);
        if (index >= 0) {
            this.riders.splice(index, 1);
        }

        if (this.riders.length == 0) this.unsetFlags();
        else await this.setFlags();
    }

    async setPosition(newX: number, newY: number) {
        const tokenDocument = this.getToken().document as ShimTokenDocument;
        await tokenDocument.update({
            x: newX,
            y: newY,
        });
        this.getToken().document.update({
            x: newX,
            y: newY,
        });
        this.getToken().x = newX;
        this.getToken().y = newY;
    }

    static fromTokenId(id: string): MountData {
        // @ts-ignore
        const token = getCanvas().tokens?.children[0].children.find((t) => t.id == id);
        const data = token.document.getFlag(MODULE_ID, MOUNT_PROPERTY_NAME) as MountData;

        if (data == undefined) {
            return new MountData(id);
        } else {
            return MountData.fromObject(data);
        }
    }

    static fromObject(input: MountData): MountData {
        const inputData = input;
        return new MountData(inputData.id, inputData.riders);
    }
}
