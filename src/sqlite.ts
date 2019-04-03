import P from "parsimmon";
import moment from "moment";
import shortid from "shortid";

const genereateId = () => shortid.generate().replace(/[-_ ]/g, "");

export interface ISqlSearchParserRule {
    anyOf?: string[];
    isString?: string[];
    isDate?: string[];
}

export interface ISqlQuery {
    text: string;
    params: any;
}

export class SqlSearchParser {
    public static and(andList: Array<string | ISqlQuery>): ISqlQuery {
        return SqlSearchParser.listJoin("AND", andList);
    }

    public static or(orList: Array<string | ISqlQuery>): ISqlQuery {
        return SqlSearchParser.listJoin("OR", orList);
    }

    public static kLikeV(k: string, v: any, leftOn: boolean = true, rightOn: boolean = true): ISqlQuery {
        const vId = genereateId();
        const qText = `${k} LIKE @${vId} ESCAPE "\\"`;
        const qParams = {[vId]: `${leftOn ? "%" : ""}${v.toString().replace(/([%_])/g, "\\$1")}${rightOn ? "%" : ""}`};

        return {text: qText, params: qParams};
    }

    public static kOpV(k: string, op: string, v: any): ISqlQuery {
        if (v === "NULL") {
            return {text: `${k} IS NULL`, params: {}};
        }

        const vId = genereateId();
        const qText = `${k} ${op} @${vId}`;
        const qParams = {[vId]: v};

        return {text: qText, params: qParams};
    }

    private static listJoin(op: string, list: Array<ISqlQuery | string>) {
        const qList: ISqlQuery[] = list.map((el) => {
            if (typeof el === "string") {
                return { text: el, params: {} } as ISqlQuery;
            }
            return el as ISqlQuery;
        });
        const qText = qList.map((el) => `(${el.text})`).join(` ${op} `);
        const qParams = {} as any;
        qList.forEach((el) => Object.assign(qParams, el.params));
        return {
            text: qText,
            params: qParams
        };
    }

    private lang: P.Language;

    constructor(rule: ISqlSearchParserRule = {}) {
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
                return SqlSearchParser.or([el[0], el[2]]);
            }),
            AndSentence: (r) => P.seq(
                r.Sentence,
                P.string(" "),
                r.Sentence
            ).map((el) => {
                return SqlSearchParser.and([el[0], el[2]]);
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
                return SqlSearchParser.or([el[0], el[2]]);
            }),
            AndExpr: (r) => P.seq(
                r.Expr,
                P.string(" "),
                r.Expr
            ).map((el) => {
                return SqlSearchParser.and([el[0], el[2]]);
            }),
            Expr: (r) => P.alt(
                r.FullExpr,
                r.PartialExpr
            ),
            PartialExpr: (r) => r.Value.map((el) => {
                const expr = [] as ISqlQuery[];

                if (rule.anyOf) {
                    for (const col of rule.anyOf) {
                        if (rule.isString) {
                            if (rule.isString.indexOf(col) !== -1) {
                                expr.push(SqlSearchParser.kLikeV(col, el));
                            } else {
                                expr.push(SqlSearchParser.kOpV(col, "=", el));
                            }
                        } else {
                            expr.push(SqlSearchParser.kLikeV(col, el));
                        }
                    }
                } else if (rule.isString) {
                    for (const col of rule.isString) {
                        expr.push(SqlSearchParser.kLikeV(col, el));
                    }
                }

                if (expr.length === 0) {
                    throw new Error("Any or String not set");
                }

                return SqlSearchParser.or(expr);
            }),
            FullExpr: (r) => P.seq(
                r.String,
                r.Op,
                r.Value
            ).map((el: any[]) => {
// tslint:disable-next-line: prefer-const
                let [k, op, v] = el;

                if (v === "NULL") {
                    return SqlSearchParser.kOpV(k, "IS", "NULL");
                }

                if (rule.isDate && rule.isDate.indexOf(k) !== -1) {
                    const m = /^([-+]?\d+)(\S+)$/.exec(v.toString());

                    if (m) {
                        v = moment().add(moment.duration(parseInt(m[1]), m[2] as any)).toISOString();
                        return SqlSearchParser.kOpV(k, "<=", v);
                    } else if (v === "now") {
                        v = moment().toISOString();
                        return SqlSearchParser.kOpV(k, "<=", v);
                    }
                }

                if (op === ":") {
                    if (rule.isString) {
                        if (rule.isString.indexOf(k) !== -1) {
                            return SqlSearchParser.kLikeV(k, v);
                        }
                    } else {
                        return SqlSearchParser.kLikeV(k, v);
                    }
                }

                return SqlSearchParser.kOpV(k, op, v);
            }),
            Value: (r) => P.alt(
                r.Number,
                r.String
            ),
            Number: () => P.regexp(/^\d+(?:\.\d+)?$/).map(Number),
            String: (r) => P.alt(
                r.RawString,
                r.QuoteString
            ),
            RawString: () => P.regexp(/[^" :>=<~]+/),
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

    public search(q?: string): ISqlQuery {
        if (q) {
            const r = this.lang.Input.parse(q);
            if (r.status === true) {
                return r.value;
            }
        }
        return { text: "TRUE", params: {} };
    }
}

export default SqlSearchParser;
