const socket = io('https://b76host.de', {
    path: '/box/socket.io',
    transports: ['polling']        
});

socket.on('connect', () => {
    console.log('connected');
});

function sendNotification(title, body) {
    const data = { title, body };
    socket.emit('notify', data);
}

socket.emit('map', 'Hello from client');

let tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
let tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

let map = L.map('mapid').setView([48.55729494100845, 13.414576593152692], 15);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

var zoneCreationLayer = L.layerGroup().addTo(map);
var zoneLayer = L.layerGroup().addTo(map);
var boxLayer = L.layerGroup().addTo(map);

var enabledBoxIcon = L.icon({
    iconUrl: 'https://b76host.de/box/box.png',
    iconSize: [30, 30],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25],
    tooltipAnchor: [25, -5]
});

var disabledBoxIcon = L.icon({
    iconUrl: 'https://b76host.de/box/box2.png',
    iconSize: [30, 30],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25],
    tooltipAnchor: [25, -5]
});

function hideAllUI() {
    if(document.querySelector('.zoneConfirmation').style.display === 'block') {
        document.querySelector('.zoneConfirmation').style.display = 'none';
        map.off('click');
        zoneCreationLayer.clearLayers();
        return;
    }
    document.querySelector('.zoneConfirmation').style.display = 'none';
    document.querySelector('.zoneInformation').style.display = 'none';
    document.querySelector('.boxInformation').style.display = 'none';
    document.querySelector('.asignBox').style.display = 'none';
}

document.getElementById('addZone').addEventListener('click', () => {
    hideAllUI();
    document.querySelector('.zoneConfirmation ul').innerHTML = '';
    document.querySelector('.zoneConfirmation input').value = '';
    document.querySelector('.zoneConfirmation').style.display = 'block';
    // click on map to add points
    map.on('click', (e) => {
        console.log(e.latlng);
        // add point to list
        let li = document.createElement('li');
        li.classList.add('list-group-item');
        li.textContent = `lat: ${e.latlng.lat}, lng: ${e.latlng.lng}`;
        document.querySelector('.zoneConfirmation ul').appendChild(li);

        // create a polygon with all points on the list, remove all polygons before
        let points = document.querySelector('.zoneConfirmation ul').children;
        let polygonPoints = [];
        for (let i = 0; i < points.length; i++) {
            let latlng = points[i].textContent.split(', ');
            latlng[0] = latlng[0].split(': ')[1];
            latlng[1] = latlng[1].split(': ')[1];
            polygonPoints.push([latlng[0], latlng[1]]);
        }
        zoneCreationLayer.clearLayers();
        L.polygon(polygonPoints, { color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }).addTo(zoneCreationLayer);
    });
});

let box_data = {};
let zone_data = {};

function modulesObjectToString(modules) {
    let str = '';
    // string should be: "Module1, Module2, Module3" Object is like: {earthquake: true, fire: false, flood: true}
    for (let key in modules) {
        if(modules[key]) {
            str += key + ', ';
        }
    }
    str = str.slice(0, -2);
    return str;
}

function searchInObjectKey(object, search) {
    for (let key in object) {
        if(key === search) {
            // if key is true
            if(object[key]) {
                return true;
            } else {
                return false;
            }
        }
    }
    return false;
}

