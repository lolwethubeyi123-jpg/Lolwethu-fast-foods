/* map.js - interactive Leaflet map for contact.html */
(function () {
    'use strict';

    var container = document.getElementById('map');
    if (!container || typeof L === 'undefined') { return; }

    // 170 Russell Rd, Central, Gqeberha
    var position = [-33.96191, 25.60804];

    var map = L.map('map', { scrollWheelZoom: false }).setView(position, 16);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.marker(position)
        .addTo(map)
        .bindPopup("<strong>Lolwethu's Fast Food Kitchen</strong><br>170 Russell Rd, Central, Gqeberha")
        .openPopup();

    // Allow scroll-zoom only after the visitor clicks the map (so page scrolling isn't hijacked)
    map.on('click', function () { map.scrollWheelZoom.enable(); });
    map.on('mouseout', function () { map.scrollWheelZoom.disable(); });
})();