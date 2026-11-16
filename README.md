# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Semantic evaluation checks

After installing dependencies, run `node --test tests\evaluation.test.mjs`.
The tests cover quantifier shadowing, preservation of outer assignments, and
consistency between evaluation table cells and their traces.

Quantifiers always range over the entire domain, overriding any existing
assignment to their variable within their scope. Table axes are unchanged;
assignments to bound variables do not affect a quantified formula's result.
Cell traces retain quantified subformulas as complete evaluation steps.
