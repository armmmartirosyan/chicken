import { useEffect, useRef, useState, useCallback } from "react";
import { Sprite, Rectangle } from "pixi.js";
import { Game } from "../game/core/Game.js";
import { EntityManager } from "../game/managers/EntityManager.js";
import { InputSystem } from "../game/systems/InputSystem.js";
import { Chicken } from "../game/entities/Chicken.js";
import { Road } from "../game/entities/Road.js";
import { Scenery } from "../game/entities/Scenery.js";
import { gameEvents } from "../game/core/GameEventBus.js";

// Import all game assets as ESM modules (will be inlined as Base64)
import startImg from "../assets/start.png";
import finishImg from "../assets/finish.png";
import gateImg from "../assets/gate.png";
import coinImg from "../assets/coin.png";
import coinGoldImg from "../assets/coin-gold.png";
import chickenTooltipImg from "../assets/chicken-tooltip.png";
import winNotificationImg from "../assets/winNotification.png";
import truckOrangeImg from "../assets/truck-orange.png";
import truckBlueImg from "../assets/truck-blue.png";
import carYellowImg from "../assets/car-yellow.png";
import carPoliceImg from "../assets/car-police.png";
import lightImg from "../assets/light.png";
import carpetImg from "../assets/carpet.png";

// Import Spine animation assets for single-file build
import chickenSkeletonData from "../assets/chicken.json";
import chickenAtlasText from "../assets/chicken.atlas?raw";
import chickenTexture from "../assets/chicken.png";

/**
 * useGame - Custom hook to manage game instance lifecycle with Pixi.js
 * Initializes game, loads assets, creates entities, and manages game state
 */
