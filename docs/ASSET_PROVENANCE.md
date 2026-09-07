# Asset provenance

## Runtime meshes, surface and interface

- S-39 head, instanced armor/plates/seams, Hunter color variant, mines, Patrol drones, Warden, cores/relays, pickup shapes, gates, rooftop, towers, machinery and wet surface noise are original code-authored Three.js geometry/materials in `src/game/renderer.ts`, created for this project on September 5, 2026.
- The generated skyline below is background scenery only. The reference PNGs are never used as a flattened playable arena or control surface.
- Title and all interactive text/controls are HTML/CSS. Original procedural marks include the favicon and texture glyphs. Interface icons are Lucide (ISC license; distribution notice in `public/licenses/lucide-ISC.txt`).
- Orbitron and Rajdhani fonts are bundled from pinned Fontsource packages, SIL Open Font License 1.1. Notices are in `public/licenses/orbitron-OFL.txt` and `public/licenses/rajdhani-OFL.txt`. Three.js and React use MIT licenses, copied under `public/licenses/`.
- These are production-direction assets for the first playable build. The owner has given positive general graphics feedback; full acceptance against the supplied reference images remains open.

## Powerup Lab recognition images — September 6, 2026

- `public/images/powerups/` contains twelve powerup images and the ready Warden pad, exported from the actual `GameRenderer` meshes, materials and glyph textures. These are project-owned procedural assets, with no external image source or new generated art.
- Reproduce with `node scripts/generate-powerup-previews.mjs` while the Vite server runs on 3039. It uses an isolated installed-Chrome context and one reused WebGL renderer, exports transparent 320 × 320 PNGs, and checks visible/unclipped models and transparency.
- The thirteen images total approximately 211 KiB. They are static HTML images in the Lab; opening the menu creates no additional WebGL context. Isolated views omit gameplay bloom and scenery while preserving each shape, symbol and color identity.
- All thirteen were visually inspected in the generated contact sheet, then checked in the actual Lab layout. Regenerate them if the underlying pickup/pad art changes.

## Combat and interface revision — September 6, 2026

- Layered rooftop supports, flush deck plates/route markings, machinery turbines, Warden iris/cannons, relay spheres, solid snake light filaments and the elevated Decoy hologram are original extensions of the existing procedural Three.js scene. Solid footprints are unchanged.
- The new Warden instructions use a project-authored SVG teaching diagram in `WardenInstructions.tsx`. The existing exported pad image remains for earlier rules; the twelve actual pickup images remain current.
- GSAP 3.14.2 is pinned for DOM menu/confirmation animations, with scoped cleanup and app/OS reduced-motion support. Its package declares the [GSAP standard license](https://gsap.com/standard-license/). No GSAP animation drives simulation state.

## Original procedural audio

- `src/game/audio.ts` contains an original code-authored electronic score (detuned filtered synth pads, syncopated bass/sub voices, metallic FM sequences, synthesized percussion and stereo delay) and event sounds for pickups, attacks, tactics, rivals and progression.
- Created for this project; no sampled commercial recordings, imported tracks or outside audio assets. Title/play/boss arrangements share an eight-bar harmonic theme, with bar-aligned intensity changes. The owner-requested futuristic music revision preserves the existing event-effect recipes and effects bus.
- District 2–5 music families, full ending score, sound mix and subjective audible review remain unfinished release work. Browser tests establish API/lifecycle behavior, not artistic approval.

## Neon Spire distant skyline

- Workspace asset: `public/assets/neon-spire-skyline.png`
- Role: Distant city and sky backdrop behind the interactive Three.js arena. Contains no gameplay geometry, snake, floor, HUD, logos, or text.
- Created: September 5, 2026 (America/Los_Angeles).
- Generation method: Built-in `image_gen.imagegen` tool; no CLI or external image API runner.
- Output: PNG, 1672 × 941 pixels.
- Original generated file: `/Users/jeremiah_perry/.codex/generated_images/01a0748b-bf1d-7092-830d-e640dfedaadc/exec-d818b8b8-d5bf-49f0-8547-83beec91e3ca.png`
- Art direction: Visually inspected the supplied `Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/references/gameplay-approved.png` for palette and distant architecture. The reference was not passed as an edit target; this is a newly generated supporting background.
- Review: Confirmed panoramic cyan/indigo city, restrained magenta accents, distant orbital ring and planet, lower central skyline, no foreground arena, no snake, no HUD or lettering. Copied the selected original output without editing or recompression.

### Exact prompt

```text
Use case: stylized-concept
Asset type: production panoramic distant skyline background for a playable Three.js cyberpunk arcade game, Snake Year 3039.
Primary request: Create ONE wide cinematic distant cyberpunk night city skyline background only. This is environment scenery to sit behind a separately rendered interactive arena.
Scene/backdrop: Dense layered gunmetal futuristic spires with many tiny cyan and magenta lights, atmospheric depth, hazy indigo and violet night sky. A restrained immense orbital ring arcs above and behind the distant buildings on the right, framing a dim blue planet. Elevated long-distance view over a city; towers are entirely distant. Small indistinct flying traffic points may add scale.
Style/medium: High-end realistic 3D game environment matte painting, crisp futuristic architecture fading into atmospheric haze; refined dark cyan and magenta neon accents.
Composition/framing: Wide landscape 16:9 panorama. Distant city and dark clouded sky only. Skyline fills the lower half, with a relatively low and subdued center and taller layered spires towards the sides. Upper half has ample dark atmospheric sky. Camera looks horizontally toward the skyline from an elevated arena that is OUTSIDE the image. Keep low central contrast so a separate 3D arena and gameplay will read clearly over this background. All bottom edge should be dark distant building bases and haze, with no ground plane.
Lighting/mood: Dramatic midnight cyberpunk atmosphere, cyan-blue windows and restrained magenta accents, subtle indigo cloud glow. Dark enough to support luminous foreground objects rendered separately.
Color palette: Near-black navy, gunmetal, indigo, deep violet, electric cyan, small magenta highlights.
Constraints: BACKGROUND SCENERY ONLY. No arena, no platforms, no floor, no grid, no foreground objects, no snake, no characters, no powerups, no barriers, no containers, no weapons, no HUD, no UI, no text, no lettering, no billboards with text, no logos, no watermark. Buildings must remain distant. Create exactly one image.
```
