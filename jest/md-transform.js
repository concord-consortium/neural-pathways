// Jest doesn't run webpack, so this does what its asset/source rule does there: an .md file becomes
// a module whose default export is the file's text.
const crypto = require('crypto');
const fs = require('fs');

// Jest's own cache key covers the file and the config, not this transform, so without this a change
// to it would keep serving the old output.
const transformVersion = fs.readFileSync(__filename, 'utf8');

module.exports = {
  getCacheKey(source, filePath, { configString }) {
    return crypto.createHash('sha1')
      .update(transformVersion).update('\0')
      .update(source).update('\0')
      .update(filePath).update('\0')
      .update(configString)
      .digest('hex');
  },

  process(source) {
    return { code: `module.exports = { __esModule: true, default: ${JSON.stringify(source)} };` };
  },
};
