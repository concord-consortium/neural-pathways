// Every state model file imports this for its side effects, so any code that uses the models gets
// them, not only the student app.
import { ModelAutoTypeCheckingMode, setGlobalConfig } from "mobx-keystone";

// keystone's public types use the newer Set methods, so tsconfig's `lib` includes
// `esnext.collection`. These polyfills make that true in browsers we support that predate the
// methods (before Chrome 122, Safari 17 and Firefox 127). The `core-js/modules` entries are about
// half the size of the `core-js/actual` ones, which bring along other polyfills.
import "core-js/modules/es.set.union.v2";
import "core-js/modules/es.set.intersection.v2";
import "core-js/modules/es.set.difference.v2";
import "core-js/modules/es.set.symmetric-difference.v2";
import "core-js/modules/es.set.is-subset-of.v2";
import "core-js/modules/es.set.is-superset-of.v2";
import "core-js/modules/es.set.is-disjoint-from.v2";

// Type-check every load and write, in browsers too. See "Rules" in docs/view-state.md.
setGlobalConfig({ modelAutoTypeChecking: ModelAutoTypeCheckingMode.AlwaysOn });
