const express = require("express")
const app = express()
const port = 3000
const mysql = require("mysql2")
const axios = require("axios")
const { findOptimalOrder } = require("./routeOptimizer")
app.use(express.json())

const db = mysql.createConnection({
  host: "localhost",
  user: "kuldeep",
  password: "kuldeep30",
  database: "userDB",
})

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err)
    return
  }
  console.log("Connected to MySQL database.")
})

app.use(express.static("public"))
app.use(express.urlencoded({ extended: true }))

app.post("/login", (req, res) => {
  const { email, password } = req.body
  if (!email.toLowerCase().endsWith("@gmail.com")) {
    console.error("Invalid email: Must be a Gmail address")
    return res.json({ success: false, message: "Please use a valid Gmail address" })
  }
  const sql = "SELECT * FROM users WHERE email = ? AND password = ?"
  db.query(sql, [email, password], (err, results) => {
    if (err) {
      console.error("Login error:", err)
      return res.json({ success: false, message: "Internal Server Error" })
    }
    if (results.length > 0) {
      const name = results[0].name
      res.json({ success: true, redirectUrl: `/mapmate.html?name=${encodeURIComponent(name)}` })
    } else {
      res.json({ success: false, message: "Invalid email or password. Please check your credentials and try again." })
    }
  })
})

app.post("/Signup", (req, res) => {
  const { name, email, password, security_question, security_answer } = req.body

  if (!email.toLowerCase().endsWith("@gmail.com")) {
    console.error("Invalid email: Must be a Gmail address")
    return res.send('<h3 style="color:red;">Please use a valid Gmail address</h3><a href="/signup.html">Try again</a>')
  }

  // Check if user already exists
  const checkUserSql = "SELECT * FROM users WHERE email = ?"
  db.query(checkUserSql, [email], (err, results) => {
    if (err) {
      console.error("Error checking user:", err)
      return res.status(500).send("Error checking user")
    }

    if (results.length > 0) {
      return res.send(
        '<h3 style="color:red;">An account with this email already exists</h3><a href="/signup.html">Try again</a>',
      )
    }

    // Check if we have security question columns in the database
    const checkColumnsSql = "SHOW COLUMNS FROM users LIKE 'security_question'"
    db.query(checkColumnsSql, (err, columnResults) => {
      if (err) {
        console.error("Error checking columns:", err)
        return res.status(500).send("Database error")
      }

      let sql, values

      if (columnResults.length > 0) {
        // Security columns exist, use them
        sql = "INSERT INTO users (name, email, password, security_question, security_answer) VALUES (?, ?, ?, ?, ?)"
        values = [name, email, password, security_question || null, security_answer || null]
      } else {
        // Security columns don't exist, use basic insert
        sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)"
        values = [name, email, password]
      }

      db.query(sql, values, (err, result) => {
        if (err) {
          console.error("Error inserting data:", err)
          return res.status(500).send("Error saving data")
        }
        console.log("Data inserted:", result)
        res.redirect("/index.html?message=Account created successfully! Please login with your credentials.")
      })
    })
  })
})

