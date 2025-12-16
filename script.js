// ============================================
// AUQI WEATHER APP - JavaScript
// Using Nominatim OSM & Open-Meteo API
// ============================================

// State
let isCelsius = true
let currentWeatherData = null
const forecastData = null
let currentLat = null
let currentLon = null
let searchTimeout = null

// DOM Elements
const introPage = document.getElementById("introPage")
const mainApp = document.getElementById("mainApp")
const bottomNav = document.getElementById("bottomNav")
const introStatusText = document.getElementById("introStatusText")
const introSpinner = document.getElementById("introSpinner")
const introError = document.getElementById("introError")
const searchLocationPage = document.getElementById("searchLocationPage")
const locationSearchInput = document.getElementById("locationSearchInput")
const searchResults = document.getElementById("searchResults")
const searchPlaceholder = document.getElementById("searchPlaceholder")
const useMyLocationBtn = document.getElementById("useMyLocationBtn")
const closeSearchPage = document.getElementById("closeSearchPage")
const cityName = document.getElementById("cityName")
const countryName = document.getElementById("countryName")
const navLocationBtn = document.getElementById("navLocationBtn")
const navThemeBtn = document.getElementById("navThemeBtn")
const unitToggle = document.getElementById("unitToggle")
const loadingSkeleton = document.getElementById("loadingSkeleton")
const weatherContent = document.getElementById("weatherContent")
const errorToast = document.getElementById("errorToast")
const errorText = document.getElementById("errorText")
const closeError = document.getElementById("closeError")

// Weather code to icon mapping for Open-Meteo
const weatherCodeMap = {
  0: { icon: "wb_sunny", color: "text-amber-400", desc: "Cerah" },
  1: { icon: "wb_sunny", color: "text-amber-400", desc: "Sebagian Cerah" },
  2: { icon: "partly_cloudy_day", color: "text-amber-400", desc: "Berawan Sebagian" },
  3: { icon: "cloud", color: "text-gray-400", desc: "Berawan" },
  45: { icon: "foggy", color: "text-gray-400", desc: "Berkabut" },
  48: { icon: "foggy", color: "text-gray-400", desc: "Kabut Beku" },
  51: { icon: "grain", color: "text-blue-400", desc: "Gerimis Ringan" },
  53: { icon: "grain", color: "text-blue-400", desc: "Gerimis" },
  55: { icon: "grain", color: "text-blue-500", desc: "Gerimis Lebat" },
  56: { icon: "ac_unit", color: "text-cyan-400", desc: "Gerimis Beku" },
  57: { icon: "ac_unit", color: "text-cyan-500", desc: "Gerimis Beku Lebat" },
  61: { icon: "water_drop", color: "text-blue-400", desc: "Hujan Ringan" },
  63: { icon: "water_drop", color: "text-blue-500", desc: "Hujan" },
  65: { icon: "water_drop", color: "text-blue-600", desc: "Hujan Lebat" },
  66: { icon: "ac_unit", color: "text-cyan-400", desc: "Hujan Beku" },
  67: { icon: "ac_unit", color: "text-cyan-500", desc: "Hujan Beku Lebat" },
  71: { icon: "ac_unit", color: "text-cyan-300", desc: "Salju Ringan" },
  73: { icon: "ac_unit", color: "text-cyan-400", desc: "Salju" },
  75: { icon: "ac_unit", color: "text-cyan-500", desc: "Salju Lebat" },
  77: { icon: "ac_unit", color: "text-white", desc: "Butiran Salju" },
  80: { icon: "water_drop", color: "text-blue-400", desc: "Hujan Ringan" },
  81: { icon: "water_drop", color: "text-blue-500", desc: "Hujan Sedang" },
  82: { icon: "water_drop", color: "text-blue-600", desc: "Hujan Lebat" },
  85: { icon: "ac_unit", color: "text-cyan-400", desc: "Hujan Salju" },
  86: { icon: "ac_unit", color: "text-cyan-500", desc: "Hujan Salju Lebat" },
  95: { icon: "thunderstorm", color: "text-yellow-500", desc: "Badai Petir" },
  96: { icon: "thunderstorm", color: "text-yellow-500", desc: "Badai Petir + Hujan Es" },
  99: { icon: "thunderstorm", color: "text-yellow-600", desc: "Badai Petir Hebat" },
}

function getWeatherInfo(code, isNight = false) {
  const info = weatherCodeMap[code] || { icon: "wb_sunny", color: "text-amber-400", desc: "Cerah" }

  // Adjust icon for night
  if (isNight && code <= 2) {
    return {
      ...info,
      icon: code === 0 ? "nightlight" : "nights_stay",
      color: "text-indigo-400",
    }
  }
  return info
}

