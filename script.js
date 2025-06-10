document.addEventListener("DOMContentLoaded", () => {
  const widgetContainer = document.getElementById("widgetContainer");
  const addWidgetBtn = document.getElementById("addWidget");
  const fileManagerIcon = document.getElementById("fileManager");
  const clearBackgroundBtn = document.getElementById("clearBackground");
  const backgroundInput = document.getElementById("backgroundInput");
  const documentationLink = document.getElementById("documentationLink");

  const API_KEY = "8b452084f73dfdd0a57fe89ebceef204"; // Replace this with your OpenWeatherMap API key

  //---------------------------
  // INIT: Load saved background and theme palette from localStorage (if they exist)
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
  // FULL BACKGROUND SELECTOR & DYNAMIC PALETTE
  //---------------------------
  // Open file input when clicking the upload icon.
  fileManagerIcon.addEventListener("click", () => {
    backgroundInput.click();
  });

  // When an image is selected, scale it down, set it as the background,
  // update the dynamic theme palette, and save both in localStorage.
  backgroundInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (evt) {
        const originalDataUrl = evt.target.result;
        // Create an image from the data URL.
        const img = new Image();
        img.src = originalDataUrl;
        img.crossOrigin = "Anonymous";
        img.onload = function () {
          // Scale down the image using a canvas.
          const maxWidth = 1920; // Maximum width for the stored image.
          const maxHeight = 1680; // Maximum height for the stored image.
          let width = img.width;
          let height = img.height;
          const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
          width = width * ratio;
          height = height * ratio;
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          // Convert the canvas to a JPEG data URL (70% quality).
          const scaledDataUrl = canvas.toDataURL("image/jpeg", 0.7);
          // Set as full background.
          document.body.style.backgroundImage = `url(${scaledDataUrl})`;
          document.body.style.backgroundSize = "cover";
          document.body.style.backgroundPosition = "center";
          // Save the scaled image in localStorage.
          try {
            localStorage.setItem("backgroundImage", scaledDataUrl);
          } catch (err) {
            console.error("LocalStorage quota exceeded", err);
          }
          // Update and store the dynamic palette using the original image.
          updateThemePaletteFromImage(img);
        };
      };
      reader.readAsDataURL(file);
    }
  });

  // Clear the background image and remove the stored values.
  clearBackgroundBtn.addEventListener("click", () => {
    document.body.style.backgroundImage = "";
    localStorage.removeItem("backgroundImage");
    localStorage.removeItem("themePalette");
  });

  //---------------------------
  // DYNAMIC THEME PALETTE FUNCTIONS
  //---------------------------
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

    // Save the computed palette in localStorage.
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

  // Approximate average color using a 10x10 canvas.
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
    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count)
    };
  }

  function rgbToHex(r, g, b) {
    return (
      "#" +
      ((1 << 24) + (r << 16) + (g << 8) + b)
        .toString(16)
        .slice(1)
    );
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
    return (
      "#" +
      (0x1000000 + R * 0x10000 + G * 0x100 + B)
        .toString(16)
        .slice(1)
    );
  }

  function getContrastYIQ(r, g, b) {
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#000000" : "#ffffff";
  }

  //---------------------------
  // FREE DRAG & DROP FUNCTIONALITY (Absolute Positioning)
  //---------------------------
  function makeWidgetDraggable(widget) {
    const header = widget.querySelector(".widget-drag-handle");
    let offsetX = 0, offsetY = 0, isDragging = false;

    header.addEventListener("mousedown", (e) => {
      e.preventDefault();
      widget.style.zIndex = Date.now();
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
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  // Initialize draggable functionality for all existing widgets.
  document.querySelectorAll(".widget").forEach((widget) => {
    if (!widget.style.left || !widget.style.top) {
      widget.style.left = "20px";
      widget.style.top = "20px";
    }
    makeWidgetDraggable(widget);
    addRemoveListener(widget);
  });

  //---------------------------
  // Add and Remove Widgets
  //---------------------------
  addWidgetBtn.addEventListener("click", () => {
    const type = prompt("Enter widget type (weather, clock, battery):", "weather");
    if (!type) return;
    let widgetHTML = "";
    if (type.toLowerCase() === "weather") {
      const widgetId = `weatherWidget_${Date.now()}`;
      widgetHTML = `
    <div class="widget-header">
      <span class="widget-title"><i class="material-icons widget-icon">wb_sunny</i> Weather</span>
      <span class="material-icons widget-remove">delete</span>
      <span class="material-icons widget-drag-handle">drag_indicator</span>
    </div>
    <div class="widget-content" id="${widgetId}">
      <p>Loading weather...</p>
    </div>`;
    }
    else if (type.toLowerCase() === "clock") {
      widgetHTML = `
        <div class="widget-header">
          <span class="widget-title"><i class="material-icons widget-icon">access_time</i> Clock</span>
          <span class="material-icons widget-remove">delete</span>
          <span class="material-icons widget-drag-handle">drag_indicator</span>
        </div>
        <div class="widget-content">
          <p id="clockTime_${Date.now()}">00:00:00</p>
        </div>`;
    } else if (type.toLowerCase() === "battery") {
      widgetHTML = `
        <div class="widget-header">
          <span class="widget-title"><i class="material-icons widget-icon">battery_full</i> Battery</span>
          <span class="material-icons widget-remove">delete</span>
          <span class="material-icons widget-drag-handle">drag_indicator</span>
        </div>
        <div class="widget-content">
          <p>85%</p>
        </div>`;
    } else {
      alert("Unknown type. Try: weather, clock, or battery.");
      return;
    }
    let newWidget = document.createElement("div");
    newWidget.classList.add("widget");
    newWidget.setAttribute("data-type", type.toLowerCase());
    newWidget.style.left = Math.floor(Math.random() * 200) + "px";
    newWidget.style.top = Math.floor(Math.random() * 200) + "px";
    newWidget.innerHTML = widgetHTML;
    widgetContainer.appendChild(newWidget);
    makeWidgetDraggable(newWidget);
    addRemoveListener(newWidget);

    if (type.toLowerCase() === "weather") {
      const weatherContent = newWidget.querySelector(".widget-content");
      fetchWeather(weatherContent, "Leiden");
    }
  });

  // Attach remove button functionality to a given widget.
  function addRemoveListener(widgetItem) {
    const removeBtn = widgetItem.querySelector(".widget-remove");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        widgetItem.remove();
      });
    }
  }

  //---------------------------
  // CLOCK UPDATES (for any clock widget)
  //---------------------------
  function updateAllClocks() {
    const clocks = document.querySelectorAll("[id^='clockTime_']");
    const now = new Date().toLocaleTimeString();
    clocks.forEach((clock) => {
      clock.textContent = now;
    });
  }
  setInterval(updateAllClocks, 1000);
  updateAllClocks();

  //---------------------------
  // (Optional) WEATHER and BATTERY UPDATES can be added here.
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
        <span style="margin-left:8px;">${temp}°C, ${desc}</span>
      `;
      })
      .catch((err) => {
        console.error("Weather API error:", err);
        widgetElement.innerHTML = `<p>Error loading weather</p>`;
      });
  }

  // Documentation link click handler
  documentationLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.open("/doc/", "_blank");
  }
  );
  //---------------------------
});