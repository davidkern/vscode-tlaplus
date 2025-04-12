import * as vscode from 'vscode';

/**
 * Replaces ASCII with Unicode on the fly in .tla files.
 */
export class TlaUnicodeOnTypeFormattingEditProvider implements vscode.OnTypeFormattingEditProvider {
    provideOnTypeFormattingEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        ch: string,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        // TODO: try triggering on " " and newline to avoid premature matches.
        // e.g. "EXTENDS Integers" becomes "EXTENDS ℤegers" with the current approach.
        if (position.line === 0) {
            return [];
        }

        const lineText = document.lineAt(position.line).text;
        const matches = [...lineText.matchAll(this.matcher)];

        return matches.map(match => {
            const start = new vscode.Position(position.line, match.index);
            const end = new vscode.Position(position.line, match.index + match[0].length);
            return vscode.TextEdit.replace(new vscode.Range(start, end), this.substitution[match[0]]);
        });
    }

    // https://github.com/tlaplus-community/tlauc/blob/main/resources/tla-unicode.csv
    substitution : {[key: string]: string} = {
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
        '≤>': '⇔', // overlap
        '<>': '◇',
        '<<': '⟨',
        '>>': '⟩',
        '>=': '≥',
        '|-': '⊢',
        '|->': '↦',
        '⊢>': '↦', // overlap
        '|=': '⊨',
        '||': '‖',
        '[]': '□',
        '::': '∷',
        ':=': '≔',
        '::=': '⩴',
        '∷=': '⩴', // overlap
        '~': '¬',
        '~>': '↝',
        '¬>': '↝', // overlap
        '/=': '≠',
        '/\\': '∧',
        '\\/': '∨',
        '#': '≠',
        '..': '‥',
        '...': '…',
        '‥.': '…', // overlap
        '^+': '⁺',
        '!!': '‼',
        '??': '⁇',
        '(/)': '⊘',
        '(+)': '⊕',
        '(-)': '⊖',
        '(.)': '⊙',
        '(\\X)': '⊗',
        '(×)': '⊗', // overlap
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
        '≺eq': '⪯', // overlap
        '≺=': '⪯', // overlap
        '\\succeq': '⪰',
        '≻eq': '⪰', // overlap
        '≻=': '⪰', // overlap
        '\\propto': '∝',
        '\\sim': '∼',
        '\\simeq': '≃',
        '∼eq': '≃', // overlap
        '∼=': '≃', // overlap
        '\\sqsubset': '⊏',
        '\\sqsupset': '⊐',
        '\\sqsubseteq': '⊑',
        '⊏eq': '⊑', // overlap
        '⊏=': '⊑', // overlap
        '\\sqsupseteq': '⊒',
        '⊐eq': '⊒', // overlap
        '⊐=': '⊒', // overlap
        '\\subset': '⊂',
        '\\supset': '⊃',
        '\\subseteq': '⊆',
        '⊂eq': '⊆', // overlap
        '⊂=': '⊆', // overlap
        '\\supseteq': '⊇',
        '⊃eq': '⊇', // overlap
        '⊃=': '⊇', // overlap
        '\\intersect': '∩',
        '\\cap': '∩',
        '\\union': '∪',
        '\\cup': '∪',
        '\\o': '∘',
        '\\oplus': '⊕',
        '∘plus': '⊕', // overlap
        '∘+': '⊕', // overlap
        '\\ominus': '⊖',
        '∘minus': '⊖', // overlap
        '∘-': '⊖', // overlap
        '\\odot': '⊙',
        '∘dot': '⊙', // overlap
        '∘.': '⊙', // overlap
        '\\oslash': '⊘',
        '∘slash': '⊘', // overlap
        '∘/': '⊘', // overlap
        '\\otimes': '⊗',
        '∘times': '⊗', // overlap
        '∘*': '⊗', // overlap
        '∘x': '⊗', // overlap
        '∘X': '⊗', // overlap
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

    matcher: RegExp;

    constructor() {
        const keys = Object.keys(this.substitution);
        const matchers = keys.map((value) => `(${escapeStringRegexp(value)})`);
        this.matcher = new RegExp(matchers.join('|'), 'g');
    }
}

function escapeStringRegexp(s: string): string {
    return s.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&');
}