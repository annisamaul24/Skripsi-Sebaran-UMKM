// ==========================
// Inisialisasi Peta
// ==========================
var map = L.map('map').setView([-5.531802, 105.237589], 12);

// Base layer
var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    minZoom: 5,
    maxZoom: 18,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

var osmHOT = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors, Tiles style by HOT'
});

var esriSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
});

// Default layer
esriSat.addTo(map);

// ==========================
// Layer Batas Desa
// ==========================
var batasdesa = L.geoJSON(null, {
    style: function(feature) {
        return { color: "yellow", weight: 1, opacity: 1, fillOpacity: 0 };
    }
});
fetch('Geojson/batasdesa.geojson')
    .then(res => res.json())
    .then(data => batasdesa.addData(data));
    batasdesa.addTo(map);

// ==========================
// Layer Jaringan Jalan
// ==========================
var Jaringanjalan = L.geoJSON(null, {
    style: function(feature) { return { color: "red", weight: 1, opacity: 1 }; }
});
fetch('Geojson/Jaringanjalan.geojson')
    .then(res => res.json())
    .then(data => Jaringanjalan.addData(data));

// ==========================
// Layer Buffer UMKM
// ==========================
var BufferUMKM = L.geoJSON(null, {
    style: function(feature) {
        return { color: "cyan", weight: 2, opacity: 1, fillOpacity: 0.2 };
    }
});
fetch('Geojson/BufferUMKM.geojson')
    .then(res => res.json())
    .then(data => BufferUMKM.addData(data));

// ==========================
// Variabel Global untuk Routing
// ==========================
var routingControl = null;
var activeRouteMarkerId = null;
var markerMap = {}; // <-- menyimpan marker UMKM

// ==========================
// Warna marker balon Leaflet bawaan (PNG)
// ==========================
const warnaMarker = {
  "Jasa Lainnya": "grey",
  "Kebersihan dan Rumah Tangga": "orange",
  "Kerajinan dan Kreatif": "yellow",
  "Kuliner": "red",
  "Otomotif": "black",
  "Perawatan dan Kecantikan": "violet",
  "Perdagangan": "green",
  "Pariwisata dan Jasa Akomodasi": "blue",
  "Pertanian dan Perdagangan Bibit": "green"
};

function popupUMKM(feature, latlng) {
  let nama = feature.properties["NAMA_USAHA"] || "-";
  let foto = feature.properties["FOTO"] || "";
  let foto2 = feature.properties["FOTO2"] || "";
  let deskripsi = feature.properties["DESKRIPSI"] || "";
  let jenis = feature.properties["JENIS_USAHA"] || "-";
  let jam = feature.properties["JAM_OPERASIONAL"] || "-";
  let alamat = feature.properties["ALAMAT"] || "-";
  let id = feature.properties["ID"] || "";
  

  // Pilih warna marker, default biru
  let color = warnaMarker[jenis] || "blue";

  // Gunakan icon balon Leaflet warna berbeda
  var icon = new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  var marker = L.marker(latlng, { icon: icon });
  markerMap[id] = marker; // simpan marker berdasarkan ID
  

  // Bind popup lengkap
  marker.popupTemplate = function(infoTambahan = '') {
    return `
      <div class="max-w-xs max-h-72 overflow-y-auto bg-white rounded-xl shadow-md p-3">
        <h3 class="text-base font-bold text-center text-gray-800 mb-2">${nama}</h3>
        
${(foto || foto2) ? `
  <div class="mb-2 flex space-x-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400">
    ${foto ? `
      <div class="rounded-2xl p-2 shadow hover:shadow-lg transition-all duration-300 cursor-pointer w-40 flex-shrink-0"
           onclick="expandCard('${foto}')">
        <img src="${foto}" class="w-full h-38 object-cover rounded-xl"
             onerror="this.parentElement.style.display='none'">
      </div>
    ` : ''}

    ${foto2 ? `
      <div class="rounded-2xl p-2 shadow hover:shadow-lg transition-all duration-300 cursor-pointer w-40 flex-shrink-0"
           onclick="expandCard('${foto2}')">
        <img src="${foto2}" class="w-full h-38 object-cover rounded-xl"
             onerror="this.parentElement.style.display='none'">
      </div>
    ` : ''}
  </div>
` : ''}

        ${deskripsi ? `<p class="mb-2 text-sm text-gray-700 text-justify">${deskripsi.replace(/\n/g, "<br>&emsp;")}</p>` : ''}

        <div class="grid grid-cols-[auto,1fr] gap-x-1 gap-y-1 text-sm">
          <span class="font-semibold">Jenis Usaha</span><span>: ${jenis}</span>
          <span class="font-semibold">Jam Operasional</span><span>: ${jam}</span>
          <span class="font-semibold">Alamat</span><span>: ${alamat}</span>
        </div>

        <div class="mt-3 text-center space-x-2">
          <button onclick="tampilkanRute(${latlng.lat}, ${latlng.lng}, '${id}')"
            class="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded">Rute</button>
          <button onclick="hapusRute()"
            class="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded">Hapus</button>
          <button 
            onclick="toggleBuffer('${id}')" 
            data-buffer="${id}"
            class="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded">
            Buffer
          </button>
        ${infoTambahan}
      </div>
    `;
  };

  marker.bindPopup(marker.popupTemplate());
  return marker;
}

