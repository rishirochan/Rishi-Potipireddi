# rishi-potipireddi

Personal site, drawn as a neural network. Scrolling (or swiping sideways) runs a
forward pass: one input neuron (me) fans out to experience, then to projects,
then converges on a single output neuron with links and details.

## Stack

- **Astro**: static output, no framework runtime shipped
- **Tailwind v4**: tokens for the three-colour palette live in `src/styles/global.css`
- **TypeScript + Canvas 2D**: edges and signal pulses (`src/lib/forward.ts`)

## Content

Everything on the page comes from `src/data/profile.ts`: experience, projects,
the experience→project edge weights, and the output neuron's details and links.

## Develop

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # type-checks, then writes static files to dist/
```
