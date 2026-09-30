# rishi-potipireddi

Personal site, drawn as a neural network. Scrolling (or swiping sideways) runs a
forward pass: one input neuron (me) fans out to experience, then to projects,
then to the output layer: name and links on top, and below them a set of
output "choices". Hovering one strengthens the edges into it and swings the
softmax next to each choice towards it.

## Stack

- **Astro**: static output, no framework runtime shipped
- **Tailwind v4**: tokens for the three-colour palette live in `src/styles/global.css`
- **TypeScript + Canvas 2D**: edges and signal pulses (`src/lib/forward.ts`)

## Content

Everything on the page comes from `src/data/profile.ts`: experience, projects,
the experience→project and project→choice edge weights, and the output layer's choices and links.

## Develop

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # type-checks, then writes static files to dist/
```
