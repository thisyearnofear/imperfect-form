let detector;
let detectorConfig;
let poses;
let video;
let skeleton = true;
let model;
let elbowAngle = 999;
let backAngle = 0;
let reps = 0;
let upPosition = false;
let downPosition = false;
let highlightBack = false;
let backWarningGiven = false;
let started = false;
let videoInitialized = false;
let detectorReady = false;
let loading = false;
let loadingRings;
let exerciseCounter;
let loadingContainer;
let loadingInstructionIndex = 0;
let loadingInstructionInterval;
let timer;
let timeLeft = 120; // 120 seconds
let timerInterval;
let firstExerciseDetected = false;
let exerciseMode = "pushups";
let modeButton;
let squatFeedbackText = "";
let squatAngle = 0;
let targetSquatAngle = 90;
let squatThreshold = 15;
let lastSpokenMessage = "";
let lastSpokenTime = 0;
let isInCorrectPosition = false;
let lastValidSquatAngle = 180;
let squatStartTime = 0;
let lastSquatType = "";
let farcasterListenerAdded = false;
let faceMesh;
let faceMeshResults;
let filterOptions = [
  { name: "none", path: null },
  { name: "nose", path: "/assets/nose.png" },
  { name: "tache", path: "/assets/mustache.png" },
  { name: "arch", path: "/assets/arch.png" },
  { name: "degen", path: "/assets/degen.png" },
];
let currentFilterIndex = 0;
let currentFilter = "none";
let noseFilter; // Variable to hold the filter image
let fallbackActivated = false; // Track if fallback is activated
let frameCount = 0;

const SQUAT_HOLD_TIME = 500; // milliseconds
const PARTIAL_SQUAT_ANGLE = 150;
const PARALLEL_SQUAT_ANGLE = 110;
const DEEP_SQUAT_ANGLE = 80;
const channelOptions = [
  {
    name: "Fitness",
    parent_url:
      "chain://eip155:1/erc721:0xee442da02f2cdcbc0140162490a068c1da94b929",
  },
  { name: "Very Internet Person", parent_url: "https://veryinter.net/person" },
  { name: "Spanish", parent_url: "https://farcaster.group/spanish" },
  { name: "Wellness", parent_url: "https://farcaster.group/wellness" },
  { name: "Random", parent_url: "https://farcaster.group/random" },
];
const memeUrl = "https://imgur.com/a/imperfect-form-aviu4z4";

// Initialize FaceMesh
async function initFaceMesh() {
  if (fallbackActivated) return; // Skip FaceMesh initialization if fallback is activated

  try {
    if (faceMesh) {
      await faceMesh.close();
    }
    faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      },
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    faceMesh.onResults(onFaceMeshResults);
  } catch (error) {
    console.error("Error initializing FaceMesh:", error);
    alert("Unable to initialize FaceMesh. Please try again later.");
  }
}

// Handle FaceMesh results
function onFaceMeshResults(results) {
  faceMeshResults = results;
}

// Load the filter image
function preload() {
  noseFilter = loadImage("/assets//nose.png"); // Adjust the path as necessary
}

// Start FaceMesh processing
async function startFaceMesh() {
  if (fallbackActivated) return; // Skip FaceMesh processing if fallback is activated

  if (video && faceMesh) {
    try {
      const sendToFaceMesh = async () => {
        if (faceMesh) {
          await faceMesh.send({ image: video.elt });
          requestAnimationFrame(sendToFaceMesh);
        }
      };
      sendToFaceMesh();
    } catch (error) {
      console.error("Error processing FaceMesh:", error);
    }
  } else {
    // If faceMesh is null, try to reinitialize it
    await initFaceMesh();
    startFaceMesh();
  }
}

async function sendToFaceMesh() {
  if (fallbackActivated) return; // Skip FaceMesh processing if fallback is activated

  if (!faceMesh || !video || !video.elt) {
    console.error("FaceMesh or video is not initialized.");
    return;
  }

  try {
    await faceMesh.send({ image: video.elt });
    requestAnimationFrame(sendToFaceMesh);
  } catch (error) {
    console.error("Error processing FaceMesh:", error);
  }
}
function setup() {
  const canvas = createCanvas(640, 480);
  canvas.parent("canvasContainer");

  // Call adjustCanvasSize initially and on window resize
  adjustCanvasSize();
  window.addEventListener("resize", adjustCanvasSize);

  let startButton = select("#startButton");
  startButton.mousePressed(startDetection);

  let stopButton = select("#stopButton");
  stopButton.mousePressed(stopDetection);

  let resetButton = select("#resetButton");
  resetButton.mousePressed(resetDetection);

  modeButton = select("#modeButton");
  modeButton.mousePressed(toggleMode);

  loadingContainer = select(".loading-container");
  loadingContainer.hide();

  timer = select(".timer");
  timer.html(formatTime(timeLeft));

  exerciseCounter = createDiv(
    `${capitalizeFirstLetter(exerciseMode)} Completed: 0`
  );
  exerciseCounter.parent("screen");
  exerciseCounter.position(10, 10);
  exerciseCounter.class("exercise-counter styled-text");
  exerciseCounter.hide();

  showInstructions(); // Add this line to show instructions immediately
  initFaceMesh();
}

