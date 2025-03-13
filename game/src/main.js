import kaplay from "./src.js";
import loadAssets from "./assets";

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
const JUMP_FORCE = 1320;
const MOVE_SPEED = 480;
const FALL_DEATH = 2400;
let TERMINAL_VELOCITY = 2001;

const LEVELS = [
    [
        "            ",
        "            ",
        "       $$   ",
        "      ===   ",
        "            ",
        "   ^^  > = @",
        "============",
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
            area({ friction: 0.02, restitution: 0 }),
            body({ isStatic: true }),
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

scene("game", ({ levelId, coins } = { levelId: 0, coins: 0 }) => {
    // add level to scene
    const level = addLevel(LEVELS[levelId ?? 0], levelConf);

    // define player object
    const player = add([
        sprite("bean"),
        pos(0, 0),
        area(),
        scale(1),
        // makes it fall to gravity and jumpable
        body(),
        // the custom component we defined above
        big(),
        anchor("bot"),
        "player"
    ]);

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

    // action() runs every frame
    let SLAM = false;
    player.onUpdate(() => {
        // check fall death
        if (player.pos.y >= FALL_DEATH) {
            go("lose");
        }
        if (player.vel.y > TERMINAL_VELOCITY) {
            player.vel.y = TERMINAL_VELOCITY;
            SLAM = true;
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
    function jump() {
        // these 2 functions are provided by body() component
        if (player.isGrounded()) {
            player.jump(JUMP_FORCE);
            canDoubleJump = true;
        }
        else if (!player.isGrounded() && canDoubleJump) {
            player.jump(JUMP_FORCE * 0.8);
            canDoubleJump = false;
        }
    }

    // gliding
    let canGlide = true;
    function glide() {
        if (player.isGrounded() || !canGlide) return;
        
        if (player.vel.y > 0) {
            player.vel.y = 0;
            player.sprite = "umbrella-hat";
            player.gravityScale = 0.1;
            canGlide = false;
            wait(1, () => {
                player.sprite = "bean";
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
    
        canBoost = false; // Disable re-triggering
        canDoubleJump = false; // disable double-jumping while boosting
        player.sprite = "propeller-hat";
        player.vel.y = 0;
        player.gravityScale = -0.6;
        wait(0.75, () => {
            player.sprite = "bean";
            dropPropeller();
            player.gravityScale = 1;
        });
    }

    function drawSlamParticle() {
        let size = rand(7, 12);
        const slam_particle = add([
            rect(size, size),
            color(74,34,11),
            pos(player.pos.x, player.pos.y-10),
            anchor("center"),
            area({ collisionIgnore: ["particle", "player", "spike", "danger"], friction: 0.02, restitution: 0 }),
            "particle",
            "slam-particle",
            body(),
            lifespan(2, { fade: 0.5 }),
            opacity(1),
        ]);

        slam_particle.addForce(vec2(choose([rand(6000,18000),-rand(6000,18000)]), 0).sub(slam_particle.vel).scale(slam_particle.mass));
        slam_particle.jump(rand(800, 1000));
    }
    function slam() {
        for (let i = 0; i < rand(5,7); i++) {
            drawSlamParticle();
        }
    }
    onCollideUpdate("slam-particle", "platform", (p, f) => { p.vel.x = 0; });

    player.on("ground", () => {
        player.sprite = "bean";
        player.gravityScale = 1;
        canGlide = true; // Re-enable gliding
        canBoost = true; // enable boost
    });
    player.onCollide("platform", () => {
        if (player.vel.y >= TERMINAL_VELOCITY) { slam(); console.log("SLAMMED!")}
    });

    onKeyPress("up", jump);

    // glide with space
    onKeyPress("space", glide);

    onKeyPress("c", boost);

    onKeyDown("left", () => {
        player.move(-MOVE_SPEED, 0);
    });

    onKeyDown("right", () => {
        player.move(MOVE_SPEED, 0);
    });

    onKeyPress("down", () => {
        player.gravityScale = 3;
    });

    onKeyRelease("down", () => {
        player.gravityScale = 1;
    });

    onKeyPress("x", () => {
        slam();
    })

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
