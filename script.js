document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const startScreen = document.getElementById('start-screen');
    const countdownScreen = document.getElementById('countdown-screen');
    const bgMusic = document.getElementById('bg-music');
    const timerEl = document.getElementById('timer');
    const carouselImg = document.getElementById('carousel-img');
    const greetingText = document.getElementById('greeting-text');

    const creeperScreen = document.getElementById('creeper-screen');
    const creeperVideo = document.getElementById('creeper-video');
    const creeperCanvas = document.getElementById('creeper-canvas');
    const ctx = creeperCanvas.getContext('2d', { willReadFrequently: true });

    const flashScreen = document.getElementById('flash-screen');
    const revealScreen = document.getElementById('reveal-screen');

    // 4 Birthday Messages matching (Red, Green, Blue, Yellow)
    // Using a slightly darker hex for yellow to ensure it remains legible on white background.
    const messages = [
        { text: "Have an amazing, fun-filled day!", color: "red" },
        { text: "May all your birthday wishes come true!", color: "green" },
        { text: "Here's to a fantastic year ahead!", color: "blue" },
        { text: "Wishing you endless joy and happiness!", color: "#FFD700" } // Gold/darker yellow
    ];

    let currentPicIndex = 1;
    let currentMsgIndex = 0;

    let timerValue = 20;
    let timerInterval;
    let carouselInterval;
    let greetingInterval;
    let isProcessingFrame = false;

    // Chroma key frame processing function
    const processFrame = () => {
        if (creeperVideo.paused || creeperVideo.ended) {
            isProcessingFrame = false;
            return;
        }

        // Set natural video dimensions to correctly sample from it
        if (creeperCanvas.width !== creeperVideo.videoWidth && creeperVideo.videoWidth > 0) {
            creeperCanvas.width = creeperVideo.videoWidth;
            creeperCanvas.height = creeperVideo.videoHeight;
        }

        if (creeperCanvas.width > 0 && creeperCanvas.height > 0) {
            // Draw current video frame to canvas
            ctx.drawImage(creeperVideo, 0, 0, creeperCanvas.width, creeperCanvas.height);

            try {
                // Extract pixel data
                const frame = ctx.getImageData(0, 0, creeperCanvas.width, creeperCanvas.height);
                const data = frame.data;
                const length = data.length;

                // Target background color (ideally bright neon green screen)
                const targetR = 0;
                const targetG = 255;
                const targetB = 0;

                // Chroma-key precision boundaries
                const similarity = 100; // Tighter range: only colors very close to neon green
                const smoothness = 50;  // Blending range to soften pixelated edges

                // Precise Chroma Keying: targets the specific green screen but protects Creeper's textured green
                for (let i = 0; i < length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Euclidean color distance between pixel and target green screen
                    const distance = Math.sqrt(
                        (r - targetR) ** 2 +
                        (g - targetG) ** 2 +
                        (b - targetB) ** 2
                    );

                    if (distance < similarity) {
                        // High similarity to background = make fully transparent
                        data[i + 3] = 0;
                    } else if (distance < similarity + smoothness) {
                        // Blending edge to avoid harsh green outlines around the Creeper
                        const alpha = Math.floor(255 * ((distance - similarity) / smoothness));
                        data[i + 3] = alpha;

                        // Suppress green tint spillage on blended edges
                        if (g > Math.max(r, b)) {
                            data[i + 1] = Math.max(r, b);
                        }
                    }
                }

                // Put processed pixel data back onto canvas
                ctx.putImageData(frame, 0, 0);
            } catch (err) {
                // Prevent fallback to native video since user explicitly requires Canvas API
                console.error("Canvas read error:", err);
                if (!window.warnedCORS) {
                    alert('Canvas API Blocked! You must run this using a "Live Server" extension or local server. The browser blocked Canvas pixel extraction because the file was opened offline.');
                    window.warnedCORS = true;
                }
            }
        }

        // Loop again for next frame
        requestAnimationFrame(processFrame);
    };

    startBtn.addEventListener('click', async () => {
        // Enforce Full-screen Mode
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            } else if (document.documentElement.webkitRequestFullscreen) { /* Safari */
                await document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.msRequestFullscreen) { /* IE11 */
                await document.documentElement.msRequestFullscreen();
            }
        } catch (err) {
            console.log("Proceeding without fullscreen mode: ", err);
        }

        // Transition screens
        startScreen.classList.add('hidden');
        countdownScreen.classList.remove('hidden');

        // Play Video Background Music
        bgMusic.currentTime = 0;
        bgMusic.play().catch(e => console.log("Bg audio could not autoplay:", e));

        // Initialize First Greeting (Red)
        greetingText.textContent = messages[0].text;
        greetingText.style.color = messages[0].color;

        // Countdown Timer Logic
        timerInterval = setInterval(() => {
            timerValue--;
            timerEl.textContent = timerValue;

            if (timerValue <= 0) {
                clearInterval(timerInterval);
                clearInterval(carouselInterval);
                clearInterval(greetingInterval);
                triggerCreeperEvent();
            }
        }, 1000);

        // Image Carousel Logic (every ~3.33 seconds for 6 images in 20s)
        // Cycles pic1.png -> pic6.png
        carouselInterval = setInterval(() => {
            currentPicIndex++;
            if (currentPicIndex > 6) currentPicIndex = 1;

            // Re-trigger CSS animation
            carouselImg.style.animation = 'none';
            carouselImg.offsetHeight; // reflow to trigger restart
            carouselImg.style.animation = null;

            carouselImg.src = `pic/pic${currentPicIndex}.png`;
        }, 3333);

        // Greetings Text Logic (every 5 seconds)
        greetingInterval = setInterval(() => {
            currentMsgIndex++;
            if (currentMsgIndex >= messages.length) currentMsgIndex = 0;

            greetingText.textContent = messages[currentMsgIndex].text;
            greetingText.style.color = messages[currentMsgIndex].color;
        }, 5000);
    });

    function triggerCreeperEvent() {
        // Stop music and hide countdown
        countdownScreen.classList.add('hidden');
        bgMusic.pause();
        bgMusic.currentTime = 0;

        // Display Creeper Canvas Screen
        creeperScreen.classList.remove('hidden');

        // Start Video Playback & Chrome Key Processing
        creeperVideo.play().catch(e => console.log("Creeper video failed to play:", e));

        creeperVideo.addEventListener('play', () => {
            if (!isProcessingFrame) {
                isProcessingFrame = true;
                processFrame();
            }
        });

        // Event listener for explosion/video finish
        creeperVideo.onended = () => {
            triggerFlashAndReveal();
        };
    }

    function triggerFlashAndReveal() {
        // Trigger white flash animation
        flashScreen.classList.remove('hidden');
        flashScreen.classList.add('flash-anim');

        // At exactly peak opacity of flash (300ms in CSS animation)
        // Transition underlying screen from Creeper -> Grand Reveal
        setTimeout(() => {
            creeperScreen.classList.add('hidden');
            revealScreen.classList.remove('hidden');
        }, 300);

        // Hide overlay flash screen once animation finishes (1s)
        setTimeout(() => {
            flashScreen.classList.add('hidden');
            flashScreen.classList.remove('flash-anim');
        }, 1000);
    }
});
