# nbody-webgpu

A gravitational N-body simulation that runs entirely on your GPU, in the browser.
Every body pulls on every other one — a brute-force O(N²) sum — recomputed each
frame as a WebGPU compute shader and drawn as a few tens of thousands of glowing
points. No server, no precomputed animation: open the page and the GPU does the
physics live.

[Live demo →](https://kerboul.me) · works in Chrome, Edge, and Safari 18+.

## The parts worth reading

**Tiled force summation.** The naive version has every body loop over all the
others straight out of global memory — correct, but bandwidth-bound. Instead each
workgroup cooperatively stages a block ("tile") of bodies into on-chip shared
memory, barriers, and runs the inner loop against that. It's the classic GPU-Gems
N-body structure and it's where the throughput comes from. See
[`src/shaders/nbody.wgsl`](src/shaders/nbody.wgsl).

**Symplectic integration.** The time stepper is leapfrog (kick-drift) with the
velocity staggered half a step behind position. The point isn't accuracy per se —
it's that a symplectic integrator doesn't secularly gain or lose energy, so the
disk holds together over millions of steps instead of slowly unwinding or
collapsing the way plain explicit Euler would. The first step does a half-kick to
set up the stagger.

**Plummer softening.** A small ε² added to every squared distance keeps the
1/r² force finite when two bodies get close, which both stabilises the integration
and conveniently zeroes out the self-interaction term for free.

**Ping-pong buffers.** Positions live in two storage buffers; each step reads one
and writes the other, then they swap. WebGPU orders successive dispatches within a
pass, so the read-after-write is safe without manual barriers. Velocities are a
single buffer since each invocation only ever touches its own.

**Rendering.** WebGPU point-list topology only gives 1px dots, so each body is an
instanced two-triangle billboard expanded to a constant pixel size in clip space,
with a soft radial falloff and additive blending. Colour is keyed to speed, so the
fast inner disk runs hot and the slow rim stays ember-dark.

The initial conditions are a rotating disk around a heavy central mass, with orbital
velocities set from the enclosed mass so it starts roughly in balance. The seed is
fixed, so the same galaxy comes back every reload.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + bundle into dist/
```

No runtime dependencies — just Vite and the TypeScript toolchain at build time.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds on every push to `main` and publishes `dist/`.
Once: in the repo settings, set **Pages → Source → GitHub Actions**. The Vite
`base` is relative, so it works from a project page (`user.github.io/nbody-webgpu/`)
or a custom domain at the root without changes. For a custom domain, drop a `CNAME`
file in `public/` and point the DNS record.

## Tuning

The panel is live. Worth a try:

- **Bodies** — the cost is N², so 65 536 is 16× the work of 16 384. Watch the
  pairwise/s readout react.
- **Gravity / time step** — turn either up far enough and you'll watch the
  integrator destabilise. Softening buys some of that back.
- **Substeps** — more physics per rendered frame; the galaxy evolves faster
  without the visual frame rate dropping.

## Why WebGPU and not WebGL

The simulation is a compute problem, not a rendering one. WebGL can fake compute
through render-to-texture gymnastics; WebGPU just has compute shaders and shared
memory, which is what this actually needs. The trade-off is reach — WebGPU is solid
on Chromium and recent Safari but not yet everywhere — so the page degrades to an
honest "WebGPU required" notice rather than a broken canvas.

## Possible next steps

- Barnes-Hut or an FMM to break the O(N²) wall and push into the millions.
- A proper colour map and HDR bloom pass.
- Collision/merger seeding — drop two disks in and let them interact.

---

Built by Ethan Kerboul. MIT licensed.
