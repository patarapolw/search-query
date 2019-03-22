import P from "parsimmon";
import XRegExp from "xregexp";
// import { inspect } from "util";

export interface IMongoSearchQueryRule {
    any?: string[];
    isString?: string[];
}

export class MongoSearchQuery {
    private lang: P.Language;

    constructor(rule: IMongoSearchQueryRule = {}) {
        this.lang = P.createLanguage({
            Input: (r) => P.alt(
                r.OrSentence,
                r.AndSentence,
                r.Sentence
            ),
            OrSentence: (r) => P.seq(
                r.Sentence,
                P.string(" OR "),
                r.Sentence
            ).map((el) => {
                return {$or: [el[0], el[2]]};
            }),
            AndSentence: (r) => P.seq(
                r.Sentence,
                P.string(" "),
                r.Sentence
            ).map((el) => {
                return {$and: [el[0], el[2]]};
            }),
            Sentence: (r) => P.alt(
                r.Bracketed,
                r.OrExpr,
                r.AndExpr,
                r.Expr
            ),
            Bracketed: (r) => P.string("(").then(r.Sentence).skip(P.string(")")),
            OrExpr: (r) => P.seq(
                r.Expr,
                P.string(" OR "),
                r.Expr
            ).map((el) => {
                return {$or: [el[0], el[2]]};
            }),
            AndExpr: (r) => P.seq(
                r.Expr,
                P.string(" "),
                r.Expr
            ).map((el) => {
                return {$and: [el[0], el[2]]};
            }),
            Expr: (r) => P.alt(
                r.FullExpr,
                r.PartialExpr
            ),
            PartialExpr: (r) => r.Value.map((el) => {
                if (rule.any) {
                    const expr = [] as any[];

                    for (const col of rule.any) {
                        if (rule.isString) {
                            if (rule.isString.indexOf(col) !== -1) {
                                expr.push({[col]: {$regexp: XRegExp.escape(el.toString())}});
                            }
                        } else {
                            expr.push({[col]: {$regexp: XRegExp.escape(el.toString())}});
                        }
                    }

                    return {$or: expr};
                } else {
                    throw new Error("Any not set");
                }
            }),
            FullExpr: (r) => P.seq(
                r.String,
                r.Op,
                r.Value
            ).map((el: any[]) => {
                const result = {[el[0]]: el[2]};

                switch (el[1]) {
                    case ":":
                        if (rule.isString) {
                            if (rule.isString.indexOf(el[1]) !== -1) {
                                result[el[0]] = {$regexp: XRegExp.escape(el[2].toString())};
                            }
                        } else {
                            result[el[0]] = {$regexp: XRegExp.escape(el[2].toString())};
                        }
                        break;
                    case ">=":
                        result[el[0]] = {$gte: el[2]};
                        break;
                    case ">":
                        result[el[0]] = {$gt: el[2]};
                        break;
                    case "<=":
                        result[el[0]] = {$lte: el[2]};
                        break;
                    case "<":
                        result[el[0]] = {$lt: el[2]};
                        break;
                    case "=":
                    default:
                }

                return result;
            }),
            Value: (r) => P.alt(
                r.Number,
                r.String
            ),
            Number: () => P.regexp(/\d+(?:\.\d+)?/).map(Number),
            String: (r) => P.alt(
                r.RawString,
                r.QuoteString
            ),
            RawString: () => P.regexp(/[^" :>=<]+/),
            QuoteString: (r) => r.Quote.then(r.Value).skip(r.Quote),
            Quote: () => P.string('"'),
            Op: () => P.alt(
                P.string(":"),
                P.string(">="),
                P.string(">"),
                P.string("<="),
                P.string("<"),
                P.string("=")
            ),
            _: () => P.optWhitespace
        });
    }

    public search(s: string) {
        return this.lang.Input.tryParse(s);
    }
}

export default MongoSearchQuery;

// const sq = new MongoSearchQuery({
//     any: ["x", "y", "z"]
// });

// console.log(inspect(sq.search(`a`), false, null, true));
// console.log(inspect(sq.search(`1`), false, null, true));
// console.log(inspect(sq.search(`"a":1 b`), false, null, true));
// console.log(inspect(sq.search(`(a OR b>2) OR c=a`), false, null, true));
