import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import { fixupConfigRules } from "@eslint/compat";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default [
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    settings: { react: { version: "detect" } },
  },
  { languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...fixupConfigRules(pluginReactConfig),
  {
    rules: {
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react/prop-types": "off",
    },
  },
  eslintPluginPrettierRecommended,
];
