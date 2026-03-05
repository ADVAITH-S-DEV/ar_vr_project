/**
 * main.js
 * Core A-Frame component registry for VoxelRift WebXR.
 * Preserves the rigorous O(1) and O(log N) optimizations by hooking into A-Frame's three.js layer.
 */

// Component: optimized-environment
// Generates the O(1) InstancedMesh pine forest, hills, and stars utilizing Three.js within A-Frame
AFRAME.registerComponent('optimized-environment', {
    init: function () {
        window.gameColliders = []; // Global pool of colliders for quick O(1) distance checks

        // Access the underlying Three.js scene from A-Frame
        const scene = this.el.sceneEl.object3D;
        const THREE = AFRAME.THREE; // A-Frame bundles Three.js

        // 1. O(1) Instanced Stars
        const starGeo = new THREE.BufferGeometry();
        const starCount = 3000;
        const starPos = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount * 3; i += 3) {
            starPos[i] = (Math.random() - 0.5) * 400; // x
            starPos[i + 1] = Math.random() * 200 + 20;  // y (above ground)
            starPos[i + 2] = (Math.random() - 0.5) * 400; // z
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.8 });
        const stars = new THREE.Points(starGeo, starMat);
        scene.add(stars);

        // 2. O(1) Distant Hills
        const hillGeo = new THREE.SphereGeometry(30, 16, 16);
        const hillMat = new THREE.MeshPhongMaterial({ color: 0x11210b, flatShading: true });
        const hillCount = 15;
        const hillMesh = new THREE.InstancedMesh(hillGeo, hillMat, hillCount);
        const dummy = new THREE.Object3D();

        for (let i = 0; i < hillCount; i++) {
            const angle = (i / hillCount) * Math.PI * 2;
            const radius = 180 + Math.random() * 40;
            dummy.position.set(Math.cos(angle) * radius, -10, Math.sin(angle) * radius);
            dummy.scale.set(1 + Math.random() * 0.5, 0.5 + Math.random() * 0.8, 1 + Math.random() * 0.5);
            dummy.lookAt(0, 0, 0);
            dummy.updateMatrix();
            hillMesh.setMatrixAt(i, dummy.matrix);
        }
        scene.add(hillMesh);

        // 3. O(1) Instanced Forest (Pine Trees + Rocks)
        const treeCount = 800;

        // Adding subtle physical roughness and varying colors to emulate texture
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 4, 8); // Taller, slightly tapered
        trunkGeo.translate(0, 2, 0);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3219, roughness: 1.0, flatShading: true });
        this.trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);

        // More realistic Pine Trees: Multi-tiered cone structure
        const leavesGeo1 = new THREE.ConeGeometry(3.0, 4, 8); leavesGeo1.translate(0, 3.5, 0);
        const leavesGeo2 = new THREE.ConeGeometry(2.2, 3.5, 8); leavesGeo2.translate(0, 6.0, 0);
        const leavesGeo3 = new THREE.ConeGeometry(1.5, 3, 8); leavesGeo3.translate(0, 8.0, 0);

        // Merge the three cones into one geometry using a simple buffer geometry merge approach
        // We'll just generate an array of geometries and let ThreeJS helper function do the work normally,
        // but since we don't have BufferGeometryUtils imported, we'll build a composite geometry manually.
        // For O(1) InstancedMesh simplicity, we'll just stack three instanced meshes.

        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x163010, roughness: 0.9, flatShading: true });
        this.leavesBottom = new THREE.InstancedMesh(leavesGeo1, leavesMat, treeCount);
        this.leavesMiddle = new THREE.InstancedMesh(leavesGeo2, leavesMat, treeCount);
        this.leavesTop = new THREE.InstancedMesh(leavesGeo3, leavesMat, treeCount);

        // Rocky texture
        const rockGeo = new THREE.DodecahedronGeometry(0.6, 1); // 1 detail level for bumpier rocks
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 1.0, flatShading: true });
        this.rocks = new THREE.InstancedMesh(rockGeo, rockMat, treeCount);

        for (let i = 0; i < treeCount; i++) {
            let x = (Math.random() - 0.5) * 200;
            let z = (Math.random() - 0.5) * 200;
            // Clear the 8x8 center area for player spawn
            if (Math.abs(x) < 8 && Math.abs(z) < 8) {
                x += (x > 0 ? 10 : -10);
                z += (z > 0 ? 10 : -10);
            }

            // Register Trunk Collider
            window.gameColliders.push({ x: x, z: z, radius: 0.6 });

            // Trunk
            dummy.position.set(x, 0, z);
            const scaleY = 0.8 + Math.random() * 0.7;
            dummy.scale.set(1, scaleY, 1);
            dummy.rotation.set(0, Math.random() * Math.PI, 0);
            dummy.updateMatrix();
            this.trunks.setMatrixAt(i, dummy.matrix);

            // Pine cone leaves (stacked)
            dummy.scale.set(0.8 + Math.random() * 0.4, scaleY, 0.8 + Math.random() * 0.4);
            dummy.updateMatrix();
            this.leavesBottom.setMatrixAt(i, dummy.matrix);
            this.leavesMiddle.setMatrixAt(i, dummy.matrix);
            this.leavesTop.setMatrixAt(i, dummy.matrix);

            // Rocks
            const rockX = x + (Math.random() - 0.5) * 4;
            const rockZ = z + (Math.random() - 0.5) * 4;
            // Register Rock Collider
            window.gameColliders.push({ x: rockX, z: rockZ, radius: 0.8 });

            dummy.position.set(rockX, 0.3, rockZ);
            dummy.scale.set(Math.random() * 0.8 + 0.4, Math.random() * 0.5 + 0.3, Math.random() * 0.8 + 0.4);
            dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            dummy.updateMatrix();
            this.rocks.setMatrixAt(i, dummy.matrix);
        }

        scene.add(this.trunks);
        scene.add(this.leavesBottom);
        scene.add(this.leavesMiddle);
        scene.add(this.leavesTop);
        scene.add(this.rocks);
    },
    tick: function (time, timeDelta) {
        // Optimized Main Loop Segment hook for A-Frame
        // This executes every frame. Time Complexity Goal: O(1) or O(log N)

        // Future Integration:
        // ChunkManager.update();
        // PhysicsWorld.step();
    }
});

