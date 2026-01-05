import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// Configuration
const CONFIG = {
    colors: {
        background: 0x050505,
        grid: 0x0a0a0a,
        accent: 0x06b6d4, // Cyan
        secondary: 0xa855f7 // Purple
    },
    debug: true // Set to true to see webcam overlay
};

class SceneManager {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.colors.background);
        this.scene.fog = new THREE.FogExp2(CONFIG.colors.background, 0.05);

        this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 100);
        this.camera.position.set(0, 1.6, 5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 10;
        this.controls.minDistance = 2;
        this.controls.enabled = false; // Disabled initially, enabled for fallback

        this.initLights();
        this.initWorld();

        window.addEventListener('resize', this.onResize.bind(this));
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Neon Glows
        const pointLight1 = new THREE.PointLight(CONFIG.colors.accent, 2, 20);
        pointLight1.position.set(-5, 2, -5);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(CONFIG.colors.secondary, 2, 20);
        pointLight2.position.set(5, 5, -5);
        this.scene.add(pointLight2);
    }

    initWorld() {
        // Grid Floor
        const gridHelper = new THREE.GridHelper(50, 50, CONFIG.colors.accent, CONFIG.colors.grid);
        this.scene.add(gridHelper);

        // Floating Particles
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 800;
        const posArray = new Float32Array(particlesCount * 3);

        for (let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 20;
            posArray[i + 1] = (Math.random() - 0.5) * 10; // More spread y
            posArray[i + 2] = (Math.random() - 0.5) * 20;
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.03,
            color: CONFIG.colors.accent,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        this.particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
        this.scene.add(this.particleSystem);

        // Placeholder Hero Cube (The "Orb")
        const geometry = new THREE.IcosahedronGeometry(1, 1);
        const material = new THREE.MeshStandardMaterial({
            color: CONFIG.colors.accent,
            roughness: 0.2,
            metalness: 0.8,
            wireframe: true
        });
        this.heroMesh = new THREE.Mesh(geometry, material);
        this.heroMesh.position.y = 1.6;
        this.scene.add(this.heroMesh);

        // Glow
        const bgGeometry = new THREE.IcosahedronGeometry(0.8, 1);
        const bgMaterial = new THREE.MeshBasicMaterial({ color: CONFIG.colors.secondary, wireframe: false, transparent: true, opacity: 0.3 });
        this.glowMesh = new THREE.Mesh(bgGeometry, bgMaterial);
        this.heroMesh.add(this.glowMesh);
    }

    update() {
        if (this.particleSystem) {
            this.particleSystem.rotation.y += 0.0005;
        }
        if (this.heroMesh) {
            this.heroMesh.rotation.x += 0.005;
            this.heroMesh.rotation.y += 0.01;
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
    }

    rotateCamera(amount) {
        gsap.to(this.scene.rotation, { y: this.scene.rotation.y + amount, duration: 0.8, ease: 'power2.out' });
    }

    applyGyroRotation(x, y) {
        // x is up/down tilt (beta), y is left/right tilt (gamma)

        // Parallax effect: Shift camera position slightly
        // x (-1 to 1) -> shift Y
        // y (-1 to 1) -> shift X

        const targetX = y * 3; // Shift range
        const targetY = 1.6 + x * 2; // Base height 1.6

        // Smoothly interpolate
        this.camera.position.x += (targetX - this.camera.position.x) * 0.05;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.05;

        // Always look at center
        this.camera.lookAt(0, 0, 0);
    }
}

class UIManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.scene = sceneManager.scene;
        this.panels = [];
        this.currentSection = 'home';

        this.initPanels();
    }

    createCanvasInput(text, subtext = "", width = 512, height = 256) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#06b6d4'; // Cyan border
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, width, height);

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px "Space Grotesk"';
        ctx.textAlign = 'center';
        ctx.fillText(text, width / 2, height / 2 - 20);

        if (subtext) {
            ctx.fillStyle = '#a855f7';
            ctx.font = '32px "Space Grotesk"';
            ctx.fillText(subtext, width / 2, height / 2 + 40);
        }

        return canvas;
    }

    createPanel(id, text, x, y, z) {
        const canvas = this.createCanvasInput(text);
        const texture = new THREE.CanvasTexture(canvas);

        const geometry = new THREE.PlaneGeometry(2, 1);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.userData = { id: id, originalScale: 1, type: 'panel' };

        this.scene.add(mesh);
        this.panels.push(mesh);
        return mesh;
    }

    initPanels() {
        // Main Menu Orb
        const orbGeo = new THREE.IcosahedronGeometry(0.5, 2);
        const orbMat = new THREE.MeshPhongMaterial({
            color: CONFIG.colors.accent,
            emissive: CONFIG.colors.secondary,
            emissiveIntensity: 0.5,
            wireframe: true
        });
        this.menuOrb = new THREE.Mesh(orbGeo, orbMat);
        this.menuOrb.position.set(0, 1.5, 0);
        this.menuOrb.userData = { id: 'menu_orb', type: 'button' };
        this.scene.add(this.menuOrb);

        // Menu Panels (Initially Hidden)
        this.menuGroup = new THREE.Group();
        this.menuGroup.visible = false;

        this.createPanelInGroup('Experience', 0, 2.5, -2, this.menuGroup);
        this.createPanelInGroup('Technology', -2.5, 1.5, -1, this.menuGroup);
        this.createPanelInGroup('For Brands', 2.5, 1.5, -1, this.menuGroup);
        this.createPanelInGroup('Contact', 0, 0.5, -2, this.menuGroup);

        this.scene.add(this.menuGroup);

        // Sections Groups
        this.sections = {
            experience: this.createSectionGroup('experience'),
            technology: this.createSectionGroup('technology'),
            brands: this.createSectionGroup('brands'),
            contact: this.createSectionGroup('contact')
        };

        // Populate Sections
        this.buildExperienceSection();
        this.buildTechSection();
        this.buildBrandsSection();
        this.buildContactSection();
    }

    createSectionGroup(name) {
        const group = new THREE.Group();
        group.visible = false;
        this.scene.add(group);
        return group;
    }

    buildExperienceSection() {
        const group = this.sections.experience;
        const panel = this.createPanel('exp_main', "Not a normal website", 0, 2, -2);
        this.createCanvasContent(panel, "Everything is controlled", "by your hand gestures.");
        group.add(panel);

        // Add reactive cubes
        for (let i = 0; i < 5; i++) {
            const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            const mat = new THREE.MeshBasicMaterial({ color: CONFIG.colors.accent, wireframe: true });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set((i - 2) * 0.8, 0.5, -1);
            group.add(mesh);

            // Animate
            monitorRotation(mesh, i);
        }
        function monitorRotation(m, offset) {
            gsap.to(m.rotation, { x: Math.PI * 2, duration: 2 + offset, repeat: -1, ease: 'none' });
        }
    }

    buildTechSection() {
        const group = this.sections.technology;
        const panel = this.createPanel('tech_main', "Neural Technology", 0, 2, -2);
        this.createCanvasContent(panel, "Powered by MediaPipe", "& Three.js WebGL");
        group.add(panel);

        // Wireframe Globe
        const geo = new THREE.IcosahedronGeometry(1.2, 1);
        const mat = new THREE.MeshBasicMaterial({ color: CONFIG.colors.secondary, wireframe: true });
        const globe = new THREE.Mesh(geo, mat);
        globe.position.set(0, 0, -1);
        group.add(globe);
        gsap.to(globe.rotation, { y: Math.PI * 2, duration: 10, repeat: -1, ease: 'none' });
    }

    buildBrandsSection() {
        const group = this.sections.brands;
        // 3 Cards
        const card1 = this.createPanel('brand_1', "Luxury Auto", -2, 1.5, -1);
        const card2 = this.createPanel('brand_2', "Tech Launch", 0, 1.5, -1.5);
        const card3 = this.createPanel('brand_3', "Fashion Drop", 2, 1.5, -1);

        group.add(card1, card2, card3);
    }

    buildContactSection() {
        const group = this.sections.contact;
        const panel = this.createPanel('contact_main', "Bring the Future", 0, 2.5, -2);
        this.createCanvasContent(panel, "Wave to Send", "Inquiry");
        group.add(panel);

        // Submit Button
        const btnGeo = new THREE.BoxGeometry(1.5, 0.5, 0.2);
        const btnMat = new THREE.MeshBasicMaterial({ color: CONFIG.colors.accent });
        const btn = new THREE.Mesh(btnGeo, btnMat);
        btn.position.set(0, 1, -1);
        btn.userData = { id: 'submit_btn', type: 'button' };
        group.add(btn);
    }

    createCanvasContent(mesh, line1, line2) {
        // Overlay text on existing texture or create new
        // For simplicity reusing creation logic but customized
        const canvas = this.createCanvasInput(line1, line2);
        mesh.material.map = new THREE.CanvasTexture(canvas);
    }

    createPanelInGroup(text, x, y, z, group) {
        // Clean ID
        const id = text.toLowerCase().replace(' ', '_');
        const mesh = this.createPanel(id, text, x, y, z);
        group.add(mesh);
        // this.scene.remove(mesh); // Removed from scene root, added to group
    }

    openMenu() {
        if (this.currentSection !== 'home') this.closeSection(this.currentSection);
        if (this.menuGroup.visible) return;

        this.menuGroup.visible = true;
        this.currentSection = 'menu';

        // Hide Orb
        gsap.to(this.menuOrb.scale, { x: 0, y: 0, z: 0, duration: 0.5 });

        // Animate Panels In
        this.menuGroup.children.forEach((child, i) => {
            child.scale.set(0, 0, 0);
            gsap.to(child.scale, {
                x: 1, y: 1, z: 1,
                duration: 0.5,
                delay: i * 0.1,
                ease: 'back.out(1.7)'
            });
        });
    }

    closeMenu() {
        if (!this.menuGroup.visible) return;

        this.menuGroup.children.forEach((child, i) => {
            gsap.to(child.scale, {
                x: 0, y: 0, z: 0,
                duration: 0.3,
                delay: 0,
                onComplete: () => { if (i === 0) this.menuGroup.visible = false; }
            });
        });

        // Show Orb
        gsap.to(this.menuOrb.scale, { x: 1, y: 1, z: 1, duration: 0.5, delay: 0.3 });
        this.currentSection = 'home';
    }

    openSection(name) {
        this.closeMenu();
        const group = this.sections[name];
        if (group) {
            group.visible = true;
            this.currentSection = name;

            // Animate In
            group.children.forEach((child) => {
                child.scale.set(0, 0, 0);
                gsap.to(child.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1)' });
            });
        }
    }

    closeSection(name) {
        const group = this.sections[name];
        if (group) {
            group.visible = false;
        }
    }

    hover(mesh) {
        if (!mesh) return;
        gsap.to(mesh.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.3 });
        if (mesh.material && mesh.material.color) mesh.material.color.setHex(CONFIG.colors.secondary);
    }

    unhover(mesh) {
        if (!mesh) return;
        gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
        if (mesh.material && mesh.material.color) mesh.material.color.setHex(CONFIG.colors.accent);
        // For panels with map, we might want to redraw texture or overlay.
        // Simple scale is enough for MVP.
    }

    select(mesh) {
        if (!mesh) return;
        const id = mesh.userData.id;
        console.log("Selected:", id);

        if (id === 'menu_orb') {
            this.openMenu();
        } else if (id === 'submit_btn') {
            alert("Sent! (Simulation)");
            this.back();
        } else if (this.sections[id]) {
            this.openSection(id);
        } else if (id.startsWith('brand')) {
            // Demo brand interaction
            gsap.to(mesh.rotation, { y: mesh.rotation.y + Math.PI, duration: 0.5 });
        } else {
            // Default bounce
            gsap.to(mesh.rotation, { y: mesh.rotation.y + Math.PI * 2, duration: 0.5 });
        }
    }

    back() {
        if (this.currentSection === 'menu') {
            this.closeMenu();
        } else if (this.currentSection !== 'home') {
            // Close current section, open menu
            this.closeSection(this.currentSection);
            this.openMenu();
        }
    }
}


