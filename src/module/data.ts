import { getCanvas } from './utils';
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

    async computeOffset(): Promise<Object> {
        const canvas = getCanvas();
        let gridSize: number;
        if (canvas.grid == undefined) {
            gridSize = 100;
        } else {
            gridSize = getCanvas().grid?.size ?? 100;
        }

        const mountData = await MountData.fromTokenId(this.mountId);

        let [x, y] = [-100 + (this.seatX * gridSize), -100 + (this.seatY * gridSize)];
        let result = {
            x: x,
            y: y,
            centerX: 0,
            centerY: 0,
        }

        if (this.seatX + 1 > mountData.width / 2) {
            result.centerX = x - ((gridSize * 0.5) * (this.seatX + 1));
        } else {
            result.centerX = x + ((gridSize * 0.5) * (this.seatX + 1));
        }

        console.log(this.seatY + 1);
        console.log(mountData.height);
        if (this.seatY + 1 > mountData.height / 2) {
            result.centerY = y - ((gridSize * 0.5) * (this.seatY + 1));
        } else {
            result.centerY = y + ((gridSize * 0.5) * (this.seatY + 1));
        }
        return result;
    }

    getToken(): Token {
        // @ts-ignore
        const token = getCanvas().tokens?.children[0].children.find((t) => t.id == this.id);
        return token;
    }

    static fromObject(input: Object, mountId: string): RiderData {
        let inputData = input as RiderData;
        return new RiderData(
            inputData.id,
            mountId,
            inputData.seatX,
            inputData.seatY,
        );
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
        for (var rider of riders) {
            this.riders.push(RiderData.fromObject(rider, this.id))
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
        for (var rider of this.riders) {
            if (rider.id == id)
                return true;
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
        let riderToken = this.riders.find((r) => r.id == riderId);
        if (riderToken == undefined)
            ui?.notifications?.error(`Mount has no token with id ${riderId}`);
        else
            return riderToken.getToken();
    }

    async update() {
        if (await window['tokenAttacher'].getAllAttachedElementsOfToken(this.getToken()).length > 0) {
            console.log(`${MODULE_ID} | Detaching all tokens from ${this.id}`);
            await window['tokenAttacher'].detachAllElementsFromToken(this.getToken());
        }
        await this.getToken().document.setFlag(MODULE_ID, MOUNT_PROPERTY_NAME, this);
        let positionSet = false;
        let tokensToAttach = new Array<Token>();

        for (var rider of this.riders) {
            let riderData = RiderData.fromObject(rider, this.id);
            let riderToken: Token = riderData.getToken();

            tokensToAttach.push(riderToken);
            if (!positionSet) {
                positionSet = true;
                this.setPosition(riderToken.x, riderToken.y);
            }

            console.log(`${MODULE_ID} | Attaching token ${riderToken.id} to ${this.id}`);
            await window['tokenAttacher'].attachElementToToken(riderToken, this.getToken());
            let oldOffset = await riderToken.document.getFlag(TOKEN_ATTACHER_ID, 'offset') as Object;
            let newOffset = {
                ...oldOffset,
                ...await riderData.computeOffset(),
            };
            await riderToken.document.setFlag(TOKEN_ATTACHER_ID, 'offset', newOffset);
        }
    }

    addRiderById(id: string) {
        if (this.hasRider(id)) {
            ui?.notifications?.error(`Token ${id} is already riding ${this.id}`);
            return;
        }

        if (this.riders.length >= this.width * this.height) {
            // Mount is full. Raise an error?
            ui?.notifications?.error('Mount is full.');
            return;
        }

        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (!this.seatIsOccupied(i, j)) {
                    this.addRiderByIdToSeat(id, j, i);
                    return;
                }
            }
        }

        // Shouldn't get down here, but...
        ui?.notifications?.error('Error mounting.');
    }

    private addRiderByIdToSeat(id: string, seatX: number, seatY: number) {
        const riderData = new RiderData(id, this.id, seatX, seatY);
        this.riders.push(riderData);
        this.seats[seatX][seatY] = true;
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

    static async fromTokenId(id: string): Promise<MountData> {
        // @ts-ignore
        const token = getCanvas().tokens?.children[0].children.find((t) => t.id == id);
        let data = await token.document.getFlag(MODULE_ID, MOUNT_PROPERTY_NAME) as MountData;

        if (data == undefined) {
            return new MountData(id);
        } else {
            return MountData.fromObject(data);
        }
    }

    static fromObject(input: Object): MountData {
        let inputData = input as MountData;
        return new MountData(inputData.id, inputData.riders);
    }
}