function updateBoxInformation(box) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${JSON.parse(box.gps).lat}&lon=${JSON.parse(box.gps).lon}`)
        .then(response => response.json())
        .then(data => {
            if(data.address.city) {
                document.querySelector('#boxRegion').textContent = data.address.city + ', ' + data.address.country;
            } else if(data.address.town) {
                document.querySelector('#boxRegion').textContent = data.address.town + ', ' + data.address.country;
            } else if(data.address.village) {
                document.querySelector('#boxRegion').textContent = data.address.village + ', ' + data.address.country;
            } else if(data.address.county) {
                document.querySelector('#boxRegion').textContent = data.address.county + ', ' + data.address.country;
            } else if(data.address.state) {
                document.querySelector('#boxRegion').textContent = data.address.state + ', ' + data.address.country;
            } else {
                document.querySelector('#boxRegion').textContent = 'Unbekannt';
            }
            // make a bootstrap tooltip with the full address
            document.querySelector('#boxRegion').setAttribute('data-bs-toggle', 'tooltip');
            document.querySelector('#boxRegion').setAttribute('data-bs-title', data.display_name);
            document.querySelector('#boxRegion').setAttribute('data-bs-custom-class', 'custom-tooltip');
            new bootstrap.Tooltip(document.querySelector('#boxRegion'));
            tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
            tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
            
        });
    let time = Date.parse(box.currentTime);
    let diff = Math.abs(new Date() - time);

    if(diff > 5000) {
        document.querySelector('#boxConnect').textContent = 'Nicht Verbunden';
        // change color to red
        document.querySelector('#boxConnect').style.color = 'red';
        if(diff > 3600000) {
            document.querySelector('#boxTime').textContent = 'vor ' + Math.floor(diff / 3600000) + ' Stunden';
        } else if(diff > 60000) {
            document.querySelector('#boxTime').textContent = 'vor ' + Math.floor(diff / 60000) + ' Minuten';
        } else {
            document.querySelector('#boxTime').textContent = 'vor ' + Math.floor(diff / 1000) + ' Sekunden';
        }
    } else {
        document.querySelector('#boxConnect').textContent = 'Verbunden';
        document.querySelector('#boxConnect').style.color = 'green';
        document.querySelector('#boxTime').textContent = 'Aktuell';
    }
    console.log(box);

    document.querySelector('#boxAsignedZone').textContent = "Zone: " + box.asignedZone;

    document.querySelector('.boxInformation ul').innerHTML = '';
    let ul = document.querySelector('.boxInformation ul');
    let modules = document.createElement('li');
    modules.classList.add('list-group-item');
    modules.innerHTML = 'Module: ' + modulesObjectToString(JSON.parse(box.modules));
    ul.appendChild(modules);
    if(searchInObjectKey(JSON.parse(box.modules), 'earthquake')) {
        let li = document.createElement('li');
        li.classList.add('list-group-item');
        li.textContent = 'Beschleunigungssensor X: ' + JSON.parse(box.acceleration).x + ' m/s² Y: ' + JSON.parse(box.acceleration).y + ' m/s² Z: ' + JSON.parse(box.acceleration).z + ' m/s²';
        ul.appendChild(li);
    }
    if(searchInObjectKey(JSON.parse(box.modules), 'fire')) {
        let li = document.createElement('li');
        li.classList.add('list-group-item');
        li.textContent = 'Gas-Sensor: ' + box.gas + '';
        ul.appendChild(li);
    }
    if(searchInObjectKey(JSON.parse(box.modules), 'flood')) {
        let li = document.createElement('li');
        li.classList.add('list-group-item');
        li.textContent = 'Wasser-Sensor: ' + box.flood + '';
        ul.appendChild(li);
    }

}
    

function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

function radiansToDegrees(radians) {
    return radians * 180 / Math.PI;
}

function findCentroid(pointsObj) {
    let x = 0;
    let y = 0;
    let z = 0;
    let points = Object.values(pointsObj).map(point => [point.lat, point.lng]);
    

    points.forEach(([lat, lon]) => {
        const latRad = degreesToRadians(lat);
        const lonRad = degreesToRadians(lon);
        x += Math.cos(latRad) * Math.cos(lonRad);
        y += Math.cos(latRad) * Math.sin(lonRad);
        z += Math.sin(latRad);
    });

    const totalPoints = points.length;
    x /= totalPoints;
    y /= totalPoints;
    z /= totalPoints;

    const centralLon = Math.atan2(y, x);
    const centralSquareRoot = Math.sqrt(x * x + y * y);
    const centralLat = Math.atan2(z, centralSquareRoot);

    return [radiansToDegrees(centralLat), radiansToDegrees(centralLon)];
}

function findCentroidArray(points) {
    let x = 0;
    let y = 0;
    let z = 0;
    

    points.forEach(([lat, lon]) => {
        const latRad = degreesToRadians(lat);
        const lonRad = degreesToRadians(lon);
        x += Math.cos(latRad) * Math.cos(lonRad);
        y += Math.cos(latRad) * Math.sin(lonRad);
        z += Math.sin(latRad);
    });

    const totalPoints = points.length;
    x /= totalPoints;
    y /= totalPoints;
    z /= totalPoints;

    const centralLon = Math.atan2(y, x);
    const centralSquareRoot = Math.sqrt(x * x + y * y);
    const centralLat = Math.atan2(z, centralSquareRoot);

    return [radiansToDegrees(centralLat), radiansToDegrees(centralLon)];
}

function onZoneClick(e) {
    hideAllUI();
    document.querySelector('.zoneInformation').style.display = 'block';
    document.querySelector('.zoneInformation h3').innerHTML = e.target.getTooltip().getContent();
    // get middle point of polygon
    
    let points = e.target.getLatLngs();
    let middle = findCentroid(points[0]);
    let lat = middle[0];
    let lng = middle[1];
    let region = '';
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if(data.address.city) {
                //document.querySelector('.zoneInformation h6').textContent = data.address.city + ', ' + data.address.country;
                region = data.address.city + ', ' + data.address.country;
            } else if(data.address.town) {
                //document.querySelector('.zoneInformation h6').textContent = data.address.town + ', ' + data.address.country;
                region = data.address.town + ', ' + data.address.country;
            } else if(data.address.village) {
                //document.querySelector('.zoneInformation h6').textContent = data.address.village + ', ' + data.address.country;
                region = data.address.village + ', ' + data.address.country;
            } else if(data.address.county) {
                //document.querySelector('.zoneInformation h6').textContent = data.address.county + ', ' + data.address.country;
                region = data.address.county + ', ' + data.address.country;
            } else if(data.address.state) {
                //document.querySelector('.zoneInformation h6').textContent = data.address.state + ', ' + data.address.country;
                region = data.address.state + ', ' + data.address.country;
            } else {
                //document.querySelector('.zoneInformation h6').textContent = 'Unbekannt';
            }
            // make a bootstrap tooltip with the full address
            //document.querySelector('.zoneInformation h6').setAttribute('data-bs-toggle', 'tooltip');
            //document.querySelector('.zoneInformation h6').setAttribute('data-bs-title', data.display_name);
            //document.querySelector('.zoneInformation h6').setAttribute('data-bs-custom-class', 'custom-tooltip');
            //new bootstrap.Tooltip(document.querySelector('.zoneInformation h6'));

            fetch(`https://b76host.de/box/map/getZoneInformation?region=${region}&zone=${e.target.getTooltip().getContent()}`)
                .then(response => response.json())
                .then(data => {
                    let currentWeather = data["weather"][0].current;
                    console.log(currentWeather);
                    let temp = currentWeather.temperature;
                    let image = currentWeather.imageUrl;
                    let sky = currentWeather.skytext;
                    image = image.replace('http://', 'https://');
                    document.querySelector('.zoneInformation .weather-widget .right-section .weather-icon').src = image;
                    document.querySelector('.zoneInformation .weather-widget .left-section .temperature').textContent = temp + '°';
                    document.querySelector('.zoneInformation .weather-widget .location').textContent = region;
                    document.querySelector('.zoneInformation .weather-widget .left-section .description').textContent = sky;
                    let boxes = data["boxes"];
                    let ul = document.querySelector('.zoneInformation ul');
                    ul.innerHTML = '';
                    for (let i = 0; i < boxes.length; i++) {
                        let li = document.createElement('li');
                        li.classList.add('list-group-item');
                        li.textContent = boxes[i].id;
                        ul.appendChild(li);
                    }
                    // hide the text "zugewiesende boxen"
                    if(boxes.length === 0) {
                        document.querySelector('.zoneInformation h6').style.display = 'none';
                    } else {
                        document.querySelector('.zoneInformation h6').style.display = 'block';
                    }
                });
        });
    // fetch weather data by using own api
    
    e.originalEvent._clickedPolygon = true;
}

