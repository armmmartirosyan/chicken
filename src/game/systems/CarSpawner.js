import { Car } from "../entities/Car.js";

/**
 * CarSpawner - Manages car spawning and object pooling
 * Implements efficient memory management and optimal spawn timing
 */
export class CarSpawner {
  constructor(config) {
    this.config = config;
    this.entityManager = null;
    this.pixiRenderer = null;
    this.road = null;
    this.chicken = null;
    this.containerElement = null;
    this.gateManager = null;

    // Object pool for cars
    this.carPool = [];
    this.activeCars = [];
    this.poolSize = 30;

    // Difficulty-based spawn timing (defaults to Easy)
    this.currentDifficulty = "Easy";
    this.baseMinSpeed = 1500; // Base speed (px/s)
    this.baseMaxSpeed = 2000; // Base speed (px/s)
    this.speedMultiplier = 1.0;
    this.minSpeed = this.baseMinSpeed * this.speedMultiplier;
    this.maxSpeed = this.baseMaxSpeed * this.speedMultiplier;

    // Spawn timing in seconds (converted from ms)
    this.spawnTimer = 0;
    this.minSpawnInterval = 2.5; // 2500ms in seconds
    this.maxSpawnInterval = 4.5; // 4500ms in seconds
    this.nextSpawnTime = this.getRandomSpawnInterval();

    // Lane configuration
    this.lanes = [];
    this.laneCooldowns = new Map();
    this.laneLastSpawnTime = new Map(); // Track last spawn time per lane
    this.cooldownDuration = 3.0;
    this.carHeight = 98; // Average car height for collision prevention
    this.safetyMargin = 150; // Safety buffer in pixels
    this.startX = 0;
    this.roadWidth = 0;
    this.roadY = 0;
    this.roadHeight = 0;
    this.laneWidth = 300;

    // Car types and their probabilities
    this.carTypes = [
      { type: "truck-orange", weight: 0.3, imageKey: "truck-orange" },
      { type: "truck-blue", weight: 0.3, imageKey: "truck-blue" },
      { type: "car-yellow", weight: 0.2, imageKey: "car-yellow" },
      { type: "car-police", weight: 0.2, imageKey: "car-police" },
    ];

    // Cleanup optimization
    this.cleanupFrameCounter = 0;
    this.cleanupInterval = 10;

    // Collision handling
    this.hasCollided = false;
    this.onCollision = null;
    this.collisionsEnabled = false; // Start with collisions disabled (enabled when game starts)

    // Track chicken's current lane for dynamic safe zone
    this.chickenLaneIndex = 0;
    this.initialSpawnComplete = false;

    // First game forced loss mechanic
    this.isFirstGame = false;
    this.firstGameForcedLossActive = false;
    this.blockedLaneForFirstGame = 2; // Lane 2 in CarSpawner = 3rd coin line (chicken lane 3)
  }

  /**
   * Initialize the spawner
   */
  initialize(
    entityManager,
    pixiRenderer,
    road,
    chicken,
    containerElement,
    gateManager = null,
  ) {
    this.entityManager = entityManager;
    this.pixiRenderer = pixiRenderer; // Use Pixi renderer for texture access
    this.road = road;
    this.chicken = chicken; // Store chicken reference for smart spawning
    this.containerElement = containerElement; // For viewport detection
    this.gateManager = gateManager; // Store gate manager reference for car blocking

    // Calculate lane positions and road boundaries
    this.startX = road.x;
    this.roadWidth = road.width;
    this.roadY = road.y;
    this.roadHeight = road.height;
    this.laneWidth = road.laneWidth;
    this.setupLanes();

    // Pre-populate object pool
    this.initializePool();

    // Check if this is the first game ever
    this.checkFirstGame();
  }

  /**
   * Check if this is the user's first game ever
   */
  checkFirstGame() {
    try {
      const hasPlayedBefore = sessionStorage.getItem("chicken_game_played");
      this.isFirstGame = !hasPlayedBefore;
      this.firstGameForcedLossActive = this.isFirstGame;
    } catch {
      // If sessionStorage fails, assume not first game
      this.isFirstGame = false;
      this.firstGameForcedLossActive = false;
    }
  }

