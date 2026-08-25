# Vector VX1: Real-Time Conquest

A stylized-3D real-time strategy game (StarCraft II tradition) built with
TypeScript, Vite, and Three.js. Four civilizations fight over a doomed
planet's Energy Core as its twin suns converge.

The full creative and systems bible — story, the four factions (heroes,
buildings, units, upgrades, costs), the Convergence fusion system, art
direction, environment, VFX/animation specs, and the build plan — lives in
the project's design document (provided to Claude Code at project start;
ask the maintainer for a copy if you need the full reference).

## Tech stack

- TypeScript + Vite
- Three.js for rendering (isometric-style RTS camera, stylized-PBR
  materials, per-faction rim-light shaders)
- Faction/unit/building data lives in plain config objects — never hard
  switch statements — so adding factions is a data change, not a new system

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build for production
```

## Project structure

```
src/
  main.ts          # entry point: renderer, scene, lighting, game loop
  game/             # engine/gameplay systems (camera, input, terrain, ...)
  config/           # data-driven faction/unit/building definitions
```

## Build status

Milestones are implemented in order and each is committed/pushed as a
working, testable increment. See commit history for progress.

- [x] Milestone 1 — Project scaffold, isometric RTS camera (pan/zoom/rotate)
      over a flat placeholder ground plane
- [x] Milestone 2 — Cyber-Nexus home biome terrain + Core Zone placeholder
- [x] Milestone 3 — Cyber-Nexus economy loop (harvester, resources, HUD)
- [x] Milestone 4 — Selection, pathfinding, basic combat
- [x] Milestone 5 — Production queues
- [x] Milestone 6 — Convergence (fusion) system
- [x] Milestone 7 — Fog of war + basic AI opponent
- [x] Milestone 8 — Sun Proximity system + win/lose flow
- [ ] Milestone 9 — Extend to Pyroliths, Solari Archons, Frost-Forged