function onBoxClick(e) {
    if(document.querySelector('.asignBox').style.display === 'block') {
        let li = document.createElement('li');
        li.classList.add('list-group-item');
        li.textContent = e.target.getTooltip().getContent();
        document.querySelector('.asignBox ul').appendChild(li);
        return;
    }
    hideAllUI();
    document.querySelector('.boxInformation').style.display = 'block';
    document.querySelector('.boxInformation h3').textContent = e.target.getTooltip().getContent();
    box = box_data.find((box) => box.id === e.target.getTooltip().getContent());

    updateBoxInformation(box);

    console.log(box);
}

document.querySelector('.zoneInformation .btn-danger').addEventListener('click', () => {
    // fetch to delete zone
    let zone = document.querySelector('.zoneInformation h3').textContent;
    (async () => {
        const response = await fetch('https://b76host.de/box/map/deleteZone', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                zone: zone
            })
        });
        const data = await response.text();
        if(data === "Zone not found") {
            alert("Zone nicht gefunden");
            return;
        }
    })();
    document.querySelector('.zoneInformation').style.display = 'none';
});

document.querySelector('.zoneConfirmation .btn-success').addEventListener('click', () => {
    // add polygon to zoneLayer
    let points = document.querySelector('.zoneConfirmation ul').children;
    let polygonPoints = [];
    for (let i = 0; i < points.length; i++) {
        let latlng = points[i].textContent.split(', ');
        latlng[0] = latlng[0].split(': ')[1];
        latlng[1] = latlng[1].split(': ')[1];
        polygonPoints.push([latlng[0], latlng[1]]);
    }

    let zoneName = document.querySelector('.zoneConfirmation input').value;
    if (zoneName === '') {
        return;
    }

    (async () => {
        // fetch to save zone https://b76host.de/box/map/createZone
        const response = await fetch('https://b76host.de/box/map/createZone', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: zoneName,
                points: polygonPoints
            })
        });
        const data = await response.text();
        if(data === "Zone already exists") {
            alert("Zone existiert schon");
            return;
        }
    })();
    L.polygon(polygonPoints, { color: 'green', fillColor: 'green', fillOpacity: 0.1 }).addTo(zoneLayer);
    // add slightly transparent tooltip to polygon
    let polygon = zoneLayer.getLayers()[zoneLayer.getLayers().length - 1];
    polygon.bindTooltip(zoneName, {permanent: true, opacity: 0.8, direction: 'center'}).openTooltip();
    // clear all points
    document.querySelector('.zoneConfirmation ul').innerHTML = '';
    // hide zoneConfirmation
    document.querySelector('.zoneConfirmation').style.display = 'none';

    document.querySelector('.zoneConfirmation input').value = '';
    // remove click event
    map.off('click');
    // remove polygon from zoneCreationLayer
    zoneCreationLayer.clearLayers();
});

