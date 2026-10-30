# 11__Import__PackageValidator

**10-19 · Scene input** · reserved: a README until real code arrives

The package validator and its report. A failed package is reported, never half-loaded.

**Belongs here**

- Missing files, incompatible schema versions, duplicate IDs, unsupported features, invalid paths, broken material references.
- Validates against the contracts in `11__Contracts__JsonSchemas`.
- A later Rust/Wasm candidate (§13), only if profiling says so.

**Takes** an unpacked package (`10`). **Gives** a pass/fail report the user can read.

**Manifest:** §04 Essential Identity Rules.
