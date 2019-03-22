import P from "parsimmon";

export interface IExpression {
    key?: string;
    value: any;
    op?: string;
}

export interface IBinaryOperation {
    name: string;
    left: any;
    right: any;
}

const lang = P.createLanguage({
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
        return {
            name: "OR",
            left: el[0],
            right: el[2]
        } as IBinaryOperation;
    }),
    AndSentence: (r) => P.seq(
        r.Sentence,
        P.string(" "),
        r.Sentence
    ).map((el) => {
        return {
            name: "AND",
            left: el[0],
            right: el[2]
        } as IBinaryOperation;
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
        return {
            name: "OR",
            left: el[0],
            right: el[2]
        } as IBinaryOperation;
    }),
    AndExpr: (r) => P.seq(
        r.Expr,
        P.string(" "),
        r.Expr
    ).map((el) => {
        return {
            name: "AND",
            left: el[0],
            right: el[2]
        } as IBinaryOperation;
    }),
    Expr: (r) => P.alt(
        r.FullExpr,
        r.PartialExpr
    ),
    PartialExpr: (r) => r.Value.map((el) => {
        return {
            value: el
        } as IExpression;
    }),
    FullExpr: (r) => P.seq(
        r.String,
        r.Op,
        r.Value
    ).map((el: any[]) => {
        const result = {
            key: el[0],
            value: el[2]
        } as IExpression;

        if (el[1] !== ":") {
            result.op = el[1];
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

console.log(lang.Input.parse(`a`));
console.log(lang.Input.parse(`1`));
console.log(lang.Input.parse(`"a":1 b`));
console.log(lang.Input.parse(`(a OR b>2) OR c=a`));

export function searchRaw(s: string) {
    return lang.Input.parse(s);
}