function showInstructions() {
  const welcomeMessage = select("#welcomeMessage");
  const instructions = select("#instructions");
  const buttonContainer = select("#buttonContainer");
  const timer = select(".timer");

  if (welcomeMessage) welcomeMessage.hide();
  if (instructions) {
    instructions.show();
    updateInstructions();
  }

  if (buttonContainer) buttonContainer.show();
  if (timer) timer.show();
}

function updateInstructions() {
  let instructions = select("#instructions");
  let content = `
    <p>a) Press START to begin</p>
    <p>b) Press STOP to end the session</p>
    <p>c) Press RESET to start again</p>
    <p>Current mode: ${exerciseMode.toUpperCase()}</p>
  `;

  // Apply styling to the text
  const styledContent = content
    .replace(/START/g, '<span class="button-text start">START</span>')
    .replace(/STOP/g, '<span class="button-text stop">STOP</span>')
    .replace(/RESET/g, '<span class="button-text reset">RESET</span>')
    .concat(
      '<p class="built-by">Built by <a href="https://warpcast.com/papa" target="_blank" class="highlight">PAPA</a></p>'
    );

  // Set the styled content to the instructions element
  instructions.html(styledContent);
}

const loadingInstructions = [
  "Position the camera so full body is visible",
  "Ensure fantastic lighting - important",
  "PUSH: Hands shoulder-width apart, back straight",
  "PUSH: Lower body to inch from ground, extend arms fully",
  "SQUAT: Stand with feet shoulder-width apart",
  "Maintain a steady pace throughout",
  "Stretch while you wait?",
  "Any issues: RESET & START again",
  "Tested on Brave (fast), Chrome (med) & Safari (slow)",
  "Chrome: enable hardware acceleration in settings",
  "Mobile: open inside wallet browswer for onchain powers",
];

function toggleMode() {
  if (!started) {
    // Switch between exercise modes
    exerciseMode = exerciseMode === "pushups" ? "squats" : "pushups";
    modeButton.html(`MODE: ${exerciseMode.toUpperCase()}`);
    updateInstructions();
    exerciseCounter.html(`${capitalizeFirstLetter(exerciseMode)} Completed: 0`);
  } else {
    // Switch between filter options
    currentFilterIndex = (currentFilterIndex + 1) % filterOptions.length;
    currentFilter = filterOptions[currentFilterIndex].name;
    noseFilter =
      currentFilter === "none"
        ? null
        : loadImage(filterOptions[currentFilterIndex].path);
    modeButton.html(`FILTER: ${currentFilter.toUpperCase()}`);
  }
}

function startDetection() {
  if (!started) {
    started = true;
    loading = true;
    showView(".loading-container");

    modeButton.html(
      `FILTER: ${filterOptions[currentFilterIndex].name.toUpperCase()}`
    );

    timer.show();
    cycleLoadingInstructions();

    userStartAudio()
      .then(() => {
        console.log("Audio context started successfully");
        if (!videoInitialized) {
          videoInitialized = true;
          video = createCapture(VIDEO, () => {
            console.log("Webcam access granted");
            video.hide();
            initDetector();

            // Check if WebGL is available before starting FaceMesh
            if (isWebGLAvailable()) {
              startFaceMesh();
            } else {
              console.error(
                "WebGL is not available. FaceMesh will not be started."
              );
            }
          });
          video.parent("canvasContainer");
        }
      })
      .catch((error) => {
        console.error("Error starting audio context:", error);
      });
  }
}

// Function to check if WebGL is available
function isWebGLAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!window.WebGLRenderingContext && !!canvas.getContext("webgl");
  } catch (e) {
    return false;
  }
}

function stopDetection() {
  if (video) {
    video.stop();
    video.remove();
  }

  // Ensure FaceMesh is properly closed
  if (faceMesh) {
    try {
      faceMesh.close(); // Close FaceMesh instance
    } catch (error) {
      console.error("Error closing FaceMesh:", error);
    }
    faceMesh = null; // Nullify to prevent further access
  }

  noLoop();
  clear();
  clearInterval(timerInterval);
  console.log("Detection stopped");

  showPositiveMessage();

  showSummary();

  // Reset mode button to exercise mode selection
  modeButton.html(`MODE: ${exerciseMode.toUpperCase()}`);
  modeButton.removeAttribute("disabled");
  currentFilterIndex = 0;
  currentFilter = "none";
}

function showView(viewToShow) {
  select("#welcomeMessage").hide();
  select("#instructions").hide();
  select(".loading-container").hide();
  select("#canvasContainer").hide();

  select(viewToShow).show();
}

function updateFormattedTimeSpent() {
  const timeSpent = 120 - timeLeft;
  formattedTimeSpent = formatTime(timeSpent);
}

function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft--;
    timer.html(formatTime(timeLeft));
    updateFormattedTimeSpent();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      stopDetection();
      alert("Time's up! Great job!");
    }
  }, 1000);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

