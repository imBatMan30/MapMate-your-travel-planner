// DOM Elements
const numDestinationsInput = document.getElementById("num-destinations")
const generateBtn = document.getElementById("generate-btn")
const destinationsContainer = document.getElementById("destinations-container")
const createMapBtn = document.getElementById("create-map-btn")
const mapContent = document.getElementById("map-content")
const sourceCity = document.getElementById("source-city")

// Get source city from URL parameter
let sourceCityName = ""

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
  createMapBtn.style.display = "none"
  const params = new URLSearchParams(window.location.search)
  sourceCityName = params.get("source")
  sourceCity.value = sourceCityName || "Source not specified"
  generateDestinationInputs(Number.parseInt(numDestinationsInput.value) || 3)

  // Add loading animation to buttons
  addButtonAnimations()
})

// Add button animations
function addButtonAnimations() {
  const buttons = document.querySelectorAll("button")
  buttons.forEach((button) => {
    button.addEventListener("click", function (e) {
      const ripple = document.createElement("span")
      ripple.classList.add("ripple")
      this.appendChild(ripple)

      const x = e.clientX - e.target.offsetLeft
      const y = e.clientY - e.target.offsetTop

      ripple.style.left = `${x}px`
      ripple.style.top = `${y}px`

      setTimeout(() => {
        ripple.remove()
      }, 600)
    })
  })
}

// Generate destination input fields with animations
generateBtn.addEventListener("click", () => {
  const numDestinations = Number.parseInt(numDestinationsInput.value)
  if (numDestinations && numDestinations > 0 && numDestinations <= 20) {
    generateDestinationInputs(numDestinations)
    createMapBtn.style.display = "block"

    // Animate button appearance
    createMapBtn.style.opacity = "0"
    createMapBtn.style.transform = "translateY(20px)"
    setTimeout(() => {
      createMapBtn.style.transition = "all 0.5s ease"
      createMapBtn.style.opacity = "1"
      createMapBtn.style.transform = "translateY(0)"
    }, 100)
  } else {
    showNotification("Please enter a valid number of destinations (1-20).", "error")
  }
})