  /**
   * Mark that the user has played the game
   */
  markGamePlayed() {
    try {
      sessionStorage.setItem("chicken_game_played", "true");
      this.isFirstGame = false;
      this.firstGameForcedLossActive = false;
    } catch {
      // Ignore sessionStorage errors
    }
  }

  /**
   * Setup lane configurations
   */
  setupLanes() {
    const laneCount = this.road.laneCount;
    const laneWidth = this.road.laneWidth;

    // Setup all lanes for vertical traffic (cars move down)
    for (let i = 0; i < laneCount; i++) {
      this.lanes.push({
        index: i,
        centerX: this.startX + (i + 0.5) * laneWidth, // Center X of the lane
        spawnChance: 0.4 + Math.random() * 0.3, // Vary traffic density per lane
      });
    }
  }

  /**
   * Update lane count when difficulty changes
   */
  updateLaneCount(road) {
    // Clear existing lanes
    this.lanes.length = 0;

    // Update road reference and properties
    this.road = road;
    this.startX = road.x;
    this.roadWidth = road.width;
    this.laneWidth = road.laneWidth;

    // Recalculate lanes
    this.setupLanes();
  }

  /**
   * Initialize object pool
   */
  initializePool() {
    for (let i = 0; i < this.poolSize; i++) {
      const car = new Car(0, 0, {});
      car.inUse = false;
      car.active = false;
      this.carPool.push(car);
    }
  }

  /**
   * Get a car from the pool or create new one
   */
  acquireCar() {
    // Try to find an unused car in the pool with valid container
    let car = this.carPool.find((c) => !c.inUse && c.container);

    // If pool is exhausted or all cars invalid, create a new car
    if (!car) {
      car = new Car(0, 0, {});

      // Verify the car was created with a valid container
      if (!car.container) {
        return null;
      }

      this.carPool.push(car);
    }

    return car;
  }

  /**
   * Release car back to pool (don't destroy - reuse)
   * ENHANCED: Force removal from stage with logging
   */
  releaseCar(car) {
    // Hide car but keep container for pooling
    car.release();

    // Remove from active cars list
    const index = this.activeCars.indexOf(car);
    if (index !== -1) {
      this.activeCars.splice(index, 1);
    }

    // CRITICAL: Remove from stage (but don't destroy container for reuse)
    if (this.entityManager && this.entityManager.stage && car.container) {
      try {
        const stage = this.entityManager.stage;
        if (car.container.parent === stage) {
          stage.removeChild(car.container);
        }
      } catch {
        // Some
      }
    }
  }

  /**
   * Enable collision detection (called when game starts)
   */
  enableCollisions() {
    this.collisionsEnabled = true;
  }

  /**
   * Disable collision detection (called when game is idle or ends)
   */
  disableCollisions() {
    this.collisionsEnabled = false;
  }

  /**
   * Force spawn a car on lane 3 to hit the chicken (first game mechanic)
   * This is called when chicken jumps from lane 2 to lane 3 on their first game
   */
  forceSpawnForFirstGame() {
    if (!this.firstGameForcedLossActive) return;
    if (!this.chicken) return;

    // CarSpawner lane 2 = 3rd coin line (chicken's lane 3)
    // CarSpawner lanes are 0-indexed without sidewalk
    const targetLane = this.blockedLaneForFirstGame; // CarSpawner lane 2 = 3rd coin line

    // Get lane info
    const lane = this.lanes[targetLane];
    if (!lane) {
      return;
    }

    // Get the chicken's current Y position (where it starts the jump from lane 2)
    const chickenCurrentY = this.chicken.container
      ? this.chicken.container.position.y
      : this.chicken.y;

    // Spawn car directly on the target lane at the chicken's landing Y position
    // We want the car to be positioned so it arrives at the chicken's landing spot during/after the jump
    // Chicken jump takes ~400ms (0.4 seconds)
    const jumpDuration = 0.4; // seconds

    // Calculate how fast the car needs to move to guarantee a hit
    // Use 3x max speed to ensure the car moves very fast and hits the chicken
    const guaranteedSpeed = this.maxSpeed * 3.0; // 3x max speed for guaranteed collision

    // Spawn car above the chicken's current Y position
    // Position car to arrive slightly after jump starts for guaranteed collision
    // Car should travel during jump duration to reach chicken position
    const distanceToTravel = guaranteedSpeed * jumpDuration * 0.5; // Spawn closer (50% of full distance)
    const spawnY = chickenCurrentY - distanceToTravel;
    const spawnX = lane.centerX; // Spawn on the exact lane center

    // Get car from pool
    const car = this.acquireCar();
    if (!car || !car.container) {
      return;
    }

    // Get random car type
    const carType = this.getRandomCarType();
    const texture = this.pixiRenderer.getTexture(carType.imageKey);
    if (!texture) {
      return;
    }

    // Get gate for this lane (if any)
    const laneGate = this.gateManager
      ? this.gateManager.getGateForLane(lane.index)
      : null;

    // Reset car with forced configuration
    car.reset(spawnX, spawnY, {
      lane: lane.index,
      speed: guaranteedSpeed,
      carType: carType.type,
      roadBottomY: this.roadY + this.roadHeight,
      gate: laneGate,
    });

    car.setTexture(texture);

    // Add to active cars
    this.activeCars.push(car);

    // Manually add to stage (critical for visibility)
    if (this.entityManager && this.entityManager.stage && car.container) {
      try {
        // Set car z-index higher than coins (coins are at 100)
        car.container.zIndex = 150;
        this.entityManager.stage.addChild(car.container);
      } catch {
        // Some
      }
    }

    // Mark that first game forced loss has been triggered
    this.markGamePlayed();
  }

