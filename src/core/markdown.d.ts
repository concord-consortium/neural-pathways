/** An .md file, imported as its text: webpack's asset/source rule, and jest/md-transform.js under Jest. */
declare module "*.md" {
  const text: string;
  export default text;
}
