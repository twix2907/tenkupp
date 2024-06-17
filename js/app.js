// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCU-sQ1l2fZ6eu-2n9cADaTY8IssrSS5mg",
    authDomain: "caminoseguro-39b7c.firebaseapp.com",
    projectId: "caminoseguro-39b7c",
    storageBucket: "caminoseguro-39b7c.appspot.com",
    messagingSenderId: "855535521945",
    appId: "1:855535521945:web:06c70bfc861c428d00e808",
    measurementId: "G-ZGB3PHMWDD"
};

let deferredPrompt;
const installNotification = document.getElementById('install-notification');
const installButton = document.getElementById('install-button');
const cancelButton = document.getElementById('cancel-button');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installNotification.classList.remove('hidden');
});

installButton.addEventListener('click', () => {
    installNotification.classList.add('hidden');
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('El usuario aceptó la instalación');
        } else {
            console.log('El usuario rechazó la instalación');
        }
        deferredPrompt = null;
    });
});

cancelButton.addEventListener('click', () => {
    installNotification.classList.add('hidden');
});

// Inicializando Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app(); // Si ya está inicializado, utilizar la instancia existente
}
const db = firebase.firestore();

// Creando un mapa Leaflet y ajustándolo a la vista mundial
var map = L.map('map').fitWorld();
// Capa de mosaico de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

// Inicialización de Leaflet.draw
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Configuración del control de dibujo y edición
var drawControl = new L.Control.Draw({
    draw: {
        polyline: false,
        polygon: false,
        rectangle: false,
        circle: {
            shapeOptions: {
                color: 'red', // Color de la línea del círculo
                stroke: false,        // Grosor de la línea del círculo
                opacity: 0.2,       // Opacidad de la línea del círculo
                fillColor: 'red', // Color de relleno del círculo
                fillOpacity: 0.3  // Opacidad del relleno del círculo
            }
        }, // Activar herramienta para dibujar círculos
        marker: false
    },
    edit: {
        featureGroup: drawnItems,
        remove: false
    }
});
map.addControl(drawControl);

// Función para cancelar el dibujo activo
function cancelDrawing() {
    map._container.querySelector('.leaflet-draw-actions a').click(); // Simular clic en el botón de cancelar
}

// Añadir botón personalizado para dibujar círculos
var customControl = L.Control.extend({
    options: {
        position: 'topright' // Posición del botón en el mapa
    },

    onAdd: function (map) {
        var container = document.getElementById('bottom-right-buttons');

        // Botón para dibujar círculos
        var drawButton = L.DomUtil.create('button', 'icon-button circular-button', container);
        
        drawButton.innerHTML = '<i class="fas fa-plus"></i>';
        L.DomEvent.on(drawButton, 'click', function() {
            map._container.querySelector('.leaflet-draw-draw-circle').click(); // Activar herramienta de dibujo de círculo
            document.getElementById('cancelarZona').style.display = 'block'
        });


        // Botón para cancelar el dibujo
        var cancelButton = L.DomUtil.create('button', 'icon-button circular-button', container);
        cancelButton.title = 'Cancelar Dibujo';
        cancelButton.setAttribute('id','cancelarZona');
        cancelButton.innerHTML = '<i class="fas fa-xmark"></i>';
        L.DomEvent.on(cancelButton, 'click', function(e) {
                    L.DomEvent.stopPropagation(e); // Detener la propagación del evento de clic
                    cancelDrawing(); // Llamar a la función para cancelar el dibujo
                    document.getElementById('cancelarZona').style.display = 'none'
                });

        return container;
    }
});

// Agregar los controles personalizados al mapa
map.addControl(new customControl());

// Evento para agregar círculo al dibujar
map.on(L.Draw.Event.CREATED, function (event) {
    var layer = event.layer;
    var centerLatLng = layer.getLatLng();
        var radius = layer.getRadius();
        console.log(centerLatLng + radius)
        addZona(centerLatLng.lat, centerLatLng.lng, radius);
        document.getElementById('cancelarZona').style.display = 'none'
});



// Control para seguir la ubicación actual del usuario
var trackingBoton = L.control({ position: 'bottomright' });