function generateDestinationInputs(count) {
  destinationsContainer.innerHTML = ""
  for (let i = 0; i < count; i++) {
    const destinationDiv = document.createElement("div")
    destinationDiv.className = "destination-input"
    destinationDiv.style.opacity = "0"
    destinationDiv.style.transform = "translateY(20px)"

    const label = document.createElement("label")
    label.innerHTML = `<i class="fas fa-map-pin"></i> Destination ${i + 1}`
    label.setAttribute("for", `destination-${i + 1}`)

    const input = document.createElement("input")
    input.type = "text"
    input.id = `destination-${i + 1}`
    input.placeholder = "Enter an amazing location..."

    destinationDiv.appendChild(label)
    destinationDiv.appendChild(input)
    destinationsContainer.appendChild(destinationDiv)

    // Animate input appearance
    setTimeout(() => {
      destinationDiv.style.transition = "all 0.5s ease"
      destinationDiv.style.opacity = "1"
      destinationDiv.style.transform = "translateY(0)"
    }, i * 100)
  }
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div")
  notification.className = `notification ${type}`
  notification.innerHTML = `
        <i class="fas fa-${type === "error" ? "exclamation-triangle" : "info-circle"}"></i>
        ${message}
    `

  // Add notification styles
  notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === "error" ? "#e74c3c" : "#667eea"};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.5s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
    `

  document.body.appendChild(notification)

  setTimeout(() => {
    notification.style.animation = "slideOut 0.5s ease"
    setTimeout(() => notification.remove(), 500)
  }, 3000)
}

// Time calculation function
function calculateJourneyTime(journeyDays, numDestinations, totalTravelTimeHours) {
  const totalHours = journeyDays * 24
  const sleepHours = journeyDays * 8
  const personalHours = journeyDays * 3

  const availableHours = totalHours - sleepHours - personalHours - totalTravelTimeHours

  if (availableHours <= 0) {
    return {
      isPossible: false,
      message: "Journey is not possible with the given duration. Travel time exceeds available time.",
      totalHours,
      sleepHours,
      personalHours,
      totalTravelTimeHours,
      availableHours: 0,
      timePerDestination: 0,
    }
  }

  const timePerDestination = availableHours / numDestinations

  return {
    isPossible: true,
    totalHours,
    sleepHours,
    personalHours,
    totalTravelTimeHours,
    availableHours,
    timePerDestination,
    message: `You have ${timePerDestination.toFixed(1)} hours to explore each destination.`,
  }
}

function generateMap(destinations, distances, durations, venues) {
  mapContent.innerHTML = ""
  const routeDiv = document.createElement("div")
  routeDiv.className = "map-route"
  const optimalOrder = window.serverData.optimalOrder || destinations
  const totalDistance = window.serverData.totalDistance
  const totalDuration = window.serverData.totalDuration
  const legs = window.serverData.legs

  console.log("Destinations:", destinations)
  console.log("Optimal Order:", optimalOrder)
  console.log("Legs:", legs)
  console.log("Venues:", venues)

  // Get journey parameters from URL
  const params = new URLSearchParams(window.location.search)
  const journeyDays = Number.parseInt(params.get("days")) || 3
  const medium = params.get("medium")
  const fuelEconomy = Number.parseFloat(params.get("fuelEconomy"))
  const fuelRate = Number.parseFloat(params.get("fuelRate"))

  const numDestinations = optimalOrder.length - 1 // Excluding source
  const totalTravelTimeHours = totalDuration / 3600 // Convert seconds to hours

  // Calculate time breakdown
  const timeCalculation = calculateJourneyTime(journeyDays, numDestinations, totalTravelTimeHours)

  // Calculate fuel cost if private vehicle
  let fuelCost = null
  if (medium === "private" && fuelEconomy && fuelRate && totalDistance) {
    const totalDistanceNum = Number.parseFloat(totalDistance)
    const fuelNeeded = totalDistanceNum / fuelEconomy
    fuelCost = fuelNeeded * fuelRate
    console.log(`Fuel Cost Calculation:`)
    console.log(`Total Distance: ${totalDistanceNum} km`)
    console.log(`Fuel Economy: ${fuelEconomy} km/L`)
    console.log(`Fuel Rate: ${fuelRate} per liter`)
    console.log(`Fuel Needed: ${fuelNeeded.toFixed(2)} liters`)
    console.log(`Total Fuel Cost: ${fuelCost.toFixed(2)}`)
  }

  optimalOrder.forEach((destination, index) => {
    const routeItem = document.createElement("div")
    routeItem.className = "route-item"
    routeItem.style.opacity = "0"
    routeItem.style.transform = "translateY(30px)"

    // Route Header: City Name and Number
    const routeHeader = document.createElement("div")
    routeHeader.className = "route-header"
    const routeNumber = document.createElement("span")
    routeNumber.className = "route-number"
    routeNumber.textContent = index + 1
    const destinationName = document.createElement("h3")
    destinationName.className = "destination-name"
    destinationName.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${destination}`
    routeHeader.appendChild(routeNumber)
    routeHeader.appendChild(destinationName)

    // Route Details: Distance and Duration (if not first city)
    if (index > 0 && legs && legs[index - 1]) {
      const leg = legs[index - 1]
      const distanceKm = leg.distance
      const durationSec = leg.duration
      const hours = Math.floor(durationSec / 3600)
      const minutes = Math.floor((durationSec % 3600) / 60)
      const routeDetails = document.createElement("div")
      routeDetails.className = "route-details"
      routeDetails.innerHTML = `
                <span><i class="fas fa-road"></i> ${distanceKm.toFixed(1)} km</span>
                <span><i class="fas fa-clock"></i> ${hours}h ${minutes}m</span>
            `
      routeHeader.appendChild(routeDetails)
    }

    // Add time allocation for each destination (excluding source)
    if (index > 0 && timeCalculation.isPossible) {
      const timeAllocation = document.createElement("div")
      timeAllocation.className = "time-allocation"
      timeAllocation.innerHTML = `
                <div class="time-info">
                    <i class="fas fa-hourglass-half"></i>
                    <span>Exploration Time: ${timeCalculation.timePerDestination.toFixed(1)} hours</span>
                </div>
            `
      routeHeader.appendChild(timeAllocation)
    }

    routeItem.appendChild(routeHeader)

    // Venues Section
    const venuesContainer = document.createElement("div")
    venuesContainer.className = "venues-container"
    const cityVenues = venues[destination.toLowerCase()]

    if (cityVenues) {
      // Attractions
      if (cityVenues.attractions && cityVenues.attractions.length > 0) {
        const attractionsDiv = document.createElement("div")
        attractionsDiv.className = "venue-card"
        attractionsDiv.innerHTML = `
                    <h4><i class="fas fa-camera"></i> Top Attractions in ${destination}</h4>
                `
        const attractionsList = document.createElement("ul")
        cityVenues.attractions.forEach((attraction) => {
          const li = document.createElement("li")
          li.innerHTML = `
                        <strong><i class="fas fa-star"></i> ${attraction.name}</strong><br>
                        <i class="fas fa-tag"></i> ${attraction.category}<br>
                        <i class="fas fa-map-pin"></i> ${attraction.address}<br>
                        <i class="fas fa-thumbs-up"></i> Rating: ${attraction.rating}/10
                    `
          attractionsList.appendChild(li)
        })
        attractionsDiv.appendChild(attractionsList)
        venuesContainer.appendChild(attractionsDiv)
      }

      // Hotels
      if (cityVenues.hotels && cityVenues.hotels.length > 0) {
        const hotelsDiv = document.createElement("div")
        hotelsDiv.className = "venue-card"
        hotelsDiv.innerHTML = `
                    <h4><i class="fas fa-bed"></i> Best Hotels in ${destination}</h4>
                `
        const hotelsList = document.createElement("ul")
        cityVenues.hotels.forEach((hotel) => {
          const li = document.createElement("li")
          li.innerHTML = `
                        <strong><i class="fas fa-hotel"></i> ${hotel.name}</strong><br>
                        <i class="fas fa-tag"></i> ${hotel.category}<br>
                        <i class="fas fa-map-pin"></i> ${hotel.address}<br>
                        <i class="fas fa-thumbs-up"></i> Rating: ${hotel.rating}/10
                    `
          hotelsList.appendChild(li)
        })
        hotelsDiv.appendChild(hotelsList)
        venuesContainer.appendChild(hotelsDiv)
      }

      // Restaurants
      if (cityVenues.restaurants && cityVenues.restaurants.length > 0) {
        const restaurantsDiv = document.createElement("div")
        restaurantsDiv.className = "venue-card"
        restaurantsDiv.innerHTML = `
                    <h4><i class="fas fa-utensils"></i> Local Cuisine in ${destination}</h4>
                `
        const restaurantsList = document.createElement("ul")
        cityVenues.restaurants.forEach((restaurant) => {
          const li = document.createElement("li")
          li.innerHTML = `
                        <strong><i class="fas fa-utensils"></i> ${restaurant.name}</strong><br>
                        <i class="fas fa-tag"></i> ${restaurant.category}<br>
                        <i class="fas fa-map-pin"></i> ${restaurant.address}<br>
                        <i class="fas fa-thumbs-up"></i> Rating: ${restaurant.rating}/10
                    `
          restaurantsList.appendChild(li)
        })
        restaurantsDiv.appendChild(restaurantsList)
        venuesContainer.appendChild(restaurantsDiv)
      }
    }

    routeItem.appendChild(venuesContainer)
    routeDiv.appendChild(routeItem)

    // Animate route item appearance
    setTimeout(() => {
      routeItem.style.transition = "all 0.6s ease"
      routeItem.style.opacity = "1"
      routeItem.style.transform = "translateY(0)"
    }, index * 200)

    // Arrow between cities
    if (index < optimalOrder.length - 1) {
      const arrow = document.createElement("div")
      arrow.className = "route-arrow"
      arrow.innerHTML = '<i class="fas fa-arrow-down"></i>'
      routeDiv.appendChild(arrow)
    }
  })

  // Time Breakdown Summary
  const timeBreakdownDiv = document.createElement("div")
  timeBreakdownDiv.className = timeCalculation.isPossible ? "time-breakdown-success" : "time-breakdown-error"

  if (timeCalculation.isPossible) {
    timeBreakdownDiv.innerHTML = `
      <h4><i class="fas fa-clock"></i> Journey Time Breakdown</h4>
      <div class="time-stats">
        <div class="time-stat">
          <span class="time-label">Total Trip Duration:</span>
          <span class="time-value">${journeyDays} days (${timeCalculation.totalHours} hours)</span>
        </div>
        <div class="time-stat">
          <span class="time-label">Sleep Time:</span>
          <span class="time-value">${timeCalculation.sleepHours} hours (8h/day)</span>
        </div>
        <div class="time-stat">
          <span class="time-label">Personal Time:</span>
          <span class="time-value">${timeCalculation.personalHours} hours (3h/day)</span>
        </div>
        <div class="time-stat">
          <span class="time-label">Travel Time:</span>
          <span class="time-value">${timeCalculation.totalTravelTimeHours.toFixed(1)} hours</span>
        </div>
        <div class="time-stat highlight">
          <span class="time-label">Available for Exploration:</span>
          <span class="time-value">${timeCalculation.availableHours.toFixed(1)} hours</span>
        </div>
        <div class="time-stat highlight">
          <span class="time-label">Time per Destination:</span>
          <span class="time-value">${timeCalculation.timePerDestination.toFixed(1)} hours each</span>
        </div>
      </div>
      <p class="time-message"><i class="fas fa-check-circle"></i> ${timeCalculation.message}</p>
    `
  } else {
    timeBreakdownDiv.innerHTML = `
      <h4><i class="fas fa-exclamation-triangle"></i> Journey Not Possible</h4>
      <div class="time-stats">
        <div class="time-stat">
          <span class="time-label">Total Trip Duration:</span>
          <span class="time-value">${journeyDays} days (${timeCalculation.totalHours} hours)</span>
        </div>
        <div class="time-stat">
          <span class="time-label">Required Sleep Time:</span>
          <span class="time-value">${timeCalculation.sleepHours} hours</span>
        </div>
        <div class="time-stat">
          <span class="time-label">Required Personal Time:</span>
          <span class="time-value">${timeCalculation.personalHours} hours</span>
        </div>
        <div class="time-stat error">
          <span class="time-label">Required Travel Time:</span>
          <span class="time-value">${timeCalculation.totalTravelTimeHours.toFixed(1)} hours</span>
        </div>
      </div>
      <p class="time-message error"><i class="fas fa-times-circle"></i> ${timeCalculation.message}</p>
      <p class="suggestion">💡 Suggestion: Increase journey duration or reduce number of destinations.</p>
    `
  }

  routeDiv.appendChild(timeBreakdownDiv)

  // Fuel Cost Summary (if applicable)
  if (fuelCost !== null) {
    const fuelCostDiv = document.createElement("div")
    fuelCostDiv.className = "fuel-cost-summary"
    const fuelNeeded = Number.parseFloat(totalDistance) / fuelEconomy
    fuelCostDiv.innerHTML = `
      <h4><i class="fas fa-gas-pump"></i> Private Vehicle Fuel Cost</h4>
      <div class="fuel-cost-details">
        <div class="fuel-stat">
          <span class="fuel-label">Total Distance:</span>
          <span class="fuel-value">${totalDistance} km</span>
        </div>
        <div class="fuel-stat">
          <span class="fuel-label">Fuel Economy:</span>
          <span class="fuel-value">${fuelEconomy} km/L</span>
        </div>
        <div class="fuel-stat">
          <span class="fuel-label">Fuel Price:</span>
          <span class="fuel-value">${fuelRate} per liter</span>
        </div>
        <div class="fuel-stat">
          <span class="fuel-label">Fuel Required:</span>
          <span class="fuel-value">${fuelNeeded.toFixed(2)} liters</span>
        </div>
        <div class="fuel-stat highlight">
          <span class="fuel-label">Total Fuel Cost:</span>
          <span class="fuel-value">${fuelCost.toFixed(2)}</span>
        </div>
      </div>
      <p class="fuel-message">
        <i class="fas fa-info-circle"></i> 
        This is an estimated cost based on your vehicle's fuel economy and current fuel prices.
      </p>
    `
    routeDiv.appendChild(fuelCostDiv)
  }

  // Route Summary
  const totalHours = Math.floor(totalDuration / 3600)
  const totalMinutes = Math.floor((totalDuration % 3600) / 60)
  const summaryDiv = document.createElement("div")
  summaryDiv.className = "route-summary"

  let summaryContent = `
        <h4><i class="fas fa-route"></i> Your Amazing Journey Summary</h4>
        <p><i class="fas fa-road"></i> Total Distance: ${totalDistance} km</p>
        <p><i class="fas fa-clock"></i> Total Travel Duration: ${totalHours}h ${totalMinutes}m</p>
        <p><i class="fas fa-calendar-alt"></i> Journey Duration: ${journeyDays} days</p>
        <p><i class="fas fa-${medium === "private" ? "car" : "bus"}"></i> Transportation: ${medium === "private" ? "Private Vehicle" : "Public Transport"}</p>
    `

  if (fuelCost !== null) {
    summaryContent += `<p><i class="fas fa-dollar-sign"></i> Estimated Fuel Cost: ${fuelCost.toFixed(2)}</p>`
  }

  summaryContent += `<p><i class="fas fa-heart"></i> Unforgettable memories await!</p>`

  summaryDiv.innerHTML = summaryContent
  routeDiv.appendChild(summaryDiv)

  // Edit Route Button
  const editButton = document.createElement("button")
  editButton.innerHTML = '<i class="fas fa-edit"></i> Customize Route'
  editButton.className = "edit-btn"
  editButton.addEventListener("click", () => {
    document.querySelector(".input-section").scrollIntoView({ behavior: "smooth" })
  })
  routeDiv.appendChild(editButton)
  // Show download section
  const downloadSection = document.getElementById("download-section")
  if (downloadSection) {
    downloadSection.style.display = "block"
    downloadSection.style.opacity = "0"
    downloadSection.style.transform = "translateY(20px)"
    setTimeout(() => {
      downloadSection.style.transition = "all 0.5s ease"
      downloadSection.style.opacity = "1"
      downloadSection.style.transform = "translateY(0)"
    }, 500)
  }
  mapContent.appendChild(routeDiv)
}

