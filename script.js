document.addEventListener("DOMContentLoaded", () => {
  const widgetContainer = document.getElementById("widgetContainer");
  const addWidgetBtn = document.getElementById("addWidget");
  const fileManagerIcon = document.getElementById("fileManager");
  const clearBackgroundBtn = document.getElementById("clearBackground");
  const backgroundInput = document.getElementById("backgroundInput");
  const documentationLink = document.getElementById("documentationLink");

  const API_KEY = "8b452084f73dfdd0a57fe89ebceef204";

  //---------------------------
  // INIT: Load saved background and theme palette
  //---------------------------
  const savedBg = localStorage.getItem("backgroundImage");
  if (savedBg) {
    document.body.style.backgroundImage = `url(${savedBg})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
  }

  const savedPalette = localStorage.getItem("themePalette");
  if (savedPalette) {
    try {
      const theme = JSON.parse(savedPalette);
      if (theme.primary && theme.secondary && theme.onPrimary && theme.header) {
        document.documentElement.style.setProperty("--primaryColor", theme.primary);
        document.documentElement.style.setProperty("--secondaryColor", theme.secondary);
        document.documentElement.style.setProperty("--onPrimaryColor", theme.onPrimary);
        document.documentElement.style.setProperty("--headerColor", theme.header);
      }
    } catch (err) {
      console.error("Error parsing themePalette", err);
    }
  }

  //---------------------------
  // BACKGROUND UPLOAD + THEME
  //---------------------------
  fileManagerIcon.addEventListener("click", () => backgroundInput.click());
  backgroundInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (evt) {
        const originalDataUrl = evt.target.result;
        const img = new Image();
        img.src = originalDataUrl;
        img.crossOrigin = "Anonymous";
        img.onload = function () {
          const maxWidth = 1920;
          const maxHeight = 1680;
          let width = img.width;
          let height = img.height;
          const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
          width *= ratio;
          height *= ratio;
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const scaledDataUrl = canvas.toDataURL("image/jpeg", 0.7);
          document.body.style.backgroundImage = `url(${scaledDataUrl})`;
          document.body.style.backgroundSize = "cover";
          document.body.style.backgroundPosition = "center";
          try {
            localStorage.setItem("backgroundImage", scaledDataUrl);
          } catch (err) {
            console.error("LocalStorage quota exceeded", err);
          }
          updateThemePaletteFromImage(img);
        };
      };
      reader.readAsDataURL(file);
    }
  });

  clearBackgroundBtn.addEventListener("click", () => {
    document.body.style.backgroundImage = "";
    localStorage.removeItem("backgroundImage");
    localStorage.removeItem("themePalette");
  });

  function updateThemePaletteFromImage(img) {
    const { r, g, b } = getAverageColor(img);
    const avgHex = rgbToHex(r, g, b);
    const onPrimary = getContrastYIQ(r, g, b);
    const secondaryColor = lightenColor(avgHex, 30);
    const headerColor = lightenColor(avgHex, -20);

    document.documentElement.style.setProperty("--primaryColor", avgHex);
    document.documentElement.style.setProperty("--secondaryColor", secondaryColor);
    document.documentElement.style.setProperty("--onPrimaryColor", onPrimary);
    document.documentElement.style.setProperty("--headerColor", headerColor);

    const themePalette = {
      primary: avgHex,
      secondary: secondaryColor,
      onPrimary: onPrimary,
      header: headerColor
    };
    try {
      localStorage.setItem("themePalette", JSON.stringify(themePalette));
    } catch (err) {
      console.error("Error saving themePalette", err);
    }
  }

  function getAverageColor(img) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const width = (canvas.width = 10);
    const height = (canvas.height = 10);
    ctx.drawImage(img, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    let r = 0, g = 0, b = 0;
    const count = width * height;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
  }

  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function lightenColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt;
    let G = ((num >> 8) & 0x00ff) + amt;
    let B = (num & 0x0000ff) + amt;
    R = R < 255 ? (R < 0 ? 0 : R) : 255;
    G = G < 255 ? (G < 0 ? 0 : G) : 255;
    B = B < 255 ? (B < 0 ? 0 : B) : 255;
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  function getContrastYIQ(r, g, b) {
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#000000" : "#ffffff";
  }

  //---------------------------
  // PERSIST WIDGET STATE
  //---------------------------
  function saveWidgetsToLocalStorage() {
    const widgets = Array.from(document.querySelectorAll(".widget")).map((widget) => {
      return {
        type: widget.getAttribute("data-type"),
        left: widget.style.left,
        top: widget.style.top,
      };
    });
    localStorage.setItem("widgets", JSON.stringify(widgets));
  }

  function loadWidgetsFromLocalStorage() {
    const saved = localStorage.getItem("widgets");
    if (!saved) return;
    try {
      const widgets = JSON.parse(saved);
      widgets.forEach((w) => {
        addWidget(w.type, w.left, w.top);
      });
    } catch (e) {
      console.error("Invalid saved widgets", e);
    }
  }

  //---------------------------
  // DRAG + SAVE POSITION
  //---------------------------
  function makeWidgetDraggable(widget) {
    const header = widget.querySelector(".widget-drag-handle");
    let offsetX = 0, offsetY = 0, isDragging = false;

    header.addEventListener("mousedown", (e) => {
      e.preventDefault();
      isDragging = true;
      const rect = widget.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      function onMouseMove(e) {
        if (!isDragging) return;
        const containerRect = widgetContainer.getBoundingClientRect();
        let posX = e.clientX - containerRect.left - offsetX;
        let posY = e.clientY - containerRect.top - offsetY;
        widget.style.left = posX + "px";
        widget.style.top = posY + "px";
      }

      function onMouseUp() {
        isDragging = false;
        saveWidgetsToLocalStorage();
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  //---------------------------
  // ADD/REMOVE WIDGETS
  //---------------------------
  function addWidget(type, left = "20px", top = "20px") {
    let widgetHTML = "";
    const id = `widget_${Date.now()}`;
    if (type === "weather") {
      widgetHTML = `
        <div class="widget-header">
          <span class="widget-title"><i class="material-icons widget-icon">wb_sunny</i> Weather</span>
          <span class="material-icons widget-remove">delete</span>
          <span class="material-icons widget-drag-handle">drag_indicator</span>
        </div>
        <div class="widget-content" id="${id}">
          <p>Loading weather...</p>
        </div>`;
    } else if (type === "clock") {
      widgetHTML = `
        <div class="widget-header">
          <span class="widget-title"><i class="material-icons widget-icon">access_time</i> Clock</span>
          <span class="material-icons widget-remove">delete</span>
          <span class="material-icons widget-drag-handle">drag_indicator</span>
        </div>
        <div class="widget-content">
          <p id="clockTime_${Date.now()}">00:00:00</p>
        </div>`;
    } else if (type === "battery") {
      widgetHTML = `
        <div class="widget-header">
          <span class="widget-title"><i class="material-icons widget-icon">battery_full</i> Battery</span>
          <span class="material-icons widget-remove">delete</span>
          <span class="material-icons widget-drag-handle">drag_indicator</span>
        </div>
        <div class="widget-content"><p>85%</p></div>`;
    } else {
      alert("Unknown widget type.");
      return;
    }

    const newWidget = document.createElement("div");
    newWidget.classList.add("widget");
    newWidget.setAttribute("data-type", type);
    newWidget.style.left = left;
    newWidget.style.top = top;
    newWidget.innerHTML = widgetHTML;
    widgetContainer.appendChild(newWidget);
    makeWidgetDraggable(newWidget);
    addRemoveListener(newWidget);
    saveWidgetsToLocalStorage();

    if (type === "weather") {
      const weatherContent = newWidget.querySelector(".widget-content");
      fetchWeather(weatherContent, "Leiden");
    }
  }

  addWidgetBtn.addEventListener("click", () => {
    const type = prompt("Enter widget type (weather, clock, battery):", "weather");
    if (!type) return;
    addWidget(type.toLowerCase());
  });

  function addRemoveListener(widgetItem) {
    const removeBtn = widgetItem.querySelector(".widget-remove");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        widgetItem.remove();
        saveWidgetsToLocalStorage();
      });
    }
  }

  //---------------------------
  // CLOCK UPDATES
  //---------------------------
  function updateAllClocks() {
    const clocks = document.querySelectorAll("[id^='clockTime_']");
    const now = new Date().toLocaleTimeString();
    clocks.forEach((clock) => clock.textContent = now);
  }
  setInterval(updateAllClocks, 1000);
  updateAllClocks();

  //---------------------------
  // WEATHER FETCH
  //---------------------------
  function fetchWeather(widgetElement, city = "Leiden") {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!data || data.cod !== 200) {
          widgetElement.innerHTML = `<p>Weather unavailable</p>`;
          return;
        }
        const temp = Math.round(data.main.temp);
        const desc = data.weather[0].description;
        const icon = data.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;
        widgetElement.innerHTML = `
          <img src="${iconUrl}" alt="${desc}" style="width:40px; vertical-align:middle;">
          <span style="margin-left:8px;">${temp}°C, ${desc}</span>`;
      })
      .catch((err) => {
        console.error("Weather API error:", err);
        widgetElement.innerHTML = `<p>Error loading weather</p>`;
      });
  }

  documentationLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.open("doc/", "_blank");
  });

  //---------------------------
  // INIT: LOAD SAVED WIDGETS
  //---------------------------
  loadWidgetsFromLocalStorage();
});