  /**
   * Get random spawn interval
   */
  getRandomSpawnInterval() {
    return (
      this.minSpawnInterval +
      Math.random() * (this.maxSpawnInterval - this.minSpawnInterval)
    );
  }

  /**
   * Calculate minimum gap required to prevent collisions on same lane
   * Formula: (CarHeight / CurrentSpeed) + SafetyMargin
   */
  calculateMinimumGap(speed) {
    const timeToPass = this.carHeight / speed; // Time for car to move past its own length
    return timeToPass + this.safetyMargin / speed; // Add safety margin time
  }

  /**
   * Get random car type based on weights
   */
  getRandomCarType() {
    const totalWeight = this.carTypes.reduce(
      (sum, type) => sum + type.weight,
      0,
    );
    let random = Math.random() * totalWeight;

    for (const carType of this.carTypes) {
      random -= carType.weight;
      if (random <= 0) {
        return carType;
      }
    }

    return this.carTypes[0]; // Fallback
  }

  /**
   * Spawn a car in a lane near the chicken (next 5 lanes ahead)
   */
  spawnCar() {
    if (!this.entityManager || !this.pixiRenderer || this.lanes.length === 0) {
      return;
    }

    // Get valid spawn lanes (exclude chicken's lane and all lanes behind it)
    const validLanes = this.getValidSpawnLanes();

    if (validLanes.length === 0) {
      return; // No valid lanes to spawn
    }

    // Select random lane from valid lanes
    const targetLane =
      validLanes[Math.floor(Math.random() * validLanes.length)];
    this.spawnCarInLane(targetLane);
  }

  /**
   * Get valid spawn lanes based on chicken's position
   * REQUIREMENT: Exclude chicken's current lane (N) and all lanes behind it (0 to N-1)
   * Only spawn on lanes ahead (N+1, N+2, ...)
   */
  getValidSpawnLanes() {
    if (!this.chicken) {
      // If no chicken reference, spawn on all lanes
      return this.lanes.map((lane) => lane.index);
    }

    // Calculate chicken's current lane index
    const chickenLaneX = this.chicken.x - this.startX;
    const newChickenLaneIndex = Math.max(
      0,
      Math.floor(chickenLaneX / this.laneWidth),
    );

    // Track chicken lane index
    this.chickenLaneIndex = newChickenLaneIndex;

    const validLanes = [];

    for (let i = 0; i < this.lanes.length; i++) {
      // REQUIREMENT: Only spawn on lanes ahead of chicken (exclude current lane and all behind it)
      if (i > this.chickenLaneIndex) {
        // FIRST GAME MECHANIC: Also exclude lane 2 (3rd coin line) during first game until triggered
        // Note: CarSpawner lanes are 0-indexed without sidewalk
        if (
          this.firstGameForcedLossActive &&
          i === this.blockedLaneForFirstGame
        ) {
          continue; // Skip 3rd coin line on first game
        }
        validLanes.push(i);
      }
    }

    return validLanes;
  }

