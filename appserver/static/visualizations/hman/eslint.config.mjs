import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    files: ["**/*.js"],
    languageOptions: { sourceType: "commonjs" },
    ignores: ["**/node_modules/", ".git/"],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.amd,
        "$": true,
        "Intl": "readonly"
      }
    }
  },
  pluginJs.configs.recommended,
];