function cycleLoadingInstructions() {
  const instructionElement = select(".loading-instruction");

  function updateInstruction() {
    instructionElement.style("opacity", "0");

    setTimeout(() => {
      loadingInstructionIndex =
        (loadingInstructionIndex + 1) % loadingInstructions.length;
      instructionElement.html(loadingInstructions[loadingInstructionIndex]);
      instructionElement.style("opacity", "1");
    }, 500);
  }

  updateInstruction();
  loadingInstructionInterval = setInterval(updateInstruction, 3000);
}

function hideLoadingScreen() {
  loading = false;
  showView("#canvasContainer");
  clearInterval(loadingInstructionInterval);
}

/*
function checkOrientation() {
  if (window.innerHeight > window.innerWidth) {
    document.getElementById("orientationMessage").style.display = "flex";
    document.getElementById("game-container").style.display = "none";
  } else {
    document.getElementById("orientationMessage").style.display = "none";
    document.getElementById("game-container").style.display = "flex";
    document.getElementById("game-container").style.height = "100vh";
    document.getElementById("game-container").style.overflowY = "auto";
    adjustLayoutForMobile();
  }
}
*/

function adjustCanvasSize() {
  const screen = document.getElementById("screen");
  const screenWidth = screen.offsetWidth;
  const screenHeight = screen.offsetHeight;

  // Ensure resizeCanvas is called from p5.js context
  if (typeof resizeCanvas === "function") {
    resizeCanvas(screenWidth, screenHeight);
  } else {
    console.error("resizeCanvas is not defined.");
  }
}

function adjustLayoutForMobile() {
  const gameContainer = document.getElementById("game-container");
  const screen = document.getElementById("screen");
  const controls = document.getElementById("controls");
  const banner = document.getElementById("banner");
  const leaderboardContainer = document.getElementById("leaderboardContainer");
  const feedbackContainer = document.getElementById("feedbackContainer");

  const isPortrait = window.innerHeight > window.innerWidth;
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    gameContainer.style.flexDirection = "column";
    screen.style.width = "100%";
    screen.style.maxWidth = "none";
    screen.style.aspectRatio = "4 / 3";

    controls.style.flexDirection = "row";
    controls.style.flexWrap = "wrap";
    controls.style.justifyContent = "center";
    controls.style.marginTop = "10px";

    if (feedbackContainer) {
      feedbackContainer.style.position = "absolute";
      feedbackContainer.style.bottom = "10px";
      feedbackContainer.style.left = "10px";
      feedbackContainer.style.right = "10px";
      feedbackContainer.style.background = "rgba(0, 0, 0, 0.7)";
      feedbackContainer.style.padding = "5px";
      feedbackContainer.style.borderRadius = "5px";
      feedbackContainer.style.fontSize = "12px";
    }
  } else {
    gameContainer.style.flexDirection = "column";
    screen.style.width = "100%";
    screen.style.maxWidth = "640px";
    screen.style.aspectRatio = "4 / 3";

    controls.style.flexDirection = "row";
    controls.style.flexWrap = "nowrap";
    controls.style.justifyContent = "center";
    controls.style.marginTop = "10px";

    if (feedbackContainer) {
      feedbackContainer.style.position = "absolute";
      feedbackContainer.style.bottom = "20px";
      feedbackContainer.style.left = "20px";
      feedbackContainer.style.right = "20px";
      feedbackContainer.style.background = "rgba(0, 0, 0, 0.7)";
      feedbackContainer.style.padding = "10px";
      feedbackContainer.style.borderRadius = "5px";
      feedbackContainer.style.fontSize = "14px";
    }
  }

  if (banner) banner.style.display = "flex";
  if (leaderboardContainer)
    leaderboardContainer.style.display = isMobile ? "none" : "block";

  adjustCanvasSize();
}

// Call adjustLayoutForMobile on load and resize
window.addEventListener("load", adjustLayoutForMobile);
window.addEventListener("resize", adjustLayoutForMobile);

//window.addEventListener("load", checkOrientation);
//window.addEventListener("resize", checkOrientation);

