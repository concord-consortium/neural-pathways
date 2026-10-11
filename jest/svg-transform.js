// Jest doesn't run webpack, so this does what SVGR does there: an .svg file becomes a module whose
// default export is a React component that draws it. It skips SVGO, which only shrinks the file.
const crypto = require('crypto');
const fs = require('fs');
const { transform } = require('@svgr/core');
const jsx = require('@svgr/plugin-jsx');
const ts = require('typescript');

// Jest's own cache key covers the file and the config, not this transform or the packages it uses,
// so without these a change to either would keep serving the old output.
const transformVersion = [
  fs.readFileSync(__filename, 'utf8'),
  require('@svgr/core/package.json').version,
  require('@svgr/plugin-jsx/package.json').version,
  ts.version,
].join('\n');

module.exports = {
  getCacheKey(source, filePath, { configString }) {
    return crypto.createHash('sha1')
      .update(transformVersion).update('\0')
      .update(source).update('\0')
      .update(filePath).update('\0')
      .update(configString)
      .digest('hex');
  },

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