document.querySelector('.zoneConfirmation .btn-danger').addEventListener('click', () => {
    // clear all points
    document.querySelector('.zoneConfirmation ul').innerHTML = '';
    // hide zoneConfirmation
    document.querySelector('.zoneConfirmation').style.display = 'none';

    document.querySelector('.zoneConfirmation input').value = '';
    // remove click event
    map.off('click');
    // remove polygon from zoneCreationLayer
    zoneCreationLayer.clearLayers();
});

// on click on a polygon show if click was not a polygon, hide zoneInformation
map.on('click', function(e) {
    if (!e.originalEvent._clickedPolygon) {
        document.querySelector('.zoneInformation').style.display = 'none';
    }
});

// on click on a polygon show zoneInformation


socket.on('zones', (data) => {
    //console.log(data);
    // clear all polygons
    zone_data = data;
    zoneLayer.clearLayers();
    for (let i = 0; i < data.length; i++) {
        let poly = L.polygon(JSON.parse(data[i].points), { color: 'green', fillColor: 'green', fillOpacity: 0.1 }).addTo(zoneLayer).bindTooltip(data[i].name, {permanent: true, opacity: 0.8, direction: 'center'}).openTooltip();
        poly.on('click', onZoneClick);
    }
});

socket.on('boxes', (data) => {
    //console.log(data);
    boxLayer.clearLayers();
    box_data = data;
    for (let i = 0; i < data.length; i++) {
        let gps = JSON.parse(data[i].gps);
        let box = L.marker([gps.lat, gps.lon], {icon: enabledBoxIcon}).addTo(boxLayer);
        let time = Date.parse(data[i].currentTime);
        // compare time with current time
        let diff = Math.abs(new Date() - time);
        // if diff is greater than 5 seconds color red
        if (diff > 5000) {
            box.setIcon(disabledBoxIcon);
        }
        box.bindTooltip(data[i].id, {permanent: true, opacity: 0.8, direction: 'center'});
        box.on('click', onBoxClick);
        // if information is shown, update it
        if(document.querySelector('.boxInformation').style.display === 'block' && document.querySelector('.boxInformation h3').textContent === data[i].id) {
            updateBoxInformation(data[i]);
        }
    }
});

