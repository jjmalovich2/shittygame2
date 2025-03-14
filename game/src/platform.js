export default function findPlatformHitbox(map) {
    const height = map.length;
    const width = map[0].length;
    const visited = Array.from({ length: height }, () => Array(width).fill(false));
    const hitboxes = [];

    function expandRectangle(startX, startY) {
        let maxWidth = 0, maxHeight = 0;

        while (startX + maxWidth < width && map[startY][startX + maxWidth] === '=' && !visited[startY][startX + maxWidth]) {
            maxWidth++;
        }

        while (startY + maxHeight < height) {
            for (let x = 0; x < maxWidth; x++) {
                if (map[startY + maxHeight][startX + x] !== '=' || visited[startY + maxHeight][startX + x]) {
                    return { x: startX, y: startY, width: maxWidth, height: maxHeight };
                }
            }
            maxHeight++;
        }

        return { x: startX, y: startY, width: maxWidth, height: maxHeight };
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (map[y][x] === '=' && !visited[y][x]) {
                let rect = expandRectangle(x, y);
                hitboxes.push(rect);

                for (let dy = 0; dy < rect.height; dy++) {
                    for (let dx = 0; dx < rect.width; dx++) {
                        visited[y + dy][x + dx] = true;
                    }
                }
            }
        }
    }

    return hitboxes;
}