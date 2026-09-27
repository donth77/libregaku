/** build.mjs loads .svg as text, so importing one gives its markup. */
declare module '*.svg' {
  const markup: string;
  export default markup;
}
