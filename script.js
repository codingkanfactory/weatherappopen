// ============================================
// AUQI WEATHER APP - JavaScript
// ============================================

// API Configuration
const API_KEY = ""
const BASE_URL = "https://api.openweathermap.org/data/2.5"

// State
let isCelsius = true
let currentWeatherData = null
let forecastData = null

// DOM Elements
const introPage = document.getElementById("introPage")
const mainApp = document.getElementById("mainApp")
const introLocationBtn = document.getElementById("introLocationBtn")
const introSearchInput = document.getElementById("introSearchInput")
const introSearchBtn = document.getElementById("introSearchBtn")
const introError = document.getElementById("introError")
const cityName = document.getElementById("cityName")
const countryName = document.getElementById("countryName")
const searchToggle = document.getElementById("searchToggle")
const searchBar = document.getElementById("searchBar")
const searchInput = document.getElementById("searchInput")
const searchBtn = document.getElementById("searchBtn")
const locationBtn = document.getElementById("locationBtn")
const darkModeToggle = document.getElementById("darkModeToggle")
const unitToggle = document.getElementById("unitToggle")
const loadingSkeleton = document.getElementById("loadingSkeleton")
const weatherContent = document.getElementById("weatherContent")
const errorToast = document.getElementById("errorToast")
const errorText = document.getElementById("errorText")
const closeError = document.getElementById("closeError")

// ============================================
// ============================================
const weatherIconMap = {
  "01d": { icon: "wb_sunny", color: "text-amber-400" }, // clear sky day
  "01n": { icon: "nightlight", color: "text-indigo-400" }, // clear sky night
  "02d": { icon: "partly_cloudy_day", color: "text-amber-400" }, // few clouds day
  "02n": { icon: "nights_stay", color: "text-indigo-400" }, // few clouds night
  "03d": { icon: "cloud", color: "text-gray-400" }, // scattered clouds
  "03n": { icon: "cloud", color: "text-gray-500" },
  "04d": { icon: "filter_drama", color: "text-gray-500" }, // broken clouds
  "04n": { icon: "filter_drama", color: "text-gray-600" },
  "09d": { icon: "grain", color: "text-blue-400" }, // shower rain
  "09n": { icon: "grain", color: "text-blue-500" },
  "10d": { icon: "water_drop", color: "text-blue-500" }, // rain day
  "10n": { icon: "water_drop", color: "text-blue-600" }, // rain night
  "11d": { icon: "thunderstorm", color: "text-yellow-500" }, // thunderstorm
  "11n": { icon: "thunderstorm", color: "text-yellow-600" },
  "13d": { icon: "ac_unit", color: "text-cyan-400" }, // snow
  "13n": { icon: "ac_unit", color: "text-cyan-500" },
  "50d": { icon: "foggy", color: "text-gray-400" }, // mist
  "50n": { icon: "foggy", color: "text-gray-500" },
}

function getWeatherIconHTML(iconCode, size = 80) {
  const iconInfo = weatherIconMap[iconCode] || { icon: "wb_sunny", color: "text-amber-400" }
  return `<span class="material-icons-round ${iconInfo.color}" style="font-size: ${size}px;">${iconInfo.icon}</span>`
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  initDarkMode()
  checkSavedLocation()
  setupEventListeners()
})

// Check for saved location
function checkSavedLocation() {
  const savedCity = localStorage.getItem("lastCity")
  const savedLat = localStorage.getItem("lastLat")
  const savedLon = localStorage.getItem("lastLon")

  if (savedLat && savedLon) {
    showMainApp()
    getWeatherByCoords(Number.parseFloat(savedLat), Number.parseFloat(savedLon))
  }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Intro page
  introLocationBtn.addEventListener("click", requestLocation)
  introSearchBtn.addEventListener("click", () => searchCity(introSearchInput.value))
  introSearchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchCity(introSearchInput.value)
  })

  // Main app header
  searchToggle.addEventListener("click", toggleSearchBar)
  locationBtn.addEventListener("click", requestLocation)
  darkModeToggle.addEventListener("click", toggleDarkMode)

  // Search
  searchBtn.addEventListener("click", () => searchCity(searchInput.value))
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchCity(searchInput.value)
  })

  // Unit toggle
  unitToggle.addEventListener("click", toggleUnit)

  // Error toast
  closeError.addEventListener("click", hideError)
}