function showSummary() {
  const summaryModal = select("#summaryModal");
  const summaryText = select("#summaryText");

  updateFormattedTimeSpent();

  let medalText = "";
  if (reps >= 30) {
    medalText = "🏅 Gold Medal! Excellent job!";
  } else if (reps >= 20) {
    medalText = "🥈 Silver Medal! Great effort!";
  } else if (reps >= 10) {
    medalText = "🥉 Bronze Medal! Good work!";
  } else {
    medalText = "Practice makes...less imperfect!";
  }

  summaryText.html(`
    <p>${capitalizeFirstLetter(exerciseMode)} Completed: ${reps}</p>
    <p>Time Spent: ${formattedTimeSpent}</p>
    <p>${medalText}</p>
  `);

  document.getElementById("connectWalletButton").style.display = "inline-block";
  document.getElementById("submitScoreButton").style.display = "none";
  document.getElementById("submissionStatus").textContent = "";

  summaryModal.style("display", "block");

  const closeButton = select(".close-button");
  if (closeButton) {
    closeButton.mousePressed(() => {
      summaryModal.style("display", "none");
    });
  } else {
    console.error("Close button not found");
  }

  // Enable sharing buttons
  document.getElementById("shareFarcasterButton").disabled = true;
  document.getElementById("shareTwitterButton").disabled = true;
  document.getElementById("shareLensButton").disabled = true;

  // event listener for the Farcaster button
  if (!farcasterListenerAdded) {
    const farcasterButton = document.getElementById("shareFarcasterButton");
    farcasterButton.addEventListener("click", shareFarcaster);
    farcasterListenerAdded = true;
  }

  const shareTwitterButton = document.getElementById("shareTwitterButton");
  shareTwitterButton.addEventListener("click", () => {
    const tweetText = `I just rocked ${reps} ${exerciseMode} in ${formattedTimeSpent} #ImperfectForm\n\nBuilt on @base & @0xPolygon\n\nhttps://imperfect-form-v2.vercel.app`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      tweetText
    )}`;
    window.open(tweetUrl, "_blank");
  });
}

function shareFarcaster() {
  const transactionDetails =
    window.transactionHash && window.selectedNetwork
      ? `\n\nTransaction Hash: ${window.transactionHash}\n\nChain: ${
          window.selectedNetwork === "amoy"
            ? "Polygon Amoy Testnet"
            : "Base Sepolia Testnet"
        }`
      : "";

  // Open a new window with a blank page
  const newWindow = window.open("", "_blank");

  // Check if the new window was successfully opened
  if (newWindow) {
    // Write the initial HTML with just the sign-in button
    newWindow.document.write(`
    <html>
      <head>
        <style>
    body {
      background-color: #000;
      font-family: 'Arial', sans-serif; /* Changed to a more homely font */
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      color: #fff;
      background-image: linear-gradient(45deg, #000 25%, #111 25%, #111 50%, #000 50%, #000 75%, #111 75%, #111 100%);
      background-size: 40px 40px;
    }
    .neynar-container {
      background-color: #000;
      border: 3px solid #fcb131;
      border-radius: 10px;
      padding: 30px; /* Increased padding for a more spacious feel */
      text-align: center;
      max-width: 350px; /* Increased max width */
    }
    .neynar-button,
    .confirm-cast-button {
      background-color: #9146ff;
      color: #fff;
      border: none;
      padding: 12px 24px; /* Increased padding for a more substantial button */
      font-family: 'Arial', sans-serif; /* Changed font */
      font-size: 16px; /* Increased font size */
      cursor: pointer;
      transition: all 0.3s ease;
      margin-top: 10px;
      border-radius: 5px; /* Added border radius for a softer look */
    }
    .neynar-button:hover,
    .confirm-cast-button:hover {
      transform: scale(1.05); /* Slightly reduced scale for a more subtle effect */
      box-shadow: 0 0 10px #9146ff;
    }
    .confirm-cast-container {
      background-color: rgba(0, 0, 0, 0.8);
      border: 4px solid #fcb131;
      border-radius: 10px;
      padding: 25px; /* Adjusted padding */
      text-align: center;
      max-width: 320px; /* Increased max width */
      box-shadow: 0 0 20px #fcb131, 0 0 30px #416ced, 0 0 40px #ff69b4;
    }
    .confirm-cast-text {
      font-size: 16px; /* Increased font size */
      margin-bottom: 20px;
    }
    .cast-preview {
      width: 100%;
      margin-bottom: 15px;
      font-size: 14px; /* Kept consistent */
      color: #fff;
      padding: 10px;
      border-radius: 5px;
      border: 2px solid #416ced;
      background-color: rgba(65, 108, 237, 0.1);
      white-space: normal; 
      word-wrap: break-word;
      text-align: center; /* Centered the text */
      line-height: 1.5; /* Increased line height for readability */
    }
    .channel-select {
      width: 100%;
      padding: 10px; /* Increased padding */
      margin-bottom: 10px;
      font-family: 'Arial', sans-serif; /* Changed font */
      font-size: 14px; /* Adjusted font size */
      background-color: #000;
      color: #fcb131;
      border: 2px solid #ff69b4;
      border-radius: 5px;
      text-align: center; /* Centered the text */
    }
  </style>
       <script src="https://cdn.socket.io/4.8.0/socket.io.min.js"></script>
      </head>
      <body>
        <div class="neynar-container">
          <h2>Imperfect Form</h2>
          <div class="neynar_signin" data-client_id="9c260f93-357a-4952-8090-a03f10e742f4" data-success-callback="onSignInSuccess" data-theme="dark"></div>
        </div>
        <script src="https://neynarxyz.github.io/siwn/raw/1.2.0/index.js" async></script>
        <script>
          let signedIn = false;
          let signerData = null;

          // Function called on successful sign-in
          function onSignInSuccess(data) {
            console.log("Sign-in success with data:", data);
            signedIn = true;
            signerData = data;

            // Establish a Socket.io connection to the server
            const socket = io("https://imperfect-form.onrender.com/");

            socket.on("connect", () => {
              console.log("Connected to Socket.io server");

              // Send sign-in data and workout details to the server
              socket.emit("store-signer", {
                signer_uuid: data.signer_uuid,
                fid: data.fid,
                reps: ${reps},
                exerciseMode: '${exerciseMode}',
                formattedTimeSpent: '${formattedTimeSpent}',
              });

              // Handle server response for storing signer data
              socket.on("store-signer-response", (response) => {
                console.log(response);
                if (response.success) {
                  // Update the UI to show the text area and confirm button after sign-in
                  document.body.innerHTML = \`
                     <div class="confirm-cast-container">
    <h2>Share Cast</h2>
    <select id="channelSelect" class="channel-select">
      ${channelOptions
        .map(
          (channel) =>
            `<option value="${channel.parent_url}">${channel.name}</option>`
        )
        .join("")}
    </select>
    <div id="castPreview" class="cast-preview">
      <p>I just rocked ${reps} ${exerciseMode} in ${formattedTimeSpent} on /imperfectform https://imperfect-form-v2.vercel.app</p>
      <p>Built on @base & @0xPolygon</p>
      <p>${transactionDetails}</p>
    </div>
    <button id="confirmCastButton" class="confirm-cast-button">Confirm and Send</button>
  </div>
                  \`;

                  // Add event listener for the Confirm and Send button
                  document.getElementById("confirmCastButton").addEventListener("click", () => {
                    const castText = document.getElementById("castPreview").innerText;
                    const selectedChannel = document.getElementById("channelSelect").value;

                    // Log the selected channel to the console
                    console.log('Confirm and Send button clicked with text:', castText);
                    console.log('Selected channel:', selectedChannel);

                    socket.emit("confirm-cast", {
                      signer_uuid: data.signer_uuid,
                      text: castText,
                      embeds: [{ url: '${memeUrl}' }],
                      parent: selectedChannel
                    });
                    console.log('Confirm-cast message sent');
                  });
                } else {
                  console.error('Error storing signer:', response.error);
                }
              });

              // Handle the confirm-cast response from the server
              socket.on("confirm-cast-response", (response) => {
                if (response.success) {
                  alert("Successfully shared on Farcaster!");
                } else {
                  alert("Failed to share on Farcaster: " + response.error);
                }
              });
            });

            // Handle disconnection from the server
            socket.on("disconnect", () => {
              console.log("Disconnected from Socket.io server");
            });
          }
        </script>
      </body>
    </html>
   `);
    newWindow.document.close();
  } else {
    alert("Popup blocked! Please allow popups for this website.");
  }
}

function showPositiveMessage() {
  const positiveMessages = [
    "Smashed It!",
    "Shoutout to you for showing up",
    "Consistency + Effort = Awesome Fitness",
    "Exercise helps reduce stress & anxiety, improving sleep & cognition.",
    "Strong muscles, killer cardio, age like a champion.",
  ];

  const randomMessage =
    positiveMessages[Math.floor(Math.random() * positiveMessages.length)];

  const messageContainer = createDiv();
  messageContainer.parent("screen");
  messageContainer.class("positive-message");
  messageContainer.html(`
    <p>${randomMessage}</p>
    <p>Thanks for Playing!</p>
  <p>Click <span class="button-text reset">RESET</span> to see instructions.</p>
  `);
}

async function resetDetection() {
  // Stop and remove the video capture
  if (video) {
    video.stop();
    video.remove();
    video = null; // Ensure video is nullified
  }

  // Reset state variables
  videoInitialized = false;
  started = false;
  reps = 0;
  timeLeft = 120;
  firstExerciseDetected = false;
  timer.html(formatTime(timeLeft));
  clear();
  console.log("Application reset");
  loop();

  // Remove any positive messages or welcome messages
  const positiveMessage = select(".positive-message");
  if (positiveMessage) {
    positiveMessage.remove();
  }

  const welcomeMessage = select("#welcomeMessage");
  if (welcomeMessage) {
    welcomeMessage.hide();
  }

  // Show instructions and update UI
  showView("#instructions");
  updateInstructions();

  // Reset UI elements
  modeButton.removeAttribute("disabled");
  squatFeedbackText = "";
  squatAngle = 0;

  // Ensure FaceMesh is properly closed and nullified
  if (faceMesh) {
    try {
      await faceMesh.close();
    } catch (error) {
      console.error("Error closing FaceMesh:", error);
    }
    faceMesh = null;
  }
  detectorReady = false;
}

function startUserAudio() {
  let audioCtx = getAudioContext();
  if (audioCtx.state !== "running") {
    audioCtx
      .resume()
      .then(() => {
        console.log("Audio context started successfully");
      })
      .catch((error) => {
        console.error("Error starting audio context:", error);
      });
  }
}

async function initDetector() {
  detectorConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
  };

  try {
    await tf.setBackend("webgl");
    await tf.ready();
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      detectorConfig
    );
  } catch (webglError) {
    console.warn("WebGL initialization failed, trying WASM.");
    try {
      await tf.setBackend("wasm");
      await tf.ready();
      detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        }
      );
    } catch (wasmError) {
      console.warn(
        "WASM initialization failed, trying TensorFlow.js fallback."
      );
      // Load the fallback script for TensorFlow.js
      loadFallbackScripts();
      fallbackActivated = true; // Activate fallback
    }
  }

  if (detector) {
    detectorReady = true;
    hideLoadingScreen();
    getPoses();
  } else {
    // Do not initialize FaceMesh if detector is not ready
    faceMesh = null; // Ensure faceMesh is null
  }
}

async function getPoses() {
  if (detectorReady && videoInitialized && detector) {
    // Check if detector is initialized
    try {
      poses = await detector.estimatePoses(video.elt);
      const delay = tf.getBackend() === "wasm" ? 200 : 100; // Increase delay for WASM
      setTimeout(getPoses, delay); // Adjusted delay for WASM
    } catch (error) {
      console.error("Error estimating poses:", error);
    }
  }
}

async function initBlazePose() {
  try {
    const pose = new window.Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults(onBlazePoseResults);

    detector = pose;
    detectorReady = true;
    hideLoadingScreen();
    getPosesWithBlazePose();
  } catch (error) {
    console.error("Error initializing BlazePose:", error);
    alert(
      "Unable to initialize pose detection. Please try a different browser or device."
    );
  }
}

function draw() {
  if (loading || !started) {
    return;
  }

  if (video && video.width > 0) {
    background(220);
    translate(width, 0);
    scale(-1, 1);
    image(video, 0, 0, video.width, video.height);

    if (poses && poses.length > 0) {
      drawKeypoints();
      if (skeleton) {
        drawSkeleton();
      }
      if (exerciseMode === "pushups") {
        updateArmAngle();
        updateBackAngle();
        inUpPosition();
        inDownPosition();
      } else if (exerciseMode === "squats") {
        detectSquat();
        isInCorrectPosition = checkUserPosition();
      }
    }

    // Draw FaceMesh landmarks only if FaceMesh is enabled and no filter is applied
    if (faceMesh && faceMeshResults && faceMeshResults.multiFaceLandmarks) {
      // Check if multiFaceLandmarks has at least one face detected
      if (faceMeshResults.multiFaceLandmarks.length > 0) {
        // Skip drawing landmarks if a filter is applied
        if (currentFilter === "none") {
          for (const landmarks of faceMeshResults.multiFaceLandmarks) {
            drawFaceMeshLandmarks(landmarks);
          }
        }

        // Draw the filter if it's not "none"
        if (currentFilter !== "none" && noseFilter) {
          const nose = faceMeshResults.multiFaceLandmarks[0][1]; // Accessing the nose landmark
          const x = nose.x * width; // Scale to canvas size
          const y = nose.y * height; // Scale to canvas size

          image(
            noseFilter,
            x - noseFilter.width / 2,
            y - noseFilter.height / 2
          );
        }
      }
    }

    resetMatrix();
    fill(255);
    strokeWeight(2);
    stroke(51);
    textSize(40);
    textAlign(LEFT, TOP);

    fill(252, 177, 49); // #fcb131 color
    noStroke();
    textFont("Press Start 2P");
    textSize(20);
    text(`${capitalizeFirstLetter(exerciseMode)}: ${reps}`, 10, 10);

    // Add visual feedback for squats
    if (exerciseMode === "squats") {
      // Draw squat angle indicator
      let angleIndicatorY = height - 100;
      stroke(255);
      strokeWeight(2);
      line(10, angleIndicatorY, width - 10, angleIndicatorY);

      // Draw current angle indicator
      let indicatorX = map(squatAngle, 180, 0, 10, width - 10);
      fill(255, 0, 0);
      noStroke();
      ellipse(indicatorX, angleIndicatorY, 20, 20);

      // Draw target angle ranges
      drawAngleRange(PARTIAL_SQUAT_ANGLE, 180, angleIndicatorY);
      drawAngleRange(
        PARALLEL_SQUAT_ANGLE,
        PARTIAL_SQUAT_ANGLE,
        angleIndicatorY
      );
      drawAngleRange(0, PARALLEL_SQUAT_ANGLE, angleIndicatorY);
    }
  }
}

// Function to draw FaceMesh landmarks
function drawFaceMeshLandmarks(landmarks) {
  for (const landmark of landmarks) {
    fill(0, 255, 0);
    noStroke();
    ellipse(landmark.x * width, landmark.y * height, 5, 5);
  }
}

function drawAngleRange(start, end, label, y) {
  const startX = map(end, 180, 0, 10, width - 10);
  const endX = map(start, 180, 0, 10, width - 10);
  const rangeWidth = endX - startX;

  fill(0, 255, 0, 100);
  noStroke();
  rect(startX, y - 10, rangeWidth, 20);

  fill(255);
  textAlign(CENTER);
  textSize(12);
  text(label, startX + rangeWidth / 2, y + 30);
}

function drawKeypoints() {
  if (poses && poses.length > 0) {
    poses[0].keypoints.forEach((kp) => {
      const { x, y, score } = kp;
      if (score > 0.3) {
        fill(255);
        stroke(0);
        strokeWeight(4);
        circle(x, y, 16);
      }
    });
  }
}

function drawSkeleton() {
  if (poses && poses.length > 0) {
    const edges = {
      "5,7": "m",
      "7,9": "m",
      "6,8": "c",
      "8,10": "c",
      "5,6": "y",
      "5,11": "m",
      "6,12": "c",
      "11,12": "y",
      "11,13": "m",
      "13,15": "m",
      "12,14": "c",
      "14,16": "c",
    };

    Object.entries(edges).forEach(([key, value]) => {
      const [p1, p2] = key.split(",");
      const { x: x1, y: y1, score: c1 } = poses[0].keypoints[p1];
      const { x: x2, y: y2, score: c2 } = poses[0].keypoints[p2];

      if (c1 > 0.5 && c2 > 0.5) {
        strokeWeight(2);
        if (exerciseMode === "squats") {
          stroke("rgb(0, 255, 0)"); // Always green for squats when key points are visible
        } else {
          // Keep the original coloring for push-up mode
          stroke(
            highlightBack && (p1 == 11 || p2 == 12)
              ? "rgb(255, 0, 0)"
              : "rgb(0, 255, 0)"
          );
        }
        line(x1, y1, x2, y2);
      }
    });
  }
}

function checkUserPosition() {
  if (exerciseMode === "squats") {
    const leftHip = getPoint("left_hip");
    const leftKnee = getPoint("left_knee");
    const leftAnkle = getPoint("left_ankle");
    const rightHip = getPoint("right_hip");
    const rightKnee = getPoint("right_knee");
    const rightAnkle = getPoint("right_ankle");

    return (
      leftHip && leftKnee && leftAnkle && rightHip && rightKnee && rightAnkle
    );
  }
  return false;
}

function calculateAngle(pointA, pointB, pointC) {
  const radians =
    Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
    Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360 - angle;
  }

  return angle;
}