// Get security question endpoint
app.post("/get-security-question", (req, res) => {
  const { email } = req.body
  console.log("=== GET SECURITY QUESTION DEBUG ===")
  console.log("Email received:", email)

  if (!email.toLowerCase().endsWith("@gmail.com")) {
    console.log("Invalid email format")
    return res.json({ success: false, message: "Please use a valid Gmail address" })
  }

  // First check if security columns exist
  const checkColumnsSql = "SHOW COLUMNS FROM users LIKE 'security_question'"
  db.query(checkColumnsSql, (err, columnResults) => {
    if (err) {
      console.error("Database error checking columns:", err)
      return res.json({ success: false, message: "Database error" })
    }

    console.log("Security columns exist:", columnResults.length > 0)

    if (columnResults.length === 0) {
      console.log("Security columns don't exist in database")
      return res.json({ success: false, message: "Password reset feature is not available. Please contact support." })
    }

    const sql = "SELECT email, security_question, security_answer FROM users WHERE email = ?"
    db.query(sql, [email], (err, results) => {
      if (err) {
        console.error("Database error:", err)
        return res.json({ success: false, message: "Database error" })
      }

      console.log("Query results:", results)

      if (results.length === 0) {
        console.log("No user found with email:", email)
        return res.json({ success: false, message: "No account found with this email" })
      }

      const user = results[0]
      console.log("User found:", { email: user.email, hasSecurityQuestion: !!user.security_question })

      if (!user.security_question) {
        console.log("User has no security question set")
        return res.json({
          success: false,
          message: "No security question set for this account. Please contact support.",
        })
      }

      const securityQuestions = {
        pet_name: "What was the name of your first pet?",
        birth_city: "In which city were you born?",
        school_name: "What was the name of your elementary school?",
        mother_maiden: "What is your mother's maiden name?",
        first_car: "What was the make of your first car?",
        favorite_book: "What is your favorite book?",
        childhood_friend: "What was the name of your childhood best friend?",
      }

      const questionKey = user.security_question
      const questionText = securityQuestions[questionKey] || "Security question not found"

      console.log("Returning security question:", questionText)
      console.log("=== END DEBUG ===")

      res.json({
        success: true,
        question: questionText,
        questionKey: questionKey,
      })
    })
  })
})

// Password reset endpoint
app.post("/reset-password", (req, res) => {
  const { email, security_answer, new_password } = req.body
  console.log("=== RESET PASSWORD DEBUG ===")
  console.log("Email:", email)
  console.log("Security answer provided:", security_answer)
  console.log("New password length:", new_password ? new_password.length : 0)

  if (!email.toLowerCase().endsWith("@gmail.com")) {
    console.log("Invalid email format")
    return res.json({ success: false, message: "Please use a valid Gmail address" })
  }

  // First check if security columns exist
  const checkColumnsSql = "SHOW COLUMNS FROM users LIKE 'security_question'"
  db.query(checkColumnsSql, (err, columnResults) => {
    if (err) {
      console.error("Database error checking columns:", err)
      return res.json({ success: false, message: "Database error" })
    }

    if (columnResults.length === 0) {
      console.log("Security columns don't exist")
      return res.json({ success: false, message: "Password reset feature is not available. Please contact support." })
    }

    // Get the user's security question and answer
    const getUserSql = "SELECT * FROM users WHERE email = ?"
    db.query(getUserSql, [email], (err, results) => {
      if (err) {
        console.error("Database error:", err)
        return res.json({ success: false, message: "Database error" })
      }

      if (results.length === 0) {
        console.log("No user found")
        return res.json({ success: false, message: "No account found with this email" })
      }

      const user = results[0]
      console.log("User found, security answer in DB:", user.security_answer)

      if (!user.security_answer) {
        console.log("No security answer in database")
        return res.json({ success: false, message: "No security answer set for this account. Please contact support." })
      }

      // Check if security answer matches (case-insensitive)
      const dbAnswer = user.security_answer.toLowerCase().trim()
      const providedAnswer = security_answer.toLowerCase().trim()
      console.log("Comparing answers:")
      console.log("DB answer:", dbAnswer)
      console.log("Provided answer:", providedAnswer)
      console.log("Match:", dbAnswer === providedAnswer)

      if (dbAnswer !== providedAnswer) {
        console.log("Security answers don't match")
        return res.json({ success: false, message: "Incorrect security answer" })
      }

      // Update password
      const updateSql = "UPDATE users SET password = ? WHERE email = ?"
      db.query(updateSql, [new_password, email], (updateErr, updateResult) => {
        if (updateErr) {
          console.error("Password update error:", updateErr)
          return res.json({ success: false, message: "Failed to update password" })
        }

        console.log("Password updated successfully for:", email)
        console.log("Update result:", updateResult)
        console.log("=== END DEBUG ===")
        res.json({ success: true, message: "Password reset successfully" })
      })
    })
  })
})

