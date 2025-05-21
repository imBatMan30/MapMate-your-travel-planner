// DOM Elements
const numDestinationsInput = document.getElementById('num-destinations');
const generateBtn = document.getElementById('generate-btn');
const destinationsContainer = document.getElementById('destinations-container');
const createMapBtn = document.getElementById('create-map-btn');
const mapContent = document.getElementById('map-content');
const sourceCity = document.getElementById('source-city');

// Get source city from URL parameter
let sourceCityName = '';

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    createMapBtn.style.display = 'none';
    const params = new URLSearchParams(window.location.search);
    sourceCityName = params.get('source');
    sourceCity.value = sourceCityName || 'Source not specified';
    generateDestinationInputs(parseInt(numDestinationsInput.value) || 3);
});

// Generate destination input fields
generateBtn.addEventListener('click', () => {
    const numDestinations = parseInt(numDestinationsInput.value);
    if (numDestinations && numDestinations > 0 && numDestinations <= 20) {
        generateDestinationInputs(numDestinations);
        createMapBtn.style.display = 'block';
    } else {
        alert('Please enter a valid number of destinations (1-20).');
    }
});

function generateDestinationInputs(count) {
    destinationsContainer.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const destinationDiv = document.createElement('div');
        destinationDiv.className = 'destination-input';
        const label = document.createElement('label');
        label.textContent = `Destination ${i + 1}:`;
        label.setAttribute('for', `destination-${i + 1}`);
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `destination-${i + 1}`;
        input.placeholder = 'Enter location name';
        destinationDiv.appendChild(label);
        destinationDiv.appendChild(input);
        destinationsContainer.appendChild(destinationDiv);
    }
}

function generateMap(destinations, distances, durations) {
    mapContent.innerHTML = '';
    const routeDiv = document.createElement('div');
    routeDiv.className = 'map-route';
    const optimalOrder = window.serverData.optimalOrder || destinations;
    const totalDistance = window.serverData.totalDistance;
    const totalDuration = window.serverData.totalDuration;
    const legs = window.serverData.legs;

    // Log for debugging
    console.log('Destinations:', destinations);
    console.log('Optimal Order:', optimalOrder);
    console.log('Legs:', legs);

    optimalOrder.forEach((destination, index) => {
        const routeItem = document.createElement('div');
        routeItem.className = 'route-item';
        const routeNumber = document.createElement('div');
        routeNumber.className = 'route-number';
        routeNumber.textContent = index + 1;
        const destinationText = document.createElement('div');
        destinationText.className = 'destination-text';
        destinationText.textContent = destination;

        if (index > 0 && legs && legs[index - 1]) {
            const leg = legs[index - 1];
            const distanceKm = leg.distance;
            const durationSec = leg.duration;
            const hours = Math.floor(durationSec / 3600);
            const minutes = Math.floor((durationSec % 3600) / 60);
            const distanceDuration = document.createElement('div');
            distanceDuration.className = 'route-details';
            distanceDuration.innerHTML = `
                <span><i class="fas fa-road"></i> ${distanceKm.toFixed(1)} km</span>
                <span><i class="fas fa-clock"></i> ${hours} hours ${minutes} min</span>
            `;
            destinationText.appendChild(distanceDuration);
        }

        routeItem.appendChild(routeNumber);
        routeItem.appendChild(destinationText);
        routeDiv.appendChild(routeItem);

        if (index < optimalOrder.length - 1) {
            const arrow = document.createElement('div');
            arrow.className = 'route-arrow';
            arrow.innerHTML = '<i class="fas fa-arrow-down"></i>';
            routeDiv.appendChild(arrow);
        }
    });

    const totalHours = Math.floor(totalDuration / 3600);
    const totalMinutes = Math.floor((totalDuration % 3600) / 60);
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'route-summary';
    summaryDiv.style.marginTop = '1rem';
    summaryDiv.innerHTML = `
        <strong>Total Distance:</strong> ${totalDistance} km<br>
        <strong>Total Duration:</strong> ${totalHours} hours ${totalMinutes} min
    `;
    routeDiv.appendChild(summaryDiv);

    const editButton = document.createElement('button');
    editButton.textContent = 'Edit Route';
    editButton.className = 'edit-btn';
    editButton.style.marginTop = '1.5rem';
    editButton.addEventListener('click', () => {
        document.querySelector('.input-section').scrollIntoView({ behavior: 'smooth' });
    });

    mapContent.appendChild(routeDiv);
    mapContent.appendChild(editButton);

    const mapNote = document.createElement('p');
    mapNote.textContent = 'This is a visual representation of your optimized travel route. In a real application, this would be an interactive map.';
    mapNote.style.marginTop = '1.5rem';
    mapNote.style.fontSize = '0.9rem';
    mapNote.style.color = '#7f8c8d';
    mapContent.appendChild(mapNote);
}

createMapBtn.addEventListener('click', () => {
    const destinationInputs = document.querySelectorAll('.destination-input input');
    const destinations = [];
    destinationInputs.forEach(input => {
        if (input.value.trim()) {
            destinations.push(input.value.trim().toLowerCase());
        }
    });

    if (destinations.length < 1) {
        alert('Please enter at least 1 destination to create a map.');
        return;
    }

    fetch('/create-map', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            source: sourceCityName.trim().toLowerCase(),
            destinations: destinations 
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(`Server error: ${err.error || response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log("Received data from server:", data);
        if (!data.origin || !data.destinations || !data.optimalOrder) {
            throw new Error('Invalid response: Missing required fields');
        }
        window.serverData = data;
        const allDestinations = [data.origin, ...data.destinations];
        generateMap(allDestinations, data.distances, data.durations);
        document.querySelector('.map-container').scrollIntoView({ behavior: 'smooth' });
    })
    .catch(error => {
        console.error('Error generating map:', error.message);
        alert(`Error generating map: ${error.message}. Please try again.`);
    });
});