function updateArmAngle() {
  const leftWrist = poses[0].keypoints[9];
  const leftShoulder = poses[0].keypoints[5];
  const leftElbow = poses[0].keypoints[7];

  if (
    leftWrist.score > 0.3 &&
    leftElbow.score > 0.3 &&
    leftShoulder.score > 0.3
  ) {
    elbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  }
}

function updateBackAngle() {
  const leftShoulder = poses[0].keypoints[5];
  const leftHip = poses[0].keypoints[11];
  const leftKnee = poses[0].keypoints[13];

  if (leftKnee.score > 0.3 && leftHip.score > 0.3 && leftShoulder.score > 0.3) {
    backAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
    // sourcery skip: simplify-ternary
    highlightBack = backAngle < 20 || backAngle > 160 ? false : true;
    if (highlightBack && !backWarningGiven) {
      var msg = new SpeechSynthesisUtterance("Keep your back straight");
      window.speechSynthesis.speak(msg);
      backWarningGiven = true;
    }
  }
}

function speak(text, voiceName = "Google UK English Male") {
  const currentTime = new Date().getTime();
  if (text !== lastSpokenMessage || currentTime - lastSpokenTime > 3000) {
    const msg = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    msg.voice = voices.find((voice) => voice.name === voiceName);
    window.speechSynthesis.speak(msg);
    lastSpokenMessage = text;
    lastSpokenTime = currentTime;
  }
}