// ==========================================
// VARIABLE PENYIMPAN BUFFER
// ==========================================

// Menyimpan seluruh data GeoJSON buffer hasil fetch
var bufferGeojsonData = null;  

// Menyimpan layer buffer yang sedang tampil di map
var activeBufferLayer = null;
var activeBufferID = null; // <- ID UMKM yang buffer-nya sedang tampil

// ==========================================
// LOAD GEOJSON BUFFER DARI FILE
// ==========================================
fetch("Geojson/BufferUMKM.geojson")
  .then(res => res.json())
  .then(data => {
    bufferGeojsonData = data;   // Simpan hasil load ke variabel global
  });

function toggleBuffer(idUMKM) {
  // Kalau buffer sedang aktif untuk UMKM yang sama, berarti ini mode hapus
  if (activeBufferID === idUMKM) {
    if (activeBufferLayer) {
      map.removeLayer(activeBufferLayer);
    }
    activeBufferLayer = null;
    activeBufferID = null;

    // Ubah tombol kembali ke BUFFER
    updateBufferButtonText(idUMKM, "Buffer");
    return;
  }

  // Kalau buffer sedang aktif untuk UMKM lain, hapus dulu
  if (activeBufferLayer) {
    map.removeLayer(activeBufferLayer);
  }

  // Cari fitur buffer yang sesuai ID UMKM
  let feature = bufferGeojsonData.features.find(
    f => f.properties.ID == idUMKM
  );
  if (!feature) return;

  activeBufferLayer = L.geoJSON(feature, {
    style: {
      color: "cyan",
      weight: 2,
      fillOpacity: 0.15
    }
  }).addTo(map);

  activeBufferID = idUMKM;

  // Ubah tombol jadi HAPUS BUFFER
  updateBufferButtonText(idUMKM, "Hapus Buffer");
}

function updateBufferButtonText(idUMKM, text) {
  let btn = document.querySelector(`button[data-buffer='${idUMKM}']`);
  if (btn) btn.innerText = text;
}

//  LEGENDA PETA
const legendDiv = document.getElementById("legend-content");

for (let key in warnaMarker) {
    const img = document.createElement("img");
    img.src = `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${warnaMarker[key]}.png`;
    img.style.width = "15px";
    img.style.height = "24px";
    img.style.verticalAlign = "middle";
    img.style.marginRight = "5px";

    const label = document.createElement("span");
    label.textContent = key;

    const row = document.createElement("div");
    row.className = "flex items-center mb-1";
    row.appendChild(img);
    row.appendChild(label);

    legendDiv.appendChild(row);
}

