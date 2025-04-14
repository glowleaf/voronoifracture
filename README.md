# Three.js Voronoi Fracture

A 3D Voronoi fracturing system for Three.js that creates realistic breaking/shattering effects. This system:
- Uses true Voronoi cell computation
- Samples surface vertices for seed points
- Creates convex hulls for each cell
- Adds physics-based motion and rotation
- Supports glass-like materials with environment mapping

## Installation

```bash
npm install @glowleaf/voronoifracture
```

## Usage

```javascript
import { VoronoiFracture } from '@glowleaf/voronoifracture';

// Create instance with custom options
const fracture = new VoronoiFracture({
    numCells: 15,              // Number of pieces to break into
    explosionForce: 2,         // Force of the explosion
    rotationSpeed: 3,          // How fast pieces rotate
    boundaryRadius: 0.1,       // Size of gaps between pieces
    gravity: 9.8,              // Gravity strength
    cleanup: true,             // Whether to remove fallen pieces
    cleanupThreshold: -10      // Y position to remove pieces
});

// When you want to shatter a mesh:
const pieces = fracture.fracture(
    mesh,           // The mesh to shatter
    impactPoint,    // Vector3 point of impact
    scene,          // Three.js scene to add pieces to
    envMap          // Optional environment map for reflections
);

// In your animation loop:
function animate() {
    requestAnimationFrame(animate);
    fracture.update();  // Updates positions/rotations of pieces
    renderer.render(scene, camera);
}

// Cleanup when done:
fracture.dispose();
```

## Features

### True Voronoi Cells
- Uses actual model vertices to create cells
- Each vertex is assigned to its nearest seed point
- Creates clean breaks along cell boundaries

### Physics Simulation
- Explosion force from impact point
- Angular velocity for realistic rotation
- Gravity affects falling pieces
- Automatic cleanup of fallen pieces

### Material Properties
- Glass-like appearance with transmission
- Environment map reflections
- Slight color variations between pieces
- Adjustable transparency and roughness

## Options

| Option | Default | Description |
|--------|---------|-------------|
| numCells | 15 | Number of pieces to break into |
| explosionForce | 2 | Multiplier for explosion velocity |
| rotationSpeed | 3 | Multiplier for angular velocity |
| boundaryRadius | 0.1 | Size of separation between pieces |
| gravity | 9.8 | Gravity force applied to pieces |
| cleanup | true | Whether to remove fallen pieces |
| cleanupThreshold | -10 | Y position at which to remove pieces |

## Requirements
- Three.js r160 or later
- ConvexGeometry and ConvexHull modules
- WebGL 2.0 capable browser

## License
CC0-1.0 license 