// Component: katana-hand
// Compiles the Katana sword and hand using basic A-Frame primitives
AFRAME.registerComponent('katana-hand', {
    init: function () {
        const el = this.el;

        // Katana Handle
        const handle = document.createElement('a-cylinder');
        handle.setAttribute('radius', '0.02');
        handle.setAttribute('height', '0.2');
        handle.setAttribute('color', '#222222');
        handle.setAttribute('position', '0 -0.1 0');
        el.appendChild(handle);

        // Katana Guard
        const guard = document.createElement('a-cylinder');
        guard.setAttribute('radius', '0.04');
        guard.setAttribute('height', '0.01');
        guard.setAttribute('color', '#aaaa00');
        guard.setAttribute('position', '0 0 0');
        el.appendChild(guard);

        // Katana Blade
        const blade = document.createElement('a-box');
        blade.setAttribute('width', '0.01');
        blade.setAttribute('height', '0.8');
        blade.setAttribute('depth', '0.03');
        blade.setAttribute('color', '#eeeeee');
        blade.setAttribute('material', 'metalness: 0.8; roughness: 0.2');
        blade.setAttribute('position', '0 0.4 0');
        el.appendChild(blade);

        // Hand Component Group
        const handGroup = document.createElement('a-entity');
        const skinColor = '#ffcc99';

        // Palm
        const palm = document.createElement('a-box');
        palm.setAttribute('width', '0.08');
        palm.setAttribute('height', '0.08');
        palm.setAttribute('depth', '0.04');
        palm.setAttribute('color', skinColor);
        palm.setAttribute('position', '0 -0.05 0.02');
        handGroup.appendChild(palm);

        // Fingers wrap
        const fingers = document.createElement('a-box');
        fingers.setAttribute('width', '0.08');
        fingers.setAttribute('height', '0.06');
        fingers.setAttribute('depth', '0.05');
        fingers.setAttribute('color', skinColor);
        fingers.setAttribute('position', '0 -0.05 -0.02');
        handGroup.appendChild(fingers);

        // Thumb side
        const thumb = document.createElement('a-box');
        thumb.setAttribute('width', '0.04');
        thumb.setAttribute('height', '0.05');
        thumb.setAttribute('depth', '0.03');
        thumb.setAttribute('color', skinColor);
        thumb.setAttribute('position', '-0.045 -0.03 0');
        handGroup.appendChild(thumb);

        // Connect everything into the entity hierarchy
        el.appendChild(handGroup);

        // --- SWINGING MECHANIC & COMBAT ---
        let isSwinging = false;
        if (typeof window.gameScore === 'undefined') window.gameScore = 0;

        const updateScore = (points) => {
            window.gameScore += points;
            const ui = document.getElementById('score-display');
            if (ui) ui.innerText = 'Score: ' + window.gameScore;
        };

        const checkHit = () => {
            // Find the rabbits component
            const rabbitsEntity = document.querySelector('[instanced-rabbits]');
            if (!rabbitsEntity || !rabbitsEntity.components['instanced-rabbits']) return;

            const rabbitComp = rabbitsEntity.components['instanced-rabbits'];
            const camPos = document.querySelector('a-camera').object3D.position;

            // Get camera forward direction
            const cameraEl = document.querySelector('a-camera');
            const camDir = new AFRAME.THREE.Vector3(0, 0, -1);
            camDir.applyQuaternion(cameraEl.object3D.quaternion);

            // Simple O(N) bounding sphere check against all rabbits for the strike range (e.g. 2 meters)
            const strikeRange = 2.5;
            const strikeRadius = 1.0; // Wide swinging arc padding

            let hitIndex = -1;
            let closestDist = Infinity;

            for (let i = 0; i < rabbitComp.rabbitCount; i++) {
                const r = rabbitComp.rabbits[i];
                if (r.dead) continue;

                // Vector from camera to rabbit
                const dx = r.x - camPos.x;
                const dy = r.y - camPos.y; // rabbit Y is near 0, camera is ~1.6
                const dz = r.z - camPos.z;

                const distToRabbitSq = dx * dx + dy * dy + dz * dz;

                if (distToRabbitSq < strikeRange * strikeRange) {
                    // Normalize direction to rabbit
                    const distToRabbit = Math.sqrt(distToRabbitSq);
                    const rxDir = dx / distToRabbit;
                    const rzDir = dz / distToRabbit;

                    // Dot product to see if rabbit is IN FRONT of the camera relative to where we are looking
                    const dot = (camDir.x * rxDir) + (camDir.z * rzDir);

                    if (dot > 0.5) { // Roughly within a 90 degree forward cone
                        if (distToRabbit < closestDist) {
                            closestDist = distToRabbit;
                            hitIndex = i;
                        }
                    }
                }
            }

            // Did we hit one?
            if (hitIndex !== -1) {
                const target = rabbitComp.rabbits[hitIndex];
                target.health -= 50;

                // Spawn blood splash at hit location
                if (window.bloodParticles) {
                    window.bloodParticles.spawn(target.x, target.y + 0.3, target.z);
                }

                if (target.health <= 0) {
                    // Trigger dying animation — rabbit tips over and bleeds out
                    target.state = 'dying';
                    target.deathTimer = 0;
                    updateScore(100); // 100 points for a kill
                    // Big blood burst on death
                    if (window.bloodParticles) {
                        window.bloodParticles.spawn(target.x, 0.5, target.z);
                    }
                } else {
                    updateScore(10); // 10 points for a hit
                    // Knockback: rabbit flinches and hops away frightened
                    target.state = 'hopping';
                    target.heading += Math.PI + (Math.random() - 0.5) * 1.0; // flee direction
                    target.y = 0.8; // pop into air on impact
                    target.timer = 1.5;
                }
                rabbitComp.needsMatrixUpdate = true;
            }
        };

        const swingSword = () => {
            if (isSwinging) return;
            isSwinging = true;

            // Simple downward strike animation using A-Frame's built-in animation system
            el.setAttribute('animation__strike', {
                property: 'rotation',
                to: '-90 0 22.5', // Strike downward
                dur: 150,     // Fast strike
                easing: 'easeInQuad'
            });

            // Perform damage check halfway through strike
            setTimeout(checkHit, 75);

            // Perform damage check halfway through strike
            setTimeout(checkHit, 75);

            // Return to resting position once the strike finishes
            setTimeout(() => {
                el.removeAttribute('animation__strike');
                el.setAttribute('animation__return', {
                    property: 'rotation',
                    to: '-45 0 22.5', // Original resting slanted pose
                    dur: 300,
                    easing: 'easeOutQuad'
                });

                setTimeout(() => {
                    el.removeAttribute('animation__return');
                    isSwinging = false;
                }, 300);
            }, 150);
        };

        // 1. Mouse Click (Desktop) - Left or Right click both work
        window.addEventListener('mousedown', (e) => {
            // e.button 0 = left, 2 = right
            // We'll allow any click to swing for ease of use
            swingSword();
        });

        // Prevent default context menu on right click so it doesn't interrupt game
        window.addEventListener('contextmenu', e => e.preventDefault());

        // 2. VR Controller Trigger Hook (WebXR)
        const sceneEl = document.querySelector('a-scene');
        if (sceneEl) {
            sceneEl.addEventListener('triggerdown', (e) => {
                swingSword();
            });
        }
    }
});