// ==========================
// Fungsi Buat List di Sidebar (versi kelompok per jenis usaha)
// ==========================
function tambahListUMKM(namaDesa, data) {
  let listContainer = document.getElementById("list-umkm");

  let desaDiv = document.createElement("div");
  desaDiv.innerHTML = `<h4 class="font-bold text-lg text-gray-700 border-b pb-1 mb-2">${namaDesa}</h4>`;

  let grouped = {};

  // Kelompokkan per jenis usaha
  data.features.forEach(f => {
    let jenis = f.properties["JENIS_USAHA"] || "Lainnya";
    if (!grouped[jenis]) grouped[jenis] = [];
    grouped[jenis].push(f);
  });

  // Ambil semua jenis usaha lalu sort
  let jenisList = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  // Render per jenis usaha yang sudah diurutkan
  jenisList.forEach(jenis => {

    // Sort UMKM di dalamnya berdasarkan nama usaha
    grouped[jenis].sort((a, b) => {
      let namaA = a.properties["NAMA_USAHA"]?.toLowerCase() || "";
      let namaB = b.properties["NAMA_USAHA"]?.toLowerCase() || "";
      return namaA.localeCompare(namaB);
    });

    let jenisDiv = document.createElement("div");
    jenisDiv.innerHTML = `<p class="ml-2 font-medium text-blue-700">${jenis}</p>`;

    let ul = document.createElement("ul");
    ul.className = "ml-6 space-y-1 list-disc";

    grouped[jenis].forEach(f => {
      let id = f.properties["ID"];
      let nama = f.properties["NAMA_USAHA"];

      let li = document.createElement("li");
      li.innerHTML = `
        <button class="w-full text-left px-2 py-1 rounded hover:bg-blue-50"
          onclick="fokusUMKM('${id}', [${f.geometry.coordinates[1]}, ${f.geometry.coordinates[0]}])">
          ${nama}
        </button>
      `;
      ul.appendChild(li);
    });

    jenisDiv.appendChild(ul);
    desaDiv.appendChild(jenisDiv);
  });

  listContainer.appendChild(desaDiv);
}

//INFROMASI MENGAKTIFKAN LAYER DESA
map.on('overlayadd overlayremove', function(e) {
  var info = document.getElementById('info-layer');

  // contoh: jika layer desa mana pun aktif, sembunyikan info
  if (map.hasLayer(BATUMENYAN) || map.hasLayer(GEBANG) || map.hasLayer(SIDODADI) || map.hasLayer(HANURA) || map.hasLayer(CILIMUS) || map.hasLayer(HURUN) || map.hasLayer(SUKAJAYALEMPASING) || map.hasLayer(TANJUNGAGUNG) || map.hasLayer(TALANGMULYA)) {
    info.style.display = 'none';
  } else {
    info.style.display = 'block';
  }
});

// ==========================
// Fungsi Fokus ke Marker
// ==========================
function fokusUMKM(id, coords, desaLayer) {
  let marker = markerMap[id];

  if (!marker) {
    // Ambil data feature
    let featureData = null;

    // Coba cari feature di layer desa
    desaLayer.eachLayer(function(layer){
      if(layer.feature && layer.feature.properties.ID == id) {
        featureData = layer.feature;
      }
    });

    if(!featureData) return; // kalau data gak ada, hentikan

    // Buat marker
    marker = popupUMKM(featureData, L.latLng(coords[0], coords[1]));

    // Tambahkan ke map langsung
    marker.addTo(map);

    // Masukkan ke markerMap
    markerMap[id] = marker;
  }

  // Zoom & buka popup
  map.setView(coords, 16);
  marker.openPopup();
}

// ==========================
// Layer Desa (kosong dulu)
// ==========================
var BATUMENYAN           = L.geoJSON(null, { pointToLayer: popupUMKM });
var GEBANG               = L.geoJSON(null, { pointToLayer: popupUMKM });
var SIDODADI             = L.geoJSON(null, { pointToLayer: popupUMKM });
var HANURA               = L.geoJSON(null, { pointToLayer: popupUMKM });
var CILIMUS              = L.geoJSON(null, { pointToLayer: popupUMKM });
var HURUN                = L.geoJSON(null, { pointToLayer: popupUMKM });
var SUKAJAYALEMPASING    = L.geoJSON(null, { pointToLayer: popupUMKM });
var MUNCA                = L.geoJSON(null, { pointToLayer: popupUMKM });
var TANJUNGAGUNG         = L.geoJSON(null, { pointToLayer: popupUMKM });
var TALANGMULYA          = L.geoJSON(null, { pointToLayer: popupUMKM });

// Load data tiap desa
//BATU MENYAN
fetch("Geojson/DESA_BATU_MENYAN.geojson")
  .then(res => res.json())
  .then(data => {
      BATUMENYAN.addData(data);
      tambahListUMKM("Desa Batu Menyan", data);
      BATUMENYAN.addTo(map);
  });

//GEBANG
fetch("Geojson/DESA_GEBANG.geojson")
  .then(res => res.json())
  .then(data => {
      GEBANG.addData(data);
      tambahListUMKM("Desa Gebang", data);
      GEBANG.addTo(map);
  });

//SIDODADI
fetch("Geojson/DESA_SIDODADI.geojson")
  .then(res => res.json())
  .then(data => {
      SIDODADI.addData(data);
      tambahListUMKM("Desa Sidodadi", data);
      SIDODADI.addTo(map);
  });  