trackingBoton.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'locate-btn');
    div.innerHTML = '<i class="fas fa-location-arrow"></i>';
    div.title = 'Seguir ubicación actual';
    div.onclick = function () {
        
        tracking = !tracking;
        div.classList.toggle('active', tracking);

        if (tracking && currentLatLng) {
            map.setView(currentLatLng, 16);
            map.setView(currentLatLng,map.getZoom());
        }
    };
    return div;
};
trackingBoton.addTo(map);
// Observador de Firebase para las zonas de peligro
 function observadorFirebase() {
     db.collection("dangerZones").onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((cambio) => {
            if (cambio.type === "added") {
                var data = cambio.doc.data();
                cargarZonas(data.lat, data.lng, data.radius, cambio.doc.id);

            } else if (cambio.type === "removed") {
                var id = cambio.doc.id;
                var zonaIndex = zonasPeligrosas.findIndex(zone => zone.id === id);
                if (zonaIndex !== -1) {
                    var zona = zonasPeligrosas[zonaIndex];
                    map.removeLayer(zona.circle);
                    map.removeLayer(zona.marker);
                    zonasPeligrosas.splice(zonaIndex, 1);
                }
            }
        });
        checkZone({ latlng: currentLatLng });
        console.log("mensaje de ocomprobacion");
    });
    console.log("mensaje de ocomprobacion");
    
}


