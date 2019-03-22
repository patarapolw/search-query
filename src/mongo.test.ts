import { inspect } from "util";
import MongoSearchQuery from "./mongo";

const sq = new MongoSearchQuery({
    any: ["front", "back", "mnemonic", "deck", "tag"],
    isString: ["front", "back", "mnemonic", "deck"],
    isDate: ["nextReview"]
});

// it("Blank string", () => {
// console.log(inspect(sq.search(""), false, null, true));
// });

// it("String", () => {
console.log(inspect(sq.search(`a`), false, null, true));
// });

// it("Integer", () => {
console.log(inspect(sq.search(`1`), false, null, true));
// });

// it("Float", () => {
console.log(inspect(sq.search(`1.1`), false, null, true));
// });

console.log(inspect(sq.search(`-1.1`), false, null, true));

// it("And", () => {
console.log(inspect(sq.search(`"a":1.1 -b`), false, null, true));
// });

// it("Complex OR", () => {
console.log(inspect(sq.search(`(a OR b>2) c=a`), false, null, true));
// });
