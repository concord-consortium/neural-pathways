/** An .svg file, imported as a React component that draws it: SVGR, and jest/svg-transform.js under Jest. */
declare module "*.svg" {
  const Svg: React.FC<React.SVGProps<SVGSVGElement>>;
  export default Svg;
}
