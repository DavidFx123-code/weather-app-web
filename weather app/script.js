const searchForm = document.getElementById("searchForm");
const locationInput = document.getElementById("locationInput");
const statusMessage = document.getElementById("statusMessage");
const weatherContent = document.getElementById("weatherContent");

const unitsButton = document.getElementById("unitsButton");
const unitsMenu = document.getElementById("unitsMenu");
const unitsDropdown = document.querySelector(".units-dropdown");

let currentCity = "Berlin";
let searchNumber = 0;

/* Open and close the Units menu */
unitsButton.addEventListener("click", (event) => {
  event.stopPropagation();

  unitsMenu.hidden = !unitsMenu.hidden;

  unitsButton.setAttribute("aria-expanded", String(!unitsMenu.hidden));
});

document.addEventListener("click", (event) => {
  if (!unitsDropdown.contains(event.target)) {
    closeUnitsMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeUnitsMenu();
    unitsButton.focus();
  }
});

function closeUnitsMenu() {
  unitsMenu.hidden = true;
  unitsButton.setAttribute("aria-expanded", "false");
}

/* Get selected units */
function getUnits() {
  return {
    temperature: document.querySelector('input[name="temperature"]:checked')
      .value,
    wind: document.querySelector('input[name="wind"]:checked').value,
    precipitation: document.querySelector('input[name="precipitation"]:checked')
      .value,
  };
}

/* Reload weather when units change */
document.querySelectorAll('#unitsMenu input[type="radio"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (currentCity) {
      loadWeather(currentCity);
    }
  });
});

/* Weather code descriptions and icons */
function getWeatherInfo(code, isDay = 1) {
  if (code === 0) {
    return {
      description: "Clear sky",
      icon: isDay ? "☀️" : "🌙",
    };
  }

  if (code === 1) {
    return { description: "Mainly clear", icon: isDay ? "🌤️" : "🌙" };
  }

  if (code === 2) {
    return { description: "Partly cloudy", icon: "⛅" };
  }

  if (code === 3) {
    return { description: "Overcast", icon: "☁️" };
  }

  if ([45, 48].includes(code)) {
    return { description: "Foggy", icon: "🌫️" };
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return { description: "Drizzle", icon: "🌦️" };
  }

  if ([61, 63, 65, 66, 67].includes(code)) {
    return { description: "Rain", icon: "🌧️" };
  }

  if ([71, 73, 75, 77].includes(code)) {
    return { description: "Snow", icon: "❄️" };
  }

  if ([80, 81, 82].includes(code)) {
    return { description: "Rain showers", icon: "🌦️" };
  }

  if ([85, 86].includes(code)) {
    return { description: "Snow showers", icon: "🌨️" };
  }

  if ([95, 96, 99].includes(code)) {
    return { description: "Thunderstorm", icon: "⛈️" };
  }

  return { description: "Unknown conditions", icon: "🌡️" };
}

/* Display helpers */
function formatNumber(value, decimals = 0) {
  return Number.isFinite(value) ? Number(value).toFixed(decimals) : "--";
}

function temperatureText(value) {
  const unit = getUnits().temperature === "fahrenheit" ? "°F" : "°C";
  return `${formatNumber(value)}${unit}`;
}

function windText(value) {
  const unit = getUnits().wind === "mph" ? "mph" : "km/h";
  return `${formatNumber(value)} ${unit}`;
}

function precipitationText(value) {
  const unit = getUnits().precipitation === "inch" ? "in" : "mm";
  return `${formatNumber(value, 1)} ${unit}`;
}

function displayDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/* Search for a city and load its weather */
async function loadWeather(city) {
  const requestNumber = ++searchNumber;

  currentCity = city;
  statusMessage.textContent = `Finding weather for ${city}...`;
  statusMessage.classList.remove("error");
  statusMessage.hidden = false;
  weatherContent.hidden = true;

  try {
    /* Find the city's coordinates */
    const geoURL = new URL("https://geocoding-api.open-meteo.com/v1/search");

    geoURL.search = new URLSearchParams({
      name: city,
      count: "1",
      language: "en",
      format: "json",
    });

    const geoResponse = await fetch(geoURL);

    if (!geoResponse.ok) {
      throw new Error("Unable to search for this city.");
    }

    const geoData = await geoResponse.json();

    if (requestNumber !== searchNumber) return;

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error("City not found. Check the spelling and try again.");
    }

    const place = geoData.results[0];
    const units = getUnits();

    /* Request current conditions and a three-day forecast */
    const weatherURL = new URL("https://api.open-meteo.com/v1/forecast");

    weatherURL.search = new URLSearchParams({
      latitude: place.latitude,
      longitude: place.longitude,
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "is_day",
        "precipitation",
        "weather_code",
        "cloud_cover",
        "wind_speed_10m",
      ].join(","),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "uv_index_max",
      ].join(","),
      temperature_unit: units.temperature,
      wind_speed_unit: units.wind,
      precipitation_unit: units.precipitation,
      timezone: "auto",
      forecast_days: "3",
    });

    const weatherResponse = await fetch(weatherURL);

    if (!weatherResponse.ok) {
      throw new Error("Unable to retrieve weather data.");
    }

    const data = await weatherResponse.json();

    if (requestNumber !== searchNumber) return;

    if (!data.current || !data.daily) {
      throw new Error("Weather information is currently unavailable.");
    }

    renderWeather(place, data);

    statusMessage.hidden = true;
    weatherContent.hidden = false;
  } catch (error) {
    if (requestNumber !== searchNumber) return;

    statusMessage.textContent =
      error.message ||
      "Something went wrong. Please check your internet connection and try again.";

    statusMessage.classList.add("error");
    weatherContent.hidden = true;
  }
}

/* Show current conditions and forecast */
function renderWeather(place, data) {
  const current = data.current;
  const daily = data.daily;

  const country = place.country || "";
  const region = place.admin1 ? `, ${place.admin1}` : "";

  document.getElementById("cityName").textContent =
    `${place.name}${region}${country ? ", " + country : ""}`;

  document.getElementById("currentDate").textContent =
    `Local time: ${current.time.replace("T", " ")}`;

  const currentInfo = getWeatherInfo(current.weather_code, current.is_day);

  document.getElementById("currentTemperature").textContent = temperatureText(
    current.temperature_2m,
  );

  document.getElementById("weatherDescription").textContent =
    currentInfo.description;

  document.getElementById("weatherEmoji").textContent = currentInfo.icon;

  document.getElementById("feelsLike").textContent = temperatureText(
    current.apparent_temperature,
  );

  document.getElementById("humidity").textContent =
    `${formatNumber(current.relative_humidity_2m)}%`;

  document.getElementById("windSpeed").textContent = windText(
    current.wind_speed_10m,
  );

  document.getElementById("precipitation").textContent = precipitationText(
    current.precipitation,
  );

  document.getElementById("cloudCover").textContent =
    `${formatNumber(current.cloud_cover)}%`;

  document.getElementById("uvIndex").textContent = formatNumber(
    daily.uv_index_max[0],
    1,
  );

  renderForecast(daily);
}

/* Render the three forecast cards */
function renderForecast(daily) {
  const forecastGrid = document.getElementById("forecastGrid");
  forecastGrid.replaceChildren();

  daily.time.forEach((date, index) => {
    const info = getWeatherInfo(daily.weather_code[index]);
    const card = document.createElement("article");

    card.className = "forecast-card";

    const heading = document.createElement("h3");
    heading.textContent = index === 0 ? "Today" : displayDate(date);

    const icon = document.createElement("span");
    icon.className = "forecast-emoji";
    icon.textContent = info.icon;
    icon.setAttribute("aria-hidden", "true");

    const description = document.createElement("p");
    description.className = "forecast-description";
    description.textContent = info.description;

    const temperatures = document.createElement("p");
    temperatures.className = "forecast-temperatures";

    const high = document.createElement("strong");
    high.textContent = temperatureText(daily.temperature_2m_max[index]);

    const low = document.createElement("span");
    low.textContent = temperatureText(daily.temperature_2m_min[index]);

    temperatures.append(high, low);
    card.append(heading, icon, description, temperatures);
    forecastGrid.appendChild(card);
  });
}

/* Submit a city search */
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const city = locationInput.value.trim();

  if (!city) {
    locationInput.focus();
    return;
  }

  loadWeather(city);
});

/* Load Berlin, Germany when the page opens */
loadWeather("Berlin");