app.post("/generate", (req, res) => {
  const { source, days, medium, fuelEconomy, fuelRate } = req.body
  console.log("Form Data Received:")
  console.log("source:", source)
  console.log("days:", days)
  console.log("medium:", medium)
  console.log("fuelEconomy:", fuelEconomy)
  console.log("fuelRate:", fuelRate)

  if (!source || source.trim() === "") {
    console.log("Invalid source: Source city is required")
    return res.redirect("/mapmate.html?error=" + encodeURIComponent("Please enter a source city"))
  }

  // Build the redirect URL with fuel data if private vehicle is selected
  let redirectUrl = `/orgmap.html?source=${encodeURIComponent(source.trim())}&days=${days}&medium=${medium}`

  if (medium === "private" && fuelEconomy && fuelRate) {
    redirectUrl += `&fuelEconomy=${fuelEconomy}&fuelRate=${fuelRate}`
  }

  res.redirect(redirectUrl)
})

async function getCoordinates(cityName, apiKey) {
  const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(cityName)}`
  try {
    const response = await axios.get(url)
    const features = response.data.features
    if (features.length > 0) {
      const [lon, lat] = features[0].geometry.coordinates
      return { lat, lon, cityName }
    } else {
      throw new Error(`Location not found for: ${cityName}`)
    }
  } catch (err) {
    throw new Error(`Geocoding failed for: ${cityName} → ${err.message}`)
  }
}

async function getFoursquareVenues(coordinates, categoryId, apiKey, limit = 5) {
  const url = `https://api.foursquare.com/v3/places/search`
  const params = {
    ll: `${coordinates.lat},${coordinates.lon}`,
    radius: 20000, // Increased to 20km for better coverage
    categories: categoryId,
    limit: limit,
    fields: "name,geocodes,location,categories,rating,website",
  }
  try {
    const response = await axios.get(url, {
      headers: { Authorization: apiKey },
      params,
    })
    return response.data.results.map((venue) => ({
      name: venue.name,
      address: venue.location.formatted_address,
      latitude: venue.geocodes.main.latitude,
      longitude: venue.geocodes.main.longitude,
      category: venue.categories[0]?.name || "Unknown",
      rating: venue.rating || "N/A",
      website: venue.website || "#",
    }))
  } catch (err) {
    console.error(`Foursquare API error for category ${categoryId}:`, err.message)
    return []
  }
}

// Function to filter out unwanted venues
function filterTouristVenues(venues, categoryName) {
  const unwantedKeywords = [
    "school",
    "college",
    "university",
    "institute",
    "academy",
    "campus",
    "hospital",
    "clinic",
    "medical",
    "pharmacy",
    "doctor",
    "office",
    "building",
    "corporate",
    "business center",
    "parking",
    "garage",
    "station",
    "terminal",
    "residential",
    "apartment",
    "housing",
    "society",
    "bank",
    "atm",
    "finance",
    "insurance",
    "government",
    "municipal",
    "administrative",
    "private",
    "personal",
    "individual",
  ]

  return venues.filter((venue) => {
    const venueName = venue.name.toLowerCase()
    const venueAddress = (venue.address || "").toLowerCase()
    const venueCategory = venue.category.toLowerCase()

    // Check if venue name or address contains unwanted keywords
    const hasUnwantedKeywords = unwantedKeywords.some(
      (keyword) => venueName.includes(keyword) || venueAddress.includes(keyword),
    )

    // Additional specific filters for each category
    if (categoryName === "Museums") {
      return !hasUnwantedKeywords && (venueName.includes("museum") || venueCategory.includes("museum"))
    }

    if (categoryName === "Historic Sites") {
      return (
        !hasUnwantedKeywords &&
        (venueName.includes("fort") ||
          venueName.includes("palace") ||
          venueName.includes("heritage") ||
          venueName.includes("historic") ||
          venueCategory.includes("historic"))
      )
    }

    return !hasUnwantedKeywords
  })
}