  /**
   * Check if a lane is available for spawning (no cooldown)
   */
  isLaneAvailable(laneIndex) {
    const now = performance.now() / 1000; // Convert to seconds
    const cooldownEnd = this.laneCooldowns.get(laneIndex);

    if (cooldownEnd === undefined) {
      return true; // Lane never used
    }

    return now >= cooldownEnd; // Check if cooldown expired
  }

  /**
   * Set cooldown for a lane
   */
  setLaneCooldown(laneIndex) {
    const now = performance.now() / 1000;
    this.laneCooldowns.set(laneIndex, now + this.cooldownDuration);
  }

  /**
   * Spawn a car in a specific lane
   */
  spawnCarInLane(laneIndex, forceSpawnY = null) {
    // Guard against invalid state
    if (!this.pixiRenderer || !this.entityManager) return;
    if (laneIndex < 0 || laneIndex >= this.lanes.length) return;

    // FIRST GAME MECHANIC: Block lane 2 (3rd coin line) spawns until chicken jumps from lane 2
    // Note: CarSpawner lanes are 0-indexed without sidewalk, so lane 2 = 3rd coin line
    if (
      this.firstGameForcedLossActive &&
      laneIndex === this.blockedLaneForFirstGame &&
      !forceSpawnY
    ) {
      return; // Skip spawning on 3rd coin line during first game until forced
    }

    // Don't spawn cars on lanes that have gates
    if (this.gateManager && this.gateManager.hasGateOnLane(laneIndex)) {
      return;
    }

    const lane = this.lanes[laneIndex];

    // Check if lane is on cooldown
    if (!this.isLaneAvailable(laneIndex)) {
      return; // Lane is on cooldown, don't spawn
    }

    // Check spawn chance for this lane
    if (Math.random() > lane.spawnChance) {
      return; // Don't spawn this time
    }

    // Random speed with wider variation
    const speed =
      this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed);

    // Collision prevention: Check minimum gap based on speed
    const currentTime = performance.now() / 1000; // Convert to seconds
    const lastSpawnTime = this.laneLastSpawnTime.get(laneIndex) || 0;
    const minBuffer = this.calculateMinimumGap(speed);

    if (currentTime - lastSpawnTime < minBuffer) {
      return; // Too soon, would cause collision
    }

    // Get car from pool
    const car = this.acquireCar();

    // Validate car from pool
    if (!car || !car.container) {
      return;
    }

    // Get random car type
    const carType = this.getRandomCarType();

    // Get car texture from Pixi renderer
    const texture = this.pixiRenderer.getTexture(carType.imageKey);
    if (!texture) {
      return;
    }

    // Spawn position: X at lane center, Y at top of canvas (or forced position)
    const spawnX = lane.centerX;

    // Spawn at the top of the visible canvas area (Y=0 or slightly above)
    // This ensures cars are visible as they enter the screen
    // regardless of where the road container is positioned
    // If forceSpawnY is provided (first game forced loss), use that instead
    const spawnY = forceSpawnY !== null ? forceSpawnY : this.roadY - 100;

    // Get gate for this lane (if any)
    const laneGate = this.gateManager
      ? this.gateManager.getGateForLane(lane.index)
      : null;

    // Reset car with new configuration
    car.reset(spawnX, spawnY, {
      lane: lane.index,
      speed: speed,
      carType: carType.type,
      roadBottomY: this.roadY + this.roadHeight,
      gate: laneGate, // Pass gate reference for this specific lane
    });

    car.setTexture(texture);

    // Set cooldown for this lane
    this.setLaneCooldown(lane.index);

    // Track spawn time for collision prevention
    this.laneLastSpawnTime.set(laneIndex, currentTime);

    // Add to active cars
    this.activeCars.push(car);

