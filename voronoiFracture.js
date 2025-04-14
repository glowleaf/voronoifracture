import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { ConvexHull } from 'three/addons/math/ConvexHull.js';

export class VoronoiFracture {
    constructor(options = {}) {
        this.options = {
            numCells: options.numCells || 15,
            explosionForce: options.explosionForce || 2,
            rotationSpeed: options.rotationSpeed || 3,
            boundaryRadius: options.boundaryRadius || 0.1,
            gravity: options.gravity || 9.8,
            cleanup: options.cleanup || true,
            cleanupThreshold: options.cleanupThreshold || -10
        };
        
        this.pieces = [];
        this.clock = new THREE.Clock();
    }

    fracture(mesh, impactPoint, scene, envMap = null) {
        if (!mesh || !scene) return null;

        const originalPosition = mesh.position.clone();
        const originalRotation = mesh.rotation.clone();
        
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 0, 0);
        mesh.updateMatrix();

        const modelVertices = this._collectVertices(mesh);
        const seedPoints = this._generateSeedPoints(modelVertices);
        const cells = this._createVoronoiCells(modelVertices, seedPoints);
        this.pieces = this._createShatterPieces(cells, impactPoint, envMap);
        
        this.pieces.forEach(piece => {
            piece.position.add(originalPosition);
            piece.rotation.x += originalRotation.x;
            piece.rotation.y += originalRotation.y;
            piece.rotation.z += originalRotation.z;
            scene.add(piece);
        });

        return this.pieces;
    }

    _collectVertices(mesh) {
        const vertices = [];
        mesh.updateMatrixWorld();
        
        mesh.traverse((child) => {
            if (child.geometry) {
                const positionAttr = child.geometry.getAttribute('position');
                const vertexCount = positionAttr.count;
                const worldMatrix = child.matrixWorld;
                
                for (let i = 0; i < vertexCount; i++) {
                    const vertex = new THREE.Vector3(
                        positionAttr.getX(i),
                        positionAttr.getY(i),
                        positionAttr.getZ(i)
                    ).applyMatrix4(worldMatrix);
                    vertices.push(vertex);
                }
            }
        });
        
        return vertices;
    }

    _generateSeedPoints(vertices) {
        const seeds = [];
        const vertexCount = vertices.length;
        
        for (let i = 0; i < this.options.numCells; i++) {
            const randomVertex = vertices[Math.floor(Math.random() * vertexCount)];
            seeds.push(randomVertex.clone());
        }
        
        return seeds;
    }

    _createVoronoiCells(vertices, seeds) {
        const cells = [];
        
        vertices.forEach(vertex => {
            let minDist = Infinity;
            let closestSeed = null;
            
            seeds.forEach(seed => {
                const dist = vertex.distanceTo(seed);
                if (dist < minDist) {
                    minDist = dist;
                    closestSeed = seed;
                }
            });
            
            let cell = cells.find(c => c.seed.equals(closestSeed));
            if (!cell) {
                cell = {
                    seed: closestSeed,
                    vertices: []
                };
                cells.push(cell);
            }
            cell.vertices.push(vertex.clone());
        });
        
        return cells;
    }

    _createShatterPieces(cells, impactPoint, envMap) {
        const pieces = [];
        
        cells.forEach((cell, index) => {
            if (cell.vertices.length < 4) return;

            const cellCenter = new THREE.Vector3();
            cell.vertices.forEach(v => cellCenter.add(v));
            cellCenter.divideScalar(cell.vertices.length);

            const boundaryPoints = this._createBoundaryPoints(cellCenter);
            const hullPoints = [...cell.vertices, ...boundaryPoints];

            try {
                const convexGeometry = new ConvexGeometry(hullPoints);
                const material = this._createMaterial(envMap);
                const piece = new THREE.Mesh(convexGeometry, material);
                
                piece.position.copy(cellCenter);
                this._addPhysicsProperties(piece, impactPoint);
                pieces.push(piece);
            } catch (e) {
                console.warn('Failed to create convex hull for cell', index, e);
            }
        });
        
        return pieces;
    }

    _createBoundaryPoints(center) {
        const boundaryPoints = [];
        const radius = this.options.boundaryRadius;
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            boundaryPoints.push(new THREE.Vector3(
                center.x + Math.cos(angle) * radius,
                center.y + Math.sin(angle) * radius,
                center.z + (Math.random() - 0.5) * radius * 0.5
            ));
        }
        
        return boundaryPoints;
    }

    _createMaterial(envMap) {
        return new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(1, 1, 1).multiplyScalar(0.9 + Math.random() * 0.2),
            metalness: 0.0,
            roughness: 0.1,
            transmission: 0.9,
            thickness: 0.5,
            envMap: envMap,
            envMapIntensity: 0.3
        });
    }

    _addPhysicsProperties(piece, impactPoint) {
        const toCenter = piece.position.clone().sub(impactPoint);
        const distance = toCenter.length();
        toCenter.normalize();
        
        piece.velocity = toCenter.multiplyScalar(this.options.explosionForce / (distance + 1))
            .add(new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ));

        piece.angularVelocity = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).multiplyScalar(this.options.rotationSpeed);
    }

    update() {
        if (this.pieces.length === 0) return;

        const delta = this.clock.getDelta();
        const piecesToRemove = [];
        
        this.pieces.forEach(piece => {
            piece.position.add(piece.velocity.clone().multiplyScalar(delta));
            
            piece.rotation.x += piece.angularVelocity.x * delta;
            piece.rotation.y += piece.angularVelocity.y * delta;
            piece.rotation.z += piece.angularVelocity.z * delta;
            
            piece.velocity.y -= this.options.gravity * delta;
            
            if (this.options.cleanup && piece.position.y < this.options.cleanupThreshold) {
                piecesToRemove.push(piece);
            }
        });
        
        piecesToRemove.forEach(piece => {
            const scene = piece.parent;
            if (scene) {
                scene.remove(piece);
                this.pieces = this.pieces.filter(p => p !== piece);
            }
        });
    }

    dispose() {
        this.pieces.forEach(piece => {
            if (piece.geometry) piece.geometry.dispose();
            if (piece.material) piece.material.dispose();
            if (piece.parent) piece.parent.remove(piece);
        });
        this.pieces = [];
    }
} 