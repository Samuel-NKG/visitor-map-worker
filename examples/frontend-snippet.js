/**
 * Drop-in frontend snippet for Visitor Map Worker + Leaflet
 *
 * 1. Set WORKER_URL
 * 2. Ensure the page has: <div id="visitor-leaflet-map" style="height:340px"></div>
 * 3. Include Leaflet CSS/JS before this script
 */
(function () {
  var WORKER_URL = "https://YOUR_WORKER_URL"; // no trailing slash

  var KNOWN_CITIES = [
    { name: "Beijing", lat: 39.9042, lng: 116.4074 },
    { name: "Shanghai", lat: 31.2304, lng: 121.4737 },
    { name: "Hangzhou", lat: 30.2741, lng: 120.1551 },
    { name: "Ningbo", lat: 29.8683, lng: 121.544 },
    { name: "Nanjing", lat: 32.0603, lng: 118.7969 },
    { name: "Guangzhou", lat: 23.1291, lng: 113.2644 },
    { name: "Shenzhen", lat: 22.5431, lng: 114.0579 },
    { name: "Chengdu", lat: 30.5728, lng: 104.0668 },
    { name: "Xi'an", lat: 34.3416, lng: 108.9398 },
    { name: "Hong Kong", lat: 22.3193, lng: 114.1694 },
    { name: "Tokyo", lat: 35.6895, lng: 139.6917 },
    { name: "Singapore", lat: 1.3521, lng: 103.8198 },
  ];

  function isBadCityName(name) {
    if (!name) return true;
    var s = String(name).trim();
    if (!s || s === "Unknown") return true;
    if (/\uFFFD/.test(s)) return true;
    var ok = (s.match(/[A-Za-z\u4e00-\u9fff]/g) || []).join("");
    return ok.length < 2 || ok.length / s.length < 0.5;
  }

  function resolveCityName(name, lat, lng) {
    var best = null;
    var bestD = 0.45;
    for (var i = 0; i < KNOWN_CITIES.length; i++) {
      var k = KNOWN_CITIES[i];
      var d = Math.abs(k.lat - lat) + Math.abs(k.lng - lng);
      if (d < bestD) {
        bestD = d;
        best = k.name;
      }
    }
    if (isBadCityName(name)) return best || "Unknown";
    if (best && bestD < 0.25) return best;
    return name;
  }

  function cityNameScore(name) {
    if (isBadCityName(name)) return -1000;
    var s = String(name);
    var score = /^[A-Za-z]/.test(s) ? 10 : 0;
    for (var i = 0; i < KNOWN_CITIES.length; i++) {
      if (KNOWN_CITIES[i].name.toLowerCase() === s.toLowerCase()) score += 100;
    }
    return score;
  }

  function renderMarkers(map, layer, cities) {
    layer.clearLayers();
    var groups = {};
    (cities || []).forEach(function (c) {
      var lat = Number(c.lat);
      var lng = Number(c.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      var key = Math.round(lat * 5) / 5 + "," + Math.round(lng * 5) / 5;
      var city = resolveCityName((c.city || "").trim() || "Unknown", lat, lng);
      var country = c.country || c.countryCode || "";
      if (!groups[key]) {
        groups[key] = { city: city, country: country, sumLat: lat, sumLng: lng, count: 1 };
      } else {
        var g = groups[key];
        g.count += 1;
        g.sumLat += lat;
        g.sumLng += lng;
        if (cityNameScore(city) > cityNameScore(g.city)) {
          g.city = city;
          if (country) g.country = country;
        }
      }
    });

    var bounds = [];
    Object.keys(groups).forEach(function (key) {
      var g = groups[key];
      var lat = g.sumLat / g.count;
      var lng = g.sumLng / g.count;
      var name = resolveCityName(g.city, lat, lng);
      var radius = Math.min(18, 5 + Math.sqrt(g.count) * 3.2);
      var label =
        name +
        (g.country ? ", " + g.country : "") +
        " · " +
        g.count +
        (g.count > 1 ? " visits" : " visit");
      layer.addLayer(
        L.circleMarker([lat, lng], {
          radius: radius,
          color: "#ff6b2c",
          weight: 1.5,
          fillColor: "#ff6b2c",
          fillOpacity: 0.75,
        }).bindPopup(label)
      );
      bounds.push([lat, lng]);
    });
    if (bounds.length) {
      try {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 5 });
      } catch (e) {}
    }
  }

  function boot() {
    var el = document.getElementById("visitor-leaflet-map");
    if (!el || !window.L) return;

    var map = L.map(el, { worldCopyJump: true }).setView([20, 10], 2);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      subdomains: "abcd",
      maxZoom: 18,
    }).addTo(map);
    var layer = L.layerGroup().addTo(map);
    setTimeout(function () {
      map.invalidateSize();
    }, 400);

    function load() {
      fetch(WORKER_URL + "/cities")
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          renderMarkers(map, layer, data.cities || []);
        })
        .catch(function () {});
    }

    fetch(WORKER_URL + "/hit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then(function () {
        setTimeout(load, 600);
      })
      .catch(function () {
        load();
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
