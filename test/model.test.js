import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTags,
  normalizeCollections,
  saveCollection,
  readObject,
  pageSize,
} from "../public/model.js";
import { positiveInteger } from "../src/http.js";

test("last tag modifier wins across casing and empty tags are ignored", () => {
  assert.deepEqual(
    normalizeTags(["Sky", "-sky", null, " ", "-", " Blue Eyes "]),
    ["-sky", "Blue Eyes"],
  );
});
test("damaged stored preferences fall back safely", () => {
  for (const value of ["null", "[]", "123", "{"])
    assert.deepEqual(readObject({ getItem: () => value }, "test"), {});
  assert.deepEqual(
    readObject(
      {
        getItem() {
          throw new Error("blocked");
        },
      },
      "test",
    ),
    {},
  );
});
test("legacy collections migrate tags and keep unique identities", () => {
  const result = normalizeCollections(
    [
      null,
      { id: "a", tags: { Sky: "-", Blue: "+" } },
      { id: "a", tags: ["Tree"] },
    ],
    "owner",
  );
  assert.deepEqual(result[0].tags, ["-Sky", "Blue"]);
  assert.notEqual(result[0].id, result[1].id);
  assert.equal(result[0].ownerId, "owner");
});
test("renaming preserves references and duplicate names cannot replace another set", () => {
  const sets = [
    { id: "a", name: "First", tags: ["Sky"] },
    { id: "b", name: "Second", tags: ["Tree"] },
  ];
  assert.equal(
    saveCollection(sets, { id: "new", name: "Renamed", tags: [] }, "a")[0].id,
    "a",
  );
  assert.throws(() => saveCollection(sets, { name: "second" }, "a"));
  assert.throws(() => saveCollection(sets, { name: "FIRST" }, null));
  assert.equal(sets[0].name, "First");
});
test("page sizes remain bounded integers", () => {
  assert.equal(pageSize(20.7), 20);
  assert.equal(pageSize(1000), 100);
  assert.equal(pageSize(-3), 10);
  assert.equal(pageSize("bad"), 30);
});
test("API integer parameters reject partial numbers", () => {
  assert.equal(positiveInteger("12oops", 0, 100), 0);
  assert.equal(positiveInteger("2.5", 0, 100), 0);
  assert.equal(positiveInteger("200", 0, 100), 100);
});