//Hanura
fetch("Geojson/DESA_HANURA.geojson")
  .then(res => res.json())
  .then(data => {
      HANURA.addData(data);
      tambahListUMKM("Desa Hanura", data);
      HANURA.addTo(map);
  });  

//CILIMUS
fetch("Geojson/DESA_CILIMUS.geojson")
  .then(res => res.json())
  .then(data => {
      CILIMUS.addData(data);
      tambahListUMKM("Desa Cilimus", data);
      CILIMUS.addTo(map);
  });

//HURUN
fetch("Geojson/DESA_HURUN.geojson")
  .then(res => res.json())
  .then(data => {
      HURUN.addData(data);
      tambahListUMKM("Desa Hurun", data);
      HURUN.addTo(map);
  });  

//SUKAJAYA LEMPASING
fetch("Geojson/DESA_LEMPASING.geojson")
  .then(res => res.json())
  .then(data => {
      SUKAJAYALEMPASING.addData(data);
      tambahListUMKM("Desa Sukajaya Lempasing", data);
      SUKAJAYALEMPASING.addTo(map);
  });

//MUNCA
fetch("Geojson/DESA_MUNCA.geojson")
  .then(res => res.json())
  .then(data => {
      MUNCA.addData(data);
      tambahListUMKM("Desa Munca", data);
      MUNCA.addTo(map);
  });

//TANJUNG AGUNG
fetch("Geojson/DESA_TANJUNG_AGUNG.geojson")
  .then(res => res.json())
  .then(data => {
      TANJUNGAGUNG.addData(data);
      tambahListUMKM("Desa Tanjung Agung", data);
      TANJUNGAGUNG.addTo(map);
  });

//TALANG MULYA
fetch("Geojson/DESA_TALANG_MULYA.geojson")
  .then(res => res.json())
  .then(data => {
      TALANGMULYA.addData(data);
      tambahListUMKM("Desa Talang Mulya", data);
      TALANGMULYA.addTo(map);
  });

