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

    computeOffset(): Object {
        const canvas = getCanvas();
        let gridSize: number;
        if (canvas.grid == undefined) {
            gridSize = 100;
        } else {
            gridSize = getCanvas().grid?.size ?? 100;
        }

        const mountData = MountData.fromTokenId(this.mountId);

        let result = {
            x: 0,
            y: 0,
            centerX: 0,
            centerY: 0,
        }

        let [halfHeight, halfWidth] = [mountData.height / 2, mountData.width / 2];

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
        let data = token.document.getFlag(MODULE_ID, RIDER_PROPERTY_NAME) as RiderData;

        if (data != undefined) {
            return RiderData.fromObject(data);
        }
    }

    static fromObject(input: Object): RiderData {
        let inputData = input as RiderData;
        return new RiderData(
            inputData.id,
            inputData.mountId,
            inputData.seatX,
            inputData.seatY,
        );
    }

    async update() {
        console.log(`${MODULE_ID} | UPDATING RIDER ${this.id}`);
        await this.getToken().document.setFlag(MODULE_ID, RIDER_PROPERTY_NAME, this);
    }

    async unsetFlags() {
        await this.getToken().document.unsetFlag(MODULE_ID, RIDER_PROPERTY_NAME);
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
        for (var rider of riders) {
            this.riders.push(RiderData.fromObject(rider))
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
        console.log(`${MODULE_ID} | UPDATING MOUNT ${this.id}`); // TODO localization
        let positionSet = false;
        let riderTokens = new Array<Token>();

        console.log(`${MODULE_ID} | Detaching tokens from ${this.id}`); // TODO localization
        await window['tokenAttacher'].detachAllElementsFromToken(this.getToken(), true);

        for (var rider of this.riders) {
            let riderData = RiderData.fromObject(rider);
            await riderData.update();
            let riderToken: Token = riderData.getToken();
            
            if (!positionSet) {
                positionSet = true;
                console.log(`${MODULE_ID} | Setting mount position to (${riderToken.x},${riderToken.y})`); // TODO localization
                this.setPosition(riderToken.x, riderToken.y);
            } 
            riderTokens.push(riderToken);
        }

        console.log(`${MODULE_ID} | Attaching ${riderTokens.length} token(s) to ${this.id}`); // TODO localization
        await window['tokenAttacher'].attachElementsToToken(riderTokens, this.getToken(), false);

        for (var rider of this.riders) {
            let riderData = RiderData.fromObject(rider);
            let riderToken = riderData.getToken();
            let oldOffset = riderToken.document.getFlag(TOKEN_ATTACHER_ID, 'offset') as Object;
            let newOffset = {
                ...oldOffset,
                ...riderData.computeOffset(),
            };
            await riderToken.document.setFlag(TOKEN_ATTACHER_ID, 'offset', newOffset);
        }

        await this.getToken().document.setFlag(MODULE_ID, MOUNT_PROPERTY_NAME, this);
    }

    async unsetFlags() {
        await this.getToken().document.unsetFlag(MODULE_ID, MOUNT_PROPERTY_NAME);
    }

    async addRiderById(id: string) {
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
                if (!this.seatIsOccupied(j, i)) {
                    this.addRiderByIdToSeat(id, j, i);
                    await this.update();
                    return;
                }
            }
        }

        // Shouldn't get down here, but...
        ui?.notifications?.error('Error mounting.');
    }

    private addRiderByIdToSeat(id: string, seatX: number, seatY: number) {
        let riderData = RiderData.fromTokenId(id);
        if (riderData == undefined) {
            riderData = new RiderData(id, this.id, seatX, seatY);
        } else {
            riderData.seatX = seatX;
            riderData.seatY = seatY;
        }
        this.riders.push(riderData);
        this.seats[seatX][seatY] = true;
    }

    async removeRiderById(id: string) {
        if (!this.hasRider(id)) {
            ui?.notifications?.error(`Token ${id} not riding ${this.id}`); // TODO localization
            return;
        }

        const index = this.riders.findIndex((r) => r.id == id);
        let riderData = this.riders[index];
        riderData = RiderData.fromObject(riderData);

        console.log(`${MODULE_ID} | Detaching token ${riderData.getToken().id} from ${this.id}`); // TODO localization
        await riderData.unsetFlags();
        await window['tokenAttacher'].detachElementFromToken(riderData.getToken(), this.getToken(), true);
        if (index >= 0) {
            this.riders.splice(index, 1);
        }
        await this.update();
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
        let data = token.document.getFlag(MODULE_ID, MOUNT_PROPERTY_NAME) as MountData;

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
