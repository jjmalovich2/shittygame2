import kaplay from "./src.js";

export default function loadAssets() {
    // load assets
    loadRoot("./");
    loadSprite("bean", "/sprites/bean.png");
    loadSprite("evil", "/sprites/evil.png");
    loadSprite("spike", "/sprites/spike.png");
    loadSprite("grass", "/sprites/grass.png");
    loadSprite("portal", "/sprites/portal.png");
    loadSprite("coin", "/sprites/coin.png");
    loadSprite("umbrella-hat", "/sprites/umbrella_hat.png");
    loadSprite("propeller-hat", "/sprites/propeller_hat.png");
    loadSprite("propeller", "/sprites/propeller.png");
    loadSprite("gun", "/sprites/gun.png");
    loadSprite("cursor", "/sprites/cursor.png");
    loadSound("coin", "/examples/sounds/score.mp3");
    loadSound("powerup", "/examples/sounds/powerup.mp3");
    loadSound("blip", "/examples/sounds/blip.mp3");
    loadSound("hit", "/examples/sounds/hit.mp3");
    loadSound("portal", "/examples/sounds/portal.mp3");

}
