import kaplay from "./src.js";
import loadAssets from "./assets.js";
import findPlatformHitbox from "./platform.js";
import { GUNS } from "./guns.js";

loadAssets();

setGravity(3200);

// custom component controlling enemy patrol movement
function patrol(speed = 60, dir = 1) {
    return {
        id: "patrol",
        require: ["pos", "area"],
        add() {
            this.on("collide", (obj, col) => {
                if (col.isLeft() || col.isRight()) {
                    dir = -dir;
                }
            });
        },
        update() {
            this.move(speed * dir, 0);
        },
    };
}

// custom component that makes stuff grow big
function big() {
    let timer = 0;
    let isBig = false;
    let destScale = 1;
    return {
        // component id / name
        id: "big",
        // it requires the scale component
        require: ["scale"],
        // this runs every frame
        update() {
            if (isBig) {
                timer -= dt();
                if (timer <= 0) {
                    this.smallify();
                }
            }
            this.scale = this.scale.lerp(vec2(destScale), dt() * 6);
        },
        // custom methods
        isBig() {
            return isBig;
        },
        smallify() {
            destScale = 1;
            timer = 0;
            isBig = false;
        },
        biggify(time) {
            destScale = 2;
            timer = time;
            isBig = true;
        },
    };
}

// define some constants
const JUMP_FORCE = 990;
const MOVE_SPEED = 480;
const FALL_DEATH = 2400;
let TERMINAL_VELOCITY = 2000;
let platformHitbox;
let currGun = GUNS.GLOCK18;

const LEVELS = [
    [
        "                                =                ",
        "                                =  =             ",
        "         ==           =         =  =             ",
        "      ========        =         =  =             ",
        "                      =         =                ",
        "                      =         =                ",
        "=================================================",
    ],
    [
        "                          $",
        "                          $",
        "                          $",
        "                          $",
        "                          $",
        "           $$         =   $",
        "         ====         =   $",
        "                      =   $",
        "                      =    ",
        "       ^^      = >    =   @",
        "===========================",
    ],
    [
        "     $    $    $    $     $",
        "     $    $    $    $     $",
        "                           ",
        "                           ",
        "                           ",
        "                           ",
        "                           ",
        " ^^^^>^^^^>^^^^>^^^^>^^^^^@",
        "===========================",
    ],
];

// define what each symbol means in the level graph
const levelConf = {
    tileWidth: 64,
    tileHeight: 64,
    tiles: {
        "=": () => [
            sprite("grass"),
            //area({ friction: 0.02, restitution: 0 }),
            //body({ isStatic: true }),
            anchor("bot"),
            offscreen({ hide: true }),
            "platform",
        ],
        "$": () => [
            sprite("coin"),
            area(),
            pos(0, -9),
            anchor("bot"),
            offscreen({ hide: true }),
            "coin",
        ],
        "^": () => [
            sprite("spike"),
            area(),
            body({ isStatic: true }),
            anchor("bot"),
            offscreen({ hide: true }),
            "danger",
        ],
        ">": () => [
            sprite("evil"),
            area(),
            anchor("bot"),
            body(),
            patrol(),
            offscreen({ hide: true }),
            "enemy",
        ],
        "@": () => [
            sprite("portal"),
            area({ scale: 0.5 }),
            anchor("bot"),
            pos(0, -12),
            offscreen({ hide: true }),
            "portal",
        ],
    },
};

layers([
    "game",
    "ui"
], "game");

