"use strict";

/**
 * CSUN Click-the-Box Quiz
 * - Map centered on CSUN
 * - Click polygon "boxes" on the map to answer the current prompt
 * - Draws boxes as google.maps.Polygon (NOT google.maps.Rectangle)
 * - Uses events: polygon.addListener("click", ...)
 */

// ============================
// A) ZONES
// ============================
// Box half-sizes (tweak these if boxes feel too big/small)
const LAT_HALF = 0.00018;
const LNG_HALF = 0.00022;

function boundsFromCenter(lat, lng) {
  return {
    north: lat + LAT_HALF,
    south: lat - LAT_HALF,
    east:  lng + LNG_HALF,
    west:  lng - LNG_HALF,
  };
}

const ZONES = [
  {
    id: "sequoia",
    title: "Sequoia Hall — E4",
    bounds: boundsFromCenter(34.2403854415989, -118.52825352250699),
  },
  {
    id: "jerome",
    title: "Jerome Richfield Hall",
    bounds: boundsFromCenter(34.23886768176015, -118.53088789971667),
  },
  {
    id: "maple",
    title: "Maple Hall",
    bounds: boundsFromCenter(34.23747668863912, -118.53123072962752),
  },
  {
    id: "juniper",
    title: "Juniper Hall",
    bounds: boundsFromCenter(34.24187364042609, -118.53061636480601),
  },
  {
    id: "eucalyptus",
    title: "Eucalyptus Hall",
    bounds: boundsFromCenter(34.2385587029562, -118.52812993292582),
  }
];
// ============================
// B) MAP SETTINGS: CSUN
// ============================
// CSUN center (covers campus well around zoom 15–16)
const CSUN_CENTER = { lat: 34.23975, lng: -118.52917 };
const CSUN_ZOOM = 16;

// ============================
// C) STATE
// ============================
let map = null;
let currentIndex = 0;
let correct = 0;
let incorrect = 0;
let gameOver = false;

let zonePolys = [];      // polygons we draw
let currentBarEl = null; // current question row on the left

// ============================
// D) DOM / UI HELPERS
// ============================
function $(id) {
  return document.getElementById(id);
}

function uiClearBars() {
  const bars = $("bars");
  if (bars) bars.innerHTML = "";
}

function uiAddQuestionBar(questionText) {
  const bars = $("bars");
  if (!bars) return null;

  const bar = document.createElement("div");
  bar.className = "bar";

  const q = document.createElement("div");
  q.className = "q";
  q.textContent = questionText;

  const a = document.createElement("div");
  a.className = "a";
  a.textContent = ""; // hidden until answered

  bar.appendChild(q);
  bar.appendChild(a);
  bars.appendChild(bar);
  return bar;
}

function uiSetAnswerOnBar(barEl, isCorrect) {
  if (!barEl) return;
  const a = barEl.querySelector(".a");
  if (!a) return;

  a.className = "a " + (isCorrect ? "ok" : "bad");
  a.textContent = isCorrect ? "Your answer is correct!!" : "Sorry wrong location.";
}

function uiShowFinalScore() {
  const scoreEl = $("finalScore");
  if (!scoreEl) return;
  scoreEl.style.display = "block";
  scoreEl.innerHTML = `${correct} Correct, ${incorrect}<br>Incorrect`;
}

function uiHideFinalScore() {
  const scoreEl = $("finalScore");
  if (scoreEl) scoreEl.style.display = "none";
}

// ============================
// E) GEOMETRY HELPERS
// ============================
function boundsToPath(b) {
  // 4 corners => rectangle-shaped polygon
  return [
    { lat: b.north, lng: b.west },
    { lat: b.north, lng: b.east },
    { lat: b.south, lng: b.east },
    { lat: b.south, lng: b.west },
  ];
}