// Creando un ícono personalizado de Leaflet para el marcador del mapa
var arrowIcon = L.divIcon({
    className: 'arrow-icon-container',
    html: '<div class="arrow-icon"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

// Creando un elemento de audio HTML para reproducir un sonido
var audio = new Audio('js/sound.mp3');
var currentlyPlaying = false; // Variable para rastrear si el audio está reproduciéndose actualmente
var zonasPeligrosas = []; // Array para almacenar marcadores de zonas de peligro
var firstLocationFound = false; // Bandera para la primera ubicación encontrada
var currentLatLng = null; // Variable para almacenar la latitud y longitud actuales
var tracking = false; // Variable para rastrear si el seguimiento de ubicación está activo
var rutamode = false;


// Función para agregar una zona de peligro a Firebase
function addZona(lat, lng, radius) {
    var bbox = calculateBbox(lat, lng, radius);
    db.collection("dangerZones").add({
        lat: lat,
        lng: lng,
        radius: radius,
        bbox: bbox.join(','),
    })
}

// Función para cargar una zona de peligro desde Firebase
function cargarZonas(lat, lng, radius, id) {
    var circle = L.circle([lat, lng], {
        stroke: false,
        color: 'red',
        relleno: '#f03',
        fillOpacity: 0.5,
        radius: radius
    }).addTo(map);

    var dragMarker = L.marker([lat, lng], {
        draggable: true,
        icon: L.divIcon({ className: 'hidden-marker' })
    }).addTo(map);


    // Evento al arrastrar el marcador
    dragMarker.on('drag', function (e) {
        circle.setLatLng(e.target.getLatLng());
        checkZone({ latlng: currentLatLng });
    });

    // Evento al hacer clic en el círculo
    circle.on('click', function () {
        const commentForm = document.getElementById('comment-form');
        commentForm.dataset.zoneId = id;
        showCommentsForZone(id);
    });

    zonasPeligrosas.push({ circle: circle, marker: dragMarker, id: id });
}


function checkZone(e) {
    var latlng = e.latlng;
    var enZonaPeligrosa = zonasPeligrosas.some(zone => {
        var distance = map.distance(latlng, zone.circle.getLatLng());
        var radius = zone.circle.getRadius();
        var dangerLevel = getDangerLevel(distance, radius);

        // Cambiar el volumen del audio y activar la vibración según el nivel de peligro
        if (dangerLevel === 'high') {
            setAudioVolume(1.0);
            vibrar();
        } else if (dangerLevel === 'medium') {
            setAudioVolume(0.6);
            pararVibracion();
        } else if (dangerLevel === 'low') {
            setAudioVolume(0.3);
            pararVibracion();
        } else {
            setAudioVolume(0.0);
            pararVibracion();
        }

        return distance <= radius;
    });

    // Reproducir el audio si se encuentra en una zona de peligro
    if (enZonaPeligrosa) {
        if (!currentlyPlaying) {
            audio.loop = true;
            audio.play();
            currentlyPlaying = true;
        }
    } else {
        // Detener el audio si no se encuentra en una zona de peligro
        if (currentlyPlaying) {
            audio.pause();
            audio.currentTime = 0;
            currentlyPlaying = false;
            pararVibracion();
        }
    }
}

// Función para manejar la ubicación encontrada
function onUbicacionEncontrada(e) {
    var latlng = e.latlng;
    currentLatLng = latlng;
    marker.setLatLng(latlng);

    if (firstLocationFound && tracking) {
        map.setView(latlng, map.getZoom());
    } else if (!firstLocationFound) {
        map.setView(latlng, 16);
        firstLocationFound = true;
    }

    var enZonaPeligrosa = zonasPeligrosas.some(zone => {
        var distance = map.distance(latlng, zone.circle.getLatLng());
        var radius = zone.circle.getRadius();
        var dangerLevel = getDangerLevel(distance, radius);

        // Cambiar el volumen del audio y activar la vibración según el nivel de peligro
        if (dangerLevel === 'high') {
            setAudioVolume(1.0);
            vibrar();
        } else if (dangerLevel === 'medium') {
            setAudioVolume(0.6);
            pararVibracion();
        } else if (dangerLevel === 'low') {
            setAudioVolume(0.3);
            pararVibracion();
        } else {
            setAudioVolume(0.0);
            pararVibracion();
        }

        return distance <= radius;
    });

    // Reproducir el audio si se encuentra en una zona de peligro
    if (enZonaPeligrosa) {
        if (!currentlyPlaying) {
            audio.loop = true;
            audio.play();
            currentlyPlaying = true;
        }
    } else {
        // Detener el audio si no se encuentra en una zona de peligro
        if (currentlyPlaying) {
            audio.pause();
            audio.currentTime = 0;
            currentlyPlaying = false;
            pararVibracion();
        }
    }
}

// Opciones para la solicitud de geolocalización
const opcionesDeSolicitud = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 5000
};
// Evento cuando se encuentra la ubicación
map.on('locationfound', onUbicacionEncontrada);
// Función para manejar errores de geolocalización
function handleError(error) {
    console.error('Error al obtener la geolocalización:', error);
}



// Función que espera la primera interacción del usuario (clic en un botón)
function esperarPrimeraInteraccion() {
    // Creamos una nueva promesa
    return new Promise((resolve, reject) => {
        // Función que se ejecutará cuando haya una interacción del usuario
        function handleInteraccion() {
            // Removemos el listener de evento para que solo se ejecute una vez
            document.removeEventListener('click', handleInteraccion);
            // Resolvemos la promesa
            resolve();
        }

        // Agregamos un listener de evento (clic en este caso)
        document.addEventListener('click', handleInteraccion);
    });
}

// Ejemplo de uso
esperarPrimeraInteraccion().then(permisoUbi);




function permisoUbi() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(function (position) {
            onUbicacionEncontrada({
                latlng: {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                }
            });

            origin.lat = position.coords.latitude
            origin.lng = position.coords.longitude

        }, handleError, opcionesDeSolicitud);
        observadorFirebase();
    } else {
        console.error('La geolocalización no es soportada por este navegador.');
    }

}
// Obtener la ubicación del usuario si el navegador lo permite

// Función para manejar el evento de orientación del dispositivo
function handleOrientation(event) {
    var alpha = event.alpha;
    var arrow = document.querySelector('.arrow-icon');
    if (arrow) {
        arrow.style.transform = 'rotate(' + alpha + 'deg)';
    }
}
window.addEventListener("deviceorientation", handleOrientation, false);

