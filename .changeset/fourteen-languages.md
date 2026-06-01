---
"@open-zread/cli": minor
---

### New Language Parsers

Added 9 tree-sitter language parsers with SCM queries and WASM mappings:

- **PHP** — namespace use declarations, functions, class declarations, methods, interfaces
- **Rust** — use declarations, function items, structs, enums, traits
- **Java** — import declarations, method declarations, classes, interfaces
- **C** — preproc includes, function definitions, struct specifiers
- **C++** — preproc includes, function definitions, class specifiers
- **C#** — using directives, method declarations, classes, interfaces
- **Ruby** — method definitions, classes, modules
- **Swift** — import declarations, function declarations, classes, protocols
- **Kotlin** — import headers, function declarations, class declarations

### Parser Improvements

- Added `resolveFunctionName()` helper that extracts function names from the `declarator` field for C/C++ (which lack a `name` field on `function_definition`), falling back to the standard `name` field for all other languages. C/C++ functions no longer appear as `anonymous`.

### Documentation

- Updated README (English and Chinese) to reflect 14 supported languages. Language table, comparison matrix, and roadmap sections now show Rust, Java, C, C++, C#, Ruby, Swift, Kotlin, and PHP as production-ready.