function inUpPosition() {
  if (exerciseMode === "pushups") {
    if (elbowAngle > 170 && elbowAngle < 200 && downPosition) {
      reps += 1;
      window.reps = reps;
      speak(reps.toString());

      if (reps === 5) {
        speak("You got this!");
      } else if (reps === 10) {
        speak("Great job! Bronze medal!");
      } else if (reps === 15) {
        speak("Wow!");
      } else if (reps === 20) {
        speak("Awesome! Silver medal!");
      } else if (reps === 25) {
        speak("Incredible!");
      } else if (reps === 30) {
        speak("Fantastic! Gold medal!");
      }

      upPosition = true;
      downPosition = false;

      if (!firstExerciseDetected) {
        firstExerciseDetected = true;
        startTimer();
      }
    }
  } else if (exerciseMode === "squats") {
    const leftHip = poses[0].keypoints[11];
    const leftKnee = poses[0].keypoints[13];
    const leftAnkle = poses[0].keypoints[15];

    const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);

    if (kneeAngle > 160 && downPosition) {
      reps += 1;
      window.reps = reps;
      speak(reps.toString());

      if (reps === 5) {
        speak("You got this!");
      } else if (reps === 10) {
        speak("Great job! Bronze medal!");
      } else if (reps === 15) {
        speak("Wow!");
      } else if (reps === 20) {
        speak("Awesome! Silver medal!");
      } else if (reps === 25) {
        speak("Incredible!");
      } else if (reps === 30) {
        speak("Fantastic! Gold medal!");
      }

      upPosition = true;
      downPosition = false;

      if (!firstExerciseDetected) {
        firstExerciseDetected = true;
        startTimer();
      }
    }
  }
}