// Función para calcular el nivel de peligro según la distancia y el radio
function getDangerLevel(distance, radius) {
    var lowDanger = {
        membership: function (dist) {
            if (dist >= radius * 2 / 3) {
                return 1;
            } else if (dist > radius / 3 && dist < radius * 2 / 3) {
                return (dist - radius / 3) / (radius / 3);
            } else {
                return 0;
            }
        }
    };
    var mediumDanger = {
        membership: function (dist) {
            if (dist > radius / 3 && dist < radius * 2 / 3) {
                return (dist - radius / 3) / (radius / 3);
            } else if (dist >= radius * 2 / 3 && dist < radius) {
                return (radius - dist) / (radius / 3);
            } else {
                return 0;
            }
        }
    };
    var highDanger = {
        membership: function (dist) {
            if (dist <= radius / 3) {
                return 1;
            } else if (dist > radius / 3 && dist < radius * 2 / 3) {
                return (radius * 2 / 3 - dist) / (radius / 3);
            } else {
                return 0;
            }
        }
    };
    var lowMembership = lowDanger.membership(distance);
    var mediumMembership = mediumDanger.membership(distance);
    var highMembership = highDanger.membership(distance);

    if (highMembership >= mediumMembership && highMembership >= lowMembership) {
        return 'high';
    } else if (mediumMembership >= lowMembership) {
        return 'medium';
    } else {
        return 'low';
    }
}

// Función para ajustar el volumen del audio
function setAudioVolume(volume) {
    audio.volume = volume;
}
// Función para activar la vibración
function vibrar() {
    if (navigator.vibrate) {
        navigator.vibrate([1000, 100, 1000]);
    }
}
// Función para detener la vibración
function pararVibracion() {
    if (navigator.vibrate) {
        navigator.vibrate(0);
    }
}

// Evento para enviar un comentario sobre una zona de peligro
document.getElementById('comment-form').addEventListener('submit', function (event) {
    event.preventDefault();
    const comment = document.getElementById('comment').value;
    const zoneId = event.target.dataset.zoneId;
    const user = auth.currentUser;

    if (!zoneId) {
        alert("Por favor, selecciona una zona roja para comentar.");
        return;
    }

    db.collection("comments").add({
        userId: user.uid,
        userPhoto: user.photoURL,
        userName: user.displayName,
        comment: comment,
        zoneId: zoneId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
        .then(function (docRef) {
            showCommentsForZone(zoneId);
        })
        .catch(function (error) {
            console.error("Error al guardar comentario: ", error);
        });

    document.getElementById('comment-form').reset();
});

// Función para mostrar los comentarios de una zona de peligro
function showCommentsForZone(zoneId) {
    document.getElementById('map').style.height = '67%';
    document.getElementById('bottom-right-buttons').style.bottom = '43%';
    document.getElementById('commentPanel').style.display = 'block'

    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = ''; // Limpiar la lista de comentarios antes de agregar nuevos

    db.collection("comments").where("zoneId", "==", zoneId).orderBy("timestamp", "desc").get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const data = doc.data();

                // Crear el elemento div para el comentario
                const commentDiv = document.createElement('div');
                commentDiv.className = 'comment';

                // Foto del usuario
                const userPhoto = document.createElement('img');
                userPhoto.className = 'comment-avatar';
                userPhoto.src = data.userPhoto ? data.userPhoto : 'image/person-icon.png'; // Asignar la URL de la foto del usuario
                userPhoto.alt = "User" // Altura de la foto del usuario
                commentDiv.appendChild(userPhoto);

                // Detalles del comentario
                const commentDetails = document.createElement('div');
                commentDetails.className = 'comment-details';

                // Nombre del usuario
                const userName = document.createElement('p');
                userName.className = 'comment-author';
                userName.textContent = data.userName;
                commentDetails.appendChild(userName);

                // Texto del comentario
                const commentText = document.createElement('p');
                commentText.className = 'comment-text';
                commentText.textContent = data.comment;
                commentDetails.appendChild(commentText);

                // Fecha y hora del comentario
                const commentTime = document.createElement('p');
                commentTime.className = 'comment-time';
                // Suponiendo que `data.timestamp` es un objeto de fecha válido
                const timestamp = data.timestamp.toDate();
                commentTime.textContent = `${timestamp.getDate()} de ${getMonthName(timestamp.getMonth())}, ${timestamp.getFullYear()} - ${timestamp.getHours()}:${timestamp.getMinutes()}`;
                commentDetails.appendChild(commentTime);

                // Agregar detalles del comentario al div del comentario
                commentDiv.appendChild(commentDetails);

                // Agregar el comentario al contenedor de la lista de comentarios
                commentsList.appendChild(commentDiv);
            });
        })
        .catch(function (error) {
            console.error("Error al cargar comentarios: ", error);
        });
}

// Función auxiliar para obtener el nombre del mes
function getMonthName(monthIndex) {
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return months[monthIndex];
}

