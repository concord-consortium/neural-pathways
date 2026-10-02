// Every state model file imports this for its side effects, so any code that uses the models gets
// them, not only the student app.
import { ModelAutoTypeCheckingMode, setGlobalConfig } from "mobx-keystone";

// keystone's public types use the newer Set methods, so tsconfig's `lib` includes
// `esnext.collection`. These make that true in browsers we support that predate the methods
// (before Chrome 122, Safari 17 and Firefox 127).
import "core-js/actual/set/union";
import "core-js/actual/set/intersection";
import "core-js/actual/set/difference";
import "core-js/actual/set/symmetric-difference";
import "core-js/actual/set/is-subset-of";
import "core-js/actual/set/is-superset-of";
import "core-js/actual/set/is-disjoint-from";

// Type-check every load and write, in browsers too. See "Rules" in docs/view-state.md.
setGlobalConfig({ modelAutoTypeChecking: ModelAutoTypeCheckingMode.AlwaysOn });