document.querySelector('#asignBox').addEventListener('click', () => {
    hideAllUI();
    document.querySelector('.asignBox').style.display = 'block';

    // put all zones as options in select zones = zone_data
    let select = document.querySelector('.selectZone');
    select.innerHTML = '';
    for (let i = 0; i < zone_data.length; i++) {
        let option = document.createElement('option');
        option.value = zone_data[i].name;
        option.textContent = zone_data[i].name;
        select.appendChild(option);
    }

    document.querySelector('.asignBox ul').innerHTML = '';
});

document.querySelector('.asignBox .btn-danger').addEventListener('click', () => {
    document.querySelector('.asignBox').style.display = 'none';
    document.querySelector('.asignBox ul').innerHTML = '';
});

document.querySelector('.asignBox .btn-success').addEventListener('click', () => {
    let zone = document.querySelector('.selectZone').value;
    let boxes = document.querySelector('.asignBox ul').children;
    let boxNames = [];
    for (let i = 0; i < boxes.length; i++) {
        boxNames.push(boxes[i].textContent);
    }
    // fetch to save boxes to zone
    (async () => {
        const response = await fetch('https://b76host.de/box/map/asignBoxes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                zone: zone,
                boxes: boxNames
            })
        });
        const data = await response.text();
        if(data === "Zone not found") {
            alert("Zone nicht gefunden");
            return;
        }
    })();
    document.querySelector('.asignBox').style.display = 'none';
    document.querySelector('.asignBox ul').innerHTML = '';
});

// search bar autocomplete
document.querySelector('#search').addEventListener('input', () => {
    // take zones and boxes
    let zones = zone_data.map(zone => zone.name);
    let boxes = box_data.map(box => box.id);
    let search = document.querySelector('#search').value;
    let results = [];
    // to lower case
    search = search.toLowerCase();
    // search in zones
    for (let i = 0; i < zones.length; i++) {
        if (zones[i].toLowerCase().includes(search)) {
            results.push(zones[i]);
        }
    }
    // search in boxes
    for (let i = 0; i < boxes.length; i++) {
        if (boxes[i].toLowerCase().includes(search)) {
            results.push(boxes[i]);
        }
    }
    // make a list hover over search bar
    let searchResults = document.querySelector('.searchResults');
    searchResults.innerHTML = '';
    for (let i = 0; i < results.length; i++) {
        let li = document.createElement('li');
        li.classList.add('list-group-item');
        li.textContent = results[i];
        searchResults.appendChild(li);
    }
    searchResults.style.display = 'block';
});

document.querySelector('.searchResults').addEventListener('click', (e) => {
    document.querySelector('#search').value = e.target.textContent;
    document.querySelector('.searchResults').style.display = 'none';
    document.querySelector('#search').focus();
});

document.querySelector('#search').addEventListener('focusout', () => {
    setTimeout(() => {
        document.querySelector('.searchResults').style.display = 'none';
    }, 100);
});

document.querySelector('#search').addEventListener('focusin', () => {
    if(document.querySelector('#search').value === '') {
        return;
    }
    document.querySelector('.searchResults').style.display = 'block';
    // on enter click
});

document.querySelector('#search_btn').addEventListener('click', () => {
    let search = document.querySelector('#search').value;
    let zones = zone_data.map(zone => zone.name);
    let boxes = box_data.map(box => box.id);
    for (let i = 0; i < zones.length; i++) {
        if (zones[i].toLowerCase() === search.toLowerCase()) {
            let zone = zone_data.find(zone => zone.name === zones[i]);
            map.setView(findCentroidArray(JSON.parse(zone.points)), 12);
            return;
        }
    }
    for (let i = 0; i < boxes.length; i++) {
        if (boxes[i].toLowerCase() === search.toLowerCase()) {
            let box = box_data.find(box => box.id === boxes[i]);
            map.setView([JSON.parse(box.gps).lat, JSON.parse(box.gps).lon], 17);
            return;
        }
    }
});

document.querySelectorAll('.btn-close').forEach(btn => {
    btn.addEventListener('click', () => {
        hideAllUI();
    });
});

