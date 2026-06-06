# Visualisasi Navigasi Objek Menggunakan Dijkstra dan Bézier Curve pada Grafika Komputer 2D

Proyek kuliah untuk mata kuliah Grafika Komputer. Sebuah aplikasi visualisasi 2D yang menggabungkan algoritma Dijkstra (untuk pathfinding) dan kurva Bézier (untuk smooth animation) dalam satu simulasi interaktif.

## Latar Belakang

Saat mengambil kuliah Grafika Komputer 2D, kami diminta membuat project yang mengimplementasikan minimal dua konsep penting. Ide ini muncul dari penggabungan dua topik yang sudah dipelajari: algoritma shortest path dan kurva parametrik. Hasilnya adalah sebuah simulator navigasi yang relatif kompleks namun cukup fleksibel untuk diperluas.

## Apa yang Bisa Dilakukan

- **Menemukan rute terpendek** di antara berbagai lokasi menggunakan Dijkstra
- **Animasi smooth** objek bergerak mengikuti rute yang telah dihitung
- **Visualisasi scene** dengan bangunan, jalan, dan elemen landscape
- **Interaksi realtime** melalui UI dan kontrol kamera
- **Generate rute random** untuk testing dan demo

## Tech Stack

Stack yang dipakai cukup sederhana:
- **HTML5 Canvas** untuk rendering 2D
- **Vanilla JavaScript (ES6+)** tanpa framework external
- Sedikit CSS untuk styling UI

Alasan tidak pakai library berat: ini project kuliah, dan tujuannya adalah belajar implementasi dari nol.

## Struktur Folder

```
js/
├── app/               # Entry point aplikasi
├── core/              # Algoritma core (Dijkstra, Graph, MinHeap)
├── city/              # Data dan konfigurasi kota/map
├── map/               # Asset map dan definisi node
├── render/            # Renderer untuk berbagai elemen (building, road, tree)
├── route/             # Route finding, smoothing, randomizing
├── ui/                # UI controls dan camera controller
├── utils/             # Utility functions (Bézier curve)
├── vehicle/           # Model dan animasi kendaraan
└── main.js            # Starter file
```

File yang penting:
- `Dijkstra.js` - algoritma pathfinding
- `bezier.js` - fungsi Bézier untuk smooth curve
- `RouteSmoother.js` - aplikasi Bézier ke rute yang dihasilkan Dijkstra
- `VehicleAnimation.js` - animasi objek bergerak

## Cara Menjalankan

**Requirement:**
- Browser yang support HTML5 Canvas (basically semua browser modern)
- Local web server (opsional tapi recommended untuk menghindari CORS issues)

**Setup:**

1. Clone/download repository
2. Buka terminal di folder project
3. Jalankan local server:
   ```bash
   # Python 3
   python -m http.server 8000
4. Buka `http://localhost:8000` di browser
5. Gunakan UI buttons untuk control simulasi, drag mouse untuk geser viewport

Atau langsung buka `index.html` (tapi ada beberapa limitation tanpa server)

## Algoritma yang Dipakai

### Dijkstra's Algorithm
Untuk menemukan shortest path antara dua node. Implementasi kami pakai MinHeap untuk optimize extraction dari priority queue. Complexity: O((V + E) log V), cukup efisien untuk graph yang reasonable size.

### Bézier Curve
Setelah Dijkstra ngasih rute (yang biasanya jagged/straight lines), kami pakai Bézier curve untuk smooth-in path tersebut. Hasilnya gerakan objek jadi lebih natural dan halus, bukan loncat-loncat dari node ke node.

### MinHeap Implementation
Struktur data penting untuk bikin Dijkstra efficient. Tanpa ini, pencarian rute bakal jauh lebih lambat, terutama untuk graph yang besar.

## Bagaimana Cara Kerjanya

1. Load map dan define nodes/graph
2. User pilih start dan end point
3. Dijkstra compute rute terpendek
4. Bézier curve smooth-in rute tersebut
5. Kendaraan animate bergerak mengikuti path yang sudah di-smooth
6. Scene di-render real-time dengan semua elemen visual
7. User bisa interact dengan UI atau kontrol kamera
8. Loop terus sampai simulasi selesai atau user stop