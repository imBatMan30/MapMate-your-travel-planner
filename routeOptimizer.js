function findOptimalOrder(cities, distances, durations) {
    if (!cities || !Array.isArray(cities) || cities.length < 2 ||
        !distances || !Array.isArray(distances) || !durations || !Array.isArray(durations)) {
        throw new Error('Invalid input: cities, distances, and durations must be non-empty arrays');
    }
    if (distances.length !== cities.length || durations.length !== cities.length) {
        throw new Error('Mismatched matrix dimensions');
    }

    const n = cities.length;
    const visited = new Array(n).fill(false);
    const order = [];
    let current = 0;
    visited[0] = true;
    order.push(cities[0]);

    while (order.length < n) {
        let minDistance = Infinity;
        let nextCity = -1;

        for (let i = 0; i < n; i++) {
            if (!visited[i] && distances[current][i] < minDistance) {
                minDistance = distances[current][i];
                nextCity = i;
            }
        }

        if (nextCity === -1) {
            console.warn('No more unvisited cities found');
            break;
        }

        visited[nextCity] = true;
        order.push(cities[nextCity]);
        current = nextCity;
    }

    let totalDistance = 0;
    let totalDuration = 0;
    for (let i = 0; i < order.length - 1; i++) {
        const fromIndex = cities.indexOf(order[i]);
        const toIndex = cities.indexOf(order[i + 1]);
        totalDistance += distances[fromIndex][toIndex]; 
        totalDuration += durations[fromIndex][toIndex];
    }

    return { order, totalDistance, totalDuration };
}

module.exports = { findOptimalOrder };