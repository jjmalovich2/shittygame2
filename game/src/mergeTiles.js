// Example level with `=` tiles to be merged
const level = [
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
];

const tileWidth = 64;
const tileHeight = 64;

// Hitboxes for each tile (as an example, you may have this as part of the tile objects)
const hitboxes = [];

// Function to merge hitboxes of neighboring `=` tiles
function mergeHitboxes(group) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Iterate over the group of tiles and combine the hitboxes
    group.forEach(tile => {
        const hitbox = tile.hitbox;
        minX = Math.min(minX, hitbox.x);
        minY = Math.min(minY, hitbox.y);
        maxX = Math.max(maxX, hitbox.x + hitbox.width);
        maxY = Math.max(maxY, hitbox.y + hitbox.height);
    });

    // The merged hitbox is the bounding box of all the individual hitboxes
    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
}

// Traverse and merge the `=` tiles into larger areas
function optimizeHitboxes({ groupAreas }) {
    const groupedTiles = [];
    const visited = Array.from({ length: level.length }, () => Array(level[0].length).fill(false));

    // Traverse the grid and find groups of `=` tiles
    for (let y = 0; y < level.length; y++) {
        for (let x = 0; x < level[0].length; x++) {
            // Skip already visited tiles or non-`=` tiles
            if (visited[y][x] || level[y][x] !== groupAreas) continue;

            const group = [];
            traverseTile(x, y, group, visited, groupAreas);
            groupedTiles.push(group);
        }
    }

    // Merge hitboxes for each group of tiles
    groupedTiles.forEach(group => {
        const mergedHitbox = mergeHitboxes(group);
        console.log('Merged Hitbox for Group:', mergedHitbox);
        // Update your platform (or other object) with this new merged hitbox
        // Assuming you have a platform object, you might do something like:
        // platform.setHitbox(mergedHitbox);
    });
}

// Recursive function to find connected `=` tiles
function traverseTile(x, y, group, visited, groupAreas) {
    if (x < 0 || y < 0 || x >= level[0].length || y >= level.length) return;
    if (visited[y][x] || level[y][x] !== groupAreas) return;

    visited[y][x] = true;
    group.push({
        x: x * tileWidth, // Scale by tile size
        y: y * tileHeight, // Scale by tile size
        hitbox: {
            x: x * tileWidth,
            y: y * tileHeight,
            width: tileWidth,
            height: tileHeight
        }
    });

    // Check neighbors (up, down, left, right)
    traverseTile(x + 1, y, group, visited, groupAreas);
    traverseTile(x - 1, y, group, visited, groupAreas);
    traverseTile(x, y + 1, group, visited, groupAreas);
    traverseTile(x, y - 1, group, visited, groupAreas);
}

// Run optimization with `=` as the tag for merging
optimizeHitboxes({ groupAreas: '=' });