function getWeatherIconHTML(code, size = 80, isNight = false) {
  const info = getWeatherInfo(code, isNight)
  return `<span class="material-icons-round ${info.color}" style="font-size: ${size}px;">${info.icon}</span>`
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  initDarkMode()
  setupEventListeners()
  // Auto-detect location on load
  autoDetectLocation()
})

function autoDetectLocation() {
  introStatusText.textContent = "Mencari lokasi Anda..."

  if (!navigator.geolocation) {
    introStatusText.textContent = "Geolocation tidak didukung"
    introSpinner.classList.add("hidden")
    checkSavedLocation()
    return
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords
      introStatusText.textContent = "Mengambil data cuaca..."

      try {
        // Get location name from coordinates using Nominatim
        const locationName = await reverseGeocode(latitude, longitude)
        showMainApp()
        await getWeatherByCoords(latitude, longitude, locationName)
      } catch (error) {
        showIntroError(error.message)
        checkSavedLocation()
      }
    },
    (error) => {
      let message = "Gagal mendapatkan lokasi"
      if (error.code === 1) message = "Akses lokasi ditolak"
      if (error.code === 2) message = "Lokasi tidak tersedia"
      if (error.code === 3) message = "Waktu permintaan habis"

      introStatusText.textContent = message
      introSpinner.classList.add("hidden")
      checkSavedLocation()
    },
    { enableHighAccuracy: true, timeout: 10000 },
  )
}

function checkSavedLocation() {
  const savedLat = localStorage.getItem("lastLat")
  const savedLon = localStorage.getItem("lastLon")
  const savedCity = localStorage.getItem("lastCity")
  const savedCountry = localStorage.getItem("lastCountry")

  if (savedLat && savedLon) {
    setTimeout(() => {
      showMainApp()
      getWeatherByCoords(Number.parseFloat(savedLat), Number.parseFloat(savedLon), {
        city: savedCity,
        country: savedCountry,
      })
    }, 1000)
  } else {
    introStatusText.textContent = "Ketuk tombol lokasi di bawah untuk memulai"
    introSpinner.classList.add("hidden")
    setTimeout(() => {
      showMainApp()
    }, 2000)
  }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Bottom nav
  navLocationBtn.addEventListener("click", openSearchLocationPage)
  navThemeBtn.addEventListener("click", toggleDarkMode)

  // Search location page
  closeSearchPage.addEventListener("click", closeSearchLocationPage)
  useMyLocationBtn.addEventListener("click", () => {
    closeSearchLocationPage()
    requestLocation()
  })

  // Search input with debounce
  locationSearchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      searchLocations(e.target.value)
    }, 500)
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
// SEARCH LOCATION PAGE
// ============================================
function openSearchLocationPage() {
  searchLocationPage.classList.remove("hidden")
  setTimeout(() => {
    searchLocationPage.classList.remove("opacity-0")
    locationSearchInput.focus()
  }, 10)
}

function closeSearchLocationPage() {
  searchLocationPage.classList.add("opacity-0")
  setTimeout(() => {
    searchLocationPage.classList.add("hidden")
    locationSearchInput.value = ""
    searchResults.innerHTML =
      '<p id="searchPlaceholder" class="text-center text-gray-400 dark:text-gray-500 py-8">Ketik nama lokasi untuk mencari</p>'
  }, 300)
}

// ============================================
// NOMINATIM GEOCODING
// ============================================
async function searchLocations(query) {
  if (!query.trim()) {
    searchResults.innerHTML =
      '<p class="text-center text-gray-400 dark:text-gray-500 py-8">Ketik nama lokasi untuk mencari</p>'
    return
  }

  searchResults.innerHTML = `
    <div class="flex justify-center py-8">
      <div class="w-6 h-6 border-2 border-teal-200 dark:border-teal-800 border-t-teal-600 dark:border-t-teal-400 rounded-full animate-spin"></div>
    </div>
  `

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "id",
        },
      },
    )
    const data = await response.json()

    if (data.length === 0) {
      searchResults.innerHTML =
        '<p class="text-center text-gray-400 dark:text-gray-500 py-8">Tidak ada hasil ditemukan</p>'
      return
    }

    searchResults.innerHTML = data
      .map((location) => {
        const city =
          location.address.city ||
          location.address.town ||
          location.address.village ||
          location.address.county ||
          location.name
        const state = location.address.state || ""
        const country = location.address.country || ""

        return `
        <button 
          onclick="selectLocation(${location.lat}, ${location.lon}, '${city.replace(/'/g, "\\'")}', '${country.replace(/'/g, "\\'")}')"
          class="w-full text-left p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors flex items-start gap-3"
        >
          <span class="material-icons-round text-teal-500 mt-0.5" style="font-size: 20px;">location_on</span>
          <div>
            <p class="font-semibold text-gray-800 dark:text-white">${city}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">${[state, country].filter(Boolean).join(", ")}</p>
          </div>
        </button>
      `
      })
      .join("")
  } catch (error) {
    searchResults.innerHTML = '<p class="text-center text-red-500 py-8">Gagal mencari lokasi</p>'
  }
}