createMapBtn.addEventListener("click", () => {
  const destinationInputs = document.querySelectorAll(".destination-input input")
  const destinations = []
  destinationInputs.forEach((input) => {
    if (input.value.trim()) {
      destinations.push(input.value.trim().toLowerCase())
    }
  })

  if (destinations.length < 1) {
    showNotification("Please enter at least 1 destination to create your journey!", "error")
    return
  }

  // Show loading state
  createMapBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Your Journey...'
  createMapBtn.disabled = true

  fetch("/create-map", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: sourceCityName.trim().toLowerCase(),
      destinations: destinations,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          throw new Error(`Server error: ${err.error || response.statusText}`)
        })
      }
      return response.json()
    })
    .then((data) => {
      console.log("Received data from server:", data)
      if (!data.origin || !data.destinations || !data.optimalOrder) {
        throw new Error("Invalid response: Missing required fields")
      }
      window.serverData = data
      const allDestinations = [data.origin, ...data.destinations]
      generateMap(allDestinations, data.distances, data.durations, data.venues)
      document.querySelector(".map-container").scrollIntoView({ behavior: "smooth" })
      showNotification("Your amazing journey has been created! 🎉", "success")
    })
    .catch((error) => {
      console.error("Error generating map:", error.message)
      showNotification(`Error creating journey: ${error.message}. Please try again.`, "error")
    })
    .finally(() => {
      // Reset button state
      createMapBtn.innerHTML = '<i class="fas fa-map"></i> Create My Journey'
      createMapBtn.disabled = false
    })
})

