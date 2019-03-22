import P from "parsimmon";
import XRegExp from "xregexp";

export interface IMongoSearchQueryRule {
    any?: string[];
    isString?: string[];
    isDate?: string[];
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
            AndSentence: (r) => r.Sentence.sepBy1(P.string(" ")).map((el) => {
                return el.length > 1 ? {$or: el} : el[0];
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
            AndExpr: (r) => r.Expr.sepBy1(P.string(" ")).map((el) => {
                return el.length > 1 ? {$or: el} : el[0];
            }),
            Expr: (r) => P.alt(
                r.FullExpr,
                r.PartialExpr
            ),
            PartialExpr: (r) => r.Value.map((el) => {
                const expr = [] as any[];

                if (rule.any) {
                    for (const col of rule.any) {
                        if (rule.isString) {
                            if (rule.isString.indexOf(col) !== -1 && typeof el !== "object") {
                                expr.push({[col]: {$regex: XRegExp.escape(el.toString())}});
                            } else {
                                expr.push({[col]: el});
                            }
                        } else {
                            if (typeof el !== "object") {
                                expr.push({[col]: {$regex: XRegExp.escape(el.toString())}});
                            } else {
                                expr.push({[col]: el});
                            }
                        }
                    }
                } else if (rule.isString) {
                    for (const col of rule.isString) {
                        if (typeof el !== "object") {
                            expr.push({[col]: {$regex: XRegExp.escape(el.toString())}});
                        } else {
                            expr.push({[col]: el});
                        }
                    }
                }

                if (expr.length === 0) {
                    throw new Error("Any or String not set");
                }

                return {$or: expr};
            }),
            FullExpr: (r) => P.seq(
                r.String,
                r.Op,
                r.Value
            ).map((el: any[]) => {
                const result = {[el[0]]: el[2]};

                if (rule.isDate && rule.isDate.indexOf(el[0]) !== -1 && typeof el[2] !== "object") {
                    result[el[0]] = {$toDate: el[2].toString()};
                } else if (el[1] === ":" && typeof el[2] !== "object") {
                    if (rule.isString) {
                        if (rule.isString.indexOf(el[0]) !== -1) {
                            result[el[0]] = {$regex: XRegExp.escape(el[2].toString())};
                        }
                    } else {
                        result[el[0]] = {$regex: XRegExp.escape(el[2].toString())};
                    }
                } else if (el[1] === ">=") {
                    result[el[0]] = {$gte: el[2]};
                } else if (el[1] === ">") {
                    result[el[0]] = {$gt: el[2]};
                } else if (el[1] === "<=") {
                    result[el[0]] = {$lte: el[2]};
                } else if (el[1] === "<") {
                    result[el[0]] = {$lt: el[2]};
                }

                return result;
            }),
            Value: (r) => P.alt(
                r.Number,
                r.String,
                r.Not
            ),
            Number: () => P.regexp(/\d+(?:\.\d+)?/).map(Number),
            String: (r) => P.alt(
                r.RawString,
                r.QuoteString
            ),
            Not: (r) => P.string("-").then(r.String).map((el) => {
                return {$not: el};
            }),
            RawString: () => P.regexp(/(?!-)[^" :>=<]+/),
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