// ============================================
// DARK MODE
// ============================================
function initDarkMode() {
  const savedDarkMode = localStorage.getItem("darkMode")
  if (savedDarkMode === "true") {
    document.documentElement.classList.add("dark")
  }
}

function toggleDarkMode() {
  document.documentElement.classList.toggle("dark")
  localStorage.setItem("darkMode", document.documentElement.classList.contains("dark"))
}

// ============================================
// SEARCH & LOCATION
// ============================================
function toggleSearchBar() {
  searchBar.classList.toggle("hidden")
  if (!searchBar.classList.contains("hidden")) {
    searchInput.focus()
  }
}

async function searchCity(query) {
  if (!query.trim()) return

  showLoading()

  try {
    const geoResponse = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${API_KEY}`,
    )
    const geoData = await geoResponse.json()

    if (geoData.length === 0) {
      throw new Error("Kota tidak ditemukan")
    }

    const { lat, lon } = geoData[0]
    showMainApp()
    await getWeatherByCoords(lat, lon)

    // Hide search bar after successful search
    searchBar.classList.add("hidden")
    searchInput.value = ""
  } catch (error) {
    showError(error.message)
    hideLoading()
  }
}

function requestLocation() {
  if (!navigator.geolocation) {
    showError("Geolocation tidak didukung browser Anda")
    return
  }

  showLoading()

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords
      showMainApp()
      await getWeatherByCoords(latitude, longitude)
    },
    (error) => {
      let message = "Gagal mendapatkan lokasi"
      if (error.code === 1) message = "Akses lokasi ditolak"
      if (error.code === 2) message = "Lokasi tidak tersedia"
      if (error.code === 3) message = "Waktu permintaan habis"
      showError(message)
      hideLoading()
    },
    { enableHighAccuracy: true, timeout: 10000 },
  )
}

// ============================================
// WEATHER API
// ============================================
async function getWeatherByCoords(lat, lon) {
  showLoading()

  try {
    // Fetch current weather and forecast in parallel
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=id`),
      fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=id`),
    ])

    if (!currentRes.ok || !forecastRes.ok) {
      throw new Error("Gagal mengambil data cuaca")
    }

    currentWeatherData = await currentRes.json()
    forecastData = await forecastRes.json()

    // Save location
    localStorage.setItem("lastLat", lat)
    localStorage.setItem("lastLon", lon)
    localStorage.setItem("lastCity", currentWeatherData.name)

    // Display data
    displayCurrentWeather(currentWeatherData)
    displayForecast(forecastData)
    displaySunTimes(currentWeatherData)

    // Animate sections
    animateSections()
  } catch (error) {
    showError(error.message)
  } finally {
    hideLoading()
  }
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================
function displayCurrentWeather(data) {
  const temp = isCelsius ? data.main.temp : celsiusToFahrenheit(data.main.temp)
  const feelsLikeTemp = isCelsius ? data.main.feels_like : celsiusToFahrenheit(data.main.feels_like)
  const tempMin = isCelsius ? data.main.temp_min : celsiusToFahrenheit(data.main.temp_min)
  const tempMax = isCelsius ? data.main.temp_max : celsiusToFahrenheit(data.main.temp_max)

  // Location
  cityName.textContent = data.name
  countryName.textContent = data.sys.country

  // Temperature
  document.getElementById("currentTemp").textContent = Math.round(temp)
  unitToggle.textContent = isCelsius ? "°C" : "°F"

  // Description
  document.getElementById("weatherDesc").textContent = data.weather[0].description

  // Feels like & range
  document.getElementById("feelsLike").textContent = `Terasa ${Math.round(feelsLikeTemp)}°`
  document.getElementById("tempRange").textContent = `H:${Math.round(tempMax)}° L:${Math.round(tempMin)}°`

  const iconCode = data.weather[0].icon
  document.getElementById("weatherIcon").innerHTML = getWeatherIconHTML(iconCode, 80)

  // Details grid
  document.getElementById("humidity").textContent = `${data.main.humidity}%`
  document.getElementById("wind").textContent = `${Math.round(data.wind.speed * 3.6)} km/h`
  document.getElementById("pressure").textContent = `${data.main.pressure} hPa`
  document.getElementById("visibility").textContent = `${(data.visibility / 1000).toFixed(1)} km`
  document.getElementById("clouds").textContent = `${data.clouds.all}%`

  // Calculate dew point
  const dewPoint = calculateDewPoint(data.main.temp, data.main.humidity)
  const dewPointDisplay = isCelsius ? dewPoint : celsiusToFahrenheit(dewPoint)
  document.getElementById("dewPoint").textContent = `${Math.round(dewPointDisplay)}°`
}

function displayForecast(data) {
  const dailyContainer = document.getElementById("dailyContainer")

  // Group forecast by day
  const dailyForecasts = {}
  data.list.forEach((item) => {
    const date = new Date(item.dt * 1000).toLocaleDateString("id-ID", { weekday: "short", day: "numeric" })
    if (!dailyForecasts[date]) {
      dailyForecasts[date] = {
        temps: [],
        icons: [],
        descriptions: [],
        pop: [],
      }
    }
    dailyForecasts[date].temps.push(item.main.temp)
    dailyForecasts[date].icons.push(item.weather[0].icon)
    dailyForecasts[date].descriptions.push(item.weather[0].description)
    dailyForecasts[date].pop.push(item.pop || 0)
  })

  // Get next 5 days
  const days = Object.keys(dailyForecasts).slice(0, 5)

  dailyContainer.innerHTML = days
    .map((day, index) => {
      const dayData = dailyForecasts[day]
      const minTemp = Math.round(Math.min(...dayData.temps))
      const maxTemp = Math.round(Math.max(...dayData.temps))
      const avgPop = Math.round((dayData.pop.reduce((a, b) => a + b, 0) / dayData.pop.length) * 100)

      // Get most frequent icon (midday preference)
      const iconIndex = Math.floor(dayData.icons.length / 2)
      const iconCode = dayData.icons[iconIndex] || dayData.icons[0]

      const displayMinTemp = isCelsius ? minTemp : Math.round(celsiusToFahrenheit(minTemp))
      const displayMaxTemp = isCelsius ? maxTemp : Math.round(celsiusToFahrenheit(maxTemp))

      return `
            <div class="flex-shrink-0 w-24 snap-center bg-white/50 dark:bg-gray-800/50 rounded-2xl p-3 text-center hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-300">
                <p class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">${index === 0 ? "Hari ini" : day}</p>
                <div class="flex justify-center mb-2">
                    ${getWeatherIconHTML(iconCode, 36)}
                </div>
                ${
                  avgPop > 20
                    ? `
                    <div class="flex items-center justify-center gap-1 mb-2">
                        <span class="material-icons-round text-blue-400" style="font-size: 14px;">water_drop</span>
                        <span class="text-xs text-blue-500">${avgPop}%</span>
                    </div>
                `
                    : '<div class="h-5 mb-2"></div>'
                }
                <div class="text-sm">
                    <span class="font-bold text-gray-800 dark:text-white">${displayMaxTemp}°</span>
                    <span class="text-gray-400 dark:text-gray-500 mx-1">/</span>
                    <span class="text-gray-500 dark:text-gray-400">${displayMinTemp}°</span>
                </div>
            </div>
        `
    })
    .join("")
}

function displaySunTimes(data) {
  const sunrise = new Date(data.sys.sunrise * 1000)
  const sunset = new Date(data.sys.sunset * 1000)
  const now = new Date()

  // Format times
  document.getElementById("sunrise").textContent = formatTime(sunrise)
  document.getElementById("sunset").textContent = formatTime(sunset)

  // Calculate daylight duration
  const daylightMs = sunset - sunrise
  const hours = Math.floor(daylightMs / (1000 * 60 * 60))
  const minutes = Math.floor((daylightMs % (1000 * 60 * 60)) / (1000 * 60))
  document.getElementById("daylightDuration").textContent = `${hours} jam ${minutes} menit`

  // Animate sun position
  animateSunPosition(sunrise, sunset, now)
}

function animateSunPosition(sunrise, sunset, now) {
  const sunArcProgress = document.getElementById("sunArcProgress")
  const sunIndicator = document.getElementById("sunIndicator")

  // Calculate progress (0 to 1)
  let progress = 0
  if (now >= sunrise && now <= sunset) {
    progress = (now - sunrise) / (sunset - sunrise)
  } else if (now > sunset) {
    progress = 1
  }

  // Arc length (approximate)
  const totalLength = 250
  const dashOffset = totalLength * (1 - progress)

  // Animate arc
  setTimeout(() => {
    sunArcProgress.style.strokeDashoffset = dashOffset
  }, 300)

  // Calculate sun position on arc
  // Quadratic bezier: P = (1-t)²P0 + 2(1-t)tP1 + t²P2
  const t = progress
  const P0 = { x: 10, y: 95 } // Start
  const P1 = { x: 100, y: -10 } // Control point
  const P2 = { x: 190, y: 95 } // End

  const x = Math.pow(1 - t, 2) * P0.x + 2 * (1 - t) * t * P1.x + Math.pow(t, 2) * P2.x
  const y = Math.pow(1 - t, 2) * P0.y + 2 * (1 - t) * t * P1.y + Math.pow(t, 2) * P2.y

  setTimeout(() => {
    sunIndicator.setAttribute("cx", x)
    sunIndicator.setAttribute("cy", Math.max(y, 10)) // Keep above horizon line
  }, 300)
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function celsiusToFahrenheit(celsius) {
  return (celsius * 9) / 5 + 32
}

function calculateDewPoint(temp, humidity) {
  // Magnus formula approximation
  const a = 17.27
  const b = 237.7
  const alpha = (a * temp) / (b + temp) + Math.log(humidity / 100)
  return (b * alpha) / (a - alpha)
}

function formatTime(date) {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
}

function toggleUnit() {
  isCelsius = !isCelsius
  if (currentWeatherData) {
    displayCurrentWeather(currentWeatherData)
  }
  if (forecastData) {
    displayForecast(forecastData)
  }
}

// ============================================
// UI HELPERS
// ============================================
function showMainApp() {
  introPage.classList.add("hidden")
  mainApp.classList.remove("hidden")
}

function showLoading() {
  loadingSkeleton.classList.remove("hidden")
  weatherContent.classList.add("hidden")
}

function hideLoading() {
  loadingSkeleton.classList.add("hidden")
  weatherContent.classList.remove("hidden")
}

function animateSections() {
  const sections = weatherContent.querySelectorAll("section")
  sections.forEach((section, index) => {
    setTimeout(() => {
      section.classList.remove("opacity-0", "translate-y-4")
    }, index * 100)
  })
}

function showError(message) {
  errorText.textContent = message
  errorToast.classList.remove("hidden")
  setTimeout(() => {
    errorToast.classList.remove("translate-y-4", "opacity-0")
  }, 10)

  // Show on intro page if still there
  if (!introPage.classList.contains("hidden")) {
    introError.textContent = message
    introError.classList.remove("hidden")
  }

  // Auto hide after 5 seconds
  setTimeout(hideError, 5000)
}

function hideError() {
  errorToast.classList.add("translate-y-4", "opacity-0")
  setTimeout(() => {
    errorToast.classList.add("hidden")
  }, 300)
  introError.classList.add("hidden")
}
