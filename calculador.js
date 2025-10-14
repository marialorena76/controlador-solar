document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('map', { zoomControl: true })
               .setView([-34.6037, -58.3816], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const geocoderControl = L.Control.geocoder({
    defaultMarkGeocode: false,
    collapsed: false, // Ensure the geocoder is not collapsed
    placeholder: 'Buscar domicilio o ciudad...'
  })
    .on('markgeocode', (e) => {
      const b = e.geocode.bbox;
      const poly = L.polygon([
        b.getSouthEast(), b.getNorthEast(), b.getNorthWest(), b.getSouthWest()
      ]);
      map.fitBounds(poly.getBounds(), { padding: [20, 20] });
    })
    .addTo(map);

  // Mover control al contenedor custom
  const gcEl = geocoderControl.getContainer();
  const gcTarget = document.getElementById('geocoder-container');
  if (gcEl && gcTarget && gcEl.parentNode !== gcTarget) {
    gcTarget.appendChild(gcEl);
  }

  // Use requestAnimationFrame to ensure invalidateSize is called after DOM is painted
  requestAnimationFrame(() => {
      map.invalidateSize();
  });
});