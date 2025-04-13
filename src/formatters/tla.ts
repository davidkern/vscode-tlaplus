import * as vscode from 'vscode';
import { IndentationType, LineInfo, makeSpaces, indentRight, indentExact, indentationLen } from './formatting';

/**
 * Formats the code on the fly in .tla files.
 */
export class TlaOnTypeFormattingEditProvider implements vscode.OnTypeFormattingEditProvider {
    provideOnTypeFormattingEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        ch: string,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        if (position.line === 0) {
            return [];
        }
        if (ch === ' ' || ch === '\n') {
            const subs = trySubstitution(ch, document, position);
            if (ch === '\n') {
                return [...subs, ...tryIndentBlockStart(document, position, options)];
            } else {
                return [...subs];
            }
        } else if (ch === 'd' || ch === 'e' || ch === 'f' || ch === 'r') {
            return tryIndentBlockEnd(document, position, options);
        }
        return [];
    }
}

/**
 * Indents text inside a block.
 */
function tryIndentBlockStart(
    document: vscode.TextDocument,
    position: vscode.Position,
    options: vscode.FormattingOptions
): vscode.TextEdit[] {
    const prevLine = document.lineAt(position.line - 1);
    const startInfo = testSimpleBlockStart(prevLine)
                        || testStateDefBlockStart(prevLine, options)
                        || findEnclosingBlockStart(document, position.line - 1);
    if (!startInfo) {
        return [];
    }
    const lineText = document.lineAt(position.line).text;
    switch (startInfo.indentationType) {
        case IndentationType.Right:
            return indentRight(lineText, position, startInfo.indentation, options);
        case IndentationType.Exact:
            return indentExact(lineText, position, startInfo.indentation);
    }
    return [];
}

/**
 * Indents a line that ends some block by aligning it to the block start.
 */
function tryIndentBlockEnd(
    document: vscode.TextDocument,
    position: vscode.Position,
    options: vscode.FormattingOptions
): vscode.TextEdit[] {
    const line = document.lineAt(position.line);
    const endInfo = testBlockEnd(line);
    if (!endInfo || endInfo.indentation.length === 0) {
        return [];
    }
    const startInfo = findEnclosingBlockStart(document, position.line - 1);
    if (!startInfo) {
        return [];
    }
    const startIndentLen = indentationLen(startInfo.indentation, options);
    const endIndentLen = indentationLen(endInfo.indentation, options);
    if (endIndentLen === startIndentLen) {
        return [];
    }
    const lineStart = new vscode.Position(position.line, 0);
    const indentationEnd = new vscode.Position(position.line, endIndentLen);
    return [
        vscode.TextEdit.replace(new vscode.Range(lineStart, indentationEnd), startInfo.indentation)
    ];
}

/**
 * Finds the beginning of the block that encloses the given line.
 */
function findEnclosingBlockStart(document: vscode.TextDocument, lineNo: number): LineInfo | undefined {
    let n = lineNo;
    while (n >= 0) {
        const line = document.lineAt(n);
        const startInfo = testBlockStart(line);
        if (startInfo) {
            return startInfo;
        }
        const endInfo = testBlockEnd(line);
        if (endInfo) {
            return undefined;
        }
        if (line.text.length > 0 && !line.text.startsWith(' ') && !line.text.startsWith('\n')) {
            return undefined;  // some text with no indentation, stop analysis to prevent too long searching
        }
        n -= 1;
    }
    return undefined;
}

function testSimpleBlockStart(line: vscode.TextLine): LineInfo | undefined {
    const gMatches = /^(\s*)(?:variables|VARIABLE(S)?|CONSTANT(S)?|\w+:)\s*$/g.exec(line.text);
    return gMatches ? new LineInfo(line, gMatches[1], IndentationType.Right) : undefined;
}

function testStateDefBlockStart(line: vscode.TextLine, options: vscode.FormattingOptions): LineInfo | undefined {
    const gMatches = /^((\s*)[\w(),\s]+(≜|==)\s*)((?:\/\\|\\\/|∨|∧).*)?\s*$/g.exec(line.text);
    if (!gMatches) {
        return undefined;
    }
    if (gMatches[3]) {
        return new LineInfo(line, makeSpaces(indentationLen(gMatches[1], options)), IndentationType.Exact);
    }
    return new LineInfo(line, gMatches[2], IndentationType.Right);
}

