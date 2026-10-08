// Jest doesn't run webpack, so this does what SVGR does there: an .svg file becomes a module whose
// default export is a React component that draws it. It skips SVGO, which only shrinks the file.
const { transform } = require('@svgr/core');
const jsx = require('@svgr/plugin-jsx');
const ts = require('typescript');

module.exports = {
  process(source, filePath) {
    const code = transform.sync(source, { plugins: [jsx] }, { componentName: 'Svg', filePath });
    const { outputText } = ts.transpileModule(code, {
      fileName: `${filePath}.tsx`,
      compilerOptions: {
        jsx: ts.JsxEmit.React,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2018,
      },
    });
    return { code: outputText };
  },
};