// Add CSS for animations
const style = document.createElement("style")
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`
document.head.appendChild(style)

// PDF Download Functionality
document.addEventListener("DOMContentLoaded", () => {
  const downloadBtn = document.getElementById("download-pdf-btn")
  
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      generateTripPDF()
    })
  }
})

function generateTripPDF() {
  const downloadBtn = document.getElementById("download-pdf-btn")

  // Show loading state
  downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...'
  downloadBtn.disabled = true

  try {
    const { jsPDF } = window.jspdf
    const doc = new jsPDF()

    // Get trip data
    const params = new URLSearchParams(window.location.search)
    const sourceCityName = params.get("source") || "Unknown"
    const journeyDays = Number.parseInt(params.get("days")) || 3
    const medium = params.get("medium") || "public"
    const fuelEconomy = Number.parseFloat(params.get("fuelEconomy"))
    const fuelRate = Number.parseFloat(params.get("fuelRate"))

    const serverData = window.serverData
    if (!serverData) {
      throw new Error("No trip data available")
    }

    let yPosition = 20
    const pageHeight = doc.internal.pageSize.height
    const margin = 20

    // Helper function to add new page if needed
    function checkPageBreak(requiredSpace = 20) {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage()
        yPosition = 20
      }
    }

    // Helper function to add text with word wrap
    function addText(text, x, y, options = {}) {
      const maxWidth = options.maxWidth || 170
      const fontSize = options.fontSize || 12
      const fontStyle = options.fontStyle || "normal"

      doc.setFontSize(fontSize)
      doc.setFont("helvetica", fontStyle)

      const lines = doc.splitTextToSize(text, maxWidth)
      lines.forEach((line, index) => {
        checkPageBreak()
        doc.text(line, x, y + index * (fontSize * 0.5))
        yPosition = Math.max(yPosition, y + index * (fontSize * 0.5) + 5)
      })

      return lines.length * (fontSize * 0.5)
    }

    // Title
    doc.setFillColor(102, 126, 234)
    doc.rect(0, 0, 210, 40, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")
    doc.text("MapMate Trip Itinerary", 20, 25)

    yPosition = 50
    doc.setTextColor(0, 0, 0)

    // Trip Overview
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Trip Overview", 20, yPosition)
    yPosition += 15

    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(`Source: ${sourceCityName}`, 20, yPosition)
    yPosition += 8
    doc.text(`Duration: ${journeyDays} days`, 20, yPosition)
    yPosition += 8
    doc.text(`Transportation: ${medium === "private" ? "Private Vehicle" : "Public Transport"}`, 20, yPosition)
    yPosition += 8
    doc.text(`Total Distance: ${serverData.totalDistance} km`, 20, yPosition)
    yPosition += 8

    const totalHours = Math.floor(serverData.totalDuration / 3600)
    const totalMinutes = Math.floor((serverData.totalDuration % 3600) / 60)
    doc.text(`Total Travel Time: ${totalHours}h ${totalMinutes}m`, 20, yPosition)
    yPosition += 15

    // Fuel Cost (if applicable)
    if (medium === "private" && fuelEconomy && fuelRate) {
      const totalDistanceNum = Number.parseFloat(serverData.totalDistance)
      const fuelNeeded = totalDistanceNum / fuelEconomy
      const fuelCost = fuelNeeded * fuelRate

      checkPageBreak(30)
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("Fuel Cost Estimate", 20, yPosition)
      yPosition += 12

      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.text(`Fuel Economy: ${fuelEconomy} km/L`, 20, yPosition)
      yPosition += 8
      doc.text(`Fuel Price: ${fuelRate} per liter`, 20, yPosition)
      yPosition += 8
      doc.text(`Fuel Required: ${fuelNeeded.toFixed(2)} liters`, 20, yPosition)
      yPosition += 8
      doc.text(`Total Fuel Cost: ${fuelCost.toFixed(2)}`, 20, yPosition)
      yPosition += 15
    }

    // Route Details
    checkPageBreak(30)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Detailed Route", 20, yPosition)
    yPosition += 15

    serverData.optimalOrder.forEach((city, index) => {
      checkPageBreak(40)

      // City header
      doc.setFillColor(240, 240, 240)
      doc.rect(15, yPosition - 5, 180, 15, "F")
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text(`${index + 1}. ${city.toUpperCase()}`, 20, yPosition + 5)
      yPosition += 20

      // Distance and duration info
      if (index > 0 && serverData.legs && serverData.legs[index - 1]) {
        const leg = serverData.legs[index - 1]
        const hours = Math.floor(leg.duration / 3600)
        const minutes = Math.floor((leg.duration % 3600) / 60)

        doc.setFontSize(10)
        doc.setFont("helvetica", "italic")
        doc.text(
          `From ${serverData.legs[index - 1].from}: ${leg.distance.toFixed(1)} km, ${hours}h ${minutes}m`,
          25,
          yPosition,
        )
        yPosition += 10
      }

      // Venues for this city
      const cityVenues = serverData.venues[city.toLowerCase()]
      if (cityVenues) {
        doc.setFontSize(12)
        doc.setFont("helvetica", "normal")

        // Attractions
        if (cityVenues.attractions && cityVenues.attractions.length > 0) {
          checkPageBreak(20)
          doc.setFont("helvetica", "bold")
          doc.text("Top Attractions:", 25, yPosition)
          yPosition += 8

          doc.setFont("helvetica", "normal")
          cityVenues.attractions.slice(0, 3).forEach((attraction) => {
            checkPageBreak(15)
            addText(`• ${attraction.name} (${attraction.category}) - Rating: ${attraction.rating}/10`, 30, yPosition, {
              maxWidth: 160,
            })
            yPosition += 12
          })
          yPosition += 5
        }

        // Hotels
        if (cityVenues.hotels && cityVenues.hotels.length > 0) {
          checkPageBreak(20)
          doc.setFont("helvetica", "bold")
          doc.text("Recommended Hotels:", 25, yPosition)
          yPosition += 8

          doc.setFont("helvetica", "normal")
          cityVenues.hotels.slice(0, 2).forEach((hotel) => {
            checkPageBreak(15)
            addText(`• ${hotel.name} - Rating: ${hotel.rating}/10`, 30, yPosition, { maxWidth: 160 })
            yPosition += 12
          })
          yPosition += 5
        }

        // Restaurants
        if (cityVenues.restaurants && cityVenues.restaurants.length > 0) {
          checkPageBreak(20)
          doc.setFont("helvetica", "bold")
          doc.text("Local Cuisine:", 25, yPosition)
          yPosition += 8

          doc.setFont("helvetica", "normal")
          cityVenues.restaurants.slice(0, 2).forEach((restaurant) => {
            checkPageBreak(15)
            addText(`• ${restaurant.name} (${restaurant.category}) - Rating: ${restaurant.rating}/10`, 30, yPosition, {
              maxWidth: 160,
            })
            yPosition += 12
          })
        }
      }

      yPosition += 10
    })

    // Time Breakdown
    checkPageBreak(50)
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("Time Breakdown", 20, yPosition)
    yPosition += 15

    const numDestinations = serverData.optimalOrder.length - 1
    const totalTravelTimeHours = serverData.totalDuration / 3600
    const totalHoursInTrip = journeyDays * 24
    const sleepHours = journeyDays * 8
    const personalHours = journeyDays * 3
    const availableHours = totalHoursInTrip - sleepHours - personalHours - totalTravelTimeHours

    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(`Total Trip Duration: ${journeyDays} days (${totalHoursInTrip} hours)`, 20, yPosition)
    yPosition += 8
    doc.text(`Sleep Time: ${sleepHours} hours (8h/day)`, 20, yPosition)
    yPosition += 8
    doc.text(`Personal Time: ${personalHours} hours (3h/day)`, 20, yPosition)
    yPosition += 8
    doc.text(`Travel Time: ${totalTravelTimeHours.toFixed(1)} hours`, 20, yPosition)
    yPosition += 8

    if (availableHours > 0) {
      const timePerDestination = availableHours / numDestinations
      doc.text(`Available for Exploration: ${availableHours.toFixed(1)} hours`, 20, yPosition)
      yPosition += 8
      doc.text(`Time per Destination: ${timePerDestination.toFixed(1)} hours each`, 20, yPosition)
    } else {
      doc.setTextColor(255, 0, 0)
      doc.text("Warning: Journey may not be feasible with current duration!", 20, yPosition)
      doc.setTextColor(0, 0, 0)
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont("helvetica", "italic")
      doc.text(`Generated by MapMate Travel Planner - Page ${i} of ${pageCount}`, 20, pageHeight - 10)
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 150, pageHeight - 10)
    }

    // Save the PDF
    const fileName = `MapMate_Trip_${sourceCityName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(fileName)

    showNotification("Trip PDF downloaded successfully! 📄", "success")
  } catch (error) {
    console.error("Error generating PDF:", error)
    showNotification("Error generating PDF. Please try again.", "error")
  } finally {
    // Reset button state
    downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download Trip PDF <div class="btn-shine"></div>'
    downloadBtn.disabled = false
  }
}