document.querySelector('#search').addEventListener('keydown', (e) => {
    if(e.key === 'Enter') {
        document.querySelector('.searchResults').style.display = 'none';
        let search = document.querySelector('#search').value;
        let zones = zone_data.map(zone => zone.name);
        let boxes = box_data.map(box => box.id);
        // if lower case search matches lower case zone or box
        for (let i = 0; i < zones.length; i++) {
            if (zones[i].toLowerCase() === search.toLowerCase()) {
                let zone = zone_data.find(zone => zone.name === zones[i]);
                map.setView(findCentroidArray(JSON.parse(zone.points)), 12);
                return;
            }
        }
        for (let i = 0; i < boxes.length; i++) {
            if (boxes[i].toLowerCase() === search.toLowerCase()) {
                let box = box_data.find(box => box.id === boxes[i]);
                map.setView([JSON.parse(box.gps).lat, JSON.parse(box.gps).lon], 17);
                return;
            }
        }

        // if ul has children, set view to first child
        if(document.querySelector('.searchResults').children.length > 0) {
            let search = document.querySelector('.searchResults').children[0].textContent;
            let zones = zone_data.map(zone => zone.name);
            let boxes = box_data.map(box => box.id);
            for (let i = 0; i < zones.length; i++) {
                if (zones[i].toLowerCase() === search.toLowerCase()) {
                    let zone = zone_data.find(zone => zone.name === zones[i]);
                    document.querySelector('#search').value = zones[i];
                    map.setView(findCentroidArray(JSON.parse(zone.points)), 12);
                    return;
                }
            }
            for (let i = 0; i < boxes.length; i++) {
                if (boxes[i].toLowerCase() === search.toLowerCase()) {
                    let box = box_data.find(box => box.id === boxes[i]);
                    document.querySelector('#search').value = boxes[i];
                    map.setView([JSON.parse(box.gps).lat, JSON.parse(box.gps).lon], 17);
                    return;
                }
            }
        } else {
            return;
        }
    }
});


document.addEventListener('DOMContentLoaded', function() {
    let myModal;
  
    socket.on('sendWarning', ([data, result]) => {
      let boxId = data.id;
      let type = data.type;
      console.log(data);
      let box = box_data.find(box => box.id === boxId);
      let gps = JSON.parse(box.gps);
      let lat = gps.lat;
      let lon = gps.lon;
      let message = '';
      let messageType;
      if(type === 'fire') {
          message = 'Feuerwarnung';
          messageType = 'Feuer';
      } else if(type === 'earthquake') {
          message = 'Erdbebenwarnung';
          messageType = 'ein Erdbeben';
      } else if(type === 'flood') {
          message = 'Hochwasserwarnung';
          messageType = 'Hochwasser';
      }
      
      document.querySelector('.modal-title').textContent = message + " " + boxId;
      document.querySelector('.modal-body').textContent = 'Warnung! Es wurde ' + messageType + ' erkannt! Möchtest du eine Benachrichtigung senden?';
  
      // Create a new modal instance and show it
      if (myModal) {
        myModal.dispose();
      }
      myModal = new bootstrap.Modal(document.getElementById('warningModal'));
      myModal.show();
    });
  
    // Clean up modal instance when it is hidden
    document.getElementById('warningModal').addEventListener('hidden.bs.modal', function () {
      if (myModal) {
        myModal.dispose();
        myModal = null;
      }
    });
    document.querySelector('.modal-footer .btn-primary').addEventListener('click', () => {
        let boxId = document.querySelector('.modal-title').textContent.split(' ')[1];
        let type = document.querySelector('.modal-title').textContent.split(' ')[0].toLowerCase();
        let msg = '';
        if(type === 'feuerwarnung') {
            msg = 'Es wurde ein Feuer in der Nähe von Box ' + boxId + ' erkannt! Begeben sie sich bitte in Sicherheit!';
        } else if(type === 'erdbebenwarnung') {
            msg = 'Es wurde ein Erdbeben in der Nähe von Box ' + boxId + ' erkannt! Begeben sie sich bitte in Sicherheit!';
        } else if(type === 'hochwasserwarnung') {
            msg = 'Es wurde ein Hochwasser in der Nähe von Box ' + boxId + ' erkannt! Begeben sie sich bitte in Sicherheit!';
        }
        // send notification
        console.log(msg);
        sendNotification('Warnung - HazardCube  ', msg);
        // hide modal
        myModal.hide();
    });
  });