function inDownPosition() {
  if (exerciseMode === "pushups") {
    const elbowAboveNose = poses[0].keypoints[0].y > poses[0].keypoints[7].y;
    if (
      !highlightBack &&
      elbowAboveNose &&
      Math.abs(elbowAngle) > 70 &&
      Math.abs(elbowAngle) < 100
    ) {
      if (upPosition) {
        var msg = new SpeechSynthesisUtterance("Down");
        window.speechSynthesis.speak(msg);
      }
      downPosition = true;
      upPosition = false;
    }
  } else if (exerciseMode === "squats") {
    const leftHip = poses[0].keypoints[11];
    const leftKnee = poses[0].keypoints[13];
    const leftAnkle = poses[0].keypoints[15];

    const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);

    if (kneeAngle < 100) {
      if (upPosition) {
        var msg = new SpeechSynthesisUtterance("Down");
        window.speechSynthesis.speak(msg);
      }
      downPosition = true;
      upPosition = false;
    }
  }
}

function getPoint(pointName) {
  if (poses && poses.length > 0) {
    const keypoint = poses[0].keypoints.find((kp) => kp.name === pointName);
    return keypoint && keypoint.score > 0.3 ? keypoint : null;
  }
  return null;
}

function detectSquat() {
  const leftHip = getPoint("left_hip");
  const leftKnee = getPoint("left_knee");
  const leftAnkle = getPoint("left_ankle");
  const rightHip = getPoint("right_hip");
  const rightKnee = getPoint("right_knee");
  const rightAnkle = getPoint("right_ankle");

  isInCorrectPosition = checkUserPosition();

  if (isInCorrectPosition) {
    // Check confidence for left leg keypoints
    if (
      leftHip &&
      leftKnee &&
      leftAnkle &&
      leftHip.score > 0.3 &&
      leftKnee.score > 0.3 &&
      leftAnkle.score > 0.3
    ) {
      // Calculate angles for left leg
      const leftSquatAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
      squatAngle = leftSquatAngle;
    } else {
      console.log("Low confidence in left leg keypoint detection");
      return;
    }

    // Check confidence for right leg keypoints
    if (
      rightHip &&
      rightKnee &&
      rightAnkle &&
      rightHip.score > 0.3 &&
      rightKnee.score > 0.3 &&
      rightAnkle.score > 0.3
    ) {
      // Calculate angles for right leg
      const rightSquatAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
      squatAngle = Math.min(squatAngle, rightSquatAngle);
    } else {
      console.log("Low confidence in right leg keypoint detection");
      return;
    }

    // Check if the angle change is too sudden (camera movement)
    if (Math.abs(squatAngle - lastValidSquatAngle) > 30) {
      squatFeedbackText = "Please keep still";
      return;
    }

    lastValidSquatAngle = squatAngle;

    if (squatAngle <= DEEP_SQUAT_ANGLE + 5 && !downPosition) {
      console.log("Deep squat detected");
      handleSquatDown("Deep squat! Great job!", "Deep");
    } else if (squatAngle <= PARALLEL_SQUAT_ANGLE && !downPosition) {
      console.log("Parallel squat detected");
      handleSquatDown("Parallel squat! Good form!", "Parallel");
    } else if (squatAngle <= PARTIAL_SQUAT_ANGLE && !downPosition) {
      console.log("Partial squat detected");
      handleSquatDown("Partial squat! Keep improving!", "Partial");
    } else if (squatAngle > 160 && downPosition) {
      handleSquatUp();
    } else if (squatAngle > PARTIAL_SQUAT_ANGLE && !upPosition) {
      squatFeedbackText = "Lower your body more if you can";
      squatStartTime = 0;
    } else if (squatAngle < 160 && upPosition) {
      squatFeedbackText = "Stand up straight";
      squatStartTime = 0;
    } else {
      squatFeedbackText = "Good form, keep going!";
      squatStartTime = 0;
    }
  }
}

function handleSquatDown(message, squatType) {
  if (squatStartTime === 0) {
    squatStartTime = millis();
  } else if (millis() - squatStartTime > SQUAT_HOLD_TIME) {
    downPosition = true;
    upPosition = false;
    squatFeedbackText = message + " Now stand up.";
    speak("Down");
    lastSquatType = squatType;
    console.log(`Squat down detected: ${squatType}`);
  } else {
    squatFeedbackText = "Hold it...";
  }
}

function handleSquatUp() {
  if (squatStartTime === 0) {
    squatStartTime = millis();
  } else if (millis() - squatStartTime > SQUAT_HOLD_TIME) {
    reps++;
    window.reps = reps;
    console.log(`Reps updated: ${reps}`);
    speak(reps.toString());
    downPosition = false;
    upPosition = true;
    squatFeedbackText = `Great ${lastSquatType} squat! Go again.`;
    console.log(`Squat type: ${lastSquatType}`); // Add this line for debugging
    squatStartTime = 0;

    if (!firstExerciseDetected) {
      firstExerciseDetected = true;
      startTimer();
    }
  } else {
    squatFeedbackText = "Hold it...";
  }
}
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