// ============================
// F) BUILD THE MAP + POLYGONS
// ============================
async function startQuiz() {
  // Ensure bootloader is present
  if (!google?.maps?.importLibrary) {
    console.error("google.maps.importLibrary not found. Put the Google bootloader script ABOVE app.js in index.html.");
    return;
  }

  // Load maps library
  const { Map } = await google.maps.importLibrary("maps");

  // Create the map
  map = new Map($("map"), {
    center: CSUN_CENTER,
    zoom: CSUN_ZOOM,

    // If your assignment requires disabling panning/zooming, keep these:
    gestureHandling: "none",
    zoomControl: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    draggable: false,
    keyboardShortcuts: false,

    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  });

  // Reset game
  resetGame();

  // Draw all zones as clickable polygons
  drawZones();
}

window.addEventListener("load", startQuiz);

// ============================
// G) DRAW ZONES + CLICK EVENTS
// ============================
function drawZones() {
  // Clear old polygons if any
  for (const p of zonePolys) p.setMap(null);
  zonePolys = [];

  for (const zone of ZONES) {
    const poly = new google.maps.Polygon({
      paths: boundsToPath(zone.bounds),
      map,
      // default appearance (neutral blue)
      strokeColor: "#1b4f8a",
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: "#1b4f8a",
      fillOpacity: 0.12,
    });

    // Store zone id on the polygon
    poly.__zoneId = zone.id;

    // Clicking a polygon = attempting an answer
    poly.addListener("click", () => {
      if (gameOver) return;
      handleZoneClick(zone, poly);
    });

    zonePolys.push(poly);
  }
}

// ============================
// H) QUIZ LOGIC (CLICK TO ANSWER)
// ============================
function resetGame() {
  currentIndex = 0;
  correct = 0;
  incorrect = 0;
  gameOver = false;

  uiHideFinalScore();
  uiClearBars();

  if ($("restartBtn")) {
    $("restartBtn").style.display = "none";
    $("restartBtn").onclick = () => resetGame();
  }

  // show ONLY the first question
  currentBarEl = uiAddQuestionBar(`Where is ${ZONES[currentIndex].title}??`);

  // reset zone styles to neutral
  for (const p of zonePolys) {
    p.setOptions({
      strokeColor: "#1b4f8a",
      fillColor: "#1b4f8a",
      fillOpacity: 0.12,
    });
  }
}

function handleZoneClick(clickedZone, clickedPoly) {
  const targetZone = ZONES[currentIndex];
  const isCorrect = clickedZone.id === targetZone.id;

  // Update score
  if (isCorrect) correct++;
  else incorrect++;

  // Reveal answer line under the CURRENT question
  uiSetAnswerOnBar(currentBarEl, isCorrect);

  // Highlight ONLY the correct zone: green if correct guess, red if wrong guess
  // (This highlights the correct answer zone, not the clicked zone.)
  highlightCorrectZone(targetZone.id, isCorrect);

  // Move to next question
  currentIndex++;

  // End
  if (currentIndex >= ZONES.length) {
    gameOver = true;
    uiShowFinalScore();
    if ($("restartBtn")) $("restartBtn").style.display = "inline-block";
    return;
  }

  // Show next question ONLY AFTER answering
  currentBarEl = uiAddQuestionBar(`Where is ${ZONES[currentIndex].title}??`);
}

function highlightCorrectZone(correctZoneId, wasCorrect) {
  for (const p of zonePolys) {
    // reset all to neutral
    p.setOptions({
      strokeColor: "#1b4f8a",
      fillColor: "#1b4f8a",
      fillOpacity: 0.12,
    });
  }

  // find correct zone polygon
  const correctPoly = zonePolys.find(p => p.__zoneId === correctZoneId);
  if (!correctPoly) return;

  // color correct zone depending on whether user got it right
  correctPoly.setOptions({
    strokeColor: wasCorrect ? "#0b7d0b" : "#b10000",
    fillColor: wasCorrect ? "#0b7d0b" : "#b10000",
    fillOpacity: 0.28,
  });
}