// ==========================
// Icon marker untuk destinasi publik
// ==========================
var publicIcon = L.icon({
  iconUrl: 'image/pin.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

// ==========================
// Fungsi popup destinasi publik 
// ==========================
function popupDestinasi(feature, latlng) {
    // Ambil atribut dari GeoJSON
    let tempat = feature.properties.TEMPAT || "-";
    let jenis = feature.properties.JENIS || "-";
    let waktu = feature.properties.WAKTU_OPERASIONAL || "-";
    let deskripsi = feature.properties.DESKRIPSI || "-";
    let foto1 = feature.properties.FOTO || "";
    let foto2 = feature.properties.FOTO2 || "";

    // Konten popup
    let popupContent = `
        <div class="max-w-xs max-h-72 overflow-y-auto bg-white rounded-xl shadow-md p-3">
            <h3 class="text-lg font-bold text-center text-gray-800 mb-2">${tempat}</h3>

            ${(foto1 || foto2) ? `
            <div class="mb-2 flex space-x-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400">
                ${foto1 ? `
                <div class="rounded-2xl p-2 shadow hover:shadow-lg transition-all duration-300 cursor-pointer w-40 flex-shrink-0"
                     onclick="expandCard('${foto1}')">
                    <img src="${foto1}" class="w-full h-32 object-cover rounded-xl"
                         onerror="this.parentElement.style.display='none'">
                </div>` : ''}

                ${foto2 ? `
                <div class="rounded-2xl p-2 shadow hover:shadow-lg transition-all duration-300 cursor-pointer w-40 flex-shrink-0"
                     onclick="expandCard('${foto2}')">
                    <img src="${foto2}" class="w-full h-32 object-cover rounded-xl"
                         onerror="this.parentElement.style.display='none'">
                </div>` : ''}
            </div>` : ''}

            ${deskripsi ? `<p class="mb-2 text-sm text-gray-700 text-justify">${deskripsi.replace(/\n/g, "<br>&emsp;")}</p>` : ''}

            <div class="grid grid-cols-[auto,1fr] gap-x-1 gap-y-1 text-sm">
                <span class="font-semibold">Jenis Destinasi</span><span>: ${jenis}</span>
                <span class="font-semibold">Jam Operasional</span><span>: ${waktu}</span>
            </div>
        </div>
    `;

    // Buat marker dengan popup
    return L.marker(latlng, { icon: publicIcon }).bindPopup(popupContent);
}

// ==========================
// Load GeoJSON Destinasi Publik
// ==========================
var destinasiPublikLayer = L.geoJSON(null, {
    pointToLayer: popupDestinasi
})

// Misal file GeoJSON-nya berada di folder 'data'
fetch('Geojson/DestinasiPublik.geojson')
    .then(res => res.json())
    .then(data => destinasiPublikLayer.addData(data));


// ==========================
// Layer Control
// ==========================
var baseMaps = { 
    "OSM": osm, 
    "OSM HOT": osmHOT, 
    "Citra Satelit": esriSat 
};

var overlayMaps = { 
    "Batas Desa": batasdesa, 
    "Jaringan Jalan": Jaringanjalan,
    "Buffer UMKM (1km)": BufferUMKM,
    "Wisata dan Pasar" : destinasiPublikLayer,
    "Desa Batu Menyan": BATUMENYAN,
    "Desa Gebang" : GEBANG,
    "Desa Sidodadi" : SIDODADI,
    "Desa Hanura" : HANURA,
    "Desa Cilimus": CILIMUS,
    "Desa Hurun" : HURUN,
    "Desa Sukajaya Lempasing" : SUKAJAYALEMPASING,
    "Desa Munca" : MUNCA,
    "Desa Tanjung Agung": TANJUNGAGUNG,
    "Desa Talang Mulya" : TALANGMULYA
};

L.control.layers(baseMaps, overlayMaps, { collapsed: true }).addTo(map);

// ==========================
// Fungsi Routing
// ==========================
function tampilkanRute(latTujuan, lngTujuan, id) {
    if (!navigator.geolocation) { alert("Browser tidak mendukung geolokasi."); return; }

    navigator.geolocation.getCurrentPosition(function(pos) {
        var latAsal = pos.coords.latitude;
        var lngAsal = pos.coords.longitude;

        if (routingControl) { map.removeControl(routingControl); routingControl = null; }

        routingControl = L.Routing.control({
            waypoints: [ L.latLng(latAsal, lngAsal), L.latLng(latTujuan, lngTujuan) ],
            router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
            lineOptions: { styles: [{ color: 'blue', opacity: 0.7, weight: 5 }] },
            createMarker: function() { return null; },
            routeWhileDragging: false,
            show: true,
            addWaypoints: false
        }).addTo(map)
        .on('routesfound', function(e) {
            var route = e.routes[0];
            var waktuMenit = Math.round(route.summary.totalTime / 60);
            var jarakKm = (route.summary.totalDistance / 1000).toFixed(2);
            var info = `<div class='mt-2 text-xs text-gray-600'>&#128337; Perkiraan: ${waktuMenit} menit (${jarakKm} km)</div>`;

            var marker = markerMap[id];
            if (marker && marker.popupTemplate) {
                marker.setPopupContent(marker.popupTemplate(info)).openPopup();
                activeRouteMarkerId = id;
            }
        });

    }, function(err) { alert("Tidak dapat mengakses lokasi Anda."); console.error(err); });
}

function hapusRute() {
    if (routingControl) { map.removeControl(routingControl); routingControl = null; }
    if (activeRouteMarkerId && markerMap[activeRouteMarkerId]) {
        var marker = markerMap[activeRouteMarkerId];
        if (marker.popupTemplate) marker.setPopupContent(marker.popupTemplate()).openPopup();
        activeRouteMarkerId = null;
    }
}

// ==========================
// Marker Lokasi User
// ==========================
var userMarker = null;

var LokasiSayaButton = L.Control.extend({
    options: { position: 'topleft' },

    onAdd: function(map) {
        var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        container.style.backgroundColor = 'white';
        container.style.width = '34px';
        container.style.height = '34px';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.cursor = 'pointer';
        container.title = "Lokasi Saya";
        container.innerHTML = '📍';

        container.onclick = function() {
            if (!navigator.geolocation) { alert("Browser tidak mendukung geolokasi."); return; }

            navigator.geolocation.getCurrentPosition(function(pos) {
                var lat = pos.coords.latitude;
                var lng = pos.coords.longitude;

                if (userMarker) { map.removeLayer(userMarker); userMarker = null; }

                userMarker = L.circleMarker([lat,lng], {
                    radius: 10,
                    fillColor: "#3388ff",
                    color: "#ffffff",
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(map).bindPopup("Lokasi Anda").openPopup();

                map.setView([lat,lng], 14);
            }, function(err){ alert("Tidak bisa mendapatkan lokasi."); console.error(err); });
        };

        return container;
    }
});

map.addControl(new LokasiSayaButton());
