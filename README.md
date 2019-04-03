# Search-query

Convert one line search query to machine-readable query, preferably on client-side.

## Usage

- Install [parsimmon](https://github.com/jneen/parsimmon)
- Install [XRegExp](https://www.npmjs.com/package/xregexp)
- Copy the code
     - MongoDB - [/src/mongo.ts](/src/mongo.ts)
     - LokiJS  - [/src/loki.ts](/src/loki.ts)
     - SQLite  - [/src/sqlite.ts](/src/sqlite.ts)

## Example

```typescript
const sq = new MongoSearchQuery({
    any: ["x", "y", "z"]
});

console.log(inspect(sq.search(`a`), false, null, true));
console.log(inspect(sq.search(`1`), false, null, true));
console.log(inspect(sq.search(`"a":1 b`), false, null, true));
console.log(inspect(sq.search(`(a OR b>2) OR c=a`), false, null, true));
```

Output:

```
{ '$or':
   [ { x: { '$regexp': 'a' } },
     { y: { '$regexp': 'a' } },
     { z: { '$regexp': 'a' } },
     [length]: 3 ] }
{ '$or':
   [ { x: { '$regexp': '1' } },
     { y: { '$regexp': '1' } },
     { z: { '$regexp': '1' } },
     [length]: 3 ] }
{ '$and':
   [ { a: { '$regexp': '1' } },
     { '$or':
        [ { x: { '$regexp': 'b' } },
          { y: { '$regexp': 'b' } },
          { z: { '$regexp': 'b' } },
          [length]: 3 ] },
     [length]: 2 ] }
{ '$or':
   [ { '$or':
        [ { '$or':
             [ { x: { '$regexp': 'a' } },
               { y: { '$regexp': 'a' } },
               { z: { '$regexp': 'a' } },
               [length]: 3 ] },
          { b: { '$gt': 2 } },
          [length]: 2 ] },
     { c: 'a' },
     [length]: 2 ] }
```