    // Manually add to stage (don't use entityManager for pooled objects)
    if (this.entityManager && this.entityManager.stage && car.container) {
      try {
        // Set car z-index higher than coins (coins are at 100)
        car.container.zIndex = 150;
        this.entityManager.stage.addChild(car.container);
      } catch {
        // Some
      }
    }
  }

  /**
   * Update spawner (optimized)
   */
  update(deltaTime) {
    if (!this.entityManager || !this.pixiRenderer || !this.road) {
      return;
    }

    // Initial spawn: spawn cars on all lanes at the start of the game
    if (!this.initialSpawnComplete && this.lanes.length > 0) {
      for (let i = 0; i < this.lanes.length; i++) {
        // Spawn with some randomness to avoid all cars appearing at once
        if (Math.random() < 0.4) {
          this.spawnCarInLane(i);
        }
      }
      this.initialSpawnComplete = true;
    }

    // Update all active cars and check collision
    // REQUIREMENT: Cars continue moving after collision - only collision checking is disabled
    for (let i = 0; i < this.activeCars.length; i++) {
      const car = this.activeCars[i];
      if (car && car.active) {
        // Update gate reference dynamically (gates can be placed after car spawns)
        car.gate = this.gateManager
          ? this.gateManager.getGateForLane(car.lane)
          : null;

        // REQUIREMENT: Car continues moving normally (even after collision)
        car.update(deltaTime);

        // REQUIREMENT: Check collision ONLY if collisions are enabled AND collision hasn't occurred yet
        // This prevents multiple collision triggers while allowing cars to continue moving
        // Collisions are disabled in idle state (before play button) and after first collision
        if (this.collisionsEnabled && !this.hasCollided) {
          this.checkCarChickenCollision(car);
        }
      }
    }

    // Update spawn timer for continuous spawning
    this.spawnTimer += deltaTime;

    if (this.spawnTimer >= this.nextSpawnTime) {
      this.spawnCar();
      this.spawnTimer = 0;
      this.nextSpawnTime = this.getRandomSpawnInterval();
    }

    // Throttled cleanup
    this.cleanupFrameCounter++;

    if (this.cleanupFrameCounter >= this.cleanupInterval) {
      this.cleanupFrameCounter = 0;

      if (this.containerElement) {
        const scrollX = this.containerElement.scrollLeft || 0;
        const scrollY = this.containerElement.scrollTop || 0;
        const viewportWidth = this.containerElement.clientWidth || 800;
        const viewportHeight = this.containerElement.clientHeight || 600;

        for (let i = this.activeCars.length - 1; i >= 0; i--) {
          const car = this.activeCars[i];

          if (!car.active) {
            this.releaseCar(car);
          } else if (
            !car.isInViewport(scrollX, scrollY, viewportWidth, viewportHeight)
          ) {
            this.releaseCar(car);
          }
        }
      } else {
        for (let i = this.activeCars.length - 1; i >= 0; i--) {
          const car = this.activeCars[i];
          if (car.isOffscreen || !car.active) {
            this.releaseCar(car);
          }
        }
      }
    }
  }

  /**
   * Check collision between car and chicken using precise AABB logic
   * REQUIREMENTS:
   * 1. Car and chicken must be on the same lane
   * 2. Precise AABB: Car's front edge >= chicken's top edge AND car's back edge <= chicken's bottom edge
   * 3. Gate Bypass: If car has passed gate (front >= gate.y), collision is ACTIVE
   * 4. Only check for cars on chicken's current lane (efficiency)
   */
  checkCarChickenCollision(car) {
    if (!this.chicken || !this.chicken.active) {
      return;
    }

    // Calculate chicken's current lane based on its world X position
    // Note: Chicken's x is world coordinate, startX is road's start position
    const chickenWorldX = this.chicken.x;
    const chickenLaneX = chickenWorldX - this.startX;
    const chickenLaneIndex = Math.floor(chickenLaneX / this.laneWidth);

    // REQUIREMENT 1 & 4: Only check collision if car and chicken are on the same lane
    // Add tolerance of ±1 lane to handle edge cases near lane boundaries
    const laneDiff = Math.abs(car.lane - chickenLaneIndex);
    if (laneDiff > 1) {
      return; // Not on same lane or adjacent lane
    }

    // CRITICAL FIX: Use PixiJS World Space bounds to avoid coordinate mismatch
    // Get actual rendered bounds from PixiJS containers (World Space coordinates)
    const carWorldBounds = car.container.getBounds();
    const chickenWorldBounds = this.chicken.container.getBounds();

    // REQUIREMENT 3: Gate Bypass Logic
    // Check if car has passed the gate's "point of no return"
    let collisionEnabled = true;
    if (this.gateManager && this.gateManager.hasGateOnLane(car.lane)) {
      const gate = this.gateManager.getGateForLane(car.lane);
      if (gate && gate.active) {
        // Car moves downward: Front = Bottom edge
        const carFrontY = carWorldBounds.y + carWorldBounds.height;
        const gateY = gate.y;

        // If car's front has NOT passed the gate, collision is DISABLED (gate blocks)
        // If car's front HAS passed the gate, collision is ENABLED (point of no return)
        if (carFrontY < gateY) {
          collisionEnabled = false;
        }
      }
    }

    if (!collisionEnabled) {
      return; // Gate is blocking, skip collision check
    }

    // REQUIREMENT 2: Precise AABB collision detection (World Space)
    // Add collision tolerance to make detection more forgiving
    const collisionTolerance = 20; // pixels

    // Define edges based on direction:
    // Car moves downward: Front = Bottom, Back = Top
    const carFrontEdge = carWorldBounds.y + carWorldBounds.height; // Bottom of car
    const carBackEdge = carWorldBounds.y; // Top of car

    // Chicken bounds with tolerance
    const chickenTopEdge = chickenWorldBounds.y - collisionTolerance;
    const chickenBottomEdge =
      chickenWorldBounds.y + chickenWorldBounds.height + collisionTolerance;
    const chickenLeftEdge = chickenWorldBounds.x - collisionTolerance;
    const chickenRightEdge =
      chickenWorldBounds.x + chickenWorldBounds.width + collisionTolerance;

    // Horizontal overlap check (X-axis) with tolerance
    const overlapsX =
      carWorldBounds.x < chickenRightEdge &&
      carWorldBounds.x + carWorldBounds.width > chickenLeftEdge;

    // Vertical overlap check (Y-axis)
    // Collision if car and chicken overlap vertically
    const overlapsY =
      carFrontEdge >= chickenTopEdge && // Car's bottom is below chicken's top
      carBackEdge <= chickenBottomEdge; // Car's top is above chicken's bottom

    // Collision occurs only if BOTH X and Y overlap
    if (overlapsX && overlapsY) {
      // REQUIREMENT: Set collision flag to prevent multiple triggers
      // CRITICAL: The car that caused collision continues moving (not stopped)
      // Car momentum is maintained - car.update() continues to be called
      this.hasCollided = true;

      if (this.onCollision) {
        this.onCollision();
      }
    }
  }

  /**
   * Get active car count (for debugging)
   */
  getActiveCarCount() {
    return this.activeCars.length;
  }

  /**
   * Get pool statistics (for debugging)
   */
  getPoolStats() {
    return {
      poolSize: this.carPool.length,
      inUse: this.carPool.filter((c) => c.inUse).length,
      available: this.carPool.filter((c) => !c.inUse).length,
      active: this.activeCars.length,
    };
  }

  /**   * ALWAYS-ACTIVE PREDICTIVE SAFETY-LOCK
   * Predict if next lane is safe to jump to
   * Used by "Go" button to prevent bad moves before they happen
   *
   * Covers three critical scenarios:
   * 1. Cars just spawned (entering viewport)
   * 2. Cars in viewport (currently visible)
   * 3. Cars about to disappear (leaving viewport)
   *
   * @param {number} currentLaneIndex - Chicken's current lane index
   * @param {number} jumpDuration - Time it takes to complete jump (0.4 seconds)
   * @returns {boolean} - True if safe to jump, false if collision predicted
   */
  isNextLaneSafe(currentLaneIndex, jumpDuration = 0.4) {
    if (!this.chicken) return true; // No chicken reference, assume safe

    const nextLaneIndex = currentLaneIndex + 1;
    const chickenY = this.chicken.container?.position?.y || this.chicken.y;

    // MOBILE SAFETY BUFFER: Account for frame-rate fluctuations (150ms for extra safety)
    const MOBILE_BUFFER_MS = 150;
    const effectiveJumpDuration = jumpDuration + MOBILE_BUFFER_MS / 1000;

    // ULTRA-SAFE COLLISION BUFFER: Covers all three scenarios (spawn/visible/exiting)
    // Increased from 200 to 600 pixels to catch cars entering, passing, and exiting
    const COLLISION_BUFFER = 600;
    const safetyZoneTop = chickenY - COLLISION_BUFFER;
    const safetyZoneBottom = chickenY + COLLISION_BUFFER;

    // SCENARIO 1, 2, 3: Check ALL active cars in next lane (covers all three scenarios)
    for (const car of this.activeCars) {
      if (!car.active || car.lane !== nextLaneIndex) continue;

      const carY = car.container?.position?.y || car.y;
      const carSpeed = car.speed;
      const carHeight = car.height || 98;

      // Check car's CURRENT position (handles recently spawned cars)
      const currentCarTop = carY - carHeight / 2;
      const currentCarBottom = carY + carHeight / 2;
      const currentOverlap = !(
        currentCarBottom < safetyZoneTop || currentCarTop > safetyZoneBottom
      );

      if (currentOverlap) {
        return false; // Unsafe - car is currently in danger zone
      }

      // Check car's position THROUGHOUT the jump (not just at the end)
      // Sample the car's path at multiple points during jump animation
      const samplePoints = 5; // Check 5 positions during jump
      for (let i = 0; i <= samplePoints; i++) {
        const timeOffset = (effectiveJumpDuration * i) / samplePoints;
        const predictedY = carY + carSpeed * timeOffset;
        const predictedTop = predictedY - carHeight / 2;
        const predictedBottom = predictedY + carHeight / 2;

        const futureOverlap = !(
          predictedBottom < safetyZoneTop || predictedTop > safetyZoneBottom
        );

        if (futureOverlap) {
          return false; // Unsafe - car will pass through danger zone
        }
      }
    }

    // SCENARIO 1 ENHANCED: Check for imminent spawns (cars about to enter)
    const nextLaneSpawner = this.laneSpawners?.[nextLaneIndex];
    if (nextLaneSpawner) {
      const timeUntilNextSpawn = nextLaneSpawner.spawnTimer;

      // Block if car will spawn during or shortly after jump
      if (timeUntilNextSpawn < effectiveJumpDuration + 0.5) {
        return false; // Unsafe - car spawning too soon
      }
    }

    return true; // Safe - no threats detected in all three scenarios
  }

  /**   * Reset spawner state (for new game)
   * EMERGENCY FIX: Aggressive stage wipe with synchronous removal
   * CRITICAL: This must completely clear the stage before chicken resets
   */
  reset() {
    // STEP 1: Stop collision checking IMMEDIATELY
    this.hasCollided = false;
    this.collisionsEnabled = false; // Disable collisions until next game starts

    // Reset first game mechanic
    this.checkFirstGame();

    // STEP 2: AGGRESSIVE STAGE CLEANUP - Force removal of ALL cars
    const stage = this.entityManager?.stage;

    // Clone array to avoid modification during iteration
    const carsToRemove = [...this.activeCars];

    for (const car of carsToRemove) {
      if (!car) continue;

      // Force hide immediately
      car.visible = false;
      car.active = false;
      car.inUse = false;

      if (car.container) {
        car.container.visible = false;

        // CRITICAL: Force remove from stage if it's there
        if (stage && car.container.parent === stage) {
          try {
            stage.removeChild(car.container);
          } catch {
            // Some
          }
        }
      }

      // Release car back to pool
      car.release();
    }

    // Clear the activeCars array completely
    this.activeCars.length = 0;

    // STEP 3: Clear timers to prevent immediate spawn
    this.spawnTimer = 0;
    this.nextSpawnTime = this.getRandomSpawnInterval();

    // STEP 4: Reset spawn flags
    this.initialSpawnComplete = false;

    // STEP 5: Clear lane cooldowns
    this.laneCooldowns.clear();
  }

  /**
   * Clean up all cars
   */
  cleanup() {
    // Release all active cars back to pool
    for (const car of this.activeCars) {
      if (car) {
        this.releaseCar(car);
      }
    }
    this.activeCars = [];

    // Destroy all pooled cars since we're shutting down
    for (const car of this.carPool) {
      if (car && car.container) {
        try {
          car.destroy();
        } catch {
          // Car might already be destroyed
        }
      }
    }
    this.carPool = [];
  }
}
