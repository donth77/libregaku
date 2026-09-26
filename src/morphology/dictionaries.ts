/**
 * The analyser's dictionaries, pinned to one lindera release.
 *
 * Pinned for the same reason JMdict is: lindera's dictionary format changed at
 * v6, and a "latest" URL would fetch files this build of the WASM cannot read.
 * The wasm (package.json) and these URLs move together, deliberately.
 *
 * Its own module so the contract canary can check the URL without loading the
 * offscreen document.
 */
export const LINDERA_DICTS: Record<string, string> = {
  ipadic: 'https://github.com/lindera/lindera/releases/download/v6.0.0/lindera-ipadic-6.0.0.zip',
};
