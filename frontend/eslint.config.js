import eslint from "@eslint/js";
// import eslintPluginAstro from "eslint-plugin-astro";
import hooksPlugin from "eslint-plugin-react-hooks";
import reactPlugin from "eslint-plugin-react";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  // ...eslintPluginAstro.configs["flat/recommended"],
  {
    // Exclude .astro files
    files: ["**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"],
    ...reactPlugin.configs.flat.recommended,
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"],
    ...reactPlugin.configs.flat["jsx-runtime"],
  },
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    plugins: {
      "react-hooks": hooksPlugin,
    },
    rules: hooksPlugin.configs.recommended.rules,
  },
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