function testBlockStart(line: vscode.TextLine): LineInfo | undefined {
    // eslint-disable-next-line max-len
    const matches = /^(\s*)(?:\w+:)?\s*(?:begin\b|if\b|else\b|elsif\b|while\b|either\b|or\b|with\b|define\b|macro\b|procedure\b|\{).*/g.exec(line.text);
    return matches ? new LineInfo(line, matches[1], IndentationType.Right) : undefined;
}

function testBlockEnd(line: vscode.TextLine): LineInfo | undefined {
    const matches = /^(\s*)(?:end\b|else\b|elsif\b|or\b|\}).*/g.exec(line.text);
    return matches ? new LineInfo(line, matches[1], IndentationType.Left) : undefined;
}

// https://github.com/tlaplus-community/tlauc/blob/main/resources/tla-unicode.csv
const substitution : {[key: string]: string} = {
    '->': '→',
    '-|': '⊣',
    '-+->': '⇸',
    '==': '≜',
    '=>': '⇒',
    '=<': '≤',
    '=|': '⫤',
    '<-': '←',
    '<=': '≤',
    '<=>': '⇔',
    '<>': '◇',
    '<<': '⟨',
    '>>': '⟩',
    '>=': '≥',
    '|-': '⊢',
    '|->': '↦',
    '|=': '⊨',
    '||': '‖',
    '[]': '□',
    '::': '∷',
    ':=': '≔',
    '::=': '⩴',
    '~': '¬',
    '~>': '↝',
    '/=': '≠',
    '/\\': '∧',
    '\\/': '∨',
    '#': '≠',
    '..': '‥',
    '...': '…',
    '^+': '⁺',
    '!!': '‼',
    '??': '⁇',
    '(/)': '⊘',
    '(+)': '⊕',
    '(-)': '⊖',
    '(.)': '⊙',
    '(\\X)': '⊗',
    '\\A': '∀',
    '\\E': '∃',
    '\\approx': '≈',
    '\\asymp': '≍',
    '\\cong': '≅',
    '\\doteq': '≐',
    '\\equiv': '≡',
    '\\exists': '∃',
    '\\forall': '∀',
    '\\in': '∈',
    '\\geq': '≥',
    '\\gg': '≫',
    '\\land': '∧',
    '\\leq': '≤',
    '\\lor': '∨',
    '\\ll': '≪',
    '\\lnot': '¬',
    '\\neg': '¬',
    '\\notin': '∉',
    '\\prec': '≺',
    '\\succ': '≻',
    '\\preceq': '⪯',
    '\\succeq': '⪰',
    '\\propto': '∝',
    '\\sim': '∼',
    '\\simeq': '≃',
    '\\sqsubset': '⊏',
    '\\sqsupset': '⊐',
    '\\sqsubseteq': '⊑',
    '\\sqsupseteq': '⊒',
    '\\subset': '⊂',
    '\\supset': '⊃',
    '\\subseteq': '⊆',
    '\\supseteq': '⊇',
    '\\intersect': '∩',
    '\\cap': '∩',
    '\\union': '∪',
    '\\cup': '∪',
    '\\o': '∘',
    '\\oplus': '⊕',
    '\\ominus': '⊖',
    '\\odot': '⊙',
    '\\oslash': '⊘',
    '\\otimes': '⊗',
    '\\bigcirc': '◯',
    '\\bullet': '●',
    '\\div': '÷',
    '\\circ': '∘',
    '\\star': '⋆',
    '\\sqcap': '⊓',
    '\\sqcup': '⊔',
    '\\uplus': '⊎',
    '\\X': '×',
    '\\times': '×',
    '\\wr': '≀',
    '\\cdot': '⋅',
    'Nat': 'ℕ',
    'Int': 'ℤ',
    'Real': 'ℝ',
};

function escapeStringRegexp(s: string): string {
    return s.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&');
}

function buildSubstitutionMatcher(): RegExp {
    const keys = Object.keys(substitution);
    const matchers = keys.map((value) => `(${escapeStringRegexp(value)})`);
    return new RegExp(`(${matchers.join('|')})(\\s|$)`, 'g');
}

const substitutionMatcher = buildSubstitutionMatcher();

function trySubstitution(
    ch: string,
    document: vscode.TextDocument,
    position: vscode.Position,
) {
    const line = ch === '\n' ? position.line - 1 : position.line;
    const lineText = document.lineAt(line).text;
    const matches = [...lineText.matchAll(substitutionMatcher)];

    return matches.map(match => {
        console.log(match);
        const start = new vscode.Position(line, match.index);
        const end = new vscode.Position(line, match.index + match[1].length);
        return vscode.TextEdit.replace(new vscode.Range(start, end), substitution[match[1]]);
    });
}