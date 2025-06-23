const WEATHER_API_KEY = '8b452084f73dfdd0a57fe89ebceef204';
// const NEWS_API_KEY = '06555db37dd444df93202010cc65e028';
// const CURRENTS_API_KEY = 'Mk2YCuu-txaH-CuFdWagZSXhsj_OsQHgWpCeVjGMoepEs8p-';
const GNEWS_API_KEY = '974685a556b8b62796ec137952bbb284';

let unit = localStorage.getItem('unit') || 'metric';
let userName = localStorage.getItem('username') || '';
const greetingEl = document.getElementById('greeting');
const hour = new Date().getHours();
const docEl = document.documentElement;

// Greeting Logic
if (!userName) {
  userName = prompt("What's your name?") || 'friend';
  localStorage.setItem('username', userName);
}

let greetingText = '';
if (hour >= 5 && hour < 12) {
  greetingText = `Good morning, ${userName}!`;
  docEl.classList.add('bg-gradient-to-br', 'from-green-900', 'via-amber-700', 'to-lime-800');
} else if (hour >= 12 && hour < 18) {
  greetingText = `Good afternoon, ${userName}!`;
  docEl.classList.add('bg-gradient-to-br', 'from-sky-600', 'via-yellow-400', 'to-orange-500');
} else {
  greetingText = `Evening check-in, ${userName}!`;
  docEl.classList.add('bg-gradient-to-br', 'from-green-900', 'via-amber-800', 'to-gray-900');
}

greetingEl.textContent = greetingText;
setTimeout(() => greetingEl.classList.remove('opacity-0'), 100);

// Last Visit Info
const lastVisitEl = document.getElementById('last-visit');
const lastVisit = localStorage.getItem('lastVisit');
if (lastVisit) {
  const last = new Date(parseInt(lastVisit));
  const diff = Math.floor((Date.now() - last) / (1000 * 60 * 60));
  lastVisitEl.textContent = `Last visit: ${diff < 1 ? 'less than an hour ago' : diff + ' hour(s) ago'}`;
}
lastVisitEl.classList.remove('opacity-0');
localStorage.setItem('lastVisit', Date.now().toString());

// Modal behavior
document.getElementById('modal').classList.remove('hidden');
document.getElementById('modal-greeting').textContent = greetingText;
document.getElementById('startBtn').onclick = () => {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('card-wrapper').classList.remove('opacity-0');
};

// Name change
document.getElementById('changeNameBtn').onclick = () => {
  const newName = prompt("Enter your name:");
  if (newName) {
    localStorage.setItem('username', newName);const CURRENTS_API_KEY = 'Mk2YCuu-txaH-CuFdWagZSXhsj_OsQHgWpCeVjGMoepEs8p-';
    location.reload();
  }
};

// Weather functions
async function fetchWeather(lat, lon) {
  const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${unit}&appid=${WEATHER_API_KEY}`);
  const data = await res.json();
  displayWeather(data);
}

function displayWeather(data) {
  const summary = document.getElementById('weather-summary');
  const forecast = document.getElementById('forecast');
  const first = data.list[0];
  summary.textContent = `${data.city.name}: ${first.weather[0].description}, ${first.main.temp.toFixed(1)}°${unit === 'metric' ? 'C' : 'F'}`;

  forecast.innerHTML = '';
  data.list.slice(0, 6).forEach(item => {
    const hour = new Date(item.dt_txt).getHours();
    const block = document.createElement('div');
    block.className = 'text-center w-16 shrink-0';
    block.innerHTML = `
      <p class="text-xs">${hour}:00</p>
      <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" class="mx-auto" />
      <p class="text-xs">${item.main.temp.toFixed(0)}°</p>
    `;
    forecast.appendChild(block);
  });
}

// Unit toggle
document.getElementById('unit-toggle').onclick = () => {
  unit = unit === 'metric' ? 'imperial' : 'metric';
  localStorage.setItem('unit', unit);
  location.reload();
};

// New fetch function using GNews
async function fetchNews() {
  try {
    const res = await fetch(`https://gnews.io/api/v4/top-headlines?lang=nl&country=nl&max=3&token=${GNEWS_API_KEY}`);
    const data = await res.json();
    if (!data.articles) throw new Error("No articles found.");
    displayNews(data.articles);
  } catch (e) {
    console.error("News fetch failed:", e);
    document.getElementById('news-list').innerHTML = `
      <p class="text-sm text-gray-400">Unable to load news right now.</p>
    `;
  }
}

// Display logic (already mostly good)
function displayNews(articles) {
  const container = document.getElementById('news-list');
  container.innerHTML = '';
  articles.forEach(a => {
    const el = document.createElement('div');
    el.className = 'bg-white/5 p-2 rounded flex gap-2';
    el.innerHTML = `
      <img src="${a.image || 'https://via.placeholder.com/80'}" class="w-16 h-16 object-cover rounded" />
      <div>
        <p class="text-sm font-medium">${a.title}</p>
        <p class="text-xs text-gray-300">${a.source.name}</p>
      </div>
    `;
    container.appendChild(el);
  });
}

// Geolocation + load data
if ('geolocation' in navigator) {
  navigator.geolocation.getCurrentPosition(
    pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
    () => alert("Location permission denied, weather won't load.")
  );
}
fetchNews();