class HandTracker {
    constructor(sceneManager, uiManager) {
        this.sceneManager = sceneManager;
        this.uiManager = uiManager; // Store Ref
        this.vision = null;
        this.handLandmarker = null;
        this.webcamRunning = false;
        this.video = document.getElementById('webcam');
        this.canvas = document.getElementById('output_canvas');
        this.ctx = this.canvas.getContext('2d');

        // 3D Cursor
        this.cursorMesh = new THREE.Mesh(
            new THREE.RingGeometry(0.1, 0.12, 32),
            new THREE.MeshBasicMaterial({ color: CONFIG.colors.accent, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
        );
        this.cursorMesh.visible = false;
        this.sceneManager.scene.add(this.cursorMesh);

        // Raycaster for interactions
        this.raycaster = new THREE.Raycaster();
        this.lastVideoTime = -1;

        this.lastHovered = null; // Track hover state
        this.pinchDebounce = 0; // Prevent rapid fires

        this.initMediaPipe();
    }

    async initMediaPipe() {
        // Import MediaPipe tasks-vision modules
        const { FilesetResolver, HandLandmarker } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0");

        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );

        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });

        console.log("MediaPipe HandLandmarker loaded");
    }

    async startWebcam() {
        if (!this.handLandmarker) {
            console.warn("HandLandmarker not loaded yet.");
            return;
        }

        const constraints = {
            video: {
                width: 1280,
                height: 720
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = stream;

            // Wait for video to load properties
            this.video.addEventListener('loadeddata', () => {
                this.webcamRunning = true;
                this.video.play();
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                console.log("Webcam started");

                // Show feedback
                const prompt = document.getElementById('start-prompt');
                if (prompt) {
                    prompt.innerHTML = `<h1 class="text-4xl md:text-6xl font-display font-black leading-tight mb-6">SYSTEM ACTIVE</h1><p>Raise your hand to see the cursor.</p>`;
                }
            });
        } catch (error) {
            console.error("Error accessing webcam:", error);
            alert("Camera access denied or error. Switching to mouse mode.");
            // Fallback to mouse
            const app = window.appInstance; // Hacky access if needed, better pass callback
            if (app) app.startMouseExperience();
        }
    }

    detect() {
        if (!this.webcamRunning || !this.handLandmarker) return;

        let startTimeMs = performance.now();
        if (this.video.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = this.video.currentTime;

            const results = this.handLandmarker.detectForVideo(this.video, startTimeMs);

            this.ctx.save();
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            if (results.landmarks && results.landmarks.length > 0) {
                // Hand detected
                const landmarks = results.landmarks[0];

                // Debug draw
                if (CONFIG.debug) {
                    this.drawDebug(landmarks);
                }

                // Update 3D Cursor & Raycast
                this.updateCursor(landmarks);

                // Handle Interactions (Hover/Select)
                this.handleInteractions();

                // Recognize Gestures (Fist/Pinch)
                this.recognizeGesture(landmarks);

            } else {
                this.cursorMesh.visible = false;
                if (this.lastHovered) {
                    this.uiManager.unhover(this.lastHovered);
                    this.lastHovered = null;
                }
            }
            this.ctx.restore();
        }
    }

    drawDebug(landmarks) {
        // Simple debug drawing
        this.ctx.fillStyle = "#00FF00";
        for (const landmark of landmarks) {
            const x = landmark.x * this.canvas.width;
            const y = landmark.y * this.canvas.height;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }

    updateCursor(landmarks) {
        // Use Index Finger Tip (8) for cursor position
        const indexTip = landmarks[8];

        // Map normalized coordinates (0-1) to 3D space (-1 to 1 range roughly, scaled by distance)
        // Camera is at 5 z, looking at 0.
        // Screen plane at z=0 is approx width 6 units.

        const x = (1 - indexTip.x) * 2 - 1; // Mirror x
        const y = (1 - indexTip.y) * 2 - 1;

        // Smooth cursor movement (Basic Lerp)
        const targetPos = new THREE.Vector3(x * 6, y * 3.5, 0); // Increased range for better reach
        this.cursorMesh.position.lerp(targetPos, 0.2);
        this.cursorMesh.visible = true;

        // Update Raycaster from camera
        const ndc = new THREE.Vector2(x, y);
        this.raycaster.setFromCamera(ndc, this.sceneManager.camera);
    }

    handleInteractions() {
        const intersects = this.raycaster.intersectObjects(this.sceneManager.scene.children, true);

        // Filter interacts to only UI panels/buttons
        const hit = intersects.find(i => i.object.userData.type === 'panel' || i.object.userData.type === 'button');

        if (hit) {
            if (this.lastHovered !== hit.object) {
                if (this.lastHovered) this.uiManager.unhover(this.lastHovered);
                this.uiManager.hover(hit.object);
                this.lastHovered = hit.object;
            }
        } else {
            if (this.lastHovered) {
                this.uiManager.unhover(this.lastHovered);
                this.lastHovered = null;
            }
        }
    }

    recognizeGesture(landmarks) {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const indexPip = landmarks[6];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];

        // 1. Pinch Detection (Thumb + Index distance)
        const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
        const isPinch = pinchDist < 0.05;

        if (isPinch) {
            this.setCursorState('pinch');
            if (this.pinchDebounce <= 0 && this.lastHovered) {
                this.uiManager.select(this.lastHovered); // Trigger Interaction
                this.pinchDebounce = 30; // Cooldown frames
            }
        } else {
            this.setCursorState('open');
        }

        if (this.pinchDebounce > 0) this.pinchDebounce--;

        // 2. Fist Detection
        const isFist = (
            indexTip.y > indexPip.y &&
            middleTip.y > landmarks[10].y &&
            ringTip.y > landmarks[14].y &&
            pinkyTip.y > landmarks[18].y
        );

        if (isFist) {
            if (this.pinchDebounce <= 0) {
                this.uiManager.back();
                this.pinchDebounce = 30;
                console.log("Back Gesture");
            }
        }

        // 3. Swipe Detection (Simple X movement avg)
        this.trackSwipe(indexTip);
    }

    trackSwipe(tip) {
        if (!this.swipeHistory) this.swipeHistory = [];
        this.swipeHistory.push({ x: tip.x, time: Date.now() });

        // Keep last 10 frames (~300ms)
        if (this.swipeHistory.length > 10) this.swipeHistory.shift();

        if (this.swipeHistory.length === 10) {
            const first = this.swipeHistory[0];
            const last = this.swipeHistory[9];
            const dx = last.x - first.x;
            const dt = last.time - first.time;

            if (dt < 500 && Math.abs(dx) > 0.2) { // Fast, significant movement
                if (this.pinchDebounce <= 0) {
                    const dir = dx > 0 ? 'left' : 'right'; // Screen coords mirror
                    // console.log("Swipe", dir);
                    this.sceneManager.rotateCamera(dir === 'left' ? -0.5 : 0.5);
                    this.pinchDebounce = 20;
                    this.swipeHistory = []; // Reset
                }
            }
        }
    }

    setCursorState(state) {
        if (state === 'pinch') {
            this.cursorMesh.material.color.set(CONFIG.colors.secondary);
            this.cursorMesh.scale.set(0.8, 0.8, 0.8);
        } else {
            this.cursorMesh.material.color.set(CONFIG.colors.accent);
            this.cursorMesh.scale.set(1, 1, 1);
        }
    }
}

