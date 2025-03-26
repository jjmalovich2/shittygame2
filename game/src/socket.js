import kaplay from "./src.js";
import loadAssets from "./assets.js";
import { io } from "socket.io-client";

export const socket = io("https://gunplay.onrender.com"); // Use your hosted backend
export const players = {};

loadAssets();

socket.on("connect", () => {
    debug.log("Connected to multiplayer server:", socket.id);
});

socket.on("updatePlayer", (data) => {
    // clear existing players if they aren't in the updated data
    for (const id in players) {
        if(!(id in data)) {
            destroy(players[id].hitbox);
            destroy(players[id].sprite);
            destroy(players[id].gun);
            delete players[id];
        }
    }

    // update or add new players
    for (const id in data) {
        if (id === socket.id) continue; // skip the player

        const playerData = data[id];

        if (!players[id]) {
            playersid = {
                hitbox: add([
                    rect(62,53),
                    pos(playerData.x, playerData.y),
                    area(),
                    body(),
                    anchor("center"),
                    opacity(0),
                    "remote-hitbox"
                ]),
                sprite: add([
                    sprite("evil"),
                    pos(playerData.x, playerData.y),
                    anchor("center"),
                    "remote-sprite"
                ]),
                gun: add([
                    sprite("gun"),
                    pos(playerData.x, playerData.y),
                    anchor(vec2(-2.3, 0)),
                    rotate(playerData.angle),
                    "remote-gun"
                ])
            }

            // Sync sprite position with hitbox
            players[id].hitbox.onUpdate(() => {
                players[id].sprite.pos = vec2(players[id].hitbox.pos.x, players[id].hitbox.pos.y);
                players[id].gun.pos = vec2(players[id].hitbox.pos.x, players[id].hitbox.pos.y);
            });
        } else {
            // Update existing player
            players[id].hitbox.pos = vec2(playerData.x, playerData.y);
            players[id].gun.angle = playerData.angle;
            players[id].gun.flipY = Math.abs(playerData.angle) > 90;
        }
    }
});

socket.on("playerDisconnected", (id) => {
    if (players[id]) {
        destroy(players[id].hitbox);
        destroy(players[id].sprite);
        destroy(players[id].gun);
        delete players[id];
    }
});

socket.on("initialState", (state) => {
    Object.assign(players, state.players);
});

socket.on("connect_error", (err) => {
    debug.log("Connection error:", err.message);
});
