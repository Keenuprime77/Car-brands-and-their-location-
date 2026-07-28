function updateMap() {

  fetch("car_location.json")
    .then(response => response.json())
    .then(rsp => {

      // Create one layer for all markers
      const markersLayer = new L.LayerGroup();
      map.addLayer(markersLayer);

      rsp.car_brands.forEach(element => {

        const marker = L.marker(
          [element.latitude, element.longitude],
          {
            title: element.brand // Used by the search plugin
          }
        );

        marker.bindPopup(`
                    <b>Brand:</b> ${element.brand}<br>
                    <b>Headquarters:</b> ${element.headquarters}
                `);

        marker.on("click", () => {
          map.setView(marker.getLatLng(), map.getZoom());
        });

        markersLayer.addLayer(marker);

      });

      // Add the search control only once
      const searchControl = new L.Control.Search({
        layer: markersLayer,
        propertyName: "title",
        zoom: 6,
        marker: false
      });


      searchControl.on("search:locationfound", function (e) {
        e.layer.openPopup();
      });

      map.addControl(searchControl);
    });

}

updateMap();