// Observador de autenticación de Firebase
const auth = firebase.auth();

auth.onAuthStateChanged((user) => {
    if (user) {
        const userName = document.getElementById('user-name');
        const userPhoto = document.getElementById('user-photo');

        if (user.displayName) {
            userName.textContent = "@" + user.displayName;
        } else {
            userName.textContent = 'Usuario';
        }

        if (user.photoURL) {
            userPhoto.src = user.photoURL;
        } else {
            userPhoto.src = 'image/person-icon.png';
        }
    } else {
        window.location.href = 'login.html'; // Redirigir al usuario a la página de inicio de sesión
    }
});

// Marcador en el centro del mapa
var marker = L.marker(map.getCenter(), { icon: arrowIcon }).addTo(map);

var menuButton = document.getElementById('menuButton');
var drawer = document.getElementById('drawer');

menuButton.addEventListener('click', function () {
    drawer.classList.toggle('open');
});

window.addEventListener('click', function (event) {
    if (!drawer.contains(event.target) && !menuButton.contains(event.target)) {
        drawer.classList.remove('open');
    }
});


window.addEventListener('click', function (event) {
    var commentPanel = document.getElementById('commentPanel');
    var map = document.getElementById('map');
    var bottomRightButtons = document.getElementById('bottom-right-buttons');

    // Verificar si el clic ocurrió fuera del panel de comentarios y del botón de comentarios
    if (event.target !== commentPanel && !commentPanel.contains(event.target) &&
        event.target !== map && !map.contains(event.target) &&
        event.target !== bottomRightButtons && !bottomRightButtons.contains(event.target)) {
        commentPanel.style.display = 'none'; // Ocultar el panel de comentarios
        map.style.height = '100%'; // Ajustar el tamaño del mapa nuevamente
        bottomRightButtons.style.bottom = '30%'; // Ajustar la posición de los botones inferiores
    }
});

mapboxgl.accessToken = 'pk.eyJ1IjoiZWx0d2l4MjkiLCJhIjoiY2x4aGU3dm1zMWU2OTJpcHJvbGx5OXFnZSJ9.tZlLjt-B6nCsd3RauWqptw';

// Configurar la plataforma HERE
const platform = new H.service.Platform({
    'apikey': 'Zy8akTt65_i5F5S0_2dkgs4-hMpJz1Za9rVdfTvFYAc'
});

// Definir coordenadas de origen y destino
var origin = { lat: -6.769300, lng: -79.843934 };
const destination = { lat: -6.771431, lng: -79.843295 };

// Definir las áreas a evitar (ejemplo de un bbox en Tiergarten park)
var avoidAreas = '';


function calculateBbox(lat, lng, radius) {
    // Convertir el radio de metros a grados (aproximadamente)
    const radiusInDegrees = radius / 111000; // Aproximadamente 111,000 metros por grado de latitud

    // Calcular el bbox
    const bbox = [
        lng - radiusInDegrees,
        lat - radiusInDegrees,
        lng + radiusInDegrees,
        lat + radiusInDegrees
    ];

    return bbox;
}


async function obtenerBboxDangerZone() {
    try {

        const bboxArray = [];
        // Consultar colección dangerZone y establecer un listener
        await db.collection('dangerZones').get().then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const bbox = data.bbox; // Suponiendo que bbox es un array en el formato [minLat, minLng, maxLat, maxLng]

                // Convertir bbox a formato compatible con HERE Maps
                bboxArray.push(bbox);

            });
        });
        console.log(convertirBboxAFormatoTexto(bboxArray));
        const arrayText = convertirBboxAFormatoTexto(bboxArray)
        return arrayText;

    } catch (error) {
        console.error('Error al obtener bbox de Firestore:', error);
        throw error;
    }
}

function convertirBboxAFormatoTexto(bboxArray) {
    const areasText = bboxArray.map(bbox => {
        return `bbox:${bbox}`;
    }).join('|');

    return areasText;
}

var areasBbox = [];

const logoutButton = document.getElementById('logout-btn');

logoutButton.addEventListener('click', function () {
    firebase.auth().signOut().then(function () {
        // Cerrar sesión exitoso, redirigir o hacer otras acciones necesarias
        console.log('Se cerró sesión correctamente');
    }).catch(function (error) {
        // Manejar errores aquí
        console.error('Error al intentar cerrar sesión', error);
    });
});


