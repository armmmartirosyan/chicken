import { Gate } from "../entities/Gate.js";

/**
 * GateManager - Manages gates across lanes
 * Creates gates on current lane and all passed lanes to stop cars
 */
export class GateManager {
  constructor(config) {
    this.config = config;
    this.pixiRenderer = null;
    this.road = null;
    this.chicken = null;
    this.entityManager = null;

    this.gates = new Map(); // Map<laneIndex, Gate>
    this.gateTexture = null;
    this.currentLaneIndex = -1; // Current lane the chicken is on (-1 means not on road yet)
  }

  /**
   * Initialize the gate manager
   */
  initialize(entityManager, pixiRenderer, road, chicken) {
    this.entityManager = entityManager;
    this.pixiRenderer = pixiRenderer;
    this.road = road;
    this.chicken = chicken;

    // Load gate texture
    this.gateTexture = this.pixiRenderer.getTexture("gate");

    if (!this.gateTexture) {

      return;
    }
  }

  /**
   * Create a gate on a specific lane
   */
  createGateOnLane(laneIndex) {
    // Don't create duplicate gates
    if (this.gates.has(laneIndex)) {
      return this.gates.get(laneIndex);
    }

    const laneWidth = this.road.laneWidth;

    // Calculate gate position (center of lane)
    const gateX = this.road.x + (laneIndex + 0.5) * laneWidth;
    const gateY = this.chicken.y - 200; // Position higher than chicken (+100px offset)

    // Create gate with proper config
    const gate = new Gate(gateX, gateY, this.gateTexture, {
      laneIndex: laneIndex,
      scale: 0.4, // Smaller scale to fit in road line
    });

    // Add to entity manager stage
    if (this.entityManager && this.entityManager.stage && gate.container) {
      this.entityManager.stage.addChild(gate.container);
      gate.container.visible = true;
      gate.container.zIndex = 50; // Below coins (100) but above road
    }

    this.gates.set(laneIndex, gate);

    return gate;
  }

  /**
   * Get gate for a specific lane
   */
  getGateForLane(laneIndex) {
    return this.gates.get(laneIndex) || null;
  }

  /**
   * Check if a lane has a gate
   */
  hasGateOnLane(laneIndex) {
    return this.gates.has(laneIndex);
  }

  /**
   * Get all gates (for car spawner)
   */
  getAllGates() {
    return this.gates;
  }

  /**
   * Called when chicken moves to a new lane
   */
  onLaneChanged(newLaneIndex) {
    // Create gates on current lane and all previous lanes (0 to newLaneIndex)
    for (let i = 0; i <= newLaneIndex; i++) {
      if (!this.gates.has(i)) {
        this.createGateOnLane(i);
      }
    }

    this.currentLaneIndex = newLaneIndex;
  }

  /**
   * Update gate manager state
   */
  update(deltaTime) {
    if (!this.chicken || !this.road) return;

    // Calculate current lane based on chicken position
    const chickenLaneIndex = this.road.getLaneAtPosition(this.chicken.x);

    if (chickenLaneIndex !== this.currentLaneIndex) {
      // Chicken moved to a new lane
      if (chickenLaneIndex !== -1 && chickenLaneIndex >= 0) {
        this.onLaneChanged(chickenLaneIndex);
      } else {
        // Chicken is not on the road (might be on start scenery)
        if (this.currentLaneIndex !== -1) {
          this.currentLaneIndex = chickenLaneIndex;
        }
      }
    }

    // Update all gates
    for (const gate of this.gates.values()) {
      if (gate.active) {
        gate.update(deltaTime);
      }
    }
  }

  /**
   * Render all gates
   */
  render(renderer) {
    for (const gate of this.gates.values()) {
      if (gate.active) {
        gate.render(renderer);
      }
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    for (const gate of this.gates.values()) {
      if (gate.container && gate.container.parent) {
        gate.container.parent.removeChild(gate.container);
      }
      gate.destroy();
    }
    this.gates.clear();
  }
}
