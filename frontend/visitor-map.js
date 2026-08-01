/**
 * Visitor Map — plug-and-play frontend (map + browser geolocation)
 *
 * VisitorMap.mount({
 *   workerUrl: 'https://YOUR_WORKER.workers.dev',
 *   container: '#visitor-map',
 *   geolocate: true,
 *   geolocateDelay: 4000,
 *   geolocateButton: true,
 * })
 */
(function (global) {
  "use strict";

  var LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  var LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  var DEFAULT_TILE = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

  var KNOWN_CITIES = [
    { name: "Beijing", lat: 39.9042, lng: 116.4074 },
    { name: "Shanghai", lat: 31.2304, lng: 121.4737 },
    { name: "Guangzhou", lat: 23.1291, lng: 113.2644 },
    { name: "Shenzhen", lat: 22.5431, lng: 114.0579 },
    { name: "Hangzhou", lat: 30.2741, lng: 120.1551 },
    { name: "Ningbo", lat: 29.8683, lng: 121.544 },
    { name: "Nanjing", lat: 32.0603, lng: 118.7969 },
    { name: "Suzhou", lat: 31.2989, lng: 120.5853 },
    { name: "Wuxi", lat: 31.4912, lng: 120.3119 },
    { name: "Xi'an", lat: 34.3416, lng: 108.9398 },
    { name: "Chengdu", lat: 30.5728, lng: 104.0668 },
    { name: "Chongqing", lat: 29.4316, lng: 106.9123 },
    { name: "Wuhan", lat: 30.5928, lng: 114.3055 },
    { name: "Changsha", lat: 28.2282, lng: 112.9388 },
    { name: "Zhengzhou", lat: 34.7466, lng: 113.6253 },
    { name: "Tianjin", lat: 39.3434, lng: 117.3616 },
    { name: "Qingdao", lat: 36.0671, lng: 120.3826 },
    { name: "Hefei", lat: 31.8206, lng: 117.2272 },
    { name: "Fuzhou", lat: 26.0745, lng: 119.2965 },
    { name: "Xiamen", lat: 24.4798, lng: 118.0894 },
    { name: "Taiyuan", lat: 37.8706, lng: 112.5489 },
    { name: "Hong Kong", lat: 22.3193, lng: 114.1694 },
    { name: "Macau", lat: 22.1987, lng: 113.5439 },
    { name: "Taipei", lat: 25.033, lng: 121.5654 },
    { name: "Tokyo", lat: 35.6895, lng: 139.6917 },
    { name: "Singapore", lat: 1.3521, lng: 103.8198 },
    { name: "Seoul", lat: 37.5665, lng: 126.978 },
    { name: "London", lat: 51.5074, lng: -0.1278 },
    { name: "New York", lat: 40.7128, lng: -74.006 },
    { name: "San Francisco", lat: 37.7749, lng: -122.4194 }
  ];

  function loadCss(href, id) {
    if (id && document.getElementById(id)) return;
    var link = document.createElement("link");
    if (id) link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (global.L) { resolve(); return; }
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("Failed to load Leaflet")); };
      document.head.appendChild(s);
    });
  }

  function isBadCityName(name) {
    if (!name) return true;
    var s = String(name).trim();
    if (!s || s === "Unknown") return true;
    if (/\uFFFD/.test(s)) return true;
    var ok = (s.match(/[A-Za-z\u4e00-\u9fff]/g) || []).join("");
    return ok.length < 2 || ok.length / s.length < 0.5;
  }

  function cityNameScore(name) {
    if (isBadCityName(name)) return -1000;
    var s = String(name).trim();
    var score = /^[A-Za-z]/.test(s) ? 10 : 0;
    for (var i = 0; i < KNOWN_CITIES.length; i++) {
      if (KNOWN_CITIES[i].name.toLowerCase() === s.toLowerCase()) score += 100;
    }
    return score;
  }

  function resolveCityName(name, lat, lng) {
    var bestKnown = null, bestD = 0.45;
    for (var i = 0; i < KNOWN_CITIES.length; i++) {
      var k = KNOWN_CITIES[i];
      var d = Math.abs(k.lat - lat) + Math.abs(k.lng - lng);
      if (d < bestD) { bestD = d; bestKnown = k.name; }
    }
    if (isBadCityName(name)) return bestKnown || "Unknown";
    if (bestKnown && bestD < 0.25) return bestKnown;
    return name;
  }

  function cityFromCoords(lat, lng) {
    var best = null, bestD = 0.5;
    for (var i = 0; i < KNOWN_CITIES.length; i++) {
      var k = KNOWN_CITIES[i];
      var d = Math.abs(k.lat - lat) + Math.abs(k.lng - lng);
      if (d < bestD) { bestD = d; best = k.name; }
    }
    return best || "Unknown";
  }

  function groupCities(cities) {
    var groups = {};
    (cities || []).forEach(function (c) {
      var lat = Number(c.lat), lng = Number(c.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      var key = Math.round(lat * 5) / 5 + "," + Math.round(lng * 5) / 5;
      var city = resolveCityName((c.city || "").toString().trim() || "Unknown", lat, lng);
      var country = (c.country || c.countryCode || "").toString();
      if (!groups[key]) {
        groups[key] = { city: city, country: country, sumLat: lat, sumLng: lng, count: 1 };
      } else {
        var g = groups[key];
        g.count += 1; g.sumLat += lat; g.sumLng += lng;
        if (cityNameScore(city) > cityNameScore(g.city)) {
          g.city = city;
          if (country) g.country = country;
        }
      }
    });
    return groups;
  }

  function renderMarkers(map, layer, cities, options) {
    layer.clearLayers();
    var groups = groupCities(cities);
    var bounds = [];
    var color = (options && options.markerColor) || "#ff6b2c";
    Object.keys(groups).forEach(function (key) {
      var g = groups[key];
      var lat = g.sumLat / g.count, lng = g.sumLng / g.count;
      var name = resolveCityName(g.city, lat, lng);
      var radius = Math.min(18, 5 + Math.sqrt(g.count) * 3.2);
      var label = name + (g.country ? ", " + g.country : "") + " · " + g.count + (g.count > 1 ? " visits" : " visit");
      layer.addLayer(L.circleMarker([lat, lng], {
        radius: radius, color: color, weight: 1.5, fillColor: color, fillOpacity: 0.75
      }).bindPopup(label));
      bounds.push([lat, lng]);
    });
    if (bounds.length) {
      try { map.fitBounds(bounds, { padding: [30, 30], maxZoom: (options && options.maxZoom) || 5 }); } catch (e) {}
    }
  }

  function resolveEl(container) {
    if (!container) return null;
    if (typeof container === "string") return document.querySelector(container);
    if (container && container.nodeType === 1) return container;
    return null;
  }

  function ensureButtonStyles() {
    if (document.getElementById("visitor-map-geo-style")) return;
    var style = document.createElement("style");
    style.id = "visitor-map-geo-style";
    style.textContent =
      ".visitor-map-wrap{position:relative;width:100%;height:100%;}" +
      ".visitor-map-geo-btn{position:absolute;z-index:1000;right:10px;bottom:10px;" +
      "border:1px solid rgba(255,255,255,.2);background:rgba(12,12,16,.88);" +
      "color:#fff;font-size:12px;padding:8px 12px;border-radius:999px;cursor:pointer;" +
      "backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}" +
      ".visitor-map-geo-btn:hover{border-color:rgba(255,80,80,.55);}" +
      ".visitor-map-geo-btn:disabled{opacity:.55;cursor:default;}";
    document.head.appendChild(style);
  }

  function requestBrowserGeo(options) {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        },
        function (err) { reject(err); },
        {
          enableHighAccuracy: false,
          timeout: (options && options.timeout) || 12000,
          maximumAge: (options && options.maximumAge) || 60000
        }
      );
    });
  }

  function mount(options) {
    options = options || {};
    var workerUrl = (options.workerUrl || "").replace(/\/$/, "");
    var el = resolveEl(options.container);
    if (!workerUrl) return Promise.reject(new Error("VisitorMap: workerUrl is required"));
    if (!el) return Promise.reject(new Error("VisitorMap: container not found"));

    ensureButtonStyles();
    el.classList.add("visitor-map-wrap");
    if (options.height) {
      el.style.height = typeof options.height === "number" ? options.height + "px" : String(options.height);
    }
    if (!el.style.height) el.style.height = "360px";
    el.style.width = el.style.width || "100%";
    el.style.position = el.style.position || "relative";

    var report = options.report !== false;
    var loadLeaflet = options.loadLeaflet !== false;
    var useGeo = options.geolocate !== false;
    var geoDelay = typeof options.geolocateDelay === "number" ? options.geolocateDelay : 4000;
    var showBtn = options.geolocateButton !== false;
    var meColor = options.meMarkerColor || "#ff3b30";
    var geoOnceKey = "visitorMapGeoAsked";

    var chain = Promise.resolve();
    if (loadLeaflet) {
      loadCss(LEAFLET_CSS, "visitor-map-leaflet-css");
      chain = loadScript(LEAFLET_JS);
    }

    return chain.then(function () {
      if (!global.L) throw new Error("VisitorMap: Leaflet (window.L) is not available");

      var map = L.map(el, { zoomControl: true, attributionControl: true, worldCopyJump: true }).setView([20, 10], 2);
      L.tileLayer(options.tileUrl || DEFAULT_TILE, {
        attribution: "&copy; OpenStreetMap &copy; CARTO", subdomains: "abcd", maxZoom: 18
      }).addTo(map);

      var layer = L.layerGroup().addTo(map);
      var meLayer = L.layerGroup().addTo(map);
      var geoInFlight = false;
      var geoDone = false;
      var btn = null;

      function drawMe(lat, lng, city) {
        meLayer.clearLayers();
        meLayer.addLayer(L.circleMarker([lat, lng], {
          radius: 10, color: meColor, weight: 2, fillColor: meColor, fillOpacity: 0.9
        }).bindPopup((city || "You") + " · current location"));
      }

      function reportGeo(lat, lng) {
        var city = cityFromCoords(lat, lng);
        drawMe(lat, lng, city);
        return fetch(workerUrl + "/hit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city: city, lat: lat, lng: lng, source: "browser" })
        }).catch(function () {}).then(function () { return reload(); });
      }

      function runGeolocate(fromButton) {
        if (geoInFlight) return Promise.resolve();
        if (!fromButton && geoDone) return Promise.resolve();
        geoInFlight = true;
        if (btn) { btn.disabled = true; btn.textContent = "Locating…"; }
        return requestBrowserGeo(options)
          .then(function (pos) {
            geoDone = true;
            try { sessionStorage.setItem(geoOnceKey, "1"); } catch (e) {}
            return reportGeo(pos.lat, pos.lng);
          })
          .catch(function (err) {
            if (btn) {
              btn.textContent = err && err.code === 1 ? "Location denied" : "Location unavailable";
              btn.disabled = false;
            }
            if (typeof options.onGeoError === "function") options.onGeoError(err);
          })
          .finally(function () {
            geoInFlight = false;
            if (btn && geoDone) { btn.disabled = true; btn.textContent = "Located"; }
            else if (btn && !geoDone) {
              btn.disabled = false;
              btn.textContent = options.geolocateButtonText || "Share my city";
            }
          });
      }

      if (showBtn) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "visitor-map-geo-btn";
        btn.textContent = options.geolocateButtonText || "Share my city";
        btn.addEventListener("click", function () { runGeolocate(true); });
        el.appendChild(btn);
      }

      function reload() {
        return fetch(workerUrl + "/cities")
          .then(function (r) {
            if (!r.ok) throw new Error("GET /cities failed: " + r.status);
            return r.json();
          })
          .then(function (data) {
            var cities = data.cities || [];
            renderMarkers(map, layer, cities, options);
            if (typeof options.onLoad === "function") options.onLoad(cities);
            return cities;
          });
      }

      function destroy() {
        try { map.remove(); } catch (e) {}
      }

      setTimeout(function () { try { map.invalidateSize(); } catch (e) {} }, 300);

      var boot = Promise.resolve();
      if (report) {
        boot = fetch(workerUrl + "/hit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}"
        }).catch(function () {});
      }

      return boot.then(function () { return reload(); }).then(function () {
        if (useGeo && navigator.geolocation) {
          var already = false;
          try { already = sessionStorage.getItem(geoOnceKey) === "1"; } catch (e) {}
          if (!already) setTimeout(function () { runGeolocate(false); }, geoDelay);
        }
        return { map: map, layer: layer, meLayer: meLayer, reload: reload, geolocate: function () { return runGeolocate(true); }, destroy: destroy };
      }).catch(function (err) {
        if (typeof options.onError === "function") options.onError(err);
        throw err;
      });
    });
  }

  function autoMount() {
    var nodes = document.querySelectorAll("[data-visitor-map]");
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.getAttribute("data-visitor-map-mounted") === "1") continue;
      var url = node.getAttribute("data-worker-url") || node.getAttribute("data-visitor-map");
      if (!url || url === "true" || url === "") continue;
      node.setAttribute("data-visitor-map-mounted", "1");
      mount({
        workerUrl: url,
        container: node,
        markerColor: node.getAttribute("data-marker-color") || undefined,
        report: node.getAttribute("data-report") !== "false",
        geolocate: node.getAttribute("data-geolocate") !== "false",
        geolocateButton: node.getAttribute("data-geolocate-button") !== "false",
        geolocateDelay: Number(node.getAttribute("data-geolocate-delay") || 4000)
      }).catch(function (e) { console.error("[VisitorMap]", e); });
    }
  }

  global.VisitorMap = { mount: mount, autoMount: autoMount, version: "1.1.0" };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoMount);
  } else {
    setTimeout(autoMount, 0);
  }
})(typeof window !== "undefined" ? window : this);