scene("game", ({ levelId, coins } = { levelId: 0, coins: 0 }) => {
    // add level to scene
    const level = addLevel(LEVELS[levelId ?? 0], levelConf);

    const hitboxes = findPlatformHitbox(LEVELS[levelId]);

    const TILE_SIZE = 64; // Adjust to match your grid scale

    const X_OFFSET = -32;
    const Y_OFFSET = -64;

    function createPlatformHitbox(x, y, width, height) {
        platformHitbox = add([
            rect(width * TILE_SIZE, height * TILE_SIZE), // Hitbox size
            pos(x * TILE_SIZE + X_OFFSET, y * TILE_SIZE + Y_OFFSET), // Position
            area(),
            body({ isStatic: true }), // Static so it doesn't fall
            color(255, 0, 0), // Optional: make it semi-transparent for debugging
            opacity(0),
            "p-hitbox", // Tag for collision detection
        ]);
    }

    hitboxes.forEach(({ x, y, width, height }) => {
        createPlatformHitbox(x, y, width, height);
    });

    const cursor = add([
        sprite("cursor"),
        pos(),
        layer("ui"),
        scale(1),
        //fakeMouse(),
        anchor("center")
    ]);
    setCursor("none");

    // define player object
    const player = add([
        rect(62,53),
        pos(0, 0),
        area(),
        scale(1),
        // makes it fall to gravity and jumpable
        body(),
        // the custom component we defined above
        big(),
        anchor("center"),
        rotate(),
        "player",
        opacity(0),
    ]);
    const playerSprite = add([
        pos(player.pos.x, player.pos.y),
        //area(),
        sprite("bean"),
        anchor("center"),
        rotate(),
        "player-sprite"
    ]);
    const gun = player.add([
        sprite("gun"),
        anchor(vec2(-2.3,-0.75)),
        "gun",
        rotate()
    ]);

    // update the player-sprite hitbox every frame
    player.onUpdate(() => {
        playerSprite.pos = vec2(player.pos.x, player.pos.y);
    });

    function drawSmallParticle(x, y, f, l) {
        let size = rand(7, 12);
        const small_particle = add([
            rect(size, size),
            color(74,34,11),
            pos(x, y-10),
            anchor("center"),
            area({ collisionIgnore: ["particle", "player", "spike", "danger"], friction: 0.02, restitution: 0 }),
            "particle",
            "small-particle",
            body(),
            lifespan(l, { fade: 0.5 }),
            opacity(1),
        ]);

        small_particle.addForce(vec2(choose([rand(6000,18000),-rand(6000,18000)]), 0).sub(small_particle.vel).scale(small_particle.mass*f));
        small_particle.jump(f*rand(800, 1000));
    }

    const BULLET_SPEED = 1200;
    const BARREL_OFFSET = 75;
    function spawnBullet(x, y, dir) {
        const offset = Vec2.fromAngle(dir).scale(BARREL_OFFSET)
        const bulletSpawn = vec2(x,y).add(offset);

        const bullet = add([
            rect(10,5),
            color(141,145,141),
            pos(bulletSpawn),
            anchor("center"),
            area(),
            rotate(dir),
            opacity(),
            move(Vec2.fromAngle(dir), BULLET_SPEED),
            lifespan(1.1),
            "bullet"
        ]);
        bullet.gravityScale = 0;

        bullet.onCollide("p-hitbox", () => {
            drawSmallParticle(bullet.pos.x, bullet.pos.y, 0.1, 0.5);
            destroy(bullet);
        });
    }

    let isFiring = false;
    function fullAuto() {
        if (!isFiring) return;

        cursor.move(rand(-20*currGun.recoil, 5*currGun.recoil), -currGun.recoil*100+rand(-20*currGun.recoil, 20*currGun.recoil));
        spawnBullet(player.pos.x, player.pos.y, gun.angle);

        wait(0.05, fullAuto);
    }

    let prevPos = vec2(player.pos.x, player.pos.y);
    onUpdate(() => {
        gun.angle = cursor.pos.sub(player.pos).angle();
        gun.flipY = Math.abs(gun.angle) > 90;
        
        cursor.move(mouseDeltaPos().scale(35));

        // move the mouse with the player
        let deltaPos = vec2(player.pos.x, player.pos.y).sub(prevPos);
        cursor.move(deltaPos.scale(60));
        //debug.log(deltaPos);
        prevPos = vec2(player.pos.x, player.pos.y);

        if (isMouseDown("left")) {
            if (!isFiring) {
                isFiring = true;
                fullAuto();
            }   
        } else {
            isFiring = false;
        }
    });

    // camera lerping and zooming
    const ZOOM_LERP = 0.1; // Lower = more delay, higher = less delay
    const DELAY_LERP = 0.035
    const BASE_ZOOM = 1.25; // Default zoom at ground level
    const MIN_ZOOM = 0.7; // Minimum zoom when high up
    const FLOOR_Y = 500;
    const MAX_HEIGHT = 5000;
    const ZOOM_SENSITIVITY = 550;

    let targetCamPos = vec2(0, FLOOR_Y)

    onUpdate(() => {
        targetCamPos = vec2(player.pos.x, Math.min(player.pos.y, FLOOR_Y));

        // Apply smooth interpolation for both X and Y axis (camera delay effect)
        const camX = lerp(camPos().x, targetCamPos.x, ZOOM_LERP);
        const camY = lerp(camPos().y, targetCamPos.y, ZOOM_LERP);
        
        // Clamp height to avoid extreme zoom-out
        const clampedHeight = Math.min(Math.max(0, FLOOR_Y - player.pos.y), MAX_HEIGHT);
        
        // zoom out at higher y
        const zoomFactor = Math.max(MIN_ZOOM, BASE_ZOOM - (clampedHeight / ZOOM_SENSITIVITY) * (BASE_ZOOM - MIN_ZOOM));
        
        // Apply smoothed camera position and zoom
        camPos(camX, camY);
        camScale(zoomFactor);
    });

    onUpdate(() => setCamPos(lerp(getCamPos(), player.worldPos(), DELAY_LERP)));

    onClick(() => {
        setCursorLocked(true);
    })

    // action() runs every frame
    let SLAM = false;
    player.onUpdate(() => {
        // check fall death
        if (player.pos.y >= FALL_DEATH) {
            go("lose");
        }
        if (player.vel.y > TERMINAL_VELOCITY) {
            player.vel.y = TERMINAL_VELOCITY;
        }
    });

    player.onBeforePhysicsResolve((collision) => {
        if (collision.target.is(["platform", "soft"]) && player.isJumping()) {
            collision.preventResolution();
        }
    });

    player.onPhysicsResolve(() => {
        // Set the viewport center to player.pos
        //setCamPos(player.pos);
    });

    // if player onCollide with any obj with "danger" tag, lose
    player.onCollide("danger", () => {
        go("lose");
        play("hit");
    });

    player.onCollide("portal", () => {
        play("portal");
        if (levelId + 1 < LEVELS.length) {
            go("game", {
                levelId: levelId + 1,
                coins: coins,
            });
        }
        else {
            go("win");
        }
    });

    player.onGround((l) => {
        if (l.is("enemy")) {
            player.jump(JUMP_FORCE * 1.5);
            destroy(l);
            addKaboom(player.pos);
            play("powerup");
        }
    });

    player.onCollide("enemy", (e, col) => {
        // if it's not from the top, die
        if (!col?.isBottom()) {
            go("lose");
            play("hit");
        }
    });

    let hasApple = false;

    // grow an apple if player's head bumps into an obj with "prize" tag
    player.onHeadbutt((obj) => {
        if (obj.is("prize") && !hasApple) {
            const apple = level.spawn("#", obj.tilePos.sub(0, 1));
            apple.jump();
            hasApple = true;
            play("blip");
        }
    });

    // player grows big onCollide with an "apple" obj
    player.onCollide("apple", (a) => {
        destroy(a);
        // as we defined in the big() component
        player.biggify(3);
        hasApple = false;
        play("powerup");
    });

    let coinPitch = 0;

    onUpdate(() => {
        if (coinPitch > 0) {
            coinPitch = Math.max(0, coinPitch - dt() * 100);
        }
    });

    player.onCollide("coin", (c) => {
        destroy(c);
        play("coin", {
            detune: coinPitch,
        });
        coinPitch += 100;
        coins += 1;
        coinsLabel.text = coins;
    });

    const coinsLabel = add([
        text(coins),
        pos(24, 24),
        fixed(),
    ]);

    let canDoubleJump = true;
    let wallSliding = false;
    async function jump() {
        if (player.isGrounded() && !wallSliding) {
            player.jump(JUMP_FORCE);
            canDoubleJump = true;
        } else if (!player.isGrounded() && canDoubleJump) {
            player.jump(JUMP_FORCE * 0.8);
            canDoubleJump = false;
        }
        else if (wallSliding) {
            canDoubleJump = true;
        } 
    }

    // gliding
    let canGlide = true;
    function glide() {
        if (player.isGrounded() || !canGlide) return;
        
        if (player.vel.y > 0) {
            player.vel.y = 0;
            playerSprite.sprite = "umbrella-hat";
            player.gravityScale = 0.1;
            canGlide = false;
            wait(1, () => {
                playerSprite.sprite = "bean";
                player.gravityScale = 1; 
            });
        }
    }

    // drop the propeller hat when done
    function dropPropeller() {
        let prop_particle = add([
            sprite("propeller"),
            pos(player.pos.x, player.pos.y-50),
            anchor("center"),
            area({ collisionIgnore: ["particle", "player"], friction: 0.1, restitution: 0 }),
            "particle",
            body(),
            lifespan(0.5, { fade: 0.5 }),
            opacity(1),
            move(LEFT, rand(60, 240)),
            rotate()
        ]);

        prop_particle.jump(-player.vel.y+rand(200, 400));
        prop_particle.onUpdate(() => prop_particle.angle -= 90 * dt());
    }

    // boost
    let canBoost = true;
    function boost() {
        if (!canBoost) return; // Prevent re-triggering while boosting
    
        player.gravityScale = 0;
        canBoost = false; // Disable re-triggering
        canDoubleJump = false; // disable double-jumping while boosting
        playerSprite.sprite = "propeller-hat";
        player.vel.y = 0;
        player.gravityScale = -0.5;
        wait(0.6, () => {
            playerSprite.sprite = "bean";
            dropPropeller();
            player.gravityScale = 1;
        });
    }

    function slam() {
        for (let i = 0; i < rand(5,7); i++) {
            drawSmallParticle(player.pos.x, player.pos.y, 1, 2);
        }
    }

    player.on("ground", () => {
        playerSprite.sprite = "bean";
        player.gravityScale = 1;
        canGlide = true; // Re-enable gliding
        canBoost = true; // enable boost
    });
    player.onCollide("p-hitbox", () => {
        if (player.vel.y >= TERMINAL_VELOCITY) { slam(); console.log("SLAMMED!")}
    });

    // wall sliding and gravity reset
    let lean_dir = 0;
    let canWallslide = false;
    player.onCollideUpdate("p-hitbox", () => {
        if (player.isGrounded()) { player.gravityScale = 1; }
        if (!player.isGrounded() && player.vel.y >= 0 && canWallslide) { 
            player.vel.y = 0;
            TERMINAL_VELOCITY = 500;
            wallSliding = true;
            playerSprite.rotateTo(30*lean_dir);

            if (wallSliding) {
                player.onCollideEnd(() => {
                    player.gravityScale = 1;
                    TERMINAL_VELOCITY = 2000;
                    wallSliding = false;
                    playerSprite.rotateTo(0);
                    canDoubleJump = true;
                });
            }
        } else {
            player.gravityScale = 1;
            TERMINAL_VELOCITY = 2000;
            playerSprite.rotateTo(0);
        }
    });

    // wall sliding particle
    let direction;
    player.onCollide("p-hitbox", (obj, col) => { if (col.isLeft()) { direction = RIGHT; } else { direction = LEFT; } });
    loop(0.15, () => {
        if (wallSliding) {
            const sp = add([
                pos(player.pos.x-16, player.pos.y-32),
                rect(8,8),
                color(74,34,11),
                anchor("center"),
                area({ collisionIgnore: ["particle", "player", "danger", "enemy"] }),
                body(),
                lifespan(0.5, { fade: 0.5 }),
                opacity(1),
                move(direction, rand(100, 150)),
                "particle",
            ]);
            //sp.jump(333);
        }
    });

    onKeyPress("w", () => { jump(); });

    // glide with space
    onKeyPress("space", glide);

    onKeyPress("c", () => { if (!player.isGrounded()) { boost(); }});

    onKeyDown("a", () => {
        player.move(-MOVE_SPEED, 0);
        canWallslide = true;
        lean_dir = 1;
    });
    onKeyRelease("a", () => {
        canWallslide = false;
    });

    onKeyDown("d", () => {
        player.move(MOVE_SPEED, 0);
        canWallslide = true;
        lean_dir = -1;
    });
    onKeyRelease("d", () => {
        canWallslide = false;
    });

    onKeyPress("s", () => {
        player.gravityScale = 3;
    });

    onKeyRelease("s", () => {
        player.gravityScale = 1;
    });

    onGamepadButtonPress("south", jump);

    onGamepadStick("left", (v) => {
        player.move(v.x * MOVE_SPEED, 0);
    });

    onKeyPress("f", () => {
        setFullscreen(!isFullscreen());
    });
});

scene("lose", () => {
    add([
        text("You Lose"),
    ]);
    onKeyPress(() => go("game"));
});

scene("win", () => {
    add([
        text("You Win"),
    ]);
    onKeyPress(() => go("game"));
});

go("game");