async function getTouristAttractions(coordinates, apiKey) {
  // Only the categories you specifically want
  const touristCategories = [
    { id: "12060", name: "Zoos", limit: 2 },
    { id: "16016", name: "Lakes", limit: 3 },
    { id: "16018", name: "Mountains", limit: 2 },
    { id: "16025", name: "Scenic Lookouts", limit: 3 },
    { id: "16019", name: "National Parks", limit: 2 },
    { id: "16020", name: "Nature Preserves", limit: 2 },
    { id: "16001", name: "Beaches", limit: 2 },
    { id: "16031", name: "Waterfalls", limit: 2 },
    { id: "16011", name: "Gardens", limit: 2 },
    { id: "10027", name: "Museums", limit: 1 },
    { id: "10032", name: "Historic Sites", limit: 2 },
    { id: "10034", name: "Monuments", limit: 2 },
    { id: "12061", name: "Aquariums", limit: 1 },
    { id: "16000", name: "Landmarks", limit: 2 },
  ]

  const allAttractions = []

  for (const category of touristCategories) {
    try {
      console.log(`Searching for ${category.name}...`)
      const venues = await getFoursquareVenues(coordinates, category.id, apiKey, 10) // Get more to filter from

      if (venues.length > 0) {
        // Filter out unwanted venues
        const filteredVenues = filterTouristVenues(venues, category.name)

        if (filteredVenues.length > 0) {
          // Sort by rating and take the specified limit
          const bestVenues = filteredVenues.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, category.limit)

          allAttractions.push(...bestVenues)
          console.log(`✓ Found ${bestVenues.length} ${category.name}:`)
          bestVenues.forEach((venue) => console.log(`  - ${venue.name} (${venue.rating}))`))
        } else {
          console.log(`✗ No valid ${category.name} found after filtering`)
        }
      } else {
        console.log(`✗ No ${category.name} found in area`)
      }
    } catch (error) {
      console.error(`Error fetching ${category.name}:`, error.message)
    }
  }

  // Remove duplicates based on name and location
  const uniqueAttractions = allAttractions.filter(
    (venue, index, self) => index === self.findIndex((v) => v.name === venue.name && v.latitude === venue.latitude),
  )

  // Sort by rating for final display
  const finalAttractions = uniqueAttractions.sort((a, b) => (b.rating || 0) - (a.rating || 0))

  // Log the final results
  console.log(`\n=== Final Tourist Attractions for ${coordinates.cityName} ===`)
  finalAttractions.forEach((attraction, index) => {
    console.log(`${index + 1}. ${attraction.name} (${attraction.category}) - Rating: ${attraction.rating}`)
  })
  console.log(`Total attractions found: ${finalAttractions.length}`)
  console.log("===========================================\n")

  return finalAttractions
}