let routeLine = null;
let startMarker = null;
let endMarker = null;

function limpiarRutaAnterior() {
    if (routeLine) {
        routeLine.remove();
        routeLine = null;
    }
    if (startMarker) {
        startMarker.remove();
        startMarker = null;
    }
    if (endMarker) {
        endMarker.remove();
        endMarker = null;
    }
}

function trazarRuta() {
    const router = platform.getRoutingService(null, 8);



    const onResult = function (result) {

        limpiarRutaAnterior();

        if (result.routes.length) {
            const lineStrings = [];
            result.routes[0].sections.forEach((section) => {
                lineStrings.push(H.geo.LineString.fromFlexiblePolyline(section.polyline));
            });

            // Convertir las polilíneas de HERE a una polilínea de Leaflet
            routeLine = L.polyline(lineStrings.map(lineString => {
                return lineString.getLatLngAltArray().reduce((acc, cur, idx, arr) => {
                    if (idx % 3 === 0) {
                        acc.push([arr[idx], arr[idx + 1]]);
                    }
                    return acc;
                }, []);
            }), {
                color: 'blue',
                weight: 4
            });

            // Agregar marcadores de inicio y fin
            var center = map.getCenter()
            startMarker = L.marker([origin.lat, origin.lng]);
            endMarker = L.marker([center.lat, center.lng]);

            // Crear contenido para los pop-ups
            var startPopupContent = `<div>
                                        <p>Start Marker</p>
                                        <button class='borrarRuta'>X</button>
                                    </div>`;
            var endPopupContent = `<div>
                                    <p>End Marker</p>
                                    <button class='borrarRuta'>X</button>
                                    </div>`;
            


            // Añadir pop-ups a los marcadores
            startMarker.bindPopup(startPopupContent);
            endMarker.bindPopup(endPopupContent);

            // Agregar los elementos al mapa
            routeLine.addTo(map);
            startMarker.addTo(map);
            endMarker.addTo(map);

            // Ajustar vista del mapa para incluir la ruta
            map.fitBounds(routeLine.getBounds());

        }
    };
    // Añadir evento global para cerrar pop-ups
    document.addEventListener('click', (event) => {
        if (event.target && event.target.classList.contains('borrarRuta')) {
            limpiarRutaAnterior();
        }
    });
    

    obtenerBboxDangerZone().then((result) => {
        var center = map.getCenter();
        console.log(result)
        avoidAreas = result
        const routingParameters = {
            'routingMode': 'fast',
            'transportMode': 'pedestrian',
            'origin': `${origin.lat},${origin.lng}`,
            'destination': `${center.lat},${center.lng}`,
            'return': 'polyline',
            'avoid[areas]': `${avoidAreas}` // Áreas a evitar
        };
        console.log(origin.lat, origin.lng);
        router.calculateRoute(routingParameters, onResult, function (error) {
            alert(error.message);
        });
        console.log(textoFormato)
        console.log(bboxArray);
    }).catch((err) => {

    });

}

// Evento para cambiar al modo de TRAZAR RUTA
document.getElementById('ruta-btn').addEventListener('click', function () {
    rutamode = true;
    var check = document.getElementById('destino-btn');
    check.style.display = 'block';
    var cancel = document.getElementById('cancelar-btn');
    cancel.style.display = 'block';
    var pin = document.getElementById('center-pin');
    pin.style.display = "block";
});

document.getElementById('destino-btn').addEventListener('click', function () {
    if (rutamode) {
        trazarRuta();
        var check = document.getElementById('destino-btn');
        check.style.display = 'none';
        var pin = document.getElementById("center-pin");
        pin.style.display = 'none';
        rutamode = false;
        var cancel = document.getElementById('cancelar-btn');
        cancel.style.display = 'none';
    }


});

document.getElementById('cancelar-btn').addEventListener('click', function () {
    
        var check = document.getElementById('destino-btn');
        check.style.display = 'none';
        var pin = document.getElementById("center-pin");
        pin.style.display = 'none';
        var cancel = document.getElementById('cancelar-btn');
        cancel.style.display = 'none';
    


});