// Component: procedural-grass
// Procedurally generates a lightweight noise texture for the grass using Canvas API to save network loads
AFRAME.registerComponent('procedural-grass', {
    init: function () {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#3d7a26';
        ctx.fillRect(0, 0, 256, 256);

        for (let i = 0; i < 4000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#2c5a1a' : '#4e9c31';
            ctx.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 2, 4 + Math.random() * 6);
        }

        const texture = new AFRAME.THREE.CanvasTexture(canvas);
        texture.wrapS = AFRAME.THREE.RepeatWrapping;
        texture.wrapT = AFRAME.THREE.RepeatWrapping;
        texture.repeat.set(100, 100);

        const applyTexture = () => {
            const mesh = this.el.getObject3D('mesh');
            if (mesh) {
                mesh.material.map = texture;
                mesh.material.color.setHex(0xffffff); // Un-tint it so the raw canvas colors show natively
                mesh.material.needsUpdate = true;
            }
        };

        if (this.el.getObject3D('mesh')) {
            applyTexture();
        } else {
            this.el.addEventListener('object3dset', applyTexture);
        }
    }
});

// Component: player-collider
// Simple, bounded O(N) spatial distance check on flat 2D plane restricting walking through instanced objects
AFRAME.registerComponent('player-collider', {
    tick: function () {
        if (!window.gameColliders) return;

        const pos = this.el.object3D.position;
        const playerRadius = 0.5;

        for (let i = 0; i < window.gameColliders.length; i++) {
            const col = window.gameColliders[i];
            const dx = pos.x - col.x;
            const dz = pos.z - col.z;
            const distSq = dx * dx + dz * dz;
            const minRadius = col.radius + playerRadius;

            if (distSq < minRadius * minRadius) {
                const dist = Math.sqrt(distSq);
                if (dist > 0.001) {
                    const overlap = minRadius - dist;
                    pos.x += (dx / dist) * overlap;
                    pos.z += (dz / dist) * overlap;
                }
            }
        }
    }
});