app.post("/create-map", async (req, res) => {
  console.log("POST request received at /create-map")
  console.log("Request Body:", req.body)
  const { source, destinations } = req.body

  if (!source || !Array.isArray(destinations)) {
    console.error("Invalid input: source or destinations missing")
    return res.status(400).json({ error: "Source and destinations are required" })
  }

  let allDestinations = []
  const normalizedSource = source.trim().toLowerCase()
  const normalizedDestinations = destinations.map((dest) => dest.trim().toLowerCase())

  if (normalizedSource && !normalizedDestinations.includes(normalizedSource)) {
    allDestinations = [normalizedSource, ...normalizedDestinations]
  } else {
    allDestinations = [...normalizedDestinations]
  }

  if (allDestinations.length < 2) {
    console.error("Invalid input: At least 2 destinations required, received:", allDestinations)
    return res.status(400).json({ error: "At least 2 destinations required" })
  }

  const OPENROUTE_API_KEY = "5b3ce3597851110001cf6248108d057934044b45b721341be468bf98"
  const FOURSQUARE_API_KEY = "fsq36Xji2n+E4rpNRV5GY1TyqYGGDtwwyMu1t9zTBcjbJgE="

  try {
    const coordinateList = []
    const cityCoordinates = []
    for (const city of allDestinations) {
      console.log(`Getting coordinates for: ${city}`)
      const coords = await getCoordinates(city, OPENROUTE_API_KEY)
      console.log(`Coordinates for ${city}:`, coords)
      coordinateList.push([coords.lon, coords.lat])
      cityCoordinates.push(coords)
    }

    console.log("Final Coordinates List:", coordinateList)

    const body = {
      locations: coordinateList,
      metrics: ["distance", "duration"],
      units: "km",
      resolve_locations: false,
    }

    const headers = {
      Authorization: OPENROUTE_API_KEY,
      "Content-Type": "application/json",
    }

    const matrixURL = "https://api.openrouteservice.org/v2/matrix/driving-car"
    const matrixResponse = await axios.post(matrixURL, body, { headers })
    console.log("Received response from OpenRouteService:", matrixResponse.data)

    if (!matrixResponse.data.distances || !matrixResponse.data.durations) {
      console.error("Invalid matrix response:", matrixResponse.data)
      throw new Error("Invalid distance or duration matrix from OpenRouteService")
    }

    const { order, totalDistance, totalDuration } = findOptimalOrder(
      allDestinations,
      matrixResponse.data.distances,
      matrixResponse.data.durations,
    )

    // Fetch Foursquare data for each city
    const venueData = {}
    for (const coords of cityCoordinates) {
      const city = coords.cityName
      console.log(`\n=== Fetching venues for: ${city} ===`)

      // Get filtered tourist attractions
      const attractions = await getTouristAttractions(coords, FOURSQUARE_API_KEY)

      // Get hotels and restaurants (with filtering)
      const allHotels = await getFoursquareVenues(coords, "19014", FOURSQUARE_API_KEY, 10)
      const hotels = filterTouristVenues(allHotels, "Hotels").slice(0, 5)

      const allRestaurants = await getFoursquareVenues(coords, "13000", FOURSQUARE_API_KEY, 10)
      const restaurants = filterTouristVenues(allRestaurants, "Restaurants").slice(0, 5)

      venueData[city.toLowerCase()] = {
        attractions,
        hotels,
        restaurants,
      }

      console.log(
        `${city} Summary: ${attractions.length} attractions, ${hotels.length} hotels, ${restaurants.length} restaurants`,
      )
    }

    // Compute leg distances and durations
    const legs = []
    for (let i = 0; i < order.length - 1; i++) {
      const fromIndex = allDestinations.indexOf(order[i])
      const toIndex = allDestinations.indexOf(order[i + 1])
      const distanceKm = matrixResponse.data.distances[fromIndex][toIndex]
      const durationSec = matrixResponse.data.durations[fromIndex][toIndex]
      legs.push({
        from: order[i],
        to: order[i + 1],
        distance: distanceKm,
        duration: durationSec,
      })
    }

    console.log("\n=== Optimized Travel Route ===")
    console.log(`Route: ${order.join(" -> ")}`)
    console.log("Legs:")
    for (let i = 0; i < order.length - 1; i++) {
      const fromIndex = allDestinations.indexOf(order[i])
      const toIndex = allDestinations.indexOf(order[i + 1])
      const distanceKm = matrixResponse.data.distances[fromIndex][toIndex].toFixed(1)
      const durationSec = matrixResponse.data.durations[fromIndex][toIndex]
      const hours = Math.floor(durationSec / 3600)
      const minutes = Math.floor((durationSec % 3600) / 60)
      console.log(`  ${order[i]} -> ${order[i + 1]}: ${distanceKm} km, ${hours} hours ${minutes} min`)
    }
    console.log(`Total Distance: ${totalDistance.toFixed(1)} km`)
    const totalHours = Math.floor(totalDuration / 3600)
    const totalMinutes = Math.floor((totalDuration % 3600) / 60)
    console.log(`Total Duration: ${totalHours} hours ${totalMinutes} min`)
    console.log("============================\n")

    res.json({
      origin: allDestinations[0],
      destinations: order.slice(1),
      distances: matrixResponse.data.distances[0],
      durations: matrixResponse.data.durations[0],
      optimalOrder: order,
      totalDistance: totalDistance.toFixed(1),
      totalDuration: totalDuration,
      distanceMatrix: matrixResponse.data.distances,
      durationMatrix: matrixResponse.data.durations,
      legs: legs,
      venues: venueData,
    })
  } catch (err) {
    console.error("Error in /create-map:", err.message, err.stack)
    res.status(500).json({ error: err.message })
  }
})

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`)
})
