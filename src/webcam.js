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

const SQUAT_HOLD_TIME = 500; // milliseconds
const PARTIAL_SQUAT_ANGLE = 150;
const PARALLEL_SQUAT_ANGLE = 110;
const DEEP_SQUAT_ANGLE = 80;
const fitnessChannelUrl =
  "chain://eip155:1/erc721:0xee442da02f2cdcbc0140162490a068c1da94b929";
const memeUrl = "https://imgur.com/a/improper-form-rvaU9ev";

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
];

function toggleMode() {
  if (!started) {
    exerciseMode = exerciseMode === "pushups" ? "squats" : "pushups";
    modeButton.html(`MODE: ${exerciseMode.toUpperCase()}`);
    updateInstructions();
    exerciseCounter.html(`${capitalizeFirstLetter(exerciseMode)} Completed: 0`);
  }
}

function startDetection() {
  if (!started) {
    started = true;
    loading = true;
    showView(".loading-container");

    modeButton.attribute("disabled", "");

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
          });
          video.parent("canvasContainer");
        }
      })
      .catch((error) => {
        console.error("Error starting audio context:", error);
      });
  }
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

  // sourcery skip: avoid-function-declarations-in-blocks
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

  resizeCanvas(screenWidth, screenHeight);
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

  // New event listener for shareFarcasterButton
  const farcasterButton = document.getElementById("shareFarcasterButton");
  farcasterButton.addEventListener("click", () => {
    const newWindow = window.open("", "_blank");
    newWindow.document.write(`
      <html>
        <head>
          <style>
            body {
              background-color: #000;
              font-family: "Press Start 2P", cursive;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              color: #fcb131;
            }
            .neynar-container {
              background-color: #000;
              border: 3px solid #fcb131;
              border-radius: 10px;
              padding: 20px;
              text-align: center;
              max-width: 300px;
            }
            .neynar-button {
              background-color: #9146ff;
              color: #fff;
              border: none;
              padding: 10px 20px;
              font-family: "Press Start 2P", cursive;
              font-size: 14px;
              cursor: pointer;
              transition: all 0.3s ease;
              margin-top: 10px;
            }
            .neynar-button:hover {
              transform: scale(1.1);
              box-shadow: 0 0 10px #9146ff;
            }
            .confirm-cast-container {
              background-color: #000;
              border: 3px solid #fcb131;
              border-radius: 10px;
              padding: 20px;
              text-align: center;
              max-width: 300px;
            }
            .confirm-cast-text {
              font-size: 14px;
              margin-bottom: 20px;
            }
            .confirm-cast-button {
              background-color: #00a651;
              color: #fff;
              border: none;
              padding: 10px 20px;
              font-family: "Press Start 2P", cursive;
              font-size: 14px;
              cursor: pointer;
              transition: all 0.3s ease;
            }
            .confirm-cast-button:hover {
              transform: scale(1.1);
              box-shadow: 0 0 10px #00a651;
            }
          </style>
        </head>
        <body>
          <div class="neynar-container">
            <h2>Imperfect Form</h2>
            <div class="neynar_signin" data-client_id="9c260f93-357a-4952-8090-a03f10e742f4" data-success-callback="onSignInSuccess" data-theme="dark"></div>
          </div>
          <script src="https://neynarxyz.github.io/siwn/raw/1.2.0/index.js" async></script>
          <script>
            function onSignInSuccess(data) {
  console.log("Sign-in success with data:", data);
  
  // Store signer data
  fetch('/api/store-signer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      signer_uuid: data.signer_uuid,
      fid: data.fid,
      reps: reps,
      exerciseMode: exerciseMode,
      formattedTimeSpent: formattedTimeSpent
    }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('Signer stored successfully');
                  document.body.innerHTML = \`
                    <div class="confirm-cast-container">
                      <h2>Share Cast On /fitness</h2>
                      <p class="confirm-cast-text">${reps} ${exerciseMode} in ${formattedTimeSpent}</p>
                      <button id="confirmCastButton" class="confirm-cast-button">Confirm and Send</button>
                    </div>
                  \`;
  
                   document.getElementById("confirmCastButton").addEventListener("click", () => {
  fetch('/api/publish-cast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      signer_uuid: data.signer_uuid,
                        text: 'I just pumped ${reps} ${exerciseMode} in ${formattedTimeSpent} #ImperfectForm',
                        embeds: [{ url: memeUrl }],
      replyTo: fitnessChannelUrl
    }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('Cast published successfully');
      // Handle success (e.g., close window, show success message)
    } else {
      console.error('Failed to publish cast:', data.error);
      // Handle error
    }
  })
  .catch(error => {
    console.error('Error:', error);
    // Handle error
  });
});
    } else {
      console.error('Error storing signer:', data.error);
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
}
          </script>
        </body>
      </html>
    `);
    newWindow.document.close();
  });

  // Add event listener for messages from the popup
  window.addEventListener("message", (event) => {
    if (event.data.type === "FARCASTER_SHARE_SUCCESS") {
      alert("Successfully shared on Farcaster!");
    } else if (event.data.type === "FARCASTER_SHARE_FAILURE") {
      alert("Failed to share on Farcaster: " + event.data.error);
    }
  });

  const shareTwitterButton = document.getElementById("shareTwitterButton");
  shareTwitterButton.addEventListener("click", () => {
    const tweetText = `I just pumped ${reps} ${exerciseMode} in ${formattedTimeSpent} /ImperfectForm`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      tweetText
    )}`;
    window.open(tweetUrl, "_blank");
  });
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

function stopDetection() {
  if (video) {
    video.stop();
    video.remove();
  }
  noLoop();
  clear();
  clearInterval(timerInterval);
  console.log("Detection stopped");

  showPositiveMessage();

  showSummary();
}

function resetDetection() {
  if (video) {
    video.stop();
    video.remove();
  }
  videoInitialized = false;
  started = false;
  reps = 0;
  timeLeft = 120;
  firstExerciseDetected = false;
  timer.html(formatTime(timeLeft));
  clear();
  console.log("Application reset");
  loop();

  const positiveMessage = select(".positive-message");
  if (positiveMessage) {
    positiveMessage.remove();
  }

  const welcomeMessage = select("#welcomeMessage");
  if (welcomeMessage) {
    welcomeMessage.hide();
  }

  showView("#instructions");
  updateInstructions();

  modeButton.removeAttribute("disabled");
  squatFeedbackText = "";
  squatAngle = 0;
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
    console.warn(
      "WebGL initialization failed with SINGLEPOSE_THUNDER, trying SINGLEPOSE_LIGHTNING on CPU."
    );
    try {
      await tf.setBackend("cpu");
      await tf.ready();
      detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        }
      );
    } catch (cpuError) {
      console.error("Error initializing detector with CPU fallback:", cpuError);
      console.warn("Trying BlazePose as a fallback.");
      await initBlazePose();
    }
  }

  if (detector) {
    detectorReady = true;
    hideLoadingScreen();
    getPoses();
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

function onBlazePoseResults(results) {
  poses = results.poseLandmarks ? [{ keypoints: results.poseLandmarks }] : [];
}

async function getPosesWithBlazePose() {
  if (detectorReady && videoInitialized) {
    try {
      await detector.send({ image: video.elt });
      setTimeout(getPosesWithBlazePose, 0);
    } catch (error) {
      console.error("Error estimating poses with BlazePose:", error);
    }
  }
}

async function getPoses() {
  if (detectorReady && videoInitialized) {
    try {
      if (detector instanceof window.Pose) {
        await getPosesWithBlazePose();
      } else {
        poses = await detector.estimatePoses(video.elt);
        setTimeout(getPoses, 0);
      }
    } catch (error) {
      console.error("Error estimating poses:", error);
    }
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