const CONFIG_GYRO = {
    sensitivity: 0.05,
    maxTilt: 20
};

class GyroController {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.enabled = false;
        this.targetBeta = 0;
        this.targetGamma = 0;
        this.currentBeta = 0;
        this.currentGamma = 0;
        this.initialBeta = null;
        this.initialGamma = null;
    }

    async requestPermission() {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permissionState = await DeviceOrientationEvent.requestPermission();
                if (permissionState === 'granted') {
                    this.start();
                } else {
                    console.warn("Gyro permission denied");
                }
            } catch (error) {
                console.error("Gyro permission error:", error);
            }
        } else {
            // Android / Non-iOS (or desktop simulation)
            this.start();
        }
    }

    start() {
        if (this.enabled) return;
        this.enabled = true;
        window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
        console.log("Gyro control started");
    }

    handleOrientation(event) {
        if (!this.enabled) return;

        // Calibrate on first valid reading
        if (this.initialBeta === null && event.beta !== null) {
            this.initialBeta = event.beta;
            this.initialGamma = event.gamma;
            return;
        }

        if (event.beta === null) return;

        // Calculate delta from initial position
        // This makes the current holding position "zero"
        const betaDiff = event.beta - this.initialBeta;
        const gammaDiff = event.gamma - this.initialGamma;

        // Clamp
        this.targetBeta = Math.max(-CONFIG_GYRO.maxTilt, Math.min(CONFIG_GYRO.maxTilt, betaDiff));
        this.targetGamma = Math.max(-CONFIG_GYRO.maxTilt, Math.min(CONFIG_GYRO.maxTilt, gammaDiff));
    }

    update() {
        if (!this.enabled) return;

        // Smooth interpolation
        this.currentBeta += (this.targetBeta - this.currentBeta) * CONFIG_GYRO.sensitivity;
        this.currentGamma += (this.targetGamma - this.currentGamma) * CONFIG_GYRO.sensitivity;

        // Normalize to -1 to 1
        const xNorm = this.currentBeta / CONFIG_GYRO.maxTilt;
        const yNorm = this.currentGamma / CONFIG_GYRO.maxTilt;

        this.sceneManager.applyGyroRotation(xNorm, yNorm);
    }
}

