const defineJestConfig = require("../../../../define_jest_config")
module.exports = defineJestConfig({
  moduleNameMapper: {
    "^@types": "<rootDir>/src/types",
    "^@utils": "<rootDir>/src/utils",
    "^@loaders": "<rootDir>/src/loaders",
  },
})
