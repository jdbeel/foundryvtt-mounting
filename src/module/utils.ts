export function getCanvas(): Canvas {
    if (!(canvas instanceof Canvas) || !canvas.ready) {
        ui?.notifications?.error('Canvas is uninitialized.');
        throw new Error('Canvas is uninitialized.');
    }

    return canvas;
}

export function getGame(): Game {
    if (!(game instanceof Game)) {
        ui?.notifications?.error('Game is uninitialized.');
        throw new Error('Game is uninitialized.');
    }

    return game;
}

export function getToken(token_id: string): Token | undefined {
    const token: Token | undefined = getCanvas().tokens?.ownedTokens.find((t) => t.id == token_id);

    return token;
}