export function useGame(canvasRef, config, scrollContainerRef) {
  const gameRef = useRef(null);
  const entityManagerRef = useRef(null);
  const chickenRef = useRef(null);
  const roadRef = useRef(null); // Store road reference for updates
  const finishSceneryRef = useRef(null); // Store finish scenery reference for updates
  const isInitializedRef = useRef(false);

  // Decorative sprite references for dynamic updates
  const lightSpriteRef = useRef(null); // Store light pole sprite reference
  const finishLightSpriteRef = useRef(null); // Store finish light pole sprite reference
  const bannerSpriteRef = useRef(null); // Store banner sprite reference
  const gameElementsCenterYRef = useRef(0); // Store center Y position for sprite updates

  // Lane tracking for chicken jumps
  const currentLaneRef = useRef(0); // 0 = start sidewalk, 1-N = road lanes, N+1 = finish sidewalk
  const lanePositionsRef = useRef([]); // Array of X positions for each lane
  const totalLanesRef = useRef(0); // Total number of lanes including sidewalks
  const startWidthRef = useRef(0); // Store start scenery width for camera calculations
  const roadWidthRef = useRef(0); // Store total road width
  const laneWidthRef = useRef(0); // Store lane width for precise camera calculations

  // Layout dimensions for canvas resizing
  const finishWidthRef = useRef(0); // Store finish scenery width
  const roadHeightRef = useRef(0); // Store road height
  const canvasWidthRef = useRef(0); // Store total canvas width for clamping

  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);

  useEffect(() => {
    if (!canvasRef.current || isInitializedRef.current) return;

    const canvas = canvasRef.current;
    let game = null;
    let aborted = false;
    let loadingTimeout = null;

    const initializeGame = async () => {
      try {
        // Prevent double initialization
        if (isInitializedRef.current) return;
        isInitializedRef.current = true;

        // DOM Verification: Ensure canvas is attached to DOM
        if (!canvas.parentElement) {
          throw new Error("Canvas not attached to DOM");
        }

        // Create managers
        const entityManager = new EntityManager();
        const inputSystem = new InputSystem(canvas);

        entityManagerRef.current = entityManager;

        // Create game instance with Pixi
        game = new Game(canvas, config);
        gameRef.current = game;

        // Initialize game with managers (this also initializes Pixi renderer)
        await game.initialize(entityManager, null, inputSystem);

        // Check if cleanup happened during async initialization
        if (aborted || !game || !game.renderer) {
          return;
        }

        // Set loading timeout (30 seconds max)
        loadingTimeout = setTimeout(() => {
          if (isInitializedRef.current && isLoading) {
            setLoadingError("Loading timeout - please refresh the page");
            setIsLoading(false);
          }
        }, 30000);

        // Load assets using Pixi's asset system with error handling
        let textures;
        try {
          textures = await game.renderer.loadTextures([
            { key: "start", url: startImg },
            { key: "finish", url: finishImg },
            // Gate image
            { key: "gate", url: gateImg },
            // Coin images
            { key: "coin", url: coinImg },
            { key: "coin-gold", url: coinGoldImg },
            // Chicken tooltip
            { key: "chicken-tooltip", url: chickenTooltipImg },
            // Win notification
            { key: "win-notification", url: winNotificationImg },
            // Car images
            { key: "truck-orange", url: truckOrangeImg },
            { key: "truck-blue", url: truckBlueImg },
            { key: "car-yellow", url: carYellowImg },
            { key: "car-police", url: carPoliceImg },
          ]);
        } catch {
          // Continue with partial loading - game will use placeholders
          textures = {};
        }

        // Load optional light pole texture separately (decorative only)
        let poleTexture = null;
        try {
          const poleResult = await game.renderer.loadTextures([
            { key: "light", url: lightImg },
          ]);
          poleTexture = poleResult.light || poleResult["light"];
        } catch {
          // Some
        }

        // Load optional finish banner texture separately (decorative only)
        let finishBannerTexture = null;
        try {
          const bannerResult = await game.renderer.loadTextures([
            { key: "carpet", url: carpetImg },
          ]);
          finishBannerTexture =
            bannerResult["carpet"] || bannerResult["carpet"];
        } catch {
          // Some
        }

        // Load Spine animation for chicken using ESM imports
        let chickenKeys;
        try {
          chickenKeys = await game.renderer.loadSpineFromImports(
            "chicken",
            chickenSkeletonData,
            chickenAtlasText,
            chickenTexture,
          );
        } catch {
          throw new Error("Critical asset loading failed");
        }

        // Check if cleanup happened during async loading
        if (aborted || !game || !game.renderer) {
          return;
        }

        // Get container element (parent of canvas) - needed for managers
        const containerElement = canvas.parentElement;

        // Store container element in game for win notification and confetti positioning
        if (game.setContainerElement && containerElement) {
          game.setContainerElement(containerElement);
        }

        // Initialize win notification AFTER textures are loaded
        // This ensures the win-notification texture exists
        if (game.initializeWinDisplay) {
          game.initializeWinDisplay();
        }

        // Get loaded textures with fallbacks
        const startTexture = textures.start || textures["start"];
        const finishTexture = textures.finish || textures["finish"];

        if (!startTexture || !finishTexture) {
          throw new Error("Critical textures failed to load");
        }

        // Scaling factor for all elements
        const sceneryScale = 0.9; // Reduced for more "zoomed out" appearance of start/finish images

        // Calculate layout using scaled texture dimensions
        // Start image: clip left and right to remove extra road portion
        const startTextureWidth = startTexture.width;
        const startClipWidth = startTextureWidth * 0.6; // Use center 60% of image (clip 30% left, 10% right)
        const startWidth = startClipWidth * sceneryScale; // Scaled width after clipping
        const startHeight = startTexture.height * sceneryScale;
        const finishWidth = finishTexture.width * sceneryScale;
        const finishHeight = finishTexture.height * sceneryScale;
        const roadHeight = startHeight;
        const roadWidth = config.laneWidth * config.laneCount;

        // Set canvas size
        const totalWidth = startWidth + roadWidth + finishWidth / 2;
        const totalHeight = Math.max(roadHeight, finishHeight);

        // Store layout dimensions for later resizing
        finishWidthRef.current = finishWidth;
        roadHeightRef.current = roadHeight;
        canvasWidthRef.current = totalWidth; // Store for world offset clamping

        // Update game renderer with new size (sets canvas internal resolution)
        game.resize(totalWidth, totalHeight);

        // Pass world dimensions to renderer for finish-line clamping
        game.renderer.setWorldDimensions(totalWidth);

        // Initialize viewport scaling (fit game to container)
        if (canvas.parentElement) {
          const containerRect = canvas.parentElement.getBoundingClientRect();
          game.updateViewport(containerRect.width, containerRect.height);
        }

        // Calculate positions for game elements (chicken, coins, gates, road)
        // Position chicken in middle area
        const gameElementsCenterY = totalHeight * 0.4; // Position in middle area (moved down)
        gameElementsCenterYRef.current = gameElementsCenterY; // Store for later updates
        const roadY = gameElementsCenterY - roadHeight / 2; // Road aligned with chicken

        // CRITICAL ALIGNMENT: Scenery must share the same Y baseline as the road
        // This ensures Start/Finish edges perfectly align with Road edges
        // Lift scenery upward for better visual composition (proportional to scale)
        const SCENERY_LIFT_OFFSET = 350; // Lift scenery by 30 logical pixels
        const sceneryY = roadY - SCENERY_LIFT_OFFSET; // Lift scenery above road baseline

        // Create entities with Pixi texture

        // Start scenery (clip left 30% and right 10% to remove road edges)
        const startClipRect = new Rectangle(
          startTextureWidth * 0.3, // Start from 30% position
          0, // Top
          startClipWidth, // Center 60% width
          startTexture.height, // Full height
        );
        const startScenery = new Scenery(
          0,
          sceneryY,
          "start",
          startTexture,
          sceneryScale,
          startClipRect, // Clip to show right 70%
        );
        entityManager.addEntity(startScenery);

        // Light pole on start sidewalk (static decoration)
        if (poleTexture) {
          const lightScale = sceneryScale * 0.5; // 60% of scenery scale
          const lightSprite = new Sprite(poleTexture);
          lightSprite.anchor.set(0.5, 1); // Center bottom anchor
          lightSprite.scale.set(lightScale);
          // Position on start sidewalk (adjusted for clipped start image)
          lightSprite.x = startWidth * 0.8; // Adjusted for 60% width start area
          lightSprite.y = gameElementsCenterY - 200; // Slightly below chicken level
          lightSprite.zIndex = 10; // Above scenery but below coins
          entityManager.stage.addChild(lightSprite);
          lightSpriteRef.current = lightSprite; // Store reference for updates
        }

        // Road (positioned to align with chicken)
        const road = new Road(startWidth, roadY, {
          laneWidth: config.laneWidth,
          laneCount: config.laneCount,
          roadHeight: roadHeight,
          roadColor: config.roadColor,
          lineColor: config.lineColor,
          roadLineWidth: config.roadLineWidth,
          dashPattern: config.dashPattern,
        });
        entityManager.addEntity(road);
        roadRef.current = road; // Store reference for updates

        // Finish scenery (aligned with road for perfect edge matching)
        const finishScenery = new Scenery(
          startWidth + roadWidth,
          sceneryY,
          "finish",
          finishTexture,
          sceneryScale,
        );
        entityManager.addEntity(finishScenery);
        finishSceneryRef.current = finishScenery; // Store reference for updates

        // Banner on finish sidewalk (static decoration)
        if (finishBannerTexture) {
          const bannerScale = sceneryScale; // 60% of scenery scale
          const bannerSprite = new Sprite(finishBannerTexture);
          bannerSprite.anchor.set(0.5, 1); // Center bottom anchor
          bannerSprite.scale.set(bannerScale);
          // Position on finish sidewalk
          bannerSprite.x = startWidth + roadWidth + finishWidth * 0.45; // Center of finish sidewalk
          bannerSprite.y = gameElementsCenterY - 30; // Slightly below chicken level
          bannerSprite.zIndex = 10; // Above scenery but below coins
          entityManager.stage.addChild(bannerSprite);
          bannerSpriteRef.current = bannerSprite; // Store reference for updates
        }

        // Light pole on finish sidewalk (static decoration, horizontally flipped)
        if (poleTexture) {
          const lightScale = sceneryScale * 0.5; // 60% of scenery scale
          const finishLightSprite = new Sprite(poleTexture);
          finishLightSprite.anchor.set(0.5, 1); // Center bottom anchor
          finishLightSprite.scale.set(-lightScale, lightScale); // Flip horizontally
          // Position on finish sidewalk
          finishLightSprite.x = startWidth + roadWidth + finishWidth * 0.1; // Left side of finish sidewalk
          finishLightSprite.y = gameElementsCenterY - 200; // Same height as start light
          finishLightSprite.zIndex = 10; // Above scenery but below coins
          entityManager.stage.addChild(finishLightSprite);
          finishLightSpriteRef.current = finishLightSprite; // Store reference for updates
        }

        // Chicken with Spine animation (positioned more to the left after start image clipping)
        const chickenX = startWidth - 160; // Adjusted for 60% width start area
        const chickenY = gameElementsCenterY; // Chicken at visual center (middle area)

        const chicken = new Chicken(chickenX, chickenY, {
          chickenSize: config.chickenSize,
          chickenScale: config.chickenScale || 0.5,
        });

        // Create Spine instance for chicken using loaded asset keys
        const chickenSpine = game.renderer.createSpine(chickenKeys);
        if (chickenSpine) {
          chicken.setSpine(chickenSpine);
        }

        // Set tooltip texture
        const tooltipTexture = game.renderer.getTexture("chicken-tooltip");
        if (tooltipTexture) {
          chicken.setTooltipTexture(tooltipTexture);
        }

        chicken.setDirection(true); // Facing right
        entityManager.addEntity(chicken);
        chickenRef.current = chicken;

        // Set camera target to follow chicken (vertically centered)
        game.renderer.setCameraTarget(chicken, 0);

        // Calculate lane positions for jumping
        // Lane 0: starting position (on start scenery/sidewalk)
        // Lanes 1 to laneCount: road lanes (center of each lane)
        // Lane laneCount+1: finish position (on finish scenery/sidewalk)
        const lanePositions = [];

        // Starting position (current chicken position)
        lanePositions.push(chickenX);

        // Road lane positions (center of each lane)
        for (let i = 0; i < config.laneCount; i++) {
          const laneCenter =
            startWidth + i * config.laneWidth + config.laneWidth / 2;
          lanePositions.push(laneCenter);
        }

        // Finish position (on finish sidewalk)
        const finishX = startWidth + roadWidth + 160;
        lanePositions.push(finishX);

        lanePositionsRef.current = lanePositions;
        totalLanesRef.current = lanePositions.length;
        currentLaneRef.current = 0; // Start at position 0

        // Store layout dimensions for camera scrolling
        startWidthRef.current = startWidth;
        roadWidthRef.current = roadWidth;
        laneWidthRef.current = config.laneWidth; // Store for precise lane-based camera

        // Initialize car spawner with road, chicken, gate manager, and container element
        // Note: containerElement was already obtained and set earlier (before confetti init)
        if (game.carSpawner) {
          try {
            game.carSpawner.initialize(
              entityManager,
              game.renderer,
              road,
              chicken,
              containerElement,
              game.gateManager, // Pass gate manager
            );
          } catch {
            //Some
          }
        }

        // Initialize coin manager with road and chicken
        if (game.coinManager) {
          game.coinManager.initialize(
            entityManager,
            game.renderer,
            road,
            chicken,
          );
        }

        // Initialize gate manager with road and chicken
        if (game.gateManager) {
          game.gateManager.initialize(
            entityManager,
            game.renderer,
            road,
            chicken,
          );
        }

        // Set entity references in game for dynamic updates
        game.setEntityReferences(road, finishScenery);

        // Store game instance for React access (Play button control)
        window.__GAME_INSTANCE__ = game;

        // Start game loop (but state will be "idle" until Play button clicked)
        game.start();

        // Wait for first frame to render (ensures canvas is fully initialized)
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
          });
        });

        // Clear timeout
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
          loadingTimeout = null;
        }

        // Small delay before hiding loader for smooth transition
        setTimeout(() => {
          setIsLoading(false);
        }, 300);
      } catch (error) {
        setLoadingError(error.message || "Failed to initialize game");
        isInitializedRef.current = false;

        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
        }

        // Still hide loader after error to show error message
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
      }
    };

    initializeGame();

    // Cleanup
    return () => {
      aborted = true;
      isInitializedRef.current = false;

      // Clear timeout
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }

      // Clear global game instance reference
      if (window.__GAME_INSTANCE__) {
        window.__GAME_INSTANCE__ = null;
      }

      if (game) {
        try {
          game.destroy();
        } catch {
          // Some
        }
        game = null;
      }
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initialize once - handle difficulty changes separately

  /**
   * DISCRETE LANE-GRID CAMERA SYSTEM
   * Pure mathematical function: State (laneIndex) → Screen Position (worldX)
   * This formula runs during jumps AND during window resizes for deterministic positioning
   */
  const calculateWorldPosition = useCallback(
    (laneIndex, containerWidth, canvasWidth) => {
      // Constants: Chicken fixed at left side of screen
      const CHICKEN_SCREEN_X = containerWidth * 0.1; // 10% from left edge
      const laneWidth = laneWidthRef.current;
      const startWidth = startWidthRef.current;

      let targetWorldX;

      if (laneIndex === 0) {
        // Lane 0 (start): No world movement yet
        targetWorldX = 0;
      } else {
        // Lane 1+: Discrete grid positioning
        // Formula: Align current lane's left edge with CHICKEN_SCREEN_X
        const roadLaneIndex = laneIndex - 1; // 0-based road lane (0 = first road lane)
        const laneLeftEdge = startWidth + roadLaneIndex * laneWidth;
        targetWorldX = -(laneLeftEdge - CHICKEN_SCREEN_X);
      }

      // FINISH-LINE CONSTRAINT: Prevent showing black space beyond finish
      const maxScroll = -(canvasWidth - containerWidth);
      const clampedWorldX = Math.max(targetWorldX, maxScroll);

      return {
        worldX: clampedWorldX,
        chickenScreenX: CHICKEN_SCREEN_X,
        isAtFinishBoundary: clampedWorldX === maxScroll,
      };
    },
    [],
  );

  // Update camera position on resize to maintain chicken at left side
  const updateCameraOnResize = useCallback(() => {
    const game = gameRef.current;
    const chicken = chickenRef.current;

    if (!game || !chicken || !scrollContainerRef?.current) {
      return;
    }

    const container = scrollContainerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Update viewport dimensions - this triggers atomic camera recalculation
    // The atomic camera (PixiRenderer.updateCamera) will automatically:
    // 1. Read chicken.x (world position)
    // 2. Calculate worldContainer.x to keep chicken at 10% from left
    // 3. Apply finish-line clamping if needed
    game.updateViewport(containerWidth, containerHeight);

    // Update fixedViewportX for reference (used in jumpTo logic)
    const chickenScreenX = containerWidth * 0.1; // 10% from left
    chicken.fixedViewportX = chickenScreenX;
  }, [scrollContainerRef]);

  // Watch for container resizes and update camera position
  useEffect(() => {
    if (!scrollContainerRef?.current) return;

    const resizeObserver = new ResizeObserver(() => {
      updateCameraOnResize();
    });

    resizeObserver.observe(scrollContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [scrollContainerRef, updateCameraOnResize]);

  // Jump function to move chicken to next lane (memoized to prevent re-renders)
  const jumpChicken = useCallback(
    (onFinishCallback = null) => {
      const chicken = chickenRef.current;
      const game = gameRef.current;
      if (!chicken || chicken.isJumping || !game) return false; // Can't jump if already jumping

      const currentLane = currentLaneRef.current;
      const totalLanes = totalLanesRef.current;

      // Check if chicken can jump forward (allow jumping from last coin to finish)
      if (currentLane >= totalLanes) {
        return false; // Already at or beyond finish
      }

      // Move to next lane
      const nextLane = currentLane + 1;
      const isJumpingToFinish = nextLane >= totalLanes - 1; // Detect if jumping TO finish line

      // FIRST GAME MECHANIC: Force spawn car on lane 3 when jumping from lane 2
      // Lane 0 = sidewalk, Lane 1 = 1st line, Lane 2 = 2nd line, Lane 3 = 3rd line
      // This creates a guaranteed collision on the player's first game at the 3rd line
      if (currentLane === 2 && nextLane === 3 && game.carSpawner) {
        game.carSpawner.forceSpawnForFirstGame();
      }

      // If jumping to finish, hide tooltip and turn current coin gold IMMEDIATELY (before jump starts)
      if (isJumpingToFinish) {
        chicken.hideTooltip(); // Hide tooltip before jumping to finish
        if (game.coinManager) {
          game.coinManager.finishCurrentLane();
        }
      }
      const targetX = lanePositionsRef.current[nextLane];

      // Start moving world when jumping FROM lane 0 TO lane 1 (nextLane >= 1)
      // This starts world scrolling immediately from the first lane
      const shouldMoveWorld = nextLane >= 1;
      const wasMovingWorld = currentLane >= 1;

      if (shouldMoveWorld && scrollContainerRef?.current) {
        const container = scrollContainerRef.current;
        const containerWidth = container.clientWidth;
        const canvasWidth = canvasWidthRef.current;
        const stage = game.renderer?.app?.stage;

        if (stage) {
          // Calculate start and end positions using discrete grid formula
          const startPosition = calculateWorldPosition(
            currentLane,
            containerWidth,
            canvasWidth,
          );
          const endPosition = calculateWorldPosition(
            nextLane,
            containerWidth,
            canvasWidth,
          );

          // If this is first time entering world-move mode, set chicken to fixed position
          if (!wasMovingWorld) {
            chicken.container.position.x = startPosition.chickenScreenX;
          }

          // Pass discrete grid animation data to chicken for frame-perfect sync
          const worldAnimationData = {
            stage: stage,
            startWorldX: wasMovingWorld ? stage.x : startPosition.worldX,
            endWorldX: endPosition.worldX,
            fixedViewportX: endPosition.chickenScreenX,
            currentLane: currentLane,
            targetLane: nextLane,
          };

          // Chicken jumps with frame-perfect camera sync
          const landingCallback = isJumpingToFinish ? onFinishCallback : null;
          chicken.jumpTo(
            targetX,
            shouldMoveWorld,
            worldAnimationData,
            landingCallback,
            isJumpingToFinish,
          );
        } else {
          // Fallback if stage not available
          const landingCallback = isJumpingToFinish ? onFinishCallback : null;
          chicken.jumpTo(
            targetX,
            shouldMoveWorld,
            null,
            landingCallback,
            isJumpingToFinish,
          );
        }
      } else {
        // First lane (lane 0): chicken moves normally without world movement
        const landingCallback = isJumpingToFinish ? onFinishCallback : null;
        chicken.jumpTo(
          targetX,
          shouldMoveWorld,
          null,
          landingCallback,
          isJumpingToFinish,
        );
      }

      currentLaneRef.current = nextLane;

      // Emit lane change event for finish line (CoinManager won't detect it because there's no coin)
      if (isJumpingToFinish) {
        // Wait for jump to complete before emitting finish event
        setTimeout(() => {
          gameEvents.emit("lane:changed", {
            laneIndex: nextLane,
            oldLaneIndex: currentLane,
          });

          // Emit game complete event for confetti VFX
          // This triggers ConfettiManager to play celebration animation
          gameEvents.emit("gameComplete", {
            finalLane: nextLane,
            totalLanes: totalLanesRef.current,
          });
        }, 400); // Match jump duration
      }

      // Update tooltip with new multiplier after landing (unless jumping to finish)
      if (!isJumpingToFinish && game.coinManager) {
        // Show tooltip on first lane (lane 1)
        if (nextLane === 1) {
          chicken.showTooltip();
        }
        // Schedule tooltip update after jump completes
        setTimeout(() => {
          const multiplier = game.coinManager.getCurrentDisplayMultiplier();
          chicken.updateTooltipText(multiplier);
        }, 400); // Match jump duration
      }

      return true;
    },
    [scrollContainerRef, calculateWorldPosition],
  );

  // Get current coin multiplier
  const getCurrentMultiplier = useCallback(() => {
    const game = gameRef.current;
    if (!game) return 1.0;
    return game.getCurrentMultiplier();
  }, []);

  // Finish current lane (turn current lane's coin to gold)
  const finishCurrentLane = useCallback(() => {
    const game = gameRef.current;
    if (game) {
      game.finishCurrentLane();
    }
  }, []);

  // Reset game to initial state
  const resetGame = useCallback(() => {
    const game = gameRef.current;
    const chicken = chickenRef.current;
    if (!game || !chicken) return;

    // Reset game entities (coins, gates, etc.)
    game.resetGame();

    // Reset chicken to starting position
    if (lanePositionsRef.current.length > 0) {
      const startX = lanePositionsRef.current[0];
      chicken.x = startX;
      chicken.container.position.x = startX;

      // Reset Y position to ground level
      chicken.container.position.y = chicken.jumpStartY;
      chicken.y = chicken.jumpStartY;

      currentLaneRef.current = 0;

      // Hide tooltip on reset
      chicken.hideTooltip();

      // Reset chicken jump state
      chicken.isJumping = false;
      chicken.jumpProgress = 0;
      chicken.hasStartedJumpAnimation = false;

      // Reset world movement state
      chicken.shouldMoveWorld = false;
      chicken.stage = null;
      chicken.startWorldOffset = 0;
      chicken.endWorldOffset = 0;
      chicken.maxWorldOffset = 0;
      chicken.fixedViewportX = null;

      // Reset animation to idle
      if (chicken.spine && chicken.spine.state) {
        try {
          const idleAnimations = ["idle", "idle_front", "stand"];
          for (const anim of idleAnimations) {
            try {
              chicken.spine.state.setAnimation(0, anim, true);
              chicken.currentAnimation = anim;
              break;
            } catch {
              // Try next animation
            }
          }
        } catch {
          // Some
        }
      }
    }

    // Reset world position to eliminate extra space
    const stage = game.renderer?.app?.stage;
    if (stage) {
      stage.x = 0;
    }

    // Reset scroll position
    if (scrollContainerRef?.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, [scrollContainerRef]);

  // Register collision callback
  // REQUIREMENT: Complete death sequence with proper timing and state restoration
  //
  // FLOW:
  //   1. Collision detected -> hasCollided flag set (prevents multiple triggers)
  //   2. Car continues moving (not stopped) until naturally removed during cleanup
  //   3. onCollisionFromApp() called -> App.jsx sets gameState to "lost" (locks input)
  //   4. game.state set to "gameover" (allows animations, stops game systems)
  //   5. Death animation plays
  //   6. 1-second visual buffer
  //   7. Reset sequence: wipe cars -> reset chicken -> reset scene -> reset objects
  //   8. game.state set to "playing" (re-enable game systems)
  //   9. onResetComplete() called -> App.jsx sets gameState to "playing" (unlock input)
  //
  const registerCollisionCallback = useCallback(
    (onCollisionFromApp, onResetComplete) => {
      const game = gameRef.current;
      const chicken = chickenRef.current;

      if (!game || !game.carSpawner || !chicken) {
        return;
      }

      // Set up collision callback (decoupled from detection logic)
      game.carSpawner.onCollision = async () => {
        // REQUIREMENT: Immediately halt all user input by notifying App
        // This sets gameState to "lost" which blocks handlePlay
        if (onCollisionFromApp) {
          onCollisionFromApp();
        }

        // REQUIREMENT: Execute death sequence with timing (animation + 1s delay)
        await game.handleChickenDeath(async () => {
          // REQUIREMENT: Complete Reset Sequence (executed after death animation + 1s delay)
          // Proper Order: 1. Stop collision checks & wipe cars
          //              2. Reset chicken position & state
          //              3. Reset camera/scene view
          //              4. Reset game objects (coins, gates)
          //              5. Re-enable input & restore game state

          // STEP 1: WIPE ALL CARS FIRST (including the one that caused collision)
          // This ensures the stage is completely clean before visual reset
          if (game.carSpawner) {
            try {
              game.carSpawner.reset();
            } catch {
              // Some
            }
          }

          // STEP 2: RESET CHICKEN TO STARTING POSITION
          if (lanePositionsRef.current.length > 0) {
            const startX = lanePositionsRef.current[0];
            chicken.x = startX;
            chicken.container.position.x = startX;

            // Reset Y position to ground level
            chicken.container.position.y = chicken.jumpStartY;
            chicken.y = chicken.jumpStartY;

            currentLaneRef.current = 0;

            // Reset chicken jump state
            chicken.isJumping = false;
            chicken.jumpProgress = 0;
            chicken.hasStartedJumpAnimation = false;

            // Reset world movement state
            chicken.shouldMoveWorld = false;
            chicken.stage = null;
            chicken.startWorldOffset = 0;
            chicken.endWorldOffset = 0;
            chicken.maxWorldOffset = 0;
            chicken.fixedViewportX = null;

            // REQUIREMENT: Set chicken to ready/idle state
            if (chicken.spine && chicken.spine.state) {
              try {
                const idleAnimations = ["idle", "idle_front", "stand"];
                for (const anim of idleAnimations) {
                  try {
                    chicken.spine.state.setAnimation(0, anim, true);
                    chicken.currentAnimation = anim;
                    break;
                  } catch {
                    // Try next animation
                  }
                }
              } catch {
                // Some
              }
            }

            // Hide tooltip when chicken is at start position
            chicken.hideTooltip();
          }

          // STEP 3: RESET CAMERA/SCENE VIEW TO STARTING STATE
          const stage = game.renderer?.app?.stage;
          if (stage) {
            stage.x = 0;
          }

          // Reset scroll position
          if (scrollContainerRef?.current) {
            scrollContainerRef.current.scrollLeft = 0;
          }

          // STEP 4: RESET GAME OBJECTS
          // 4a. Reset coins (Golds to 0, NOT permanent balance)
          if (game.coinManager) {
            try {
              game.coinManager.reset();
            } catch {
              // Some
            }
          }

          // 4b. Reset gates
          if (game.gateManager) {
            try {
              game.gateManager.destroy();
            } catch {
              // Some
            }
          }

          // STEP 5: RE-ENABLE INPUT & RESTORE GAME STATE TO IDLE
          // CRITICAL: Set game to "idle" and disable collisions
          // Cars continue spawning and moving but collision detection is disabled
          game.setGameState("idle");

          // Then, notify App.jsx to restore React gameState to "idle"
          // This shows the Play button and allows user to start a new game
          if (onResetComplete) {
            onResetComplete();
          }
        });
      };
    },
    [scrollContainerRef],
  );

  return {
    gameRef,
    entityManagerRef,
    chickenRef,
    isLoading,
    loadingError,
    jumpChicken,
    getCurrentMultiplier,
    finishCurrentLane,
    resetGame,
    registerCollisionCallback,
  };
}