// Component: instanced-rabbits
// Autonomous roaming low-poly rabbits using InstancedMesh (O(1) draw calls, O(K) state updates)
AFRAME.registerComponent('instanced-rabbits', {
    init: function () {
        const scene = this.el.sceneEl.object3D;
        const THREE = AFRAME.THREE;

        this.rabbitCount = 50;

        // --- Multi-part Rabbit Geometry (merged into one BufferGeometry) ---
        // We build a realistic low-poly rabbit by combining several boxes:
        //   body (flattened elliptical box), head (slightly smaller box),
        //   two ears (thin tall box), fluffy tail (tiny sphere-like box), four legs
        const parts = [];

        const addBox = (w, h, d, ox, oy, oz) => {
            const g = new THREE.BoxGeometry(w, h, d);
            g.translate(ox, oy, oz);
            parts.push(g);
        };

        addBox(0.35, 0.22, 0.55, 0, 0.20, 0);    // body
        addBox(0.25, 0.22, 0.28, 0, 0.30, 0.32); // head
        addBox(0.06, 0.30, 0.05, -0.07, 0.54, 0.30); // left ear
        addBox(0.06, 0.30, 0.05, 0.07, 0.54, 0.30); // right ear
        addBox(0.10, 0.10, 0.10, 0, 0.22, -0.29); // tail
        // Four legs
        addBox(0.07, 0.14, 0.07, -0.12, 0.07, 0.17); // front-left
        addBox(0.07, 0.14, 0.07, 0.12, 0.07, 0.17); // front-right
        addBox(0.09, 0.14, 0.09, -0.12, 0.07, -0.17); // rear-left
        addBox(0.09, 0.14, 0.09, 0.12, 0.07, -0.17); // rear-right

        // Manually merge all part geometries via BufferGeometry merge loop
        let totalVerts = 0;
        for (const p of parts) totalVerts += p.attributes.position.count;

        const posArray = new Float32Array(totalVerts * 3);
        const normArray = new Float32Array(totalVerts * 3);
        const uvArray = new Float32Array(totalVerts * 2);
        const idxArrays = [];

        let vOffset = 0, idxOffset = 0;
        for (const p of parts) {
            const pos = p.attributes.position;
            const nor = p.attributes.normal;
            const uv = p.attributes.uv;
            for (let v = 0; v < pos.count; v++) {
                posArray[(vOffset + v) * 3] = pos.getX(v);
                posArray[(vOffset + v) * 3 + 1] = pos.getY(v);
                posArray[(vOffset + v) * 3 + 2] = pos.getZ(v);
                normArray[(vOffset + v) * 3] = nor.getX(v);
                normArray[(vOffset + v) * 3 + 1] = nor.getY(v);
                normArray[(vOffset + v) * 3 + 2] = nor.getZ(v);
                uvArray[(vOffset + v) * 2] = uv.getX(v);
                uvArray[(vOffset + v) * 2 + 1] = uv.getY(v);
            }
            const idx = p.index;
            if (idx) {
                for (let f = 0; f < idx.count; f++) idxArrays.push(idx.getX(f) + vOffset);
            }
            vOffset += pos.count;
        }

        const rabbitGeo = new THREE.BufferGeometry();
        rabbitGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        rabbitGeo.setAttribute('normal', new THREE.BufferAttribute(normArray, 3));
        rabbitGeo.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
        rabbitGeo.setIndex(idxArrays);
        rabbitGeo.computeBoundingSphere();

        const rabbitMat = new THREE.MeshStandardMaterial({
            color: 0xd4b896,   // Sandy/brown realistic fur color
            roughness: 0.95,
            flatShading: true
        });
        this.mesh = new THREE.InstancedMesh(rabbitGeo, rabbitMat, this.rabbitCount);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        this.dummy = new THREE.Object3D();
        this.rabbits = []; // Logical state array

        for (let i = 0; i < this.rabbitCount; i++) {
            const x = (Math.random() - 0.5) * 150;
            const z = (Math.random() - 0.5) * 150;
            const heading = Math.random() * Math.PI * 2;

            this.rabbits.push({
                x: x, z: z, y: 0,
                heading: heading,
                health: 100,
                dead: false,
                state: 'idle', // 'idle' or 'hopping'
                timer: Math.random() * 3, // Seconds until state change
                hopPhase: 0
            });

            this.dummy.position.set(x, 0, z);
            this.dummy.rotation.y = heading;
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }

        scene.add(this.mesh);
    },
    tick: function (time, timeDelta) {
        const dt = timeDelta / 1000;
        let needsUpdate = false;

        if (this.needsMatrixUpdate) {
            needsUpdate = true;
            this.needsMatrixUpdate = false;
        }

        for (let i = 0; i < this.rabbitCount; i++) {
            const r = this.rabbits[i];

            if (r.dead) continue; // Skip fully-dead rabbits (gone from world)

            r.timer -= dt;

            if (r.timer <= 0) {
                // Switch states
                if (r.state === 'idle') {
                    r.state = 'hopping';
                    r.timer = 1 + Math.random() * 2; // Hop for 1-3 seconds
                    r.heading += (Math.random() - 0.5) * Math.PI; // Pick new random direction
                } else {
                    r.state = 'idle';
                    r.timer = 2 + Math.random() * 5; // Rest for 2-7 seconds
                    r.hopPhase = 0;
                    r.y = 0;
                }
            }

            // ---- DYING ANIMATION: tip over and sink ----
            if (r.state === 'dying') {
                r.deathTimer += dt;
                const t = Math.min(r.deathTimer / 1.2, 1.0); // 1.2s tip-over
                // Tilt 90deg onto side, sink slowly below ground
                this.dummy.position.set(r.x, Math.max(-0.3, -t * 0.4), r.z);
                this.dummy.rotation.set(Math.PI * 0.5 * t, r.heading, 0);
                // Bleed periodically while dying
                if (window.bloodParticles && Math.random() < 0.12) {
                    window.bloodParticles.spawn(r.x + (Math.random() - 0.5) * 0.3, 0.1, r.z + (Math.random() - 0.5) * 0.3);
                }
                // Go fully red when dying
                this.mesh.setColorAt(i, new AFRAME.THREE.Color(0xff2200));
                this.dummy.updateMatrix();
                this.mesh.setMatrixAt(i, this.dummy.matrix);
                needsUpdate = true;
                if (t >= 1.0) {
                    r.dead = true; // Permanently remove from simulation
                    // Hide it underground
                    this.dummy.position.set(r.x, -10, r.z);
                    this.dummy.scale.set(0.001, 0.001, 0.001);
                    this.dummy.updateMatrix();
                    this.mesh.setMatrixAt(i, this.dummy.matrix);
                }
                continue; // Don't run normal movement logic while dying
            }

            if (r.state === 'hopping') {
                // Move forward
                const speed = 2.0;
                r.x += Math.sin(r.heading) * speed * dt;
                r.z += Math.cos(r.heading) * speed * dt;

                // Animate hopping arc using a sine wave
                r.hopPhase += dt * 10;
                r.y = Math.abs(Math.sin(r.hopPhase)) * 0.5; // Max height 0.5m
                needsUpdate = true;
            } else if (r.y > 0) {
                // Settle to ground if interrupted
                r.y = Math.max(0, r.y - dt * 2);
                needsUpdate = true;
            }

            if (needsUpdate || r.state === 'hopping') {
                this.dummy.position.set(r.x, r.y, r.z);

                // Slightly tilt forward if hopping aggressively
                if (r.state === 'hopping') {
                    this.dummy.rotation.set(-0.2, r.heading, 0);
                } else {
                    this.dummy.rotation.set(0, r.heading, 0);
                }

                // Color flash indicator if health is low
                if (r.health <= 50) {
                    this.mesh.setColorAt(i, new AFRAME.THREE.Color(0xffaaaa)); // Turn red
                } else {
                    this.mesh.setColorAt(i, new AFRAME.THREE.Color(0xffffff)); // White
                }

                this.dummy.updateMatrix();
                this.mesh.setMatrixAt(i, this.dummy.matrix);
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            this.mesh.instanceMatrix.needsUpdate = true;
            if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
        }
    }
});

// Component: blood-particles
// Pre-allocated Points pool for O(1) allocation, O(K) animation per frame
AFRAME.registerComponent('blood-particles', {
    init: function () {
        const THREE = AFRAME.THREE;
        const scene = this.el.sceneEl.object3D;

        // Pool: 500 particles, we re-use the same buffer
        this.POOL_SIZE = 500;
        this.positions = new Float32Array(this.POOL_SIZE * 3);
        this.velocities = [];
        this.lifetimes = new Float32Array(this.POOL_SIZE); // 0 = dead
        this.nextSlot = 0; // Round-robin allocation pointer

        // Fill off-screen BEFORE creating the attribute
        this.positions.fill(-9999);
        this.lifetimes.fill(0);

        for (let i = 0; i < this.POOL_SIZE; i++) {
            this.velocities.push({ x: 0, y: 0, z: 0 });
        }

        const geo = new THREE.BufferGeometry();
        // Store the attribute reference explicitly so we can mark needsUpdate
        this.posAttr = new THREE.BufferAttribute(this.positions, 3);
        this.posAttr.setUsage(THREE.DynamicDrawUsage);
        geo.setAttribute('position', this.posAttr);

        const mat = new THREE.PointsMaterial({
            color: 0xcc0000,
            size: 0.25,          // Bigger so it's clearly visible
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.95,
            depthWrite: false
        });

        this.points = new THREE.Points(geo, mat);
        scene.add(this.points);

        // Expose spawn method globally so katana-hand can call it
        window.bloodParticles = this;
    },

    // Call this to emit a blood splash at world position (x,y,z)
    spawn: function (x, y, z) {
        const COUNT = 60; // More particles per splash for visibility
        for (let k = 0; k < COUNT; k++) {
            const idx = this.nextSlot % this.POOL_SIZE;
            this.nextSlot++;

            this.positions[idx * 3] = x;
            this.positions[idx * 3 + 1] = y;
            this.positions[idx * 3 + 2] = z;

            // Random outward spray velocity
            this.velocities[idx].x = (Math.random() - 0.5) * 5;
            this.velocities[idx].y = Math.random() * 4 + 1;
            this.velocities[idx].z = (Math.random() - 0.5) * 5;

            this.lifetimes[idx] = 1.5; // 1.5 seconds of life
        }
        this.posAttr.needsUpdate = true;
    },

    tick: function (time, timeDelta) {
        const dt = timeDelta / 1000;
        let dirty = false;
        const GRAVITY = -6.0;

        for (let i = 0; i < this.POOL_SIZE; i++) {
            if (this.lifetimes[i] <= 0) continue;
            this.lifetimes[i] -= dt;

            if (this.lifetimes[i] <= 0) {
                // Recycle: hide it far away
                this.positions[i * 3] = -9999;
                this.positions[i * 3 + 1] = -9999;
                this.positions[i * 3 + 2] = -9999;
            } else {
                const vel = this.velocities[i];
                vel.y += GRAVITY * dt;
                this.positions[i * 3] += vel.x * dt;
                this.positions[i * 3 + 1] += vel.y * dt;
                this.positions[i * 3 + 2] += vel.z * dt;

                // Splat on ground
                if (this.positions[i * 3 + 1] < 0.01) {
                    this.positions[i * 3 + 1] = 0.01;
                    vel.y = 0;
                    vel.x *= 0.4;
                    vel.z *= 0.4;
                }
            }
            dirty = true;
        }

        if (dirty) {
            this.posAttr.needsUpdate = true;
        }
    }
});