class App {
    constructor() {
        window.appInstance = this; // Global ref for fallback
        this.sceneManager = new SceneManager();
        this.uiManager = new UIManager(this.sceneManager); // Create UI Manager
        this.handTracker = new HandTracker(this.sceneManager, this.uiManager); // Pass UI to Tracker
        this.gyroController = new GyroController(this.sceneManager); // Gyro
        this.clock = new THREE.Clock();

        this.initUI();
        this.animate();
    }

    initUI() {
        // UI Elements
        this.ui = {
            loading: document.getElementById('loading-screen'),
            permission: document.getElementById('permission-prompt'),
            start: document.getElementById('start-prompt'),
            guide: document.getElementById('gesture-guide'),
            btnAllow: document.getElementById('btn-allow-camera'),
            btnMouse: document.getElementById('btn-use-mouse')
        };

        // Event Listeners
        this.ui.btnAllow.addEventListener('click', () => {
            this.startCameraExperience();
            this.gyroController.requestPermission();
        });

        this.ui.btnMouse.addEventListener('click', () => {
            this.startMouseExperience();
            this.gyroController.requestPermission();
        });

        // Simulate initial load
        setTimeout(() => {
            this.ui.loading.classList.add('opacity-0');
            setTimeout(() => {
                this.ui.loading.style.display = 'none';
                this.ui.permission.classList.remove('hidden');
            }, 1000);
        }, 1500);
    }

    startCameraExperience() {
        console.log("Starting Camera Experience...");
        this.ui.permission.classList.add('hidden');
        this.ui.start.style.opacity = '1';
        this.ui.guide.style.opacity = '1';

        this.handTracker.startWebcam();
    }

    startMouseExperience() {
        console.log("Starting Mouse Experience...");
        this.ui.permission.classList.add('hidden');
        this.ui.start.style.opacity = '1';

        // Enable OrbitControls
        this.sceneManager.controls.enabled = true;
        this.sceneManager.controls.autoRotate = true;
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        this.gyroController.update(); // Update Gyro
        this.handTracker.detect(); // Process vision
        this.sceneManager.update();
    }
}

// Start App
window.addEventListener('DOMContentLoaded', () => {
    new App();
});