async function reverseGeocode(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "id",
        },
      },
    )
    const data = await response.json()

    const city =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.county ||
      data.address.state ||
      "Lokasi"
    const country = data.address.country || ""

    return { city, country }
  } catch (error) {
    return { city: "Lokasi Anda", country: "" }
  }
}

// Called from search result buttons
window.selectLocation = async (lat, lon, city, country) => {
  closeSearchLocationPage()
  showLoading()
  await getWeatherByCoords(lat, lon, { city, country })
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
      try {
        const locationName = await reverseGeocode(latitude, longitude)
        await getWeatherByCoords(latitude, longitude, locationName)
      } catch (error) {
        showError(error.message)
        hideLoading()
      }
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
// OPEN-METEO WEATHER API
// ============================================
async function getWeatherByCoords(lat, lon, locationName = null) {
  showLoading()
  currentLat = lat
  currentLon = lon

  try {
    // Fetch weather data from Open-Meteo
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,cloud_cover,pressure_msl,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&hourly=dew_point_2m&timezone=auto&forecast_days=7`,
    )

    if (!response.ok) {
      throw new Error("Gagal mengambil data cuaca")
    }

    const data = await response.json()
    currentWeatherData = data

    // Get location name if not provided
    if (!locationName) {
      locationName = await reverseGeocode(lat, lon)
    }

    // Save location
    localStorage.setItem("lastLat", lat)
    localStorage.setItem("lastLon", lon)
    localStorage.setItem("lastCity", locationName.city)
    localStorage.setItem("lastCountry", locationName.country)

    // Display data
    displayCurrentWeather(data, locationName)
    displayForecast(data)
    displaySunTimes(data)

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
function displayCurrentWeather(data, locationName) {
  const current = data.current
  const daily = data.daily
  const hourly = data.hourly

  const temp = isCelsius ? current.temperature_2m : celsiusToFahrenheit(current.temperature_2m)
  const feelsLikeTemp = isCelsius ? current.apparent_temperature : celsiusToFahrenheit(current.apparent_temperature)
  const tempMin = isCelsius ? daily.temperature_2m_min[0] : celsiusToFahrenheit(daily.temperature_2m_min[0])
  const tempMax = isCelsius ? daily.temperature_2m_max[0] : celsiusToFahrenheit(daily.temperature_2m_max[0])

  // Location
  cityName.textContent = locationName.city
  countryName.textContent = locationName.country

  // Temperature
  document.getElementById("currentTemp").textContent = Math.round(temp)
  unitToggle.textContent = isCelsius ? "°C" : "°F"

  // Weather description
  const weatherInfo = getWeatherInfo(current.weather_code, !current.is_day)
  document.getElementById("weatherDesc").textContent = weatherInfo.desc

  // Feels like & range
  document.getElementById("feelsLike").textContent = `Terasa ${Math.round(feelsLikeTemp)}°`
  document.getElementById("tempRange").textContent = `H:${Math.round(tempMax)}° L:${Math.round(tempMin)}°`

  // Weather icon
  document.getElementById("weatherIcon").innerHTML = getWeatherIconHTML(current.weather_code, 80, !current.is_day)

  // Details grid
  document.getElementById("humidity").textContent = `${current.relative_humidity_2m}%`
  document.getElementById("wind").textContent = `${Math.round(current.wind_speed_10m)} km/h`
  document.getElementById("pressure").textContent = `${Math.round(current.pressure_msl)} hPa`
  document.getElementById("uvIndex").textContent = Math.round(daily.uv_index_max[0])
  document.getElementById("clouds").textContent = `${current.cloud_cover}%`

  // Dew point (get current hour's value)
  const currentHour = new Date().getHours()
  const dewPoint = hourly.dew_point_2m[currentHour]
  const dewPointDisplay = isCelsius ? dewPoint : celsiusToFahrenheit(dewPoint)
  document.getElementById("dewPoint").textContent = `${Math.round(dewPointDisplay)}°`
}

function displayForecast(data) {
  const dailyContainer = document.getElementById("dailyContainer")
  const daily = data.daily

  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

  dailyContainer.innerHTML = daily.time
    .map((date, index) => {
      const d = new Date(date)
      const dayName = index === 0 ? "Hari ini" : days[d.getDay()]
      const dayNum = d.getDate()

      const minTemp = isCelsius ? daily.temperature_2m_min[index] : celsiusToFahrenheit(daily.temperature_2m_min[index])
      const maxTemp = isCelsius ? daily.temperature_2m_max[index] : celsiusToFahrenheit(daily.temperature_2m_max[index])
      const pop = daily.precipitation_probability_max[index] || 0
      const weatherCode = daily.weather_code[index]

      return `
      <div class="flex-shrink-0 w-24 snap-center bg-white/50 dark:bg-gray-800/50 rounded-2xl p-3 text-center hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-300 ${index === 0 ? "ring-2 ring-teal-400" : ""}">
        <p class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">${dayName}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">${dayNum}</p>
        <div class="flex justify-center mb-2">
          ${getWeatherIconHTML(weatherCode, 36)}
        </div>
        ${
          pop > 20
            ? `
          <div class="flex items-center justify-center gap-1 mb-2">
            <span class="material-icons-round text-blue-400" style="font-size: 14px;">water_drop</span>
            <span class="text-xs text-blue-500">${pop}%</span>
          </div>
        `
            : '<div class="h-5 mb-2"></div>'
        }
        <div class="text-sm">
          <span class="font-bold text-gray-800 dark:text-white">${Math.round(maxTemp)}°</span>
          <span class="text-gray-400 dark:text-gray-500 mx-1">/</span>
          <span class="text-gray-500 dark:text-gray-400">${Math.round(minTemp)}°</span>
        </div>
      </div>
    `
    })
    .join("")
}

function displaySunTimes(data) {
  const daily = data.daily
  const sunrise = new Date(daily.sunrise[0])
  const sunset = new Date(daily.sunset[0])
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

  let progress = 0
  if (now >= sunrise && now <= sunset) {
    progress = (now - sunrise) / (sunset - sunrise)
  } else if (now > sunset) {
    progress = 1
  }

  const totalLength = 250
  const dashOffset = totalLength * (1 - progress)

  setTimeout(() => {
    sunArcProgress.style.strokeDashoffset = dashOffset
  }, 300)

  // Quadratic bezier calculation
  const t = progress
  const P0 = { x: 10, y: 95 }
  const P1 = { x: 100, y: -10 }
  const P2 = { x: 190, y: 95 }

  const x = Math.pow(1 - t, 2) * P0.x + 2 * (1 - t) * t * P1.x + Math.pow(t, 2) * P2.x
  const y = Math.pow(1 - t, 2) * P0.y + 2 * (1 - t) * t * P1.y + Math.pow(t, 2) * P2.y

  setTimeout(() => {
    sunIndicator.setAttribute("cx", x)
    sunIndicator.setAttribute("cy", Math.max(y, 10))
  }, 300)
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function celsiusToFahrenheit(celsius) {
  return (celsius * 9) / 5 + 32
}

function formatTime(date) {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
}

function toggleUnit() {
  isCelsius = !isCelsius
  if (currentWeatherData && currentLat && currentLon) {
    const locationName = {
      city: cityName.textContent,
      country: countryName.textContent,
    }
    displayCurrentWeather(currentWeatherData, locationName)
    displayForecast(currentWeatherData)
  }
}

// ============================================
// UI HELPERS
// ============================================
function showMainApp() {
  introPage.classList.add("opacity-0")
  setTimeout(() => {
    introPage.classList.add("hidden")
  }, 500)
  mainApp.classList.remove("hidden")
  bottomNav.classList.remove("hidden")
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

function showIntroError(message) {
  introStatusText.textContent = message
  introSpinner.classList.add("hidden")
  introError.textContent = message
  introError.classList.remove("hidden")
}

function showError(message) {
  errorText.textContent = message
  errorToast.classList.remove("hidden")
  setTimeout(() => {
    errorToast.classList.remove("translate-y-4", "opacity-0")
  }, 10)

  setTimeout(hideError, 5000)
}

function hideError() {
  errorToast.classList.add("translate-y-4", "opacity-0")
  setTimeout(() => {
    errorToast.classList.add("hidden")
  }